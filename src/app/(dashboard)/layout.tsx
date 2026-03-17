import Link from "next/link";
import { ReactNode } from "react";
import { LogoutButton } from "@/components/ui/badu/LogoutButton";
import { Toaster } from "@/components/ui/badu/Toaster";
import { RealtimeStockMonitor } from "@/components/ui/badu/RealtimeStockMonitor";
import { SidebarNavSection } from "@/components/ui/badu/SidebarNav";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { createClient } from "@/lib/supabaseServer";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
    // Fetch current user role + store settings in parallel
    const serverClient = await createClient();
    const [{ data: { user } }, { data: storeSettings }] = await Promise.all([
        serverClient.auth.getUser(),
        supabaseAdmin.from("store_settings").select("enable_custom_requests").eq("id", "default").single(),
    ]);

    let userRole: string | null = null;
    if (user) {
        const { data: profile } = await supabaseAdmin
            .from("profiles")
            .select("role")
            .eq("id", user.id)
            .single();
        userRole = profile?.role ?? null;
    }

    const isFullAccess = !userRole || userRole === "admin" || userRole === "owner";
    const showCustomRequests = storeSettings?.enable_custom_requests ?? true;

    const salesItems = [
        { label: "Orders",    href: "/sales/orders" },
        { label: "Analytics", href: "/sales/analytics" },
        { label: "Riders",    href: "/sales/riders" },
        ...(isFullAccess ? [{ label: "Wholesalers", href: "/sales/wholesalers" }] : []),
    ];

    const customerItems = [
        { label: "Contact List",     href: "/customers" },
        { label: "Abandoned Carts",  href: "/customers/abandoned" },
        ...(showCustomRequests ? [{ label: "Custom Requests", href: "/customers/requests" }] : []),
        { label: "Form Submissions", href: "/customers/forms" },
    ];

    return (
        <>
            <div className="min-h-screen bg-neutral-50 font-sans flex text-neutral-900">
                {/* Sidebar */}
                <aside className="w-64 border-r border-neutral-200 hidden md:flex flex-col h-screen sticky top-0 bg-white shadow-sm">
                    <div className="p-8 border-b border-neutral-100">
                        <Link href="/overview" className="font-serif text-2xl tracking-widest uppercase block text-neutral-900">
                            Miss Tokyo
                        </Link>
                        <span className="text-[10px] uppercase tracking-widest text-neutral-400 mt-2 block">Atelier Console</span>
                    </div>

                    <nav className="flex-1 overflow-y-auto py-6 px-2 space-y-6">
                        <SidebarNavSection title="Overview" items={[
                            { label: "Dashboard Home", href: "/overview" },
                        ]} />

                        <SidebarNavSection title="Sales" items={salesItems} />

                        <SidebarNavSection title="Catalog" items={[
                            { label: "Products",   href: "/catalog/products" },
                            { label: "Categories", href: "/catalog/categories" },
                            { label: "Discounts",  href: "/catalog/discounts" },
                            { label: "Gift Cards", href: "/catalog/gift-cards" },
                        ]} />

                        {isFullAccess && (
                            <SidebarNavSection title="Getting Paid" items={[
                                { label: "Invoices",  href: "/finance/invoices" },
                                { label: "Pay Links", href: "/finance/links" },
                            ]} />
                        )}

                        <SidebarNavSection title="Customers" items={customerItems} />

                        {isFullAccess && (
                            <SidebarNavSection title="Settings" items={[
                                { label: "Site Settings", href: "/settings" },
                            ]} />
                        )}
                    </nav>

                    <div className="p-4 border-t border-neutral-100 space-y-1">
                        <Link
                            href="/"
                            className="flex items-center px-4 py-2 text-sm text-neutral-400 hover:text-black rounded-lg hover:bg-neutral-50 transition-all duration-150"
                        >
                            &larr; Return to Storefront
                        </Link>
                        <LogoutButton />
                    </div>
                </aside>

                {/* Main */}
                <main className="flex-1 min-w-0 overflow-y-auto w-full md:w-auto p-6 md:p-12">
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
