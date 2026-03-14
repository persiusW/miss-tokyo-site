export const metadata = {
    title: "About Us | Miss Tokyo",
    description:
        "Miss Tokyo is a women's fashion and lifestyle brand all about trendy, affordable style — founded by Miriam Aseye.",
};

export default function AboutPage() {
    return (
        <div className="max-w-screen-xl mx-auto">
            {/* Hero split — image left, text right */}
            <div className="grid grid-cols-1 md:grid-cols-2 min-h-[80vh]">
                {/* Image */}
                <div className="relative min-h-[50vh] md:min-h-full overflow-hidden bg-gray-100">
                    <img
                        src="https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=900&q=80"
                        alt="Miss Tokyo Founder"
                        className="absolute inset-0 w-full h-full object-cover object-top"
                    />
                </div>

                {/* Text */}
                <div className="flex flex-col justify-center px-8 md:px-16 py-16">
                    <p className="text-[10px] uppercase tracking-widest text-gray-400 mb-4">
                        Our Story
                    </p>
                    <h1 className="font-serif text-4xl md:text-5xl text-gray-900 leading-tight mb-8">
                        Meet Our Founder
                    </h1>
                    <div className="space-y-5 text-sm text-gray-600 leading-relaxed">
                        <p>
                            Miss Tokyo is a women's fashion and lifestyle brand all about
                            trendy, affordable style. From standout outfits and cute
                            accessories to dreamy perfumes and everyday beauty essentials,
                            we've got everything you need to express yourself effortlessly.
                            Every piece is handpicked to inspire confidence, creativity, and
                            a little everyday magic. Whether you're dressing up or keeping
                            it casual, Miss Tokyo helps you stay stylish — without breaking
                            the bank.
                        </p>
                        <p>
                            Miss Tokyo was founded by{" "}
                            <span className="font-semibold text-gray-900">Miriam Aseye</span>{" "}
                            — a hardworking and visionary entrepreneur with a love for
                            fashion, culture, and empowering young women. What started as a
                            small idea grew into a brand fueled by her passion and
                            persistence. Miriam personally selects every product, making
                            sure it aligns with her vision: to offer quality, stylish pieces
                            as unique and beautiful as the women who wear them. Her journey
                            is a reminder that with heart and hustle, anything is possible.
                        </p>
                    </div>

                    <div className="mt-10 flex flex-col sm:flex-row gap-3">
                        <a
                            href="/shop"
                            className="inline-block bg-black text-white text-[11px] uppercase tracking-widest px-8 py-3 hover:bg-gray-900 transition-colors text-center"
                        >
                            Shop the Collection
                        </a>
                        <a
                            href="/contact"
                            className="inline-block border border-black text-black text-[11px] uppercase tracking-widest px-8 py-3 hover:bg-black hover:text-white transition-colors text-center"
                        >
                            Get in Touch
                        </a>
                    </div>
                </div>
            </div>

            {/* Values strip */}
            <div className="grid grid-cols-1 sm:grid-cols-3 border-t border-gray-200">
                {[
                    {
                        title: "Affordable Style",
                        body: "Every piece is carefully priced so you can look incredible without stretching your budget.",
                    },
                    {
                        title: "Curated with Care",
                        body: "Miriam hand-selects every item to make sure it meets our standard for quality, fit, and personality.",
                    },
                    {
                        title: "For Every Woman",
                        body: "Bold, playful, minimal, or maximalist — we celebrate every style and every woman who wears it.",
                    },
                ].map((v) => (
                    <div
                        key={v.title}
                        className="px-8 py-12 border-b sm:border-b-0 sm:border-r border-gray-200 last:border-r-0"
                    >
                        <p className="font-serif text-lg text-gray-900 mb-3">{v.title}</p>
                        <p className="text-xs text-gray-500 leading-relaxed tracking-wide uppercase">
                            {v.body}
                        </p>
                    </div>
                ))}
            </div>
        </div>
    );
}
