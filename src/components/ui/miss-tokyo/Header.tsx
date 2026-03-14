"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { User, Search, ShoppingBag, Menu, X } from "lucide-react";
import { useCart } from "@/store/useCart";
import { CartDrawer } from "./CartDrawer";
import { SearchModal } from "./SearchModal";

const NAV_LINKS = [
  { label: "Home", href: "/" },
  { label: "Shop", href: "/shop" },
  { label: "Sale", href: "/shop?filter=sale" },
  { label: "Dresses", href: "/shop?filter=dresses" },
  { label: "New Arrivals", href: "/shop?filter=new-arrivals" },
  { label: "Gift Card", href: "/gift-card" },
  { label: "Contact", href: "/contact" },
  { label: "About", href: "/about" },
];

export function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const totalItems = useCart((s) => s.totalItems());
  const setCartOpen = useCart((s) => s.setIsOpen);
  const cartOpen = useCart((s) => s.isOpen);

  useEffect(() => {
    setMounted(true);
    const fetchLogo = async () => {
        const { createClient } = await import("@/lib/supabaseBrowser");
        const supabase = createClient();
        const { data } = await supabase.from("business_settings").select("logo_url").eq("id", 1).single();
        if (data?.logo_url) setLogoUrl(data.logo_url);
    };
    fetchLogo();
  }, []);

  return (
    <>
      {/* ── Main Header ── */}
      <header className="sticky top-0 z-50 bg-black border-b border-gray-800">
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          {/* Logo */}
          <Link
            href="/"
            className="flex items-center gap-2 text-xl sm:text-2xl tracking-widest uppercase shrink-0 text-white font-bold"
            style={{ fontFamily: "var(--font-cinzel), 'Cinzel', Georgia, serif" }}
          >
            {logoUrl ? (
                <img src={logoUrl} alt="Miss Tokyo" className="h-8 w-auto object-contain" />
            ) : (
                "Miss Tokyo"
            )}
          </Link>

          {/* Desktop Nav — Arial, bold */}
          <nav className="hidden lg:flex items-center gap-5 xl:gap-7">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-[11px] uppercase tracking-wider text-gray-300 hover:text-white transition-colors whitespace-nowrap font-bold"
                style={{ fontFamily: "Arial, 'Helvetica Neue', sans-serif" }}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Right Icons */}
          <div className="flex items-center gap-4 shrink-0">
            <Link
              href="/account"
              className="hidden sm:flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-gray-300 hover:text-white transition-colors"
            >
              <User size={16} strokeWidth={1.5} />
              Log In
            </Link>

            {/* Search */}
            <button
              aria-label="Search"
              onClick={() => setSearchOpen(true)}
              className="text-gray-300 hover:text-white transition-colors"
            >
              <Search size={20} strokeWidth={1.5} />
            </button>

            {/* Cart */}
            <button
              aria-label="Cart"
              onClick={() => setCartOpen(true)}
              className="relative text-gray-300 hover:text-white transition-colors"
            >
              <ShoppingBag size={20} strokeWidth={1.5} />
              {mounted && totalItems > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-white text-black text-[9px] w-4 h-4 rounded-full flex items-center justify-center font-sans font-bold">
                  {totalItems > 9 ? "9+" : totalItems}
                </span>
              )}
            </button>

            {/* Hamburger */}
            <button
              aria-label="Open menu"
              className="lg:hidden text-gray-300 hover:text-white transition-colors"
              onClick={() => setMobileOpen(true)}
            >
              <Menu size={22} strokeWidth={1.5} />
            </button>
          </div>
        </div>
      </header>

      {/* ── Mobile Drawer ── */}
      {mobileOpen && (
        <div className="fixed inset-0 z-[100] flex">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMobileOpen(false)} />
          <div className="relative ml-auto w-72 max-w-full bg-black h-full flex flex-col shadow-xl border-l border-gray-800">
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-800">
              <span className="font-serif text-xl tracking-widest uppercase text-white">
                Miss Tokyo
              </span>
              <button aria-label="Close" onClick={() => setMobileOpen(false)} className="text-gray-400 hover:text-white">
                <X size={22} strokeWidth={1.5} />
              </button>
            </div>
            <nav className="flex flex-col py-6 px-6 gap-5 overflow-y-auto">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className="text-sm uppercase tracking-widest text-gray-300 hover:text-white transition-colors"
                >
                  {link.label}
                </Link>
              ))}
              <Link
                href="/account"
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-2 text-sm uppercase tracking-widest text-gray-300 hover:text-white transition-colors mt-4 border-t border-gray-800 pt-6"
              >
                <User size={16} strokeWidth={1.5} />
                Account
              </Link>
            </nav>
          </div>
        </div>
      )}

      {/* ── Cart Drawer ── */}
      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />

      {/* ── Search Modal ── */}
      <SearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}
