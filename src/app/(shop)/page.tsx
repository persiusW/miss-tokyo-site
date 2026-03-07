import { Hero } from "@/components/ui/badu/Hero";
import { ProductCard } from "@/components/ui/badu/ProductCard";

const MOCK_PRODUCTS = [
    {
        slug: "badu-slide-01",
        name: "Badu Slide 01",
        price: "300 GHS",
        imageUrl: "https://images.unsplash.com/photo-1560343090-f0409e92791a?auto=format&fit=crop&q=80&w=1000",
        category: "Mens",
    },
    {
        slug: "badu-slide-02",
        name: "Classic Loafer",
        price: "450 GHS",
        imageUrl: "https://images.unsplash.com/photo-1620809311313-059ad8a38ae1?auto=format&fit=crop&q=80&w=1000",
        category: "Unisex",
    },
    {
        slug: "badu-slide-03",
        name: "Woven Sandal",
        price: "350 GHS",
        imageUrl: "https://images.unsplash.com/photo-1603808033192-082d6919d3e1?auto=format&fit=crop&q=80&w=1000",
        category: "Womens",
    },
    {
        slug: "badu-slide-04",
        name: "Leather Mule",
        price: "400 GHS",
        imageUrl: "https://images.unsplash.com/photo-1549298916-b41d501d3772?auto=format&fit=crop&q=80&w=1000",
        category: "Womens",
    },
];

export default function HomePage() {
    return (
        <>
            <Hero
                title="BADU"
                subtitle="Visual Silence. Uncompromised Quality."
                imageUrl="https://images.unsplash.com/photo-1522079031023-ebc22d716d1f?auto=format&fit=crop&q=80&w=2000"
            />

            <section className="py-24 md:py-32 px-6 max-w-4xl mx-auto text-center">
                <h2 className="text-xs uppercase tracking-widest font-semibold mb-8 text-neutral-400">The Philosophy</h2>
                <p className="font-serif text-2xl md:text-4xl leading-relaxed text-neutral-900">
                    We strip away the non-essential to reveal the true character of our materials.
                    Every piece is a testament to the art of restraint.
                </p>
            </section>

            <section className="py-24 bg-creme px-6 md:px-12">
                <div className="max-w-7xl mx-auto">
                    <div className="flex justify-between items-end mb-16">
                        <h2 className="font-serif text-4xl tracking-widest uppercase">The Collection</h2>
                        <a href="/shop" className="text-xs uppercase tracking-widest font-semibold hover:text-neutral-500 transition-colors border-b border-black pb-1">
                            View All
                        </a>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                        {MOCK_PRODUCTS.map((product) => (
                            <ProductCard key={product.slug} {...product} />
                        ))}
                    </div>
                </div>
            </section>

            <section className="py-32 px-6 flex flex-col items-center justify-center text-center">
                <h2 className="font-serif text-5xl md:text-7xl tracking-widest uppercase mb-8">Handmade<br />in Ghana</h2>
                <p className="max-w-xl text-neutral-600 leading-relaxed mb-12">
                    Crafted by artisans who have honed their skills over generations.
                    We source the finest local leather to create footwear that only gets better with time.
                </p>
                <a href="/craft" className="px-8 py-4 bg-black text-white text-xs uppercase tracking-widest hover:bg-neutral-800 transition-colors">
                    Discover The Craft
                </a>
            </section>
        </>
    );
}
