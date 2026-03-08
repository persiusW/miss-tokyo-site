"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function ContactPage() {
    const [formData, setFormData] = useState({ name: "", email: "", message: "" });
    const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setStatus("submitting");

        try {
            const { error } = await supabase.from("contact_inquiries").insert([
                {
                    name: formData.name,
                    email: formData.email,
                    message: formData.message,
                }
            ]);

            if (error) throw error;

            setStatus("success");
            setFormData({ name: "", email: "", message: "" });
        } catch (error) {
            console.error("Error submitting form:", error);
            setStatus("error");
        }
    };

    return (
        <div className="pt-32 pb-24 px-6 md:px-12 max-w-7xl mx-auto min-h-screen flex flex-col md:flex-row gap-16 lg:gap-32">
            {/* Contact Details Side */}
            <div className="w-full md:w-1/3 flex flex-col justify-center">
                <h1 className="font-serif text-5xl md:text-6xl tracking-widest uppercase mb-12">Contact</h1>

                <div className="space-y-12">
                    <div>
                        <h2 className="text-xs font-semibold tracking-widest uppercase text-neutral-400 mb-4">Location</h2>
                        <p className="text-neutral-900 leading-relaxed font-serif text-lg">
                            Accra Atelier<br />
                            (By Appointment Only)<br />
                            Ghana
                        </p>
                    </div>

                    <div>
                        <h2 className="text-xs font-semibold tracking-widest uppercase text-neutral-400 mb-4">Inquiries</h2>
                        <a href="mailto:studio@badu.com" className="text-neutral-900 hover:text-neutral-500 transition-colors font-serif text-lg block mb-2">
                            studio@badu.com
                        </a>
                        <a href="tel:+233201234567" className="text-neutral-900 hover:text-neutral-500 transition-colors font-serif text-lg">
                            +233 20 123 4567
                        </a>
                    </div>
                </div>
            </div>

            {/* Form Side */}
            <div className="w-full md:w-2/3 flex flex-col justify-center">
                {status === "success" ? (
                    <div className="bg-white p-12 text-center border border-neutral-100">
                        <h3 className="font-serif text-2xl tracking-widest uppercase mb-4">Message Received</h3>
                        <p className="text-neutral-600">We will review your inquiry and respond shortly.</p>
                        <button
                            onClick={() => setStatus("idle")}
                            className="mt-8 text-xs uppercase tracking-widest font-semibold border-b border-black pb-1 hover:text-neutral-500 transition-colors"
                        >
                            Send another message
                        </button>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-8 max-w-xl">
                        {status === "error" && (
                            <div className="p-4 bg-red-50 text-red-900 text-sm">
                                There was an issue submitting your message. Please try again or email us directly.
                            </div>
                        )}

                        <div>
                            <label htmlFor="name" className="block text-xs uppercase tracking-widest font-semibold text-neutral-400 mb-2">Full Name</label>
                            <input
                                type="text"
                                id="name"
                                required
                                disabled={status === "submitting"}
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                className="w-full border-b border-neutral-300 py-3 bg-transparent text-neutral-900 focus:outline-none focus:border-black transition-colors disabled:opacity-50"
                                placeholder="Your name"
                            />
                        </div>

                        <div>
                            <label htmlFor="email" className="block text-xs uppercase tracking-widest font-semibold text-neutral-400 mb-2">Email Address</label>
                            <input
                                type="email"
                                id="email"
                                required
                                disabled={status === "submitting"}
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                className="w-full border-b border-neutral-300 py-3 bg-transparent text-neutral-900 focus:outline-none focus:border-black transition-colors disabled:opacity-50"
                                placeholder="your@email.com"
                            />
                        </div>

                        <div>
                            <label htmlFor="message" className="block text-xs uppercase tracking-widest font-semibold text-neutral-400 mb-2">Message</label>
                            <textarea
                                id="message"
                                required
                                disabled={status === "submitting"}
                                rows={4}
                                value={formData.message}
                                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                                className="w-full border-b border-neutral-300 py-3 bg-transparent text-neutral-900 focus:outline-none focus:border-black transition-colors resize-none disabled:opacity-50"
                                placeholder="How can we help you?"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={status === "submitting"}
                            className="w-full bg-black text-white px-8 py-4 text-xs uppercase tracking-widest hover:bg-neutral-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {status === "submitting" ? "Sending..." : "Send Message"}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}
