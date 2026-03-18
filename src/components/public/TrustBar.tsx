import type { TrustBarItem } from "@/types/settings";

interface TrustBarProps {
  enabled: boolean;
  items: TrustBarItem[];
}

export function TrustBar({ enabled, items }: TrustBarProps) {
  if (!enabled) return null;

  const visibleItems = items.filter((item) => item.enabled);
  if (visibleItems.length === 0) return null;

  return (
    <div className="bg-[#111] text-white h-10 flex items-center justify-center w-full overflow-hidden">
      <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 px-4">
        {visibleItems.map((item, index) => (
          <span key={item.id} className="flex items-center gap-4">
            <span className="text-[10px] uppercase tracking-[0.15em] whitespace-nowrap">
              {item.text}
            </span>
            {index < visibleItems.length - 1 && (
              <span className="text-white/30 text-[10px]" aria-hidden="true">
                ·
              </span>
            )}
          </span>
        ))}
      </div>
    </div>
  );
}
