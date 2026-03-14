"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "@/lib/toast";
import { Loader2 } from "lucide-react";

export function NewsletterBanner() {
  const [email, setEmail] = useState("");
  const [agreed, setAgreed] = useState(true);
  const [loading, setLoading] = useState(false);

  const handleSubscribe = async () => {
    if (!email || !agreed) return;
    
    setLoading(true);
    const { error } = await supabase
      .from("newsletter_subs")
      .insert({ email, status: "active" });

    if (error) {
      if (error.code === "23505") {
        toast.success("Identity recognized. You are already part of our circle.");
      } else {
        toast.error("Cloud access restricted. Please try again later.");
      }
    } else {
      toast.success("Subscribed. Welcome to Miss Tokyo.");
      setEmail("");
    }
    setLoading(false);
  };

  return (
    <section
      className="relative w-full py-20 md:py-32 px-6"
      style={{
        backgroundImage:
          "url('https://images.unsplash.com/photo-1558769132-cb1aea458c5e?w=1400&q=80')",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      {/* Dark overlay */}
      <div className="absolute inset-0 bg-black/65" />

      <div className="relative z-10 max-w-2xl mx-auto text-center md:text-left">
        <h2 className="font-serif text-3xl md:text-5xl text-white uppercase tracking-wide mb-8 leading-tight">
          Join the Miss Tokyo <br /> Collective
        </h2>

        <div className="flex flex-col gap-4">
          <input
            type="email"
            placeholder="Recipient Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-white/95 text-black text-xs uppercase tracking-widest px-5 py-4 outline-none placeholder:text-gray-400 rounded-none border-0"
          />
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="accent-black w-3.5 h-3.5 cursor-pointer opacity-80"
            />
            <span className="text-white text-[10px] uppercase tracking-widest font-medium opacity-80">
              I agree to receive curated updates.
            </span>
          </label>
          <button 
            onClick={handleSubscribe}
            disabled={loading || !email || !agreed}
            className="w-full bg-black text-white text-[10px] uppercase tracking-[0.2em] py-4 hover:bg-neutral-800 transition-all duration-300 rounded-none disabled:opacity-50 flex items-center justify-center gap-2">
            {loading ? <Loader2 size={14} className="animate-spin" /> : "Subscribe"}
          </button>
        </div>
      </div>
    </section>
  );
}
