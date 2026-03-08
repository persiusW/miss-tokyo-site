"use client";

import { useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "@/lib/toast";

export function RealtimeStockMonitor() {
    useEffect(() => {
        const channel = supabase
            .channel("products-stock-monitor")
            .on(
                "postgres_changes",
                { event: "UPDATE", schema: "public", table: "products" },
                (payload) => {
                    const updated = payload.new as { name: string; inventory_count: number; is_active: boolean };
                    if (updated.is_active && typeof updated.inventory_count === "number" && updated.inventory_count < 5) {
                        const msg = updated.inventory_count === 0
                            ? `${updated.name} is out of stock.`
                            : `Low stock: ${updated.name} — ${updated.inventory_count} remaining.`;
                        toast.error(msg);
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    return null;
}
