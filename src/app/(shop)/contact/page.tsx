"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function ContactPage() {
    const [formData, setFormData] = useState({ name: "", email: "", phone: "", message: "" });
    const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setStatus("submitting");

        try {
            const { error } = await supabase.from("contact_inquiries").insert([
                {
                    name: formData.name,
                    email: formData.email,
                    phone: formData.phone || null,
                    message: formData.message,
                }
            ]);

            if (error) throw error;

            setStatus("success");
            setFormData({ name: "", email: "", phone: "", message: "" });
        } catch (error) {
            console.error("Error submitting form:", error);
            setStatus("error");
        }
    };

    return (
        <div className="pb-24">
            <header className="py-24 text-center px-6">
                <h1 className="text-3xl md:text-5xl font-serif uppercase tracking-[0.2em] text-black mb-4">
                    Contact Us
                </h1>
                <p className="text-[10px] uppercase tracking-[0.3em] text-neutral-400 font-bold">
                    Concierge & Technical Assistance
                </p>
            </header>

            <div className="max-w-7xl mx-auto px-6 md:px-12">
                <div className="grid md:grid-cols-2 gap-0 border border-black min-h-[600px] mb-24">
                    {/* Left Column (Map) */}
                    <div className="relative w-full h-full bg-neutral-100 grayscale hover:grayscale-0 transition-all duration-1000 overflow-hidden">
                         <iframe 
                            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d127063.2536836!2d-0.2117!3d5.6!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0xfdf9084b2b7a773%3A0xbed1c48c344d9307!2sAccra!5e0!3m2!1sen!2sgh!4v1710437000000!5m2!1sen!2sgh" 
                            width="100%" 
                            height="100%" 
                            style={{ border: 0 }} 
                            allowFullScreen={false} 
                            loading="lazy" 
                            referrerPolicy="no-referrer-when-downgrade"
                            className="grayscale contrast-125 brightness-90 absolute inset-0"
                        ></iframe>
                    </div>

                    {/* Right Column (Form) */}
                    <div className="bg-white p-8 md:p-12 lg:p-20 flex flex-col justify-center">
                        <div className="mb-12">
                            <h2 className="text-[10px] uppercase tracking-[0.3em] font-bold text-neutral-400 mb-6">Send a Message</h2>
                            <div className="h-px w-10 bg-black"></div>
                        </div>

                        {status === "success" ? (
                            <div className="text-center py-12">
                                <h3 className="font-serif text-2xl tracking-widest uppercase mb-4">Message Sent</h3>
                                <p className="text-xs tracking-widest uppercase text-neutral-400">Our concierge will respond shortly.</p>
                                <button
                                    onClick={() => setStatus("idle")}
                                    className="mt-8 text-[10px] uppercase tracking-[0.3em] font-bold border-b border-black pb-1 hover:opacity-50 transition-all"
                                >
                                    New Inquiry
                                </button>
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit} className="flex flex-col gap-8">
                                {status === "error" && (
                                    <p className="text-[10px] text-red-500 tracking-widest uppercase">Registry error. Try again.</p>
                                )}
                                
                                <div className="group">
                                    <label htmlFor="name" className="block text-[10px] uppercase tracking-[0.3em] text-neutral-400 mb-2 font-bold group-focus-within:text-black transition-colors">
                                        Full Name
                                    </label>
                                    <input
                                        type="text"
                                        id="name"
                                        required
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full bg-transparent border-b border-neutral-200 text-black text-sm py-4 focus:outline-none focus:border-black transition-all rounded-none"
                                        placeholder="ALEXANDER SMITH"
                                    />
                                </div>

                                <div className="group">
                                    <label htmlFor="email" className="block text-[10px] uppercase tracking-[0.3em] text-neutral-400 mb-2 font-bold group-focus-within:text-black transition-colors">
                                        Email Address
                                    </label>
                                    <input
                                        type="email"
                                        id="email"
                                        required
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        className="w-full bg-transparent border-b border-neutral-200 text-black text-sm py-4 focus:outline-none focus:border-black transition-all rounded-none"
                                        placeholder="STUDIO@CLIENT.COM"
                                    />
                                </div>

                                <div className="group">
                                    <label htmlFor="phone" className="block text-[10px] uppercase tracking-[0.3em] text-neutral-400 mb-2 font-bold group-focus-within:text-black transition-colors">
                                        Phone Number <span className="normal-case tracking-normal font-normal">(Optional)</span>
                                    </label>
                                    <input
                                        type="tel"
                                        id="phone"
                                        value={formData.phone}
                                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                        className="w-full bg-transparent border-b border-neutral-200 text-black text-sm py-4 focus:outline-none focus:border-black transition-all rounded-none"
                                        placeholder="+233 ..."
                                    />
                                </div>

                                <div className="group">
                                    <label htmlFor="message" className="block text-[10px] uppercase tracking-[0.3em] text-neutral-400 mb-2 font-bold group-focus-within:text-black transition-colors">
                                        Inquiry
                                    </label>
                                    <textarea
                                        id="message"
                                        required
                                        rows={4}
                                        value={formData.message}
                                        onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                                        className="w-full bg-transparent border-b border-neutral-200 text-black text-sm py-4 focus:outline-none focus:border-black transition-all rounded-none resize-none"
                                        placeholder="HOW CAN OUR ATELIER ASSIST YOU?"
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={status === "submitting"}
                                    className="w-full bg-black text-white py-5 text-[10px] font-bold uppercase tracking-[0.4em] hover:bg-neutral-900 transition-all duration-500 rounded-none shadow-xl mt-4"
                                >
                                    {status === "submitting" ? "Sending..." : "Submit Inquiry"}
                                </button>
                            </form>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-12 text-center py-24 border-t border-neutral-100">
                    <div>
                        <h4 className="text-[10px] uppercase tracking-[0.3em] font-bold text-black mb-4">Location</h4>
                        <p className="text-sm font-serif text-neutral-500 leading-relaxed italic">
                            Accra Atelier<br />
                            Ghana
                        </p>
                    </div>
                    <div>
                        <h4 className="text-[10px] uppercase tracking-[0.3em] font-bold text-black mb-4">Studio</h4>
                        <p className="text-sm font-serif text-neutral-500 leading-relaxed italic">
                            concierge@misstokyo.shop<br />
                            By Appointment Only
                        </p>
                    </div>
                    <div>
                        <h4 className="text-[10px] uppercase tracking-[0.3em] font-bold text-black mb-4">Press</h4>
                        <p className="text-sm font-serif text-neutral-500 leading-relaxed italic">
                            archive@misstokyo.shop
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
