import Image from "next/image";
import Link from "next/link";

interface HeroSectionProps {
    title: string;
    imageUrl: string;
    ctaText?: string;
    ctaLink?: string;
}

const FALLBACK = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Crect width='100' height='100' fill='%23111'/%3E%3C/svg%3E";

export function HeroSection({ title, imageUrl, ctaText, ctaLink }: HeroSectionProps) {
    return (
        <section className="relative w-full h-screen overflow-hidden">
            <Image
                src={imageUrl || FALLBACK}
                alt={title}
                fill
                priority
                className="object-cover object-center"
            />
            {/* Dark overlay for text legibility */}
            <div className="absolute inset-0 bg-black/20" />

            {/* Centered content */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6 z-10">
                <h1 className="font-serif text-5xl md:text-7xl text-white uppercase tracking-widest drop-shadow-lg">
                    {title}
                </h1>
                {ctaText && ctaLink && (
                    <Link
                        href={ctaLink}
                        className="mt-8 bg-white text-black px-8 py-4 text-xs font-bold uppercase tracking-[0.2em] hover:bg-black hover:text-white transition-colors duration-300 rounded-none"
                    >
                        {ctaText}
                    </Link>
                )}
            </div>
        </section>
    );
}
