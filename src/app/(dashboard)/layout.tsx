import { ReactNode } from "react";
import { redirect } from "next/navigation";
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

export default async function DashboardLayout({ children }: { children: ReactNode }) {
    const serverClient = await createClient();
    const [{ data: { user } }, storeData, bizData] = await Promise.all([
        serverClient.auth.getUser(),
        safeQuery(() => supabaseAdmin.from("store_settings").select("enable_custom_requests").eq("id", "default").single()),
        safeQuery(() => supabaseAdmin.from("business_settings").select("business_name").eq("id", "default").single()),
    ]);
    const storeSettings = storeData as { enable_custom_requests: boolean } | null;
    const businessSettings = bizData as { business_name: string } | null;

    if (!user) redirect("/admin/login");

    const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();
    const userRole = profile?.role ?? null;

    const isAuthorized = ["admin", "owner", "sales_staff"].includes(userRole || "");
    if (!isAuthorized) redirect("/admin/login?error=unauthorized");

    if (userRole && ["owner", "sales_staff"].includes(userRole)) {
        logSignIn(user.id, userRole).catch(() => {});
    }

    const isFullAccess = userRole === "admin" || userRole === "owner";
    const showCustomRequests = storeSettings?.enable_custom_requests ?? true;
    const businessName = businessSettings?.business_name ?? "Miss Tokyo";

    const displayName = (user.user_metadata?.full_name as string | undefined) || user.email || "Admin";
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
