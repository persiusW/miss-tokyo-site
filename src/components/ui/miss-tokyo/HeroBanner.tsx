import Link from "next/link";

interface HeroBannerProps {
  imageUrl?: string;
  title?: string;
  subtitle?: React.ReactNode;
}

export function HeroBanner({ 
    imageUrl = "/hero-banner.jpg", 
    title = "Curated", 
    subtitle = "Femininity" 
}: HeroBannerProps) {
  return (
    <section className="relative w-full h-[65vh] md:h-[80vh] overflow-hidden">
      {/* Background Image */}
      <div
        className="absolute inset-0 bg-center bg-cover bg-no-repeat grayscale-[0.3]"
        style={{ backgroundImage: `url('${imageUrl}')` }}
      />

      {/* High-end gradient overlay */}
      <div className="absolute inset-0 bg-black/40 md:bg-black/20" />
      <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-60" />

      {/* Content — perfectly centered on mobile, left-aligned on md+ */}
      <div className="relative z-10 h-full flex flex-col justify-center md:justify-end items-center text-center md:items-start md:text-left px-6 md:px-14 pb-12 md:pb-24">
        <h1 
          className="text-3xl sm:text-5xl md:text-7xl text-white uppercase tracking-tighter leading-none mb-8 max-w-2xl drop-shadow-2xl"
          style={{ fontFamily: "var(--font-cinzel), 'Cinzel', serif" }}
        >
          {title} <br /> {subtitle}
        </h1>
        <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
          <Link
            href="/shop"
            className="inline-block px-12 py-4 bg-white text-black text-[10px] uppercase tracking-[0.2em] font-bold hover:bg-black hover:text-white transition-all duration-500 rounded-none text-center"
          >
            The Collection
          </Link>
          <Link
            href="/shop?filter=new-arrivals"
            className="inline-block px-12 py-4 border border-white text-white text-[10px] uppercase tracking-[0.2em] font-bold bg-transparent hover:bg-white hover:text-black transition-all duration-500 rounded-none text-center"
          >
            New Arrivals
          </Link>
        </div>
      </div>
    </section>
  );
}

