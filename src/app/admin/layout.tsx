import { Toaster } from "@/components/ui/miss-tokyo/Toaster";

export default function Layout({ children }: { children: React.ReactNode }) {
    return (<>{children}<Toaster /></>);
}
