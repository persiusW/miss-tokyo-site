import { NavBar } from "@/components/ui/badu/NavBar";
import { Footer } from "@/components/ui/badu/Footer";
import { Toaster } from "@/components/ui/badu/Toaster";

export default function ShopLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen flex flex-col bg-white">
            <NavBar />
            <main className="flex-1">
                {children}
            </main>
            <Footer />
            <Toaster />
        </div>
    );
}
