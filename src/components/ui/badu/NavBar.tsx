import Link from "next/link";

export function NavBar() {
    return (
        <header className="h-16 w-full flex items-center justify-between px-6 md:px-12 bg-transparent absolute top-0 z-50">
            <Link href="/" className="font-serif text-2xl tracking-widest uppercase">
                BADU
            </Link>
            <nav className="space-x-8 text-sm tracking-widest uppercase hidden md:block">
                <Link href="/shop" className="hover:text-neutral-500 transition-colors">Shop</Link>
                <Link href="/gallery" className="hover:text-neutral-500 transition-colors">Gallery</Link>
                <Link href="/custom" className="hover:text-neutral-500 transition-colors">Custom</Link>
                <Link href="/craft" className="hover:text-neutral-500 transition-colors">Craft</Link>
                <Link href="/contact" className="hover:text-neutral-500 transition-colors">Contact</Link>
                <Link href="/faq" className="hover:text-neutral-500 transition-colors">FAQ</Link>
            </nav>
            <button className="md:hidden tracking-widest uppercase text-sm">
                Menu
            </button>
        </header>
    );
}
