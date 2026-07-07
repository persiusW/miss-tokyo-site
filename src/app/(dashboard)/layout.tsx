import { ReactNode } from "react";
import { redirect } from "next/navigation";
import { unstable_cache } from "next/cache";
import { Toaster } from "@/components/ui/miss-tokyo/Toaster";
import { RealtimeStockMonitor } from "@/components/ui/miss-tokyo/RealtimeStockMonitor";
import { AdminSidebar } from "@/components/ui/miss-tokyo/AdminSidebar";
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
    const userId = claimsResult.data?.claims?.sub as string | undefined;
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
    if (!isAuthorized) {
        redirect("/admin/login?error=unauthorized");
    }

    if (userRole && ["owner", "sales_staff"].includes(userRole)) {
        logSignIn(userId, userRole).catch(() => {}); // fire-and-forget, don't block render
    }

    const isFullAccess = userRole === "admin" || userRole === "owner";
    const showCustomRequests = storeSettings?.enable_custom_requests ?? true;
    const businessName = businessSettings?.business_name ?? "Miss Tokyo";

    return (
        <>
            <div className="h-screen overflow-hidden bg-neutral-50 font-sans flex text-neutral-900">
                <AdminSidebar
                    isFullAccess={isFullAccess}
                    showCustomRequests={showCustomRequests}
                    businessName={businessName}
                />

                {/* Main content — offset on mobile for the fixed top bar */}
                <main className="flex-1 min-w-0 overflow-y-auto w-full md:w-auto p-6 md:p-12 pt-20 md:pt-12">
                    <div className="max-w-7xl mx-auto">
                        {children}
                    </div>
                </main>
            </div>
            <Toaster />
            <RealtimeStockMonitor />
        </>
    );
}
