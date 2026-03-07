import Image from "next/image";

interface HeroProps {
    title: string;
    subtitle?: string;
    imageUrl: string;
}

export function Hero({ title, subtitle, imageUrl }: HeroProps) {
    return (
        <section className="relative h-screen w-full flex items-center justify-center overflow-hidden">
            <div className="absolute inset-0 z-0">
                <Image
                    src={imageUrl}
                    alt={title}
                    fill
                    className="object-cover object-center"
                    priority
                />
                <div className="absolute inset-0 bg-black/10" />
            </div>

            <div className="relative z-10 text-center text-white px-6">
                <h1 className="font-serif text-5xl md:text-7xl lg:text-8xl tracking-widest uppercase mb-6 drop-shadow-sm">
                    {title}
                </h1>
                {subtitle && (
                    <p className="text-sm md:text-base tracking-[0.2em] uppercase max-w-2xl mx-auto drop-shadow-sm">
                        {subtitle}
                    </p>
                )}
            </div>
        </section>
    );
}
