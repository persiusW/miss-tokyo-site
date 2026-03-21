import Image from "next/image";

interface HeroProps {
    title: string;
    subtitle?: string;
    imageUrl: string;
    ctaText?: string;
    ctaLink?: string;
}

export function Hero({ title, subtitle, imageUrl, ctaText, ctaLink }: HeroProps) {
    return (
        <section className="relative min-h-[70vh] h-screen w-full flex items-center justify-center overflow-hidden">
            <div className="absolute inset-0 z-0">
                <Image
                    src={imageUrl}
                    alt={title}
                    fill
                    sizes="100vw"
                    className="object-cover object-center"
                    priority
                />
                <div className="absolute inset-0 bg-black/10" />
            </div>

            <div className="relative z-10 text-center text-white px-6">
                <h1 className="font-serif text-4xl md:text-6xl tracking-wider uppercase mb-6 drop-shadow-md">
                    {title}
                </h1>
                {subtitle && (
                    <p className="text-sm md:text-base text-white/90 font-light tracking-wide max-w-2xl mx-auto drop-shadow-sm mb-12">
                        {subtitle}
                    </p>
                )}
                {ctaText && ctaLink && (
                    <a 
                        href={ctaLink} 
                        className="inline-block bg-white text-black px-10 py-4 text-xs font-bold uppercase tracking-[0.2em] border border-white hover:bg-black hover:text-white transition-colors duration-300 rounded-none shadow-lg"
                    >
                        {ctaText}
                    </a>
                )}
            </div>
        </section>
    );
}
