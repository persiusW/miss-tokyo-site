import Image from "next/image";
import Link from "next/link";

export default function ProductPage({ params }: { params: { slug: string } }) {
    // Mock data for "Badu Slide 01"
    const product = {
        name: "Badu Slide 01",
        price: "300 GHS",
        description: "Our signature slide. Minimalist design featuring premium Ghanaian leather. Unlined for natural comfort that molds to your foot over time.",
        imageUrl: "https://images.unsplash.com/photo-1560343090-f0409e92791a?auto=format&fit=crop&q=80&w=1000",
        colors: ["Noir", "Cognac", "Sand"],
        stitching: ["Tonal", "Contrast White"],
        sizes: ["39", "40", "41", "42", "43", "44", "45", "46"],
    };

    return (
        <div className="pt-24 pb-32 px-6 md:px-12 max-w-7xl mx-auto flex flex-col md:flex-row gap-16">
            {/* Product Images */}
            <div className="w-full md:w-1/2 flex flex-col gap-6">
                <div className="relative aspect-[4/5] w-full bg-creme">
                    <Image
                        src={product.imageUrl}
                        alt={product.name}
                        fill
                        className="object-cover object-center"
                        priority
                    />
                </div>
                <div className="grid grid-cols-2 gap-6">
                    <div className="relative aspect-square bg-creme">
                        <Image
                            src="https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?auto=format&fit=crop&q=80&w=600"
                            alt={`${product.name} detail`}
                            fill
                            className="object-cover object-center"
                        />
                    </div>
                    <div className="relative aspect-square bg-creme">
                        <Image
                            src="https://images.unsplash.com/photo-1608256246200-53e635b5b65f?auto=format&fit=crop&q=80&w=600"
                            alt={`${product.name} alternate angle`}
                            fill
                            className="object-cover object-center"
                        />
                    </div>
                </div>
            </div>

            {/* Product Info */}
            <div className="w-full md:w-1/2 md:sticky md:top-32 h-fit">
                <h1 className="font-serif text-4xl md:text-5xl tracking-widest uppercase mb-4">{product.name}</h1>
                <p className="text-xl text-neutral-600 mb-8">{product.price}</p>

                <p className="text-neutral-600 leading-relaxed mb-12">
                    {product.description}
                </p>

                <form className="space-y-8 mb-12">
                    {/* Color Selection */}
                    <div>
                        <span className="block text-xs uppercase tracking-widest font-semibold mb-4">Color</span>
                        <div className="flex gap-4">
                            {product.colors.map(color => (
                                <label key={color} className="cursor-pointer">
                                    <input type="radio" name="color" className="sr-only peer" />
                                    <span className="block px-4 py-2 text-sm border border-neutral-200 peer-checked:border-black peer-checked:bg-black peer-checked:text-white transition-colors uppercase tracking-widest">
                                        {color}
                                    </span>
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* Stitching Selection */}
                    <div>
                        <span className="block text-xs uppercase tracking-widest font-semibold mb-4">Stitching</span>
                        <div className="flex gap-4">
                            {product.stitching.map(style => (
                                <label key={style} className="cursor-pointer">
                                    <input type="radio" name="stitching" className="sr-only peer" />
                                    <span className="block px-4 py-2 text-sm border border-neutral-200 peer-checked:border-black peer-checked:bg-black peer-checked:text-white transition-colors uppercase tracking-widest">
                                        {style}
                                    </span>
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* Size Selection */}
                    <div>
                        <div className="flex justify-between items-center mb-4">
                            <span className="block text-xs uppercase tracking-widest font-semibold">Size (EU)</span>
                            <button type="button" className="text-xs uppercase tracking-widest text-neutral-500 underline">Size Guide</button>
                        </div>
                        <div className="grid grid-cols-4 gap-2">
                            {product.sizes.map(size => (
                                <label key={size} className="cursor-pointer">
                                    <input type="radio" name="size" className="sr-only peer" />
                                    <span className="block py-3 text-center text-sm border border-neutral-200 peer-checked:border-black peer-checked:bg-black peer-checked:text-white transition-colors uppercase tracking-widest">
                                        {size}
                                    </span>
                                </label>
                            ))}
                        </div>
                    </div>

                    <button type="button" className="w-full py-5 bg-black text-white text-xs uppercase tracking-widest hover:bg-neutral-800 transition-colors mt-8">
                        Add to Cart — {product.price}
                    </button>
                </form>

                <div className="border-t border-neutral-200 pt-8 mt-12 pb-8">
                    <Link href="/custom" className="flex justify-between items-center group">
                        <span className="text-sm uppercase tracking-widest font-semibold group-hover:text-neutral-500 transition-colors">
                            Request Custom Version
                        </span>
                        <span className="text-xl group-hover:-translate-x-1 transition-transform">→</span>
                    </Link>
                    <p className="text-xs text-neutral-500 mt-2">
                        Looking for a specific leather, color, or modification? Contact our atelier.
                    </p>
                </div>
            </div>
        </div>
    );
}
