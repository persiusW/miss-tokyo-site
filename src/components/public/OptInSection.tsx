"use client";

import { useState } from "react";

interface OptInSectionProps {
  enabled: boolean;
  title: string;
  subtitle: string;
  couponEnabled: boolean;
  couponCode: string;
}

export function OptInSection({
  enabled,
  title,
  subtitle,
  couponEnabled,
  couponCode,
}: OptInSectionProps) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "duplicate" | "error">("idle");
  const [returnedCode, setReturnedCode] = useState<string | null>(null);

  if (!enabled) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;

    setStatus("loading");
    try {
      const res = await fetch("/api/newsletter/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });

      const data = await res.json();

      if (data.alreadySubscribed) {
        setStatus("duplicate");
      } else if (data.success) {
        setStatus("success");
        setReturnedCode(data.couponCode || couponCode);
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
  }

  return (
    <section className="bg-[#0a0a0a] py-28 text-center relative overflow-hidden">
      {/* Background watermark */}
      <span
        className="absolute inset-0 flex items-center justify-center select-none pointer-events-none"
        aria-hidden="true"
      >
        <span
          className="text-white/[0.03] font-serif font-bold leading-none"
          style={{ fontSize: "clamp(80px, 20vw, 220px)", letterSpacing: "0.15em" }}
        >
          MISS TOKYO
        </span>
      </span>

      <div className="relative z-10 max-w-lg mx-auto px-6">
        {/* Eyebrow */}
        <p className="text-[#C8A97A] text-[9px] tracking-[0.4em] uppercase mb-4">
          JOIN THE MISS TOKYO FAMILY
        </p>

        {/* Headline */}
        <h2 className="font-serif text-4xl md:text-5xl text-white leading-tight mb-4">
          {title}
        </h2>

        {/* Subtitle */}
        <p className="text-neutral-400 text-sm max-w-md mx-auto mb-8 leading-relaxed">
          {subtitle}
        </p>

        {/* Success state */}
        {status === "success" && returnedCode && couponEnabled && (
          <div className="border border-[#C8A97A]/40 bg-[#C8A97A]/10 px-6 py-5 mb-6">
            <p className="text-white text-sm leading-relaxed">
              Your code is{" "}
              <strong className="text-[#C8A97A] tracking-[0.2em] font-bold">{returnedCode}</strong>{" "}
              — use it at checkout!
            </p>
          </div>
        )}

        {status === "success" && !couponEnabled && (
          <div className="border border-white/20 bg-white/5 px-6 py-5 mb-6">
            <p className="text-white text-sm">
              You&apos;re subscribed! Welcome to the family.
            </p>
          </div>
        )}

        {status === "duplicate" && (
          <div className="border border-white/20 bg-white/5 px-6 py-5 mb-6">
            <p className="text-white/70 text-sm">You&apos;re already on the list!</p>
          </div>
        )}

        {status === "error" && (
          <div className="border border-red-500/30 bg-red-500/10 px-6 py-5 mb-6">
            <p className="text-red-400 text-sm">Something went wrong. Please try again.</p>
          </div>
        )}

        {/* Form */}
        {status !== "success" && status !== "duplicate" && (
          <form onSubmit={handleSubmit} className="flex gap-0 max-w-sm mx-auto" noValidate>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Your email address"
              required
              disabled={status === "loading"}
              className="flex-1 bg-transparent border border-neutral-600 px-4 py-3 text-white text-xs tracking-widest outline-none focus:border-white placeholder:text-neutral-500 disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={status === "loading"}
              className="bg-[#C8A97A] text-black text-[10px] tracking-[0.3em] uppercase font-bold px-6 py-3 hover:bg-[#b89668] transition-colors duration-200 disabled:opacity-60 whitespace-nowrap"
            >
              {status === "loading" ? "..." : "SUBSCRIBE"}
            </button>
          </form>
        )}

        {/* Fine print */}
        <p className="text-neutral-600 text-[10px] tracking-widest uppercase mt-5">
          No spam ever. Unsubscribe at any time.
        </p>
      </div>
    </section>
  );
}
