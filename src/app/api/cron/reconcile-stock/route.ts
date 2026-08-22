// src/app/api/cron/reconcile-stock/route.ts
// Nightly stock reconciliation. Read-only by default.
//
// Drift used to accumulate in silence — a sale that missed its variant row, a
// settlement that ran twice, a refund that never gave anything back. Nothing
// compared the numbers, so the first sign was a customer buying something that
// was not there. This job does the comparison every night and says so.
//
// It reports; it does not repair. Which number is true is a judgement call that
// depends on a physical count, and a job that silently rewrote stock would be
// the same class of bug it exists to catch. Pass ?repair=rollup to rebuild
// product roll-ups from their variant rows — the one correction that is always
// safe, because on a variant-tracked product the variant rows are the record
// and the roll-up is derived from them.

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { syncProductStockFromVariants } from "@/lib/inventory";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

type Drift = {
    productId: string;
    name: string;
    isActive: boolean;
    rollup: number;
    variantSum: number;
    delta: number;
};

export async function GET(req: Request) {
    const authHeader = req.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const repair = url.searchParams.get("repair");

    try {
        const [products, variants] = await Promise.all([
            supabaseAdmin
                .from("products")
                .select("id, name, inventory_count, is_active, track_variant_inventory, track_inventory")
                .eq("track_variant_inventory", true),
            supabaseAdmin
                .from("product_variants")
                .select("product_id, inventory_count"),
        ]);

        if (products.error) throw new Error(products.error.message);
        if (variants.error) throw new Error(variants.error.message);

        const sums = new Map<string, number>();
        for (const v of variants.data ?? []) {
            sums.set(v.product_id, (sums.get(v.product_id) ?? 0) + (Number(v.inventory_count) || 0));
        }

        // 9999 is the "not tracked" sentinel. On a product that does track
        // inventory it is not a quantity, it is damage: the old admin form left
        // it behind and the product then read as having unlimited stock.
        const sentinelStranded: Drift[] = [];
        const drift: Drift[] = [];

        for (const p of products.data ?? []) {
            const rollup = Number(p.inventory_count) || 0;
            const variantSum = sums.get(p.id) ?? 0;
            const row: Drift = {
                productId: p.id,
                name: p.name,
                isActive: p.is_active ?? false,
                rollup,
                variantSum,
                delta: rollup - variantSum,
            };

            if (rollup === 9999 && p.track_inventory !== false) {
                sentinelStranded.push(row);
                continue;
            }
            if (row.delta !== 0) drift.push(row);
        }

        drift.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));

        // A negative delta means the roll-up sits below the sum of its variants:
        // the fingerprint of a sale that decremented the product but not the
        // variant row. Those variant rows are overstated, which is the direction
        // that oversells.
        const phantomUnits = drift
            .filter(d => d.delta < 0)
            .reduce((n, d) => n + Math.abs(d.delta), 0);

        // Settlements the ledger recorded but could not place on a variant row.
        const { data: unplaced } = await supabaseAdmin
            .from("stock_movements")
            .select("product_id, order_id, delta, created_at, note")
            .eq("reason", "sale_unresolved_variant")
            .order("created_at", { ascending: false })
            .limit(50);

        let repaired: Array<{ productId: string; name: string; from: number; to: number }> = [];
        if (repair === "rollup") {
            // Safe because on a variant-tracked product the variant rows are the
            // record of what is on the shelf and the roll-up is only their sum.
            // Deliberately excludes the 9999 group: a stranded sentinel needs a
            // human to confirm the product really is stock-tracked first.
            for (const d of drift) {
                await syncProductStockFromVariants(d.productId);
                repaired.push({ productId: d.productId, name: d.name, from: d.rollup, to: d.variantSum });
            }
        }

        const summary = {
            checkedProducts: products.data?.length ?? 0,
            driftingProducts: drift.length,
            driftingActiveProducts: drift.filter(d => d.isActive).length,
            phantomUnits,
            sentinelStranded: sentinelStranded.length,
            unresolvedVariantSales: unplaced?.length ?? 0,
            repaired: repaired.length,
        };

        if (drift.length > 0 || sentinelStranded.length > 0 || (unplaced?.length ?? 0) > 0) {
            console.warn("[cron/reconcile-stock] drift detected", summary);
        } else {
            console.log("[cron/reconcile-stock] clean", summary);
        }

        return NextResponse.json({
            ok: true,
            ranAt: new Date().toISOString(),
            summary,
            drift: drift.slice(0, 100),
            sentinelStranded: sentinelStranded.slice(0, 100),
            unresolvedVariantSales: unplaced ?? [],
            repaired,
        });
    } catch (e: any) {
        // Never surface the raw error to a caller — this endpoint is reachable
        // with a secret, but the rule is the rule.
        console.error("[cron/reconcile-stock] failed:", e?.message, e);
        return NextResponse.json(
            { ok: false, error: "Stock reconciliation could not complete. Please try again shortly." },
            { status: 500 },
        );
    }
}
