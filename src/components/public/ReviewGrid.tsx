import type { HomepageReview } from "@/types/settings";

interface ReviewGridProps {
  reviews: HomepageReview[];
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5" aria-label={`${rating} out of 5 stars`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <span
          key={i}
          className={i < rating ? "text-[#C8A97A]" : "text-neutral-300"}
          aria-hidden="true"
        >
          ★
        </span>
      ))}
    </div>
  );
}

export function ReviewGrid({ reviews }: ReviewGridProps) {
  if (reviews.length === 0) return null;

  return (
    <section style={{ backgroundColor: "var(--sand)" }} className="py-24">
      <div className="max-w-7xl mx-auto px-6 md:px-12">
        {/* Section header */}
        <div className="flex items-end justify-between mb-12">
          <div>
            <p className="section-eyebrow">WHAT OUR CUSTOMERS SAY</p>
            <h2 className="section-title">
              Real <em>Looks,</em> Real Love
            </h2>
          </div>

          {/* Aggregate rating */}
          <div className="hidden md:flex flex-col items-end gap-1">
            <div className="flex items-center gap-1 text-[#C8A97A] text-lg">
              ★★★★★
            </div>
            <p className="text-xs tracking-widest text-neutral-500 uppercase">
              4.9 / 5 &nbsp;(200+ reviews)
            </p>
          </div>
        </div>

        {/* Reviews grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {reviews.map((review) => (
            <article key={review.id} className="bg-white p-6 shadow-sm">
              <StarRating rating={review.star_rating} />

              <p className="text-sm leading-relaxed text-neutral-700 mt-3">
                &ldquo;{review.review_text}&rdquo;
              </p>

              {/* Reviewer info */}
              <div className="flex items-center gap-3 mt-6 pt-6 border-t border-neutral-100">
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                  style={{ backgroundColor: review.avatar_color }}
                  aria-hidden="true"
                >
                  {review.avatar_initials}
                </div>
                <div>
                  <p className="text-xs font-medium text-neutral-800 tracking-wide">
                    {review.reviewer_name}
                  </p>
                  {review.reviewer_location && (
                    <p className="text-[10px] text-neutral-400 tracking-widest uppercase mt-0.5">
                      {review.reviewer_location}
                    </p>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
