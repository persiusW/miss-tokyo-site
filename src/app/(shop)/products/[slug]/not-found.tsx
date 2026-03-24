export const revalidate = 300; // cache product 404s at CDN for 5 min

export default function ProductNotFound() {
    return (
        <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-6">
            <p className="font-serif text-2xl tracking-widest uppercase mb-4">Product Not Found</p>
            <p className="text-neutral-500 text-sm mb-8">
                This item may no longer be available or the link may have changed.
            </p>
            <a
                href="/shop"
                className="text-xs uppercase tracking-widest border-b border-black pb-1 hover:text-neutral-600 transition-colors"
            >
                Continue Shopping
            </a>
        </div>
    );
}
