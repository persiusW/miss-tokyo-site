import Image from "next/image";

export default function CustomOrderPage() {
    return (
        <div className="pt-24 pb-32 px-6 md:px-12 max-w-7xl mx-auto flex flex-col md:flex-row gap-16 md:gap-24">
            {/* Editorial Image */}
            <div className="w-full md:w-5/12 hidden md:block relative h-[80vh] bg-creme">
                <Image
                    src="https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&q=80&w=1000"
                    alt="Artisanal leathercraft tools"
                    fill
                    className="object-cover object-center"
                    priority
                />
            </div>

            {/* Form Content */}
            <div className="w-full md:w-7/12 py-8">
                <h1 className="font-serif text-4xl md:text-5xl tracking-widest uppercase mb-6">Custom Orders</h1>
                <p className="text-neutral-600 leading-relaxed mb-12 max-w-xl">
                    At Badu, every piece is made to order. For clients seeking something truly unique,
                    our workshop offers bespoke services. Share your vision, and we will bring it to life
                    with our signature minimal aesthetic.
                </p>

                <form className="space-y-8 max-w-xl">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div>
                            <label htmlFor="firstName" className="block text-xs uppercase tracking-widest font-semibold mb-3">First Name</label>
                            <input
                                type="text"
                                id="firstName"
                                className="w-full border-b border-black bg-transparent py-2 outline-none focus:border-neutral-400 transition-colors rounded-none"
                            />
                        </div>
                        <div>
                            <label htmlFor="lastName" className="block text-xs uppercase tracking-widest font-semibold mb-3">Last Name</label>
                            <input
                                type="text"
                                id="lastName"
                                className="w-full border-b border-black bg-transparent py-2 outline-none focus:border-neutral-400 transition-colors rounded-none"
                            />
                        </div>
                    </div>

                    <div>
                        <label htmlFor="email" className="block text-xs uppercase tracking-widest font-semibold mb-3">Email Address</label>
                        <input
                            type="email"
                            id="email"
                            className="w-full border-b border-black bg-transparent py-2 outline-none focus:border-neutral-400 transition-colors rounded-none"
                        />
                    </div>

                    <div>
                        <label htmlFor="requestType" className="block text-xs uppercase tracking-widest font-semibold mb-3">Type of Request</label>
                        <select
                            id="requestType"
                            className="w-full border-b border-black bg-transparent py-2 outline-none focus:border-neutral-400 transition-colors rounded-none appearance-none"
                        >
                            <option value="modification">Modification to existing design</option>
                            <option value="bespoke">Entirely new bespoke design</option>
                            <option value="sizing">Special sizing requirements</option>
                            <option value="other">Other inquiry</option>
                        </select>
                    </div>

                    <div>
                        <label htmlFor="details" className="block text-xs uppercase tracking-widest font-semibold mb-3">Project Details</label>
                        <textarea
                            id="details"
                            rows={5}
                            className="w-full border border-neutral-200 bg-transparent p-4 outline-none focus:border-black transition-colors rounded-none resize-y"
                            placeholder="Describe your vision, preferred materials, and any other relevant details..."
                        ></textarea>
                    </div>

                    <button type="submit" className="w-full py-5 bg-black text-white text-xs uppercase tracking-widest hover:bg-neutral-800 transition-colors mt-8">
                        Submit Inquiry
                    </button>
                </form>
            </div>
        </div>
    );
}
