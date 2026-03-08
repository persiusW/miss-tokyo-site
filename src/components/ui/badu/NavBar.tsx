"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import { CartButton } from "./CartButton";

const NAV_LINKS = [
    { href: "/shop",        label: "Shop" },
    { href: "/gallery",     label: "Gallery" },
    { href: "/whitelabel",  label: "White Labelling" },
    { href: "/craft",       label: "Craft" },
    { href: "/contact",     label: "Contact" },
    { href: "/faq",         label: "FAQ" },
];

export function NavBar() {
    const [menuOpen, setMenuOpen] = useState(false);

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
            <header className="h-16 w-full flex items-center justify-between px-6 md:px-12 bg-white border-b border-neutral-200 sticky top-0 z-50">
                <Link href="/" className="font-serif text-2xl tracking-widest uppercase">
                    BADU
                </Link>

                <nav className="space-x-8 text-sm tracking-widest uppercase hidden md:block">
                    {NAV_LINKS.map(l => (
                        <Link key={l.href} href={l.href} className="hover:text-neutral-500 transition-colors">
                            {l.label}
                        </Link>
                    ))}
                </nav>

                <div className="flex items-center gap-4">
                    <CartButton />
                    {/* Hamburger — mobile only */}
                    <button
                        onClick={() => setMenuOpen(true)}
                        aria-label="Open navigation menu"
                        className="md:hidden flex flex-col justify-center items-end gap-[5px] w-10 h-10 -mr-2"
                    >
                        <span className="block w-6 h-px bg-current transition-all" />
                        <span className="block w-4 h-px bg-current transition-all" />
                    </button>
                </div>
            </header>

            {/* Full-screen mobile overlay */}
            {menuOpen && (
                <div className="fixed inset-0 z-[100] bg-white flex flex-col md:hidden">
                    {/* Top bar */}
                    <div className="flex items-center justify-between px-6 h-16 flex-shrink-0">
                        <Link
                            href="/"
                            onClick={() => setMenuOpen(false)}
                            className="font-serif text-2xl tracking-widest uppercase"
                        >
                            BADU
                        </Link>
                        <button
                            onClick={() => setMenuOpen(false)}
                            aria-label="Close navigation menu"
                            className="flex items-center justify-center w-10 h-10 -mr-2"
                        >
                            <X size={22} />
                        </button>
                    </div>

                    {/* Links */}
                    <nav className="flex-1 flex flex-col items-center justify-center gap-8 pb-16 px-6">
                        {NAV_LINKS.map(l => (
                            <Link
                                key={l.href}
                                href={l.href}
                                onClick={() => setMenuOpen(false)}
                                className="font-serif text-4xl sm:text-5xl tracking-widest uppercase text-neutral-900 hover:text-neutral-400 transition-colors"
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
