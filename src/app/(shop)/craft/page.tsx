import Image from "next/image";

export default function CraftPage() {
    return (
        <div className="pt-24 pb-32">
            {/* Intro Header */}
            <header className="px-6 md:px-12 max-w-4xl mx-auto text-center mb-24 md:mb-32">
                <h1 className="font-serif text-5xl md:text-7xl tracking-widest uppercase mb-8">The Craft</h1>
                <p className="text-xl md:text-2xl text-neutral-600 leading-relaxed font-serif italic">
                    "Elegance is refusal." — Diana Vreeland
                </p>
            </header>

            {/* Feature Section 1 */}
            <section className="flex flex-col md:flex-row items-stretch mb-24 md:mb-32">
                <div className="w-full md:w-1/2 relative h-[60vh] md:h-[80vh] bg-creme">
                    <Image
                        src="https://images.unsplash.com/photo-1605810756783-7f8e8fe8c062?auto=format&fit=crop&q=80&w=1200"
                        alt="Artisan hands working on leather"
                        fill
                        className="object-cover object-center"
                    />
                </div>
                <div className="w-full md:w-1/2 flex items-center justify-center p-12 md:p-24 bg-[#FAFAFA]">
                    <div className="max-w-md">
                        <h2 className="text-xs uppercase tracking-widest font-semibold mb-6 text-neutral-400">01. Origin</h2>
                        <h3 className="font-serif text-3xl md:text-4xl tracking-widest uppercase mb-6">Handmade in Ghana</h3>
                        <p className="text-neutral-600 leading-relaxed">
                            Every Badu piece is crafted in our Accra atelier. We partner with local tanneries who have preserved
                            traditional techniques for generations. By keeping our production local, we maintain absolute oversight
                            of the quality while supporting the community that inspires us.
                        </p>
                    </div>
                </div>
            </section>

            {/* Quote Break */}
            <section className="py-24 px-6 max-w-3xl mx-auto text-center">
                <p className="font-serif text-3xl md:text-5xl leading-tight text-neutral-900">
                    We strip away the extraneous to leave only the essential structure. True luxury is found in the quiet details.
                </p>
            </section>

            {/* Feature Section 2 */}
            <section className="flex flex-col md:flex-row-reverse items-stretch mb-24 md:mb-32">
                <div className="w-full md:w-1/2 relative h-[60vh] md:h-[80vh] bg-creme">
                    <Image
                        src="https://images.unsplash.com/photo-1628151015968-3a4429e9ef04?auto=format&fit=crop&q=80&w=1200"
                        alt="Minimalist design tools"
                        fill
                        className="object-cover object-center"
                    />
                </div>
                <div className="w-full md:w-1/2 flex items-center justify-center p-12 md:p-24 bg-creme">
                    <div className="max-w-md">
                        <h2 className="text-xs uppercase tracking-widest font-semibold mb-6 text-neutral-400">02. Materials</h2>
                        <h3 className="font-serif text-3xl md:text-4xl tracking-widest uppercase mb-6">Visual Silence</h3>
                        <p className="text-neutral-600 leading-relaxed mb-6">
                            Our leathers are selected for their character and durability. We prefer subtle textures and natural
                            finishes that age gracefully. We avoid loud branding, instead letting the silhouette and the quality
                            of the material speak for themselves.
                        </p>
                        <p className="text-neutral-600 leading-relaxed">
                            The hardware is minimal, the stitching is precise, and the forms are timeless.
                        </p>
                    </div>
                </div>
            </section>

        </div>
    );
}
