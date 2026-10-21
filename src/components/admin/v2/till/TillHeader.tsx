"use client";

// The Till header and its two route tabs: New sale and Today's sales (sales
// staff see "My sales today", their own sales only).
import { Btn, PageHeader, Tabs, toast } from "@/components/admin/ui";
import { tillLastReceipt } from "./actions";
import { useReceipt } from "./useReceipt";

export function TillHeader({ tab, role }: { tab: "sale" | "today"; role: string }) {
    const receipt = useReceipt();
    const reprint = async () => {
        const r = await tillLastReceipt();
        if (!r.ok) { toast.error(r.error); return; }
        if (!r.orderId) { toast.info("You haven't completed a till sale yet, so there's no receipt to reprint."); return; }
        await receipt.print(r.orderId);
    };
    return (
        <>
            <PageHeader title="Till" sub="Sell in the atelier or over the phone. Take cash or send a pay link."
                actions={<Btn kind="ghost" icon="print" onClick={() => void reprint()} disabled={receipt.busy}>{receipt.busy ? "Getting the receipt…" : "Reprint last receipt"}</Btn>} />
            <Tabs label="Till sections" value={tab} tabs={[
                { v: "sale", l: "New sale", href: "/till" },
                { v: "today", l: role === "sales_staff" ? "My sales today" : "Today's sales", href: "/till/today" },
            ]} />
            {receipt.node}
        </>
    );
}
