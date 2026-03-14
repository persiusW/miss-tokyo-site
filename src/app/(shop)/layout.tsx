import { Header } from "@/components/ui/miss-tokyo/Header";
import { Footer } from "@/components/ui/miss-tokyo/Footer";
import { createClient } from "@/lib/supabaseServer";

export default async function ShopLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const supabase = await createClient();
    const { data: copyData } = await supabase.from("site_copy").select("copy_key, value");
    
    // Simple helper to get copy by key
    const siteCopy = (copyData || []).reduce((acc: Record<string, string>, row) => ({
        ...acc,
        [row.copy_key]: row.value
    }), {} as Record<string, string>);

    return (
        <div className="min-h-screen flex flex-col bg-white">
            <Header />
            <div className="flex-1">
                {children}
            </div>
            <Footer siteCopy={siteCopy} />
        </div>
    );
}
