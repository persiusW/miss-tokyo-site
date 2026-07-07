import { ReactNode } from "react";
import { redirect } from "next/navigation";
import { unstable_cache } from "next/cache";
import "./admin.css";
import { Toaster } from "@/components/ui/miss-tokyo/Toaster";
import { RealtimeStockMonitor } from "@/components/ui/miss-tokyo/RealtimeStockMonitor";
import { AdminShellClient } from "@/components/ui/miss-tokyo/AdminShellClient";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { createClient } from "@/lib/supabaseServer";
import { logSignIn } from "@/lib/utils/logSignIn";

const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

async function safeQuery<T>(fn: () => PromiseLike<{ data: T | null }>, ms = 8000): Promise<T | null> {
    try {
        const race = await Promise.race([
            Promise.resolve(fn()),
            delay(ms).then(() => ({ data: null as T | null })),
        ]);
        return race.data ?? null;
    } catch {
        return null;
    }
}

function getInitials(name: string): string {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
}

// Sidebar settings rarely change — cache for 60 s so every dashboard render
// doesn't pay two extra DB round trips.
const getLayoutSettings = unstable_cache(
    async () => {
        const [storeData, bizData] = await Promise.all([
            safeQuery(() => supabaseAdmin.from("store_settings").select("enable_custom_requests").eq("id", "default").single()),
            safeQuery(() => supabaseAdmin.from("business_settings").select("business_name").eq("id", "default").single()),
        ]);
        return { storeData, bizData };
    },
    ["dashboard-layout-settings"],
    { revalidate: 60 }
);

export default async function DashboardLayout({ children }: { children: ReactNode }) {
    const serverClient = await createClient();
    // getClaims() verifies the session JWT locally (no auth-server round trip)
    // when the project uses asymmetric signing keys; it falls back to getUser()
    // for symmetric keys. Safe here because proxy.ts middleware has already
    // validated and refreshed the session before this RSC renders — we only
    // need the user id (sub claim); the role still comes from the DB below.
    const [claimsResult, { storeData, bizData }] = await Promise.all([
        serverClient.auth.getClaims(),
        getLayoutSettings(),
    ]);
    const claims = claimsResult.data?.claims;
    const userId = claims?.sub as string | undefined;
    const storeSettings = storeData as { enable_custom_requests: boolean } | null;
    const businessSettings = bizData as { business_name: string } | null;

    if (!userId) {
        redirect("/admin/login");
    }

    let userRole: string | null = null;
    {
        const { data: profile } = await supabaseAdmin
            .from("profiles")
            .select("role")
            .eq("id", userId)
            .single();
        userRole = profile?.role ?? null;
    }

    const isAuthorized = ["admin", "owner", "sales_staff"].includes(userRole || "");
    if (!isAuthorized) redirect("/admin/login?error=unauthorized");

    if (userRole && ["owner", "sales_staff"].includes(userRole)) {
        logSignIn(userId, userRole).catch(() => {}); // fire-and-forget, don't block render
    }

    const isFullAccess = userRole === "admin" || userRole === "owner";
    const showCustomRequests = storeSettings?.enable_custom_requests ?? true;
    const businessName = businessSettings?.business_name ?? "Miss Tokyo";

    // Display name for the topbar comes from the JWT claims (email + user_metadata
    // are present on the Supabase access token) — no extra getUser round trip.
    const displayName = ((claims?.user_metadata as { full_name?: string } | undefined)?.full_name)
        || (claims?.email as string | undefined)
        || "Admin";
    const topbarUser = {
        name: displayName,
        initials: getInitials(displayName),
        role: userRole ?? "staff",
    };

    return (
        <>
            <AdminShellClient
                businessName={businessName}
                isFullAccess={isFullAccess}
                showCustomRequests={showCustomRequests}
                user={topbarUser}
            >
                {children}
            </AdminShellClient>
            <Toaster />
            <RealtimeStockMonitor />
        </>
    );
}
