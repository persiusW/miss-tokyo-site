"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { X, Search } from "lucide-react";
import { CartButton } from "./CartButton";

const NAV_LINKS = [
    { href: "/",            label: "Home" },
    { href: "/shop",        label: "Shop" },
    { href: "/sale",        label: "Sale" },
    { href: "/dresses",     label: "Dresses" },
    { href: "/new-arrivals",label: "New Arrivals" },
    { href: "/gift-card",   label: "Gift Card" },
    { href: "/contact",     label: "CONTACT" },
    { href: "/about",       label: "ABOUT" },
];

export function NavBar() {
    const [menuOpen, setMenuOpen] = useState(false);
    const pathname = usePathname();

    // Prevent body scroll when menu is open
    useEffect(() => {
        if (menuOpen) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "";
        }
        return () => { document.body.style.overflow = ""; };
    }, [menuOpen]);

    return (
        <>
            <header className="h-20 w-full flex items-center justify-between px-6 md:px-12 bg-black text-white sticky top-0 z-50 rounded-none border-b border-gray-900 shadow-sm">
                <Link href="/" className="font-serif text-2xl md:text-3xl tracking-[0.15em] uppercase hover:opacity-80 transition-opacity">
                    MISS TOKYO
                </Link>

                <nav className="space-x-4 lg:space-x-8 text-[10px] md:text-xs tracking-[0.2em] font-medium uppercase hidden xl:block">
                    {NAV_LINKS.map(l => {
                        const isActive = pathname === l.href;
                        return (
                            <Link 
                                key={l.href} 
                                href={l.href} 
                                className={`transition-colors hover:text-neutral-400 pb-1 ${
                                    isActive 
                                    ? "underline underline-offset-8 decoration-1" 
                                    : "border-b border-transparent hover:border-white"
                                }`}
                            >
                                {l.label}
                            </Link>
                        );
                    })}
                </nav>

                <div className="flex items-center gap-6">
                    <div className="hidden md:flex items-center gap-6 text-[11px] uppercase tracking-[0.2em] font-medium mr-4">
                        <Link href="/login" className="flex items-center gap-2 hover:text-neutral-400">
                             Log In
                        </Link>
                    </div>
                    
                    <button className="hover:text-neutral-400 transition-colors" aria-label="Search">
                        <Search size={20} strokeWidth={1.5} />
                    </button>
                    
                    <CartButton />

                    <button
                        onClick={() => setMenuOpen(true)}
                        aria-label="Open navigation menu"
                        className="xl:hidden flex flex-col justify-center items-end gap-[6px] w-8 h-8 rounded-none"
                    >
                        <span className="block w-6 h-[1px] bg-white transition-all" />
                        <span className="block w-4 h-[1px] bg-white transition-all" />
                    </button>
                </div>
            </header>

            {/* Full-screen mobile overlay */}
            {menuOpen && (
                <div className="fixed inset-0 z-[100] bg-black text-white flex flex-col xl:hidden animate-in fade-in duration-500">
                    {/* Top bar */}
                    <div className="flex items-center justify-between px-6 h-20 flex-shrink-0 border-b border-gray-900">
                        <Link
                            href="/"
                            onClick={() => setMenuOpen(false)}
                            className="font-serif text-2xl tracking-[0.15em] uppercase"
                        >
                            MISS TOKYO
                        </Link>
                        <button
                            onClick={() => setMenuOpen(false)}
                            aria-label="Close navigation menu"
                            className="flex items-center justify-center w-10 h-10 -mr-2 rounded-none"
                        >
                            <X size={24} className="stroke-[1.5px]" />
                        </button>
                    </div>

                    {/* Links */}
                    <nav className="flex-1 flex flex-col items-center justify-center gap-6 pb-16 px-6 overflow-y-auto">
                        {NAV_LINKS.map(l => (
                            <Link
                                key={l.href}
                                href={l.href}
                                onClick={() => setMenuOpen(false)}
                                className={`font-serif text-3xl sm:text-4xl tracking-[0.1em] uppercase hover:text-neutral-400 transition-colors py-2 ${
                                    pathname === l.href ? "text-white" : "text-neutral-500"
                                }`}
                            >
                                {l.label}
                            </Link>
                        ))}
                    </nav>
                </div>
            )}
        </>
    );
}
