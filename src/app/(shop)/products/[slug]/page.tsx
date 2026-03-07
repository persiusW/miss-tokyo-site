import Image from "next/image";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { AnimatedProductView } from "@/components/ui/badu/AnimatedProductView";
import { ProductCheckoutForm } from "@/components/ui/badu/ProductCheckoutForm";
import { notFound } from "next/navigation";

import { Metadata } from "next";

export const revalidate = 60;

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
    const { slug } = await params;
    const { data: product } = await supabase
        .from("products")
        .select("name, description, image_url")
        .eq("slug", slug)
        .single();

    if (product) {
        return {
            title: `${product.name} | Badu`,
            description: product.description || `Our signature piece. Minimalist design featuring premium Ghanaian leather. Discover the ${product.name}.`,
            openGraph: {
                images: product.image_url ? [{ url: product.image_url }] : [],
            }
        };
    }

    return { title: "Product | Badu" };
}

export default async function ProductPage({ params }: { params: { slug: string } }) {
    const { slug } = await params;

    // Fetch product
    const { data: product } = await supabase
        .from("products")
        .select("*")
        .eq("slug", slug)
        .single();

    if (!product) {
        notFound();
    }

    // Default mock lists for variants if not in db
    const colors = product.colors || ["Noir", "Cognac", "Sand"];
    const stitching = product.stitching || ["Tonal", "Contrast White"];
    const sizes = product.sizes || ["39", "40", "41", "42", "43", "44", "45", "46"];
    const imageUrl = product.image_url || "https://images.unsplash.com/photo-1560343090-f0409e92791a?auto=format&fit=crop&q=80&w=1000";
    const priceStr = `${product.price || 300} GHS`;

    return (
        <div className="pt-24 pb-32 px-6 md:px-12 max-w-7xl mx-auto">
            <AnimatedProductView>
                {/* Product Images */}
                <div className="w-full md:w-1/2 flex flex-col gap-6">
                    <div className="relative aspect-[4/5] w-full bg-creme">
                        <Image
                            src={imageUrl}
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
                    <p className="text-xl text-neutral-600 mb-8">{priceStr}</p>

                    <p className="text-neutral-600 leading-relaxed mb-12">
                        {product.description || "Our signature slide. Minimalist design featuring premium Ghanaian leather. Unlined for natural comfort that molds to your foot over time."}
                    </p>

                    <ProductCheckoutForm
                        productId={product.id}
                        price={priceStr}
                        colors={colors}
                        stitching={stitching}
                        sizes={sizes}
                    />

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
            </AnimatedProductView>
        </div>
    );
}
