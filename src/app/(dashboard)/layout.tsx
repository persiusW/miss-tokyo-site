import Link from "next/link";
import { ReactNode } from "react";
import { LogoutButton } from "@/components/ui/badu/LogoutButton";
import { Toaster } from "@/components/ui/badu/Toaster";

type NavItem = { label: string; href: string };
type NavSection = { title: string; items: NavItem[] };

const NAV: NavSection[] = [
    {
        title: "Overview",
        items: [
            { label: "Dashboard Home", href: "/overview" },
        ],
    },
    {
        title: "Sales",
        items: [
            { label: "Orders", href: "/sales/orders" },
            { label: "Payments", href: "/sales/payments" },
            { label: "Analytics", href: "/sales/analytics" },
        ],
    },
    {
        title: "Catalog",
        items: [
            { label: "Products", href: "/catalog/products" },
            { label: "Categories", href: "/catalog/categories" },
        ],
    },
    {
        title: "Getting Paid",
        items: [
            { label: "Invoices", href: "/finance/invoices" },
            { label: "Pay Links", href: "/finance/links" },
        ],
    },
    {
        title: "Customers",
        items: [
            { label: "Contact List", href: "/customers" },
            { label: "Custom Requests", href: "/customers/requests" },
            { label: "Form Submissions", href: "/customers/forms" },
        ],
    },
    {
        title: "Brand & Growth",
        items: [
            { label: "Site Assets", href: "/assets" },
        ],
    },
    {
        title: "Settings",
        items: [
            { label: "Site Settings", href: "/settings" },
        ],
    },
];

export default function DashboardLayout({ children }: { children: ReactNode }) {
    return (
        <>
            <div className="min-h-screen bg-creme font-sans flex text-neutral-900">
                {/* Sidebar */}
                <aside className="w-64 border-r border-neutral-200 hidden md:flex flex-col h-screen sticky top-0 bg-white">
                    <div className="p-8 border-b border-neutral-200">
                        <Link href="/overview" className="font-serif text-2xl tracking-widest uppercase block">
                            Badu
                        </Link>
                        <span className="text-[10px] uppercase tracking-widest text-neutral-400 mt-2 block">Atelier Console</span>
                    </div>

                    <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-8">
                        {NAV.map((section) => (
                            <div key={section.title}>
                                <h3 className="text-[10px] font-semibold uppercase tracking-widest text-neutral-400 mb-3 px-4">
                                    {section.title}
                                </h3>
                                <ul className="space-y-1 text-sm text-neutral-600">
                                    {section.items.map((item) => (
                                        <li key={item.href}>
                                            <Link
                                                href={item.href}
                                                className="block px-4 py-2 hover:bg-neutral-50 hover:text-black rounded transition-colors"
                                            >
                                                {item.label}
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </nav>

                    <div className="p-4 border-t border-neutral-200 space-y-1">
                        <Link href="/" className="block px-4 py-2 text-sm text-neutral-500 hover:text-black transition-colors">
                            &larr; Return to Storefront
                        </Link>
                        <LogoutButton />
                    </div>
                </aside>

                {/* Main */}
                <main className="flex-1 min-w-0 overflow-y-auto w-full md:w-auto p-6 md:p-12">
                    <div className="max-w-6xl mx-auto">
                        {children}
                    </div>
                </main>
            </div>
            <Toaster />
        </>
    );
}
