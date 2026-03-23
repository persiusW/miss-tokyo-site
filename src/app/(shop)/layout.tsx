import { NavBar } from "@/components/ui/miss-tokyo/NavBar";
import { Footer } from "@/components/ui/miss-tokyo/Footer";
import { Toaster } from "@/components/ui/miss-tokyo/Toaster";
import { CartDrawer } from "@/components/ui/miss-tokyo/CartDrawer";
import { unstable_cache } from "next/cache";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

// ── ISR-SAFE: supabaseAdmin does NOT call cookies() so this layout never opts
// pages out of static caching. Maintenance mode changes rarely — 60 s TTL.
const getMaintenanceMode = unstable_cache(
    async () => {
        const { data } = await supabaseAdmin
            .from("store_settings")
            .select("maintenance_mode")
            .eq("id", "default")
            .maybeSingle();
        return data?.maintenance_mode ?? false;
    },
    ["maintenance-mode"],
    { revalidate: 60 }
);

export default async function ShopLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const isMaintenanceMode = await getMaintenanceMode();

    if (isMaintenanceMode) {
        return (
            <div className="min-h-screen flex flex-col bg-white">
                <main className="flex-1 flex flex-col items-center justify-center p-6 text-center">
                    <h1 className="font-serif text-4xl md:text-5xl tracking-widest uppercase mb-6">MISS TOKYO</h1>
                    <p className="text-neutral-500 tracking-widest uppercase text-sm max-w-md mx-auto leading-relaxed">
                        We are currently preparing something new. <br /><br /> Our atelier will return shortly.
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
            <NavBar initialUser={null} />
            <main className="flex-1 pt-20">
                {children}
            </main>
            <Footer />
            <Toaster />
            <CartDrawer />
        </div>
    );
}
