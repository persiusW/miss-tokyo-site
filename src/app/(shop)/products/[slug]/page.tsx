import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { AnimatedProductView } from "@/components/ui/badu/AnimatedProductView";
import { ProductCheckoutForm } from "@/components/ui/badu/ProductCheckoutForm";
import { ProductImageCarousel } from "@/components/ui/badu/ProductImageCarousel";
import { notFound } from "next/navigation";

import { Metadata } from "next";

export const revalidate = 60;

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
    const { slug } = await params;
    const { data: product } = await supabase
        .from("products")
        .select("name, description, image_urls")
        .eq("slug", slug)
        .single();

    if (product) {
        return {
            title: `${product.name} | Badu`,
            description: product.description || `Our signature piece. Minimalist design featuring premium Ghanaian leather. Discover the ${product.name}.`,
            openGraph: {
                images: product.image_urls?.[0] ? [{ url: product.image_urls[0] }] : [],
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
    const colors = product.available_colors || ["Noir", "Cognac", "Sand"];
    const stitching = product.available_stitching || ["Tonal", "Contrast White"];
    const availableSizes = product.available_sizes || null;
    const imageUrl = product.image_urls?.[0] || "";
    const priceStr = `${product.price_ghs || 300} GHS`;

    return (
        <div className="pt-10 pb-32 px-4 md:px-12 max-w-7xl mx-auto" style={{ paddingBottom: "calc(5rem + env(safe-area-inset-bottom, 0px))" }}>
            <AnimatedProductView>
                {/* Product Images — Carousel */}
                <div className="w-full md:w-1/2">
                    <ProductImageCarousel
                        images={product.image_urls || (imageUrl ? [imageUrl] : [])}
                        name={product.name}
                    />
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
                        productName={product.name}
                        productSlug={product.slug}
                        productImageUrl={imageUrl}
                        priceNum={product.price_ghs || 300}
                        price={priceStr}
                        colors={colors}
                        stitching={stitching}
                        availableSizes={availableSizes}
                    />

                    <div className="border-t border-neutral-200 pt-8 mt-12 pb-8">
                        <Link href={`/whitelabel?ref=${product.slug}`} className="flex justify-between items-center group">
                            <span className="text-sm uppercase tracking-widest font-semibold group-hover:text-neutral-500 transition-colors">
                                Request White Label Version
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
