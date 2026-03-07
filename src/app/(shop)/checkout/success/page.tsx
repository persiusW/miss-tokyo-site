import Link from "next/link";

export default function CheckoutSuccessPage({
    searchParams,
}: {
    searchParams: { reference?: string };
}) {
    const reference = searchParams.reference || "Unknown";

    return (
        <div className="min-h-[80vh] flex flex-col items-center justify-center px-6 text-center">
            <div className="max-w-xl mx-auto space-y-8">
                <h1 className="font-serif text-4xl md:text-5xl tracking-widest uppercase text-neutral-900">
                    Thank You
                </h1>

                <p className="text-xl text-neutral-600 font-serif italic mb-2">
                    Your order is being crafted with intention.
                </p>

                <p className="text-sm text-neutral-500 uppercase tracking-widest mb-12">
                    Order Reference: {reference}
                </p>

                <div className="pt-8 border-t border-neutral-200">
                    <Link
                        href="/shop"
                        className="inline-block border-b border-black text-xs uppercase tracking-widest pb-1 hover:text-neutral-500 transition-colors"
                    >
                        Return to Collection
                    </Link>
                </div>
            </div>
        </div>
    );
}
