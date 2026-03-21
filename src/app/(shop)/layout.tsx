import { NavBar } from "@/components/ui/miss-tokyo/NavBar";
import { Footer } from "@/components/ui/miss-tokyo/Footer";
import { Toaster } from "@/components/ui/miss-tokyo/Toaster";
import { CartDrawer } from "@/components/ui/miss-tokyo/CartDrawer";
import { supabase } from "@/lib/supabase";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export default async function ShopLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { data } = await supabaseAdmin.from("store_settings").select("maintenance_mode").eq("id", "default").maybeSingle();
    const isMaintenanceMode = data?.maintenance_mode || false;

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
            <NavBar />
            <main className="flex-1 pt-20">
                {children}
            </main>
            <Footer />
            <Toaster />
            <CartDrawer />
        </div>
    );
}
