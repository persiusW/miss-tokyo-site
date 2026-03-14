import Link from "next/link";
import { Instagram, Music2, MessageCircle } from "lucide-react";
import { NewsletterBanner } from "./NewsletterBanner";

interface FooterProps {
  siteCopy?: Record<string, string>;
}

export function Footer({ siteCopy = {} }: FooterProps) {
  return (
    <footer>
      {/* ── Newsletter Banner ── */}
      <NewsletterBanner />

      {/* ── 3-Column Bottom Grid ── */}
      <div className="bg-gray-100 px-6 md:px-10 py-14">
        <div className="max-w-screen-xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-10">
          {/* Col 1 — Brand */}
          <div>
            <p className="font-serif text-base tracking-widest uppercase text-gray-900 mb-4">
              Miss Tokyo
            </p>
            <p className="text-[11px] leading-relaxed text-gray-600 tracking-wide uppercase max-w-xs">
              {siteCopy.footer_text || `Step into Miss Tokyo — your all-girl destination for everything
              cute, cool, and unmistakably feminine. From statement streetwear
              and delicate accessories to dreamy perfumes and everyday
              must-haves, we've got everything you need to serve looks on a
              budget.`}
            </p>
            <div className="flex items-center gap-4 mt-5">
              <a
                href="https://instagram.com/misstokyo"
                target="_blank"
                rel="noreferrer"
                aria-label="Instagram"
                className="text-gray-600 hover:text-black transition-colors"
              >
                <Instagram size={17} strokeWidth={1.5} />
              </a>
              <a
                href="https://tiktok.com/@misstokyo"
                target="_blank"
                rel="noreferrer"
                aria-label="TikTok"
                className="text-gray-600 hover:text-black transition-colors"
              >
                <Music2 size={17} strokeWidth={1.5} />
              </a>
              <a
                href="https://wa.me/233550000000"
                target="_blank"
                rel="noreferrer"
                aria-label="WhatsApp"
                className="text-gray-600 hover:text-black transition-colors"
              >
                <MessageCircle size={17} strokeWidth={1.5} />
              </a>
            </div>
          </div>

          {/* Col 2 — Categories */}
          <div>
            <p className="font-serif text-base tracking-wide uppercase text-gray-900 mb-4">
              Categories
            </p>
            <ul className="flex flex-col gap-2">
              {["Women", "Tops", "Leggings", "Pants"].map((cat) => (
                <li key={cat}>
                  <Link
                    href={`/shop?filter=${cat.toLowerCase()}`}
                    className={`text-[11px] uppercase tracking-widest transition-colors hover:text-black ${
                      cat === "Women"
                        ? "text-gray-900 font-semibold"
                        : "text-gray-500"
                    }`}
                  >
                    {cat}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Col 3 — Contact & Policies */}
          <div>
            <p className="font-serif text-base tracking-wide uppercase text-gray-900 mb-4">
              Contact
            </p>
            <address className="not-italic text-[11px] uppercase tracking-widest text-gray-500 leading-relaxed">
              <p>Miss Tokyo</p>
              <p>{siteCopy.about_us_text || "Dome Road Accra Ghana"}</p>
              <a
                href={`mailto:${siteCopy.contact_email || "orders@misstokyo.shop"}`}
                className="hover:text-black transition-colors"
              >
                {siteCopy.contact_email || "orders@misstokyo.shop"}
              </a>
              <p>
                Tel:{" "}
                <a
                  href={`tel:${siteCopy.contact_phone || "0553898704"}`}
                  className="hover:text-black transition-colors"
                >
                  {siteCopy.contact_phone || "055 389 8704"}
                </a>
              </p>
            </address>

            <p className="font-serif text-sm tracking-wide uppercase text-gray-900 mt-6 mb-3">
              Shop Policies
            </p>
            <ul className="flex flex-col gap-2">
              {[
                { label: "Refund Policy", href: "/refund-policy" },
                { label: "Shipping Policy", href: "/shipping-policy" },
              ].map((p) => (
                <li key={p.href}>
                  <Link
                    href={p.href}
                    className="text-[11px] uppercase tracking-widest text-gray-500 underline underline-offset-2 hover:text-black transition-colors"
                  >
                    {p.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* ── Bottom Bar ── */}
      <div className="bg-gray-100 border-t border-gray-200 px-6 md:px-10 py-4">
        <div className="max-w-screen-xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <p className="text-[10px] uppercase tracking-widest text-gray-400">
            © 2026 By Dashttp
          </p>
          <div className="flex flex-wrap gap-4">
            {[
              { label: "Terms & Conditions", href: "/terms-and-conditions" },
              { label: "Privacy Policy", href: "/privacy-policy" },
              { label: "Accessibility Statement", href: "/accessibility-statement" },
            ].map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-[10px] uppercase tracking-widest text-gray-400 underline underline-offset-2 hover:text-black transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
