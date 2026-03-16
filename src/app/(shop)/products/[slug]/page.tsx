import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { AnimatedProductView } from "@/components/ui/badu/AnimatedProductView";
import { ProductCheckoutForm } from "@/components/ui/badu/ProductCheckoutForm";
import { ProductImageCarousel } from "@/components/ui/badu/ProductImageCarousel";
import { RelatedProducts } from "@/components/ui/miss-tokyo/RelatedProducts";
import { RecentlyViewed } from "@/components/ui/miss-tokyo/RecentlyViewed";
import { notFound } from "next/navigation";
import { Metadata } from "next";
import { ChevronRight } from "lucide-react";

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
            title: `${product.name} | Miss Tokyo`,
            description: product.description || `Our signature piece. Minimalist design featuring premium Ghanaian leather. Discover the ${product.name}.`,
            openGraph: {
                images: product.image_urls?.[0] ? [{ url: product.image_urls[0] }] : [],
            }
        };
    }

    return { title: "Product | Miss Tokyo" };
}

export default async function ProductPage({ params }: { params: { slug: string } }) {
    const { slug } = await params;

    const [{ data: product }, { data: storeSettings }] = await Promise.all([
        supabase.from("products").select("*").eq("slug", slug).single(),
        supabase.from("store_settings").select("enable_whitelabel").eq("id", "default").single(),
    ]);

    if (!product) notFound();

    // Fetch related products (same category, exclude self)
    const { data: relatedRaw } = await supabase
        .from("products")
        .select("slug, name, price_ghs, image_urls, is_sale, discount_value")
        .eq("is_active", true)
        .eq("category_type", product.category_type)
        .neq("slug", slug)
        .order("created_at", { ascending: false })
        .limit(4);

    const enableWhitelabel = storeSettings?.enable_whitelabel ?? true;
    const colors = product.available_colors || ["Noir", "Cognac", "Sand"];
    const stitching = product.available_stitching || ["Tonal", "Contrast White"];
    const availableSizes = product.available_sizes || null;
    const imageUrl = product.image_urls?.[0] || "";
    const priceStr = `GH₵ ${Number(product.price_ghs || 0).toFixed(2)}`;

    // Stock status
    const trackInventory = product.track_inventory === true;
    const stockQty: number = product.stock_quantity ?? null;
    const isSoldOut = trackInventory && stockQty === 0;
    const isLowStock = trackInventory && stockQty !== null && stockQty > 0 && stockQty <= 5;

    const categoryLabel = product.category_type
        ? product.category_type.charAt(0).toUpperCase() + product.category_type.slice(1)
        : "Shop";

    return (
        <div
            className="pt-6 pb-32 px-4 md:px-12 max-w-7xl mx-auto"
            style={{ paddingBottom: "calc(5rem + env(safe-area-inset-bottom, 0px))" }}
        >
            {/* Breadcrumb */}
            <nav className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-neutral-400 mb-8">
                <Link href="/" className="hover:text-black transition-colors">Home</Link>
                <ChevronRight size={10} />
                <Link href="/shop" className="hover:text-black transition-colors">Shop</Link>
                {product.category_type && (
                    <>
                        <ChevronRight size={10} />
                        <Link
                            href={`/shop?category=${product.category_type}`}
                            className="hover:text-black transition-colors"
                        >
                            {categoryLabel}
                        </Link>
                    </>
                )}
                <ChevronRight size={10} />
                <span className="text-black font-medium truncate max-w-[160px]">{product.name}</span>
            </nav>

            <AnimatedProductView>
                {/* Product Images */}
                <div className="w-full md:w-1/2">
                    <ProductImageCarousel
                        images={product.image_urls || (imageUrl ? [imageUrl] : [])}
                        name={product.name}
                    />
                </div>

                {/* Product Info */}
                <div className="w-full md:w-1/2 md:sticky md:top-32 h-fit">
                    <h1 className="font-serif text-4xl md:text-5xl tracking-widest uppercase mb-3">{product.name}</h1>

                    {/* Price + Stock */}
                    <div className="flex items-baseline gap-4 mb-2">
                        <p className="text-xl text-neutral-600">{priceStr}</p>
                        {isSoldOut && (
                            <span className="text-[10px] uppercase tracking-widest font-bold text-neutral-400 border border-neutral-300 px-2 py-0.5">
                                Sold Out
                            </span>
                        )}
                        {isLowStock && (
                            <span className="text-[10px] uppercase tracking-widest font-bold text-red-500">
                                Only {stockQty} left
                            </span>
                        )}
                    </div>

                    <p className="text-neutral-600 leading-relaxed mb-10">
                        {product.description || "Our signature piece. Minimalist design featuring premium Ghanaian craftsmanship. Unlined for natural comfort that molds to your body over time."}
                    </p>

                    <ProductCheckoutForm
                        productId={product.id}
                        productName={product.name}
                        productSlug={product.slug}
                        productImageUrl={imageUrl}
                        priceNum={product.price_ghs || 0}
                        price={priceStr}
                        colors={colors}
                        stitching={stitching}
                        availableSizes={availableSizes}
                    />

                    {enableWhitelabel && (
                        <div className="border-t border-neutral-200 pt-8 mt-8 pb-8">
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
                    )}
                </div>
            </AnimatedProductView>

            {/* Related Products */}
            <RelatedProducts products={relatedRaw || []} />

            {/* Recently Viewed — client component, saves + displays */}
            <RecentlyViewed currentSlug={slug} />
        </div>
    );
}
