import Image from "next/image";
import Link from "next/link";

interface InstagramPost {
  id: string;
  media_url: string;
  permalink: string;
  thumbnail_url?: string;
}

interface InstagramFeedProps {
  instagramUrl: string | null;
  accessToken: string | null;
}

const PLACEHOLDER_GRADIENTS = [
  "bg-gradient-to-br from-rose-200 to-orange-300",
  "bg-gradient-to-br from-purple-300 to-indigo-400",
  "bg-gradient-to-br from-teal-300 to-green-400",
  "bg-gradient-to-br from-amber-200 to-yellow-300",
  "bg-gradient-to-br from-pink-300 to-rose-400",
  "bg-gradient-to-br from-sky-300 to-blue-400",
];

async function fetchInstagramPosts(accessToken: string): Promise<InstagramPost[]> {
  const url = `https://graph.instagram.com/me/media?fields=id,media_url,permalink,thumbnail_url&limit=6&access_token=${accessToken}`;
  const res = await fetch(url, { next: { revalidate: 3600 } });
  if (!res.ok) throw new Error("Instagram fetch failed");
  const data = await res.json();
  return (data.data || []) as InstagramPost[];
}

function extractHandle(instagramUrl: string | null): string {
  if (!instagramUrl) return "@misstokyo__";
  const raw = instagramUrl.split("instagram.com/")[1]?.replace("/", "") || "misstokyo__";
  return `@${raw}`;
}

export async function InstagramFeed({ instagramUrl, accessToken }: InstagramFeedProps) {
  let posts: InstagramPost[] = [];

  if (accessToken) {
    try {
      posts = await fetchInstagramPosts(accessToken);
    } catch {
      // Fall through to placeholder
    }
  }

  const handle = extractHandle(instagramUrl);
  const hasPosts = posts.length > 0;
  const tiles = hasPosts ? posts.slice(0, 6) : Array.from({ length: 6 });

  return (
    <section className="bg-white py-20">
      <div className="max-w-7xl mx-auto px-6 md:px-12">
        {/* Header */}
        <div className="flex items-end justify-between mb-8">
          <div>
            <p className="text-[9px] tracking-[0.4em] uppercase text-neutral-400 mb-3">
              FOLLOW US
            </p>
            <h2 className="font-serif text-3xl md:text-4xl text-black font-bold">
              {handle}
            </h2>
          </div>
          {instagramUrl && (
            <Link
              href={instagramUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] tracking-[0.25em] uppercase text-black hover:text-neutral-500 transition-colors pb-1 border-b border-black hover:border-neutral-500 whitespace-nowrap"
            >
              FOLLOW ON INSTAGRAM →
            </Link>
          )}
        </div>

        {/* Feed grid */}
        <div className="grid grid-cols-3 md:grid-cols-6 gap-1">
          {tiles.map((post, index) => {
            const p = post as InstagramPost | undefined;
            const imageUrl = p?.thumbnail_url || p?.media_url || null;
            const permalink = p?.permalink || (instagramUrl ?? "#");
            const gradient = PLACEHOLDER_GRADIENTS[index % PLACEHOLDER_GRADIENTS.length];

            return (
              <Link
                key={p?.id ?? index}
                href={permalink}
                target="_blank"
                rel="noopener noreferrer"
                className="relative aspect-square overflow-hidden group block"
                aria-label={`Instagram post ${index + 1}`}
              >
                {imageUrl ? (
                  <Image
                    src={imageUrl}
                    alt={`Instagram post ${index + 1}`}
                    fill
                    className="object-cover object-center group-hover:scale-105 transition-transform duration-500"
                    sizes="(max-width: 768px) 33vw, 16vw"
                  />
                ) : (
                  <div className={`absolute inset-0 ${gradient} group-hover:scale-105 transition-transform duration-500`} />
                )}
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
