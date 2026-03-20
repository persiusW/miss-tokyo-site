"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useSearchParams } from "next/navigation";
import Image from "next/image";

type RefProduct = { name: string; slug: string; image_urls: string[] | null };

export function CustomOrderForm() {
    const searchParams = useSearchParams();
    const refSlug = searchParams.get("ref");

    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [submitError, setSubmitError] = useState("");
    const [refProduct, setRefProduct] = useState<RefProduct | null>(null);

    const [formData, setFormData] = useState({
        firstName: "",
        lastName: "",
        email: "",
        requestType: "modification",
        strapColor: "",
        stitchColor: "",
        soleTone: "",
        details: "",
        referenceProduct: "",
    });

    useEffect(() => {
        if (refSlug) {
            supabase.from("products").select("name, slug, image_urls").eq("slug", refSlug).single()
                .then(({ data }: { data: any }) => {
                    if (data) {
                        setRefProduct(data);
                        setFormData(prev => ({ ...prev, referenceProduct: data.name, requestType: "modification" }));
                    }
                });
        }
    }, [refSlug]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        setFormData(prev => ({ ...prev, [e.target.id]: e.target.value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitError("");
        setLoading(true);

        try {
            const { error } = await supabase.from("custom_requests").insert([
                {
                    customer_name: `${formData.firstName} ${formData.lastName}`.trim(),
                    customer_email: formData.email,
                    strap_color: formData.strapColor || null,
                    stitch_refinement: formData.stitchColor || null,
                    sole_tone: formData.soleTone || null,
                    reference_product: formData.referenceProduct || null,
                    details: formData.details || null,
                    status: "inquiry",
                }
            ]);

            if (error) throw error;
            setSuccess(true);
        } catch (err) {
            console.error(err);
            setSubmitError("An error occurred while submitting your inquiry. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="py-12 border-t border-neutral-200 mt-8 max-w-xl">
                <h3 className="font-serif text-2xl tracking-widest uppercase mb-4">Request Received</h3>
                <p className="text-neutral-600 leading-relaxed">
                    Thank you for reaching out. Our atelier will review your custom request and get back to you shortly.
                </p>
            </div>
        );
    }

    return (
        <form className="space-y-8 max-w-xl" onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                    <label htmlFor="firstName" className="block text-xs uppercase tracking-widest font-semibold mb-3">First Name</label>
                    <input
                        type="text"
                        id="firstName"
                        value={formData.firstName}
                        onChange={handleChange}
                        required
                        className="w-full border-b border-black bg-transparent py-3 min-h-[44px] text-[16px] outline-none focus:border-neutral-400 transition-colors rounded-none"
                    />
                </div>
                <div>
                    <label htmlFor="lastName" className="block text-xs uppercase tracking-widest font-semibold mb-3">Last Name</label>
                    <input
                        type="text"
                        id="lastName"
                        value={formData.lastName}
                        onChange={handleChange}
                        required
                        className="w-full border-b border-black bg-transparent py-3 min-h-[44px] text-[16px] outline-none focus:border-neutral-400 transition-colors rounded-none"
                    />
                </div>
            </div>

            <div>
                <label htmlFor="email" className="block text-xs uppercase tracking-widest font-semibold mb-3">Email Address</label>
                <input
                    type="email"
                    id="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    className="w-full border-b border-black bg-transparent py-3 min-h-[44px] text-[16px] outline-none focus:border-neutral-400 transition-colors rounded-none"
                />
            </div>

            <div>
                <label htmlFor="requestType" className="block text-xs uppercase tracking-widest font-semibold mb-3">Type of Request</label>
                <select
                    id="requestType"
                    value={formData.requestType}
                    onChange={handleChange}
                    className="w-full border-b border-black bg-transparent py-3 min-h-[44px] text-[16px] outline-none focus:border-neutral-400 transition-colors rounded-none appearance-none"
                >
                    <option value="modification">Modification to existing design</option>
                    <option value="bespoke">Entirely new bespoke design</option>
                    <option value="sizing">Special sizing requirements</option>
                    <option value="other">Other inquiry</option>
                </select>
            </div>

            {refProduct && (
                <div className="flex gap-6 items-center p-4 bg-neutral-50/50 border border-neutral-100">
                    <div className="w-20 h-20 relative bg-neutral-100 flex-shrink-0">
                        {refProduct.image_urls?.[0] ? (
                            <Image src={refProduct.image_urls[0]} alt={refProduct.name} fill className="object-cover" />
                        ) : (
                            <span className="text-[8px] uppercase tracking-widest text-neutral-400 absolute inset-0 flex items-center justify-center">No Img</span>
                        )}
                    </div>
                    <div>
                        <p className="text-[10px] uppercase tracking-widest text-neutral-500 mb-1">Based on</p>
                        <p className="text-sm font-semibold">{refProduct.name}</p>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div>
                    <label htmlFor="strapColor" className="block text-xs uppercase tracking-widest font-semibold mb-3">Strap Color (Optional)</label>
                    <input
                        type="text"
                        id="strapColor"
                        value={formData.strapColor}
                        onChange={handleChange}
                        placeholder="e.g. Cognac"
                        className="w-full border-b border-black bg-transparent py-3 min-h-[44px] text-[16px] outline-none focus:border-neutral-400 transition-colors rounded-none"
                    />
                </div>
                <div>
                    <label htmlFor="stitchColor" className="block text-xs uppercase tracking-widest font-semibold mb-3">Stitch Color (Optional)</label>
                    <input
                        type="text"
                        id="stitchColor"
                        value={formData.stitchColor}
                        onChange={handleChange}
                        placeholder="e.g. Contrast White"
                        className="w-full border-b border-black bg-transparent py-3 min-h-[44px] text-[16px] outline-none focus:border-neutral-400 transition-colors rounded-none"
                    />
                </div>
                <div>
                    <label htmlFor="soleTone" className="block text-xs uppercase tracking-widest font-semibold mb-3">Sole Tone (Optional)</label>
                    <input
                        type="text"
                        id="soleTone"
                        value={formData.soleTone}
                        onChange={handleChange}
                        placeholder="e.g. Dark Brown"
                        className="w-full border-b border-black bg-transparent py-3 min-h-[44px] text-[16px] outline-none focus:border-neutral-400 transition-colors rounded-none"
                    />
                </div>
            </div>

            <div>
                <label htmlFor="details" className="block text-xs uppercase tracking-widest font-semibold mb-3">Project Details</label>
                <textarea
                    id="details"
                    rows={5}
                    value={formData.details}
                    onChange={handleChange}
                    required
                    className="w-full border border-neutral-200 bg-transparent p-4 outline-none focus:border-black transition-colors rounded-none resize-y"
                    placeholder="Describe your vision, preferred materials, and any other relevant details..."
                ></textarea>
            </div>

            {submitError && (
                <p className="text-sm text-red-600 border border-red-200 bg-red-50 px-4 py-3">{submitError}</p>
            )}

            <button
                type="submit"
                disabled={loading}
                className="w-full py-5 bg-black text-white text-xs uppercase tracking-widest hover:bg-neutral-800 transition-colors mt-8 disabled:opacity-50"
            >
                {loading ? "Submitting..." : "Submit Inquiry"}
            </button>
        </form>
    );
}
