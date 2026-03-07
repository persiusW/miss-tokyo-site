import Link from "next/link";

export default function CheckoutCancelPage() {
    return (
        <div className="min-h-[80vh] flex flex-col items-center justify-center px-6 text-center">
            <div className="max-w-xl mx-auto space-y-8">
                <h1 className="font-serif text-3xl md:text-4xl tracking-widest uppercase text-neutral-900">
                    Checkout Incomplete
                </h1>

                <p className="text-neutral-600 leading-relaxed mb-12">
                    Your transaction was cancelled or could not be completed. If you experienced an issue, our atelier is here to help.
                </p>

                <div className="pt-8 border-t border-neutral-200 flex flex-col sm:flex-row items-center justify-center gap-6">
                    <Link
                        href="/shop"
                        className="inline-block px-8 py-4 bg-black text-white text-xs uppercase tracking-widest hover:bg-neutral-800 transition-colors"
                    >
                        Return to Collection
                    </Link>
                    <span className="text-neutral-300 hidden sm:inline">|</span>
                    <Link
                        href="/contact"
                        className="inline-block border-b border-black text-xs uppercase tracking-widest pb-1 hover:text-neutral-500 transition-colors"
                    >
                        Contact Support
                    </Link>
                </div>
            </div>
        </div>
    );
}
