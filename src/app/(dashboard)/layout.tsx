import Link from "next/link";
import { ReactNode } from "react";

export default function DashboardLayout({ children }: { children: ReactNode }) {
    return (
        <div className="min-h-screen bg-creme font-sans flex text-neutral-900">
            {/* Sidebar Area */}
            <aside className="w-64 border-r border-neutral-200 hidden md:flex flex-col h-screen sticky top-0 bg-white">
                <div className="p-8 border-b border-neutral-200">
                    <Link href="/overview" className="font-serif text-2xl tracking-widest uppercase block">
                        Badu
                    </Link>
                    <span className="text-[10px] uppercase tracking-widest text-neutral-400 mt-2 block">Atelier Console</span>
                </div>

                <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-8">
                    <div>
                        <h3 className="text-[10px] font-semibold uppercase tracking-widest text-neutral-400 mb-3 px-4">Overview</h3>
                        <ul className="space-y-1 text-sm text-neutral-600">
                            <li>
                                <Link href="/overview" className="block px-4 py-2 hover:bg-neutral-50 hover:text-black rounded transition-colors">
                                    Dashboard Home
                                </Link>
                            </li>
                        </ul>
                    </div>

                    <div>
                        <h3 className="text-[10px] font-semibold uppercase tracking-widest text-neutral-400 mb-3 px-4">Sales</h3>
                        <ul className="space-y-1 text-sm text-neutral-600">
                            <li>
                                <span className="block px-4 py-2 opacity-50 cursor-not-allowed">Orders</span>
                            </li>
                            <li>
                                <span className="block px-4 py-2 opacity-50 cursor-not-allowed">Payments</span>
                            </li>
                            <li>
                                <span className="block px-4 py-2 opacity-50 cursor-not-allowed">Analytics</span>
                            </li>
                        </ul>
                    </div>

                    <div>
                        <h3 className="text-[10px] font-semibold uppercase tracking-widest text-neutral-400 mb-3 px-4">Catalog</h3>
                        <ul className="space-y-1 text-sm text-neutral-600">
                            <li>
                                <Link href="/catalog/products" className="block px-4 py-2 hover:bg-neutral-50 hover:text-black rounded transition-colors">
                                    Products
                                </Link>
                            </li>
                            <li>
                                <span className="block px-4 py-2 opacity-50 cursor-not-allowed">Categories</span>
                            </li>
                        </ul>
                    </div>

                    <div>
                        <h3 className="text-[10px] font-semibold uppercase tracking-widest text-neutral-400 mb-3 px-4">Getting Paid</h3>
                        <ul className="space-y-1 text-sm text-neutral-600">
                            <li>
                                <span className="block px-4 py-2 opacity-50 cursor-not-allowed">Invoices</span>
                            </li>
                        </ul>
                    </div>

                    <div>
                        <h3 className="text-[10px] font-semibold uppercase tracking-widest text-neutral-400 mb-3 px-4">Customers</h3>
                        <ul className="space-y-1 text-sm text-neutral-600">
                            <li>
                                <span className="block px-4 py-2 opacity-50 cursor-not-allowed">Contact List</span>
                            </li>
                            <li>
                                <Link href="/customers/requests" className="block px-4 py-2 hover:bg-neutral-50 hover:text-black rounded transition-colors">
                                    Custom Requests
                                </Link>
                            </li>
                        </ul>
                    </div>
                </nav>

                <div className="p-4 border-t border-neutral-200">
                    <Link href="/" className="block px-4 py-2 text-sm text-neutral-500 hover:text-black transition-colors">
                        &larr; Return to Storefront
                    </Link>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 min-w-0 overflow-y-auto w-full md:w-auto p-6 md:p-12">
                <div className="max-w-6xl mx-auto">
                    {children}
                </div>
            </main>
        </div>
    );
}
