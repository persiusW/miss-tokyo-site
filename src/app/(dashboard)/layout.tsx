import { ReactNode } from "react";
import { redirect } from "next/navigation";
import { Toaster } from "@/components/ui/miss-tokyo/Toaster";
import { RealtimeStockMonitor } from "@/components/ui/miss-tokyo/RealtimeStockMonitor";
import { AdminSidebar } from "@/components/ui/miss-tokyo/AdminSidebar";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { createClient } from "@/lib/supabaseServer";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
    const serverClient = await createClient();
    const [{ data: { user } }, { data: storeSettings }, { data: businessSettings }] = await Promise.all([
        serverClient.auth.getUser(),
        supabaseAdmin.from("store_settings").select("enable_custom_requests").eq("id", "default").single(),
        supabaseAdmin.from("business_settings").select("business_name").eq("id", "default").single(),
    ]);

    if (!user) {
        redirect("/admin/login");
    }

    let userRole: string | null = null;
    if (user) {
        const { data: profile } = await supabaseAdmin
            .from("profiles")
            .select("role")
            .eq("id", user.id)
            .single();
        userRole = profile?.role ?? null;
    }

    const isAuthorized = ["admin", "owner", "sales_staff"].includes(userRole || "");
    if (!isAuthorized) {
        redirect("/admin/login?error=unauthorized");
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
