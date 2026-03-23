"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import type { HeroSlide } from "@/types/settings";

interface HeroSliderProps {
  slides: HeroSlide[];
}

const FALLBACK_SLIDE: HeroSlide = {
  id: "fallback",
  position: 1,
  enabled: true,
  image_url: null,
  overlay_opacity: 0.55,
  eyebrow: "New Collection",
  headline_line1: "Made for",
  headline_line2: "the Bold",
  headline_line3: "",
  body_text: "Explore our latest curated collection — crafted for those who dare to stand out.",
  cta_primary_label: "Shop Now",
  cta_primary_url: "/shop",
  cta_secondary_label: "New Arrivals",
  cta_secondary_url: "/new-arrivals",
} as HeroSlide;

export function HeroSlider({ slides }: HeroSliderProps) {
  const activeSlides = slides.length > 0 ? slides : [FALLBACK_SLIDE];
  const firstSlide = activeSlides[0];
  const [current, setCurrent] = useState(0);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    fetch("/api/me")
      .then(r => r.json())
      .then(({ isAdmin }) => { if (isAdmin) setIsAdmin(true); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (activeSlides.length <= 1) return;
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % activeSlides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [activeSlides.length]);

  return (
    <section
      className="relative overflow-hidden"
      style={{ height: "calc(100vh - 120px)" }}
      aria-live="polite"
      aria-label="Hero slideshow"
    >
      {/* SPD-02: First slide image rendered eagerly outside the slider loop so the
          server emits a <link rel="preload"> immediately, improving LCP. */}
      {firstSlide.image_url && (
        <Image
          src={firstSlide.image_url}
          alt={firstSlide.headline_line1}
          fill
          priority
          sizes="100vw"
          className={`object-cover object-center transition-opacity duration-1000 ${current === 0 ? "opacity-100" : "opacity-0"}`}
        />
      )}

      {activeSlides.map((slide, index) => (
        <div
          key={slide.id}
          className="absolute inset-0 transition-opacity duration-1000"
          style={{ opacity: index === current ? 1 : 0 }}
          aria-hidden={index !== current}
        >
          {/* Background image: index 0 already rendered eagerly above */}
          {index !== 0 && slide.image_url ? (
            <Image
              src={slide.image_url}
              alt={slide.headline_line1}
              fill
              quality={85}
              className="object-cover object-center"
              sizes="100vw"
            />
          ) : !slide.image_url ? (
            <div
              className="absolute inset-0"
              style={{ background: "linear-gradient(135deg, #1a1208 0%, #2d1f0e 40%, #141210 100%)" }}
            />
          ) : null}

          {/* Dark overlay */}
          <div
            className="absolute inset-0 bg-black"
            style={{ opacity: slide.overlay_opacity }}
          />

          {/* Content */}
          <div className="absolute inset-0 flex flex-col justify-end pb-16 pl-12 md:pl-20 lg:pl-32">
            {/* Eyebrow */}
            {slide.eyebrow && (
              <p className="text-white/70 text-[10px] tracking-[0.3em] uppercase mb-4">
                — {slide.eyebrow}
              </p>
            )}

            {/* Headline */}
            <h1 className="font-serif text-6xl md:text-7xl lg:text-8xl leading-none mb-4">
              {slide.headline_line1 && (
                <span className="block text-white">{slide.headline_line1}</span>
              )}
              {slide.headline_line2 && (
                <span className="block italic" style={{ color: "var(--gold, #C8A97A)" }}>
                  {slide.headline_line2}
                </span>
              )}
              {slide.headline_line3 && (
                <span className="block text-white">{slide.headline_line3}</span>
              )}
            </h1>

            {/* Body text */}
            {slide.body_text && (
              <p className="text-white/80 text-sm max-w-sm mt-4 leading-relaxed mb-8">
                {slide.body_text}
              </p>
            )}

            {/* CTA Buttons */}
            <div className="flex flex-wrap items-center gap-3 mt-2">
              <Link
                href={slide.cta_primary_url}
                className="bg-white text-black px-8 py-3.5 text-[10px] tracking-[0.25em] uppercase font-bold hover:bg-black hover:text-white border border-white transition-all duration-300"
              >
                {slide.cta_primary_label}
              </Link>
              {slide.cta_secondary_label && slide.cta_secondary_url && (
                <Link
                  href={slide.cta_secondary_url}
                  className="border border-white text-white px-8 py-3.5 text-[10px] tracking-[0.25em] uppercase hover:bg-white hover:text-black transition-all duration-300"
                >
                  {slide.cta_secondary_label}
                </Link>
              )}
            </div>
          </div>
        </div>
      ))}

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-12 text-white/50 text-[9px] tracking-[0.4em] uppercase flex items-center gap-3 pointer-events-none">
        <span>—</span>
        <span>SCROLL</span>
      </div>

      {/* Dot navigation */}
      {activeSlides.length > 1 && (
        <div className="absolute bottom-8 right-12 flex items-center gap-2">
          {activeSlides.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrent(index)}
              aria-label={`Go to slide ${index + 1}`}
              className={`transition-all duration-300 ${
                index === current
                  ? "w-8 h-[2px] bg-white"
                  : "w-2 h-[2px] bg-white/40 hover:bg-white/70"
              }`}
            />
          ))}
        </div>
      )}

      {/* Admin edit shortcut */}
      {isAdmin && (
        <Link
          href="/cms?tab=hero-slides"
          style={{
            position: "absolute", top: 16, right: 16, zIndex: 10,
            display: "flex", alignItems: "center", gap: 6,
            background: "rgba(20,18,16,0.75)", backdropFilter: "blur(6px)",
            border: "1px solid rgba(255,255,255,0.18)",
            color: "#fff", fontSize: 10, letterSpacing: "0.15em",
            textTransform: "uppercase", padding: "7px 14px", borderRadius: 3,
            textDecoration: "none", transition: "background 0.15s",
          }}
          onMouseEnter={e => (e.currentTarget.style.background = "rgba(20,18,16,0.95)")}
          onMouseLeave={e => (e.currentTarget.style.background = "rgba(20,18,16,0.75)")}
          aria-label="Edit hero slides"
        >
          <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
          Edit Slides
        </Link>
      )}
    </section>
  );
}
