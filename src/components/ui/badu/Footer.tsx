import Link from "next/link";

export function Footer() {
    return (
        <footer className="w-full bg-white px-6 py-16 md:px-12 md:py-24 mt-24">
            <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12">
                <div className="col-span-1 md:col-span-2">
                    <h3 className="font-serif text-3xl tracking-widest uppercase mb-6">BADU</h3>
                    <p className="max-w-sm text-neutral-600 leading-relaxed text-sm">
                        Minimalist luxury footwear, handmade in Ghana. We believe in visual silence and uncompromised quality.
                    </p>
                </div>

                <div>
                    <h4 className="text-xs uppercase tracking-widest font-semibold mb-6">Explore</h4>
                    <ul className="space-y-4 text-sm text-neutral-600">
                        <li><Link href="/shop" className="hover:text-black transition-colors">The Collection</Link></li>
                        <li><Link href="/custom" className="hover:text-black transition-colors">Custom Orders</Link></li>
                        <li><Link href="/craft" className="hover:text-black transition-colors">The Craft</Link></li>
                    </ul>
                </div>

                <div>
                    <h4 className="text-xs uppercase tracking-widest font-semibold mb-6">Support</h4>
                    <ul className="space-y-4 text-sm text-neutral-600">
                        <li><Link href="/faq" className="hover:text-black transition-colors">FAQ</Link></li>
                        <li><Link href="/shipping" className="hover:text-black transition-colors">Shipping & Returns</Link></li>
                        <li><Link href="/contact" className="hover:text-black transition-colors">Contact Us</Link></li>
                    </ul>
                </div>
            </div>

            <div className="max-w-7xl mx-auto mt-24 pt-8 border-t border-neutral-200 flex flex-col md:flex-row justify-between items-center text-xs text-neutral-400">
                <p>&copy; {new Date().getFullYear()} BADU. All rights reserved.</p>
                <div className="space-x-6 mt-4 md:mt-0">
                    <Link href="/privacy" className="hover:text-neutral-600">Privacy Policy</Link>
                    <Link href="/terms" className="hover:text-neutral-600">Terms of Service</Link>
                </div>
            </div>
        </footer>
    );
}
