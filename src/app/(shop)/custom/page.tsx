import Image from "next/image";
import { CustomOrderForm } from "@/components/ui/badu/CustomOrderForm";

export default function CustomOrderPage() {
    return (
        <div className="pt-24 pb-32 px-6 md:px-12 max-w-7xl mx-auto flex flex-col md:flex-row gap-16 md:gap-24">
            {/* Editorial Image */}
            <div className="w-full md:w-5/12 hidden md:block relative h-[80vh] bg-neutral-100 flex items-center justify-center">
                <span className="text-neutral-400 text-sm tracking-widest uppercase">Custom Orders</span>
            </div>

            {/* Form Content */}
            <div className="w-full md:w-7/12 py-8">
                <h1 className="font-serif text-4xl md:text-5xl tracking-widest uppercase mb-6">Custom Orders</h1>
                <p className="text-neutral-600 leading-relaxed mb-12 max-w-xl">
                    At Badu, every piece is made to order. For clients seeking something truly unique,
                    our workshop offers bespoke services. Share your vision, and we will bring it to life
                    with our signature minimal aesthetic.
                </p>

                <CustomOrderForm />
            </div>
        </div>
    );
}
