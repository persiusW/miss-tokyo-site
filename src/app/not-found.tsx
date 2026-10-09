import Link from "next/link";

export default function NotFound() {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-[#FAF9F6] px-6 text-center">
            <p className="text-[10px] uppercase tracking-[0.3em] text-neutral-400 mb-6">Miss Tokyo</p>
            <h1 className="font-serif text-3xl tracking-widest uppercase mb-4">Page not found</h1>
            <p className="text-neutral-500 text-sm max-w-md mb-8">We couldn&rsquo;t find that page.</p>
            <Link href="/" className="text-[11px] uppercase tracking-widest border-b border-black pb-1">Go to the homepage</Link>
        </div>
    );
}
