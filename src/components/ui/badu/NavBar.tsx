"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { X, Search } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { CartButton } from "./CartButton";
import { supabase } from "@/lib/supabase";

const NAV_LINKS = [
    { href: "/",             label: "Home",         navKey: "nav_show_home" },
    { href: "/shop",         label: "Shop",         navKey: "nav_show_shop" },
    { href: "/sale",         label: "Sale",         navKey: null },
    { href: "/dresses",      label: "Dresses",      navKey: null },
    { href: "/new-arrivals", label: "New Arrivals", navKey: "nav_show_new_arrivals" },
    { href: "/gift-cards",   label: "Gift Cards",   navKey: "nav_show_gift_card" },
    { href: "/contact",      label: "CONTACT",      navKey: "nav_show_contact" },
    { href: "/about",        label: "ABOUT",        navKey: "nav_show_about" },
];

const TRENDING_SEARCHES = ["DRESSES", "NEW ARRIVALS", "SALE", "BLACK"];

export function NavBar() {
    const [menuOpen, setMenuOpen] = useState(false);
    const [searchOpen, setSearchOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [navVisible, setNavVisible] = useState(true);
    const lastScrollY = useRef(0);
    const [navSettings, setNavSettings] = useState({
        nav_show_home: true,
        nav_show_shop: true,
        nav_show_new_arrivals: true,
        nav_show_gift_card: true,
        nav_show_contact: true,
        nav_show_about: true,
    });
    const pathname = usePathname();
    const router = useRouter();

    useEffect(() => {
        supabase.auth.getUser().then(({ data: { user } }) => setIsLoggedIn(!!user));
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
            setIsLoggedIn(!!session?.user);
        });
        return () => subscription.unsubscribe();
    }, []);

    useEffect(() => {
        supabase
            .from("site_settings")
            .select("nav_show_home, nav_show_shop, nav_show_new_arrivals, nav_show_gift_card, nav_show_contact, nav_show_about")
            .eq("id", "singleton")
            .single()
            .then(({ data }) => {
                if (data) setNavSettings(data);
            });
    }, []);

    // Hide on scroll down, show on scroll up
    useEffect(() => {
        const onScroll = () => {
            const currentY = window.scrollY;
            const prev = lastScrollY.current;
            if (currentY < 10) {
                setNavVisible(true);
            } else if (currentY > prev + 6) {
                setNavVisible(false);
            } else if (currentY < prev - 6) {
                setNavVisible(true);
            }
            lastScrollY.current = currentY;
        };
        window.addEventListener("scroll", onScroll, { passive: true });
        return () => window.removeEventListener("scroll", onScroll);
    }, []);

    // Prevent body scroll when menu or search is open
    useEffect(() => {
        if (menuOpen || searchOpen) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "";
        }
        return () => { document.body.style.overflow = ""; };
    }, [menuOpen, searchOpen]);

    const handleSearch = (query: string) => {
        if (query.trim()) {
            router.push(`/search?q=${encodeURIComponent(query.trim())}`);
            setSearchOpen(false);
            setSearchQuery("");
        }
    };

    return (
        <>
            <header className={`h-20 w-full flex items-center justify-between px-6 md:px-12 bg-black text-white fixed top-0 left-0 z-50 border-b border-gray-900 shadow-sm transition-transform duration-300 ease-in-out ${navVisible ? "translate-y-0" : "-translate-y-full"}`}>
                <Link href="/" className="font-serif text-2xl md:text-3xl tracking-[0.15em] uppercase hover:opacity-80 transition-opacity">
                    MISS TOKYO
                </Link>

                <nav className="space-x-4 lg:space-x-8 text-[10px] md:text-xs tracking-[0.2em] font-medium uppercase hidden xl:block">
                    {NAV_LINKS.filter(l => !l.navKey || navSettings[l.navKey as keyof typeof navSettings]).map(l => {
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
                        {isLoggedIn ? (
                            <Link href="/account/orders" className="flex items-center gap-2 hover:text-neutral-400">
                                Account
                            </Link>
                        ) : (
                            <Link href="/login" className="flex items-center gap-2 hover:text-neutral-400">
                                Log In
                            </Link>
                        )}
                    </div>
                    
                    <button 
                        onClick={() => setSearchOpen(true)}
                        className="hover:text-neutral-400 transition-colors" 
                        aria-label="Toggle Search"
                    >
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

            {/* Premium Full-Screen Search Modal */}
            <AnimatePresence>
                {searchOpen && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[200] bg-white text-black flex flex-col justify-center items-center px-6"
                    >
                        <button 
                            onClick={() => setSearchOpen(false)}
                            className="absolute top-6 right-6 md:top-12 md:right-12 hover:rotate-90 transition-transform duration-500"
                            aria-label="Close Search"
                        >
                            <X size={32} strokeWidth={1} />
                        </button>

                        <div className="w-full max-w-4xl animate-in fade-in slide-in-from-bottom-8 duration-700">
                            <form 
                                onSubmit={(e) => {
                                    e.preventDefault();
                                    handleSearch(searchQuery);
                                }}
                            >
                                <input
                                    autoFocus
                                    type="text"
                                    placeholder="SEARCH ARCHIVE..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full bg-transparent border-b-2 border-black text-2xl md:text-5xl uppercase tracking-[0.1em] md:tracking-[0.2em] text-center py-6 focus:outline-none rounded-none placeholder:text-neutral-200 mt-[-10vh]"
                                />
                            </form>

                            <div className="mt-12 text-center">
                                <h3 className="text-[10px] uppercase tracking-[0.4em] text-neutral-400 font-bold mb-6">Trending Searches</h3>
                                <div className="flex flex-wrap justify-center gap-x-8 gap-y-4">
                                    {TRENDING_SEARCHES.map(term => (
                                        <button
                                            key={term}
                                            onClick={() => handleSearch(term)}
                                            className="text-[11px] md:text-xs uppercase tracking-[0.3em] font-medium hover:text-neutral-400 transition-colors border-b border-transparent hover:border-neutral-400 pb-1"
                                        >
                                            {term}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

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
                        {NAV_LINKS.filter(l => !l.navKey || navSettings[l.navKey as keyof typeof navSettings]).map(l => (
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
