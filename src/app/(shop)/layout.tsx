import { NavBar } from "@/components/ui/miss-tokyo/NavBar";
import { Footer } from "@/components/ui/miss-tokyo/Footer";
import { Toaster } from "@/components/ui/miss-tokyo/Toaster";
import { ErrorNet } from "@/components/errors/ErrorNet";
import { CartDrawer } from "@/components/ui/miss-tokyo/CartDrawer";
import { MobileTabBar } from "@/components/ui/miss-tokyo/MobileTabBar";
import { PWAInstallBanner } from "@/components/ui/miss-tokyo/PWAInstallBanner";
import { unstable_cache } from "next/cache";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { AskMissTokyo } from "@/components/shop/askMissTokyo/AskMissTokyo";
import { DEFAULT_NAV, NAV_TAG, shopNavFrom } from "@/lib/content/shopNav";
import { NAV_KEYS } from "@/lib/content/adminInput";

export const revalidate = 60;

// ── ISR-SAFE: supabaseAdmin does NOT call cookies() so this layout never opts
// pages out of static caching. Maintenance mode changes rarely — 60 s TTL.
const getMaintenanceMode = unstable_cache(
    async () => {
        try {
            const result = await Promise.race([
                supabaseAdmin
                    .from("store_settings")
                    .select("maintenance_mode")
                    .eq("id", "default")
                    .maybeSingle(),
                new Promise<{ data: null }>((resolve) =>
                    setTimeout(() => resolve({ data: null }), 5000)
                ),
            ]);
            return result.data?.maintenance_mode ?? false;
        } catch {
            return false;
        }
    },
    ["maintenance-mode"],
    { revalidate: 60 }
);

// The chat switch, cached like maintenance mode so pages stay static.
// SHOP_ASSISTANT_FORCE_ENABLED=1 shows it in local development only (browser tests).
const getShopAssistantEnabled = unstable_cache(
    async () => {
        try {
            const { data } = await supabaseAdmin.from("ai_settings").select("value").eq("key", "shop_assistant_enabled").maybeSingle();
            return data?.value === true;
        } catch {
            return false;
        }
    },
    ["shop-assistant-enabled"],
    { revalidate: 60 }
);

// The menu's links (Content › Menu) and which optional pages are on
// (Settings › Shop pages), read on the server so the first paint is right and
// cached like maintenance mode. Saving either expires NAV_TAG.
const getShopNav = unstable_cache(
    async () => {
        try {
            const [site, store] = await Promise.all([
                supabaseAdmin.from("site_settings").select(NAV_KEYS.join(", ")).eq("id", "singleton").maybeSingle(),
                supabaseAdmin.from("store_settings").select("enable_gallery, enable_gift_cards").eq("id", "default").maybeSingle(),
            ]);
            if (site.error || store.error) return DEFAULT_NAV;
            return shopNavFrom(site.data as unknown as Record<string, boolean | null> | null, store.data);
        } catch {
            return DEFAULT_NAV;
        }
    },
    ["shop-nav"],
    { revalidate: 60, tags: [NAV_TAG] }
);

export default async function ShopLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const [isMaintenanceMode, nav] = await Promise.all([getMaintenanceMode(), getShopNav()]);
    const askEnabled = (process.env.NODE_ENV !== "production" && process.env.SHOP_ASSISTANT_FORCE_ENABLED === "1")
        || ((await getShopAssistantEnabled()) && !!process.env.ANTHROPIC_API_KEY);

    if (isMaintenanceMode) {
        return (
            <div className="min-h-screen flex flex-col bg-white">
                <main className="flex-1 flex flex-col items-center justify-center p-6 text-center">
                    <h1 className="font-serif text-4xl md:text-5xl tracking-widest uppercase mb-6">MISS TOKYO</h1>
                    <p className="text-neutral-500 tracking-widest uppercase text-sm max-w-md mx-auto leading-relaxed">
                        We are currently preparing something new. <br /><br /> Our Shop will return shortly.
                    </p>
                </main>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col bg-white">
            {/*
              * initialUser is intentionally null here.
              * NavBar is a client component — supabase.auth.onAuthStateChange() fires
              * on mount and sets isLoggedIn correctly from the browser session.
              * Removing server-side auth.getUser() from the layout prevents cookies()
              * from being called, which restores ISR for every page under (shop).
              */}
            <NavBar initialUser={null} nav={nav} />
            <main className="flex-1 flex flex-col pt-20 pb-safe-tab bg-[#f5f0e8]">
                {children}
            </main>
            <Footer />
            <Toaster />
            <ErrorNet />
            <CartDrawer />
            <AskMissTokyo enabled={askEnabled} />
            <MobileTabBar nav={nav} />
            <PWAInstallBanner />
        </div>
    );
}
