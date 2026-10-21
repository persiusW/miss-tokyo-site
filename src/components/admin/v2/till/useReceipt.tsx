"use client";

// Prints a till sale's receipt: the same sheet the order panel's "Print
// receipt" prints, loaded through the Orders action (order staff only).
import { useEffect, useState } from "react";
import { toast } from "@/components/admin/ui";
import { getOrder } from "../orders/actions";
import { Receipt } from "../orders/PrintSheets";
import type { OrderDetail } from "@/lib/admin/v2/ordersLoad";
import "../orders/orders.css";

export function useReceipt() {
    const [detail, setDetail] = useState<OrderDetail | null>(null);
    const [busy, setBusy] = useState(false);
    useEffect(() => {
        if (!detail) return;
        const t = setTimeout(() => { window.print(); setDetail(null); }, 50);
        return () => clearTimeout(t);
    }, [detail]);
    const print = async (orderId: string | null) => {
        if (!orderId) { toast.error("The order isn't ready yet. Try again in a moment."); return; }
        setBusy(true);
        try {
            const r = await getOrder(orderId);
            if (!r.ok) { toast.error(r.error); return; }
            setDetail(r.detail);
        } catch {
            toast.error("We couldn't load the receipt. Please try again.");
        } finally {
            setBusy(false);
        }
    };
    return { print, busy, node: detail ? <Receipt d={detail} /> : null };
}
