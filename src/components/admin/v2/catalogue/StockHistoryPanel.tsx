"use client";

// Stock history (BACKEND_GAPS 10): the ledger for one product or one size,
// in plain words, newest first. Read-only.
import { useCallback, useEffect, useState } from "react";
import { Btn, Empty, ErrorState, Panel, SkeletonRows, when } from "@/components/admin/ui";
import { historyLine, type HistoryRow } from "@/lib/admin/v2/catalogue";
import { stockHistory } from "./actions";

export function StockHistoryPanel({ productId, productName, variantId, option, level, onClose }: {
    productId: string; productName: string; variantId: string | null; option?: string; level?: 1 | 2; onClose: () => void;
}) {
    const [rows, setRows] = useState<HistoryRow[] | null>(null);
    const [failed, setFailed] = useState(false);
    const [more, setMore] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);

    const load = useCallback(async (before: string | null) => {
        const r = await stockHistory(productId, variantId, before);
        if (!r.ok) { setFailed(true); return; }
        setFailed(false);
        setRows(prev => (before && prev ? [...prev, ...r.rows] : r.rows));
        setMore(r.rows.length >= 40);
    }, [productId, variantId]);

    useEffect(() => { void load(null); }, [load]);

    const older = async () => {
        if (!rows?.length) return;
        setLoadingMore(true);
        await load(rows[rows.length - 1].created_at);
        setLoadingMore(false);
    };

    return (
        <Panel open level={level} onClose={onClose} title="Stock history" sub={option ? `${productName} · ${option}` : productName}
            footer={<Btn onClick={onClose}>Close</Btn>}>
            <div className="card cat-inset">
                {failed ? <ErrorState what="the stock history" onRetry={() => { setRows(null); void load(null); }} />
                    : rows === null ? <SkeletonRows n={5} cols={3} />
                    : rows.length === 0 ? <Empty icon="clock" title="No stock changes yet" body="Sales, returns, deliveries, counts and corrections appear here as they happen." />
                    : (
                        <div className="rows">
                            {rows.map(r => {
                                const l = historyLine(r);
                                return (
                                    <div className="row" key={r.id}>
                                        <div className="row-main">
                                            <div className="row-title">{l.title}</div>
                                            <div className="row-sub">{[l.sub, when(r.created_at)].filter(Boolean).join(" · ")}</div>
                                        </div>
                                        <div className={`strong num ${l.up ? "cat-ok" : ""}`}>{l.qty}</div>
                                    </div>
                                );
                            })}
                            {more && <div className="cat-hist-more"><Btn sm kind="ghost" onClick={older} disabled={loadingMore}>{loadingMore ? "Loading…" : "Show older changes"}</Btn></div>}
                        </div>
                    )}
            </div>
        </Panel>
    );
}
