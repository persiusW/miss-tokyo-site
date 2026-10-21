import type { Metadata } from "next";
import { PolicyBody } from "@/components/public/PolicyBody";
import { loadPolicy, pageSeo } from "@/lib/content/load";

// The text is edited in the admin (Content › Pages); the original wording is
// the fallback. Publishing there refreshes this page straight away.
export const revalidate = 300;

export function generateMetadata(): Promise<Metadata> {
    return pageSeo("/policies/terms-and-conditions", { title: "Terms & Conditions — Miss Tokyo" });
}

export default async function TermsAndConditionsPage() {
    const doc = await loadPolicy("terms");
    return (
        <div className="pt-32 pb-24 px-6 md:px-12 max-w-3xl mx-auto min-h-screen">
            <p className="text-[10px] uppercase tracking-[0.3em] text-neutral-400 mb-4">Policies</p>
            <h1 className="font-serif text-4xl md:text-5xl tracking-widest uppercase mb-16">Terms &amp; Conditions</h1>
            <PolicyBody doc={doc} />
        </div>
    );
}
