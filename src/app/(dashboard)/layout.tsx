import { ReactNode } from "react";
import { redirect } from "next/navigation";
import { unstable_cache } from "next/cache";
import "./admin.css";
import { Toaster } from "@/components/ui/miss-tokyo/Toaster";
import { ErrorNet } from "@/components/errors/ErrorNet";
import { RealtimeStockMonitor } from "@/components/ui/miss-tokyo/RealtimeStockMonitor";
import { AdminShellClient } from "@/components/ui/miss-tokyo/AdminShellClient";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { createClient } from "@/lib/supabaseServer";
import { logSignIn } from "@/lib/utils/logSignIn";
import { AdminV2Shell } from "@/components/admin/shell/AdminV2Shell";
import { v2FontClass } from "@/components/admin/shell/fonts";
import { v2View } from "@/lib/admin/v2/server";
import "@/components/admin/ui/admin-v2.css";

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

    // Two-step sign-in (Settings › Your account): someone who turned it on must
    // enter their code before the admin opens. Read from the session cookie, so
    // there's no extra round trip, and only checked while the session is aal1.
    if (claims?.aal === "aal1") {
        const { data: aal } = await serverClient.auth.mfa.getAuthenticatorAssuranceLevel().catch(() => ({ data: null }));
        if (aal?.nextLevel === "aal2" && aal.currentLevel !== "aal2") redirect("/auth/two-step");
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

    // Admin v2: the new shell renders for everyone once the store switch is on,
    // or on a device that's previewing it. Old pages not yet rebuilt render
    // inside it unchanged (their --ac-* tokens are mapped to the new ones).
    const view = await v2View();
    if (view.shell) {
        return (
            <>
                <AdminV2Shell
                    businessName={businessName}
                    role={(userRole ?? "sales_staff") as "admin" | "owner" | "sales_staff"}
                    user={{ name: displayName, email: (claims?.email as string | undefined) ?? null }}
                    showCustomRequests={showCustomRequests}
                    previewOnly={view.preview}
                    fontClass={v2FontClass}
                >
                    {children}
                </AdminV2Shell>
                <ErrorNet />
                <RealtimeStockMonitor />
            </>
        );
    }

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
            <ErrorNet />
            <RealtimeStockMonitor />
        </>
    );
}
