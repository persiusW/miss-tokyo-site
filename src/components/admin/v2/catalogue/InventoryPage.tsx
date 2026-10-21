"use client";

// Products › Inventory (/catalogue/inventory): every size and colour with its
// stock, the Running low view (it replaces the old Low Stock page), Adjust
// with a reason (gap 9) and the readable stock history (gap 10). Paged and
// counted on the server (fn_inventory_rows); the numbers match Home's.
import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
    Badge, Banner, Btn, BtnLink, Card, Chip, Empty, ErrorState, Field, Kpi, Panel, RadioCards, Search, Seg, SkeletonRows, Thumb, plural, toast,
} from "@/components/admin/ui";
import {
    ADJUST_LABEL, INVENTORY_VIEWS, PAGE_SIZE, STATE_BADGE, optionText, planAdjust, querySearch, type AdjustReason, type InventoryQuery, type InventoryView,
} from "@/lib/admin/v2/catalogue";
import type { InventoryData, InventoryRow } from "@/lib/admin/v2/catalogueLoad";
import { CatalogueHeader } from "./CatalogueHeader";
import { StockHistoryPanel } from "./StockHistoryPanel";

export function InventoryPage({ query, data, restockAlertsOn }: { query: InventoryQuery; data: InventoryData | null; restockAlertsOn: boolean }) {
    const router = useRouter();
    const [pending, start] = useTransition();
    const [term, setTerm] = useState(query.q);
    const [adjust, setAdjust] = useState<{ row: InventoryRow; reason: AdjustReason } | null>(null);
    const [history, setHistory] = useState<InventoryRow | null>(null);

    useEffect(() => { setTerm(query.q); }, [query.q]);
    const go = (patch: Partial<InventoryQuery>) => start(() => router.push(`/catalogue/inventory${querySearch(query, { page: 1, ...patch })}`, { scroll: false }));
    useEffect(() => {
        if (term.trim() === query.q) return;
        const t = setTimeout(() => go({ q: term.trim() }), 350);
        return () => clearTimeout(t);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [term]);

    const pages = Math.max(1, Math.ceil((data?.total ?? 0) / PAGE_SIZE));
    const s = data?.summary;
    const counts: Record<InventoryView, number | null> = { all: null, low: s?.low ?? null, out: s?.out ?? null };

    return (
        <>
            <CatalogueHeader tab="inventory" actions={<BtnLink kind="ghost" icon="download" href="/api/admin/stock/export" external>Export stock</BtnLink>} />

            {data && data.drift.length > 0 && (
                <div className="cat-banners">
                    <Banner tone="warn" title={`${plural(data.drift.length, "product's", "products'")} total stock doesn't match ${data.drift.length === 1 ? "its" : "their"} sizes`}>
                        {`${data.drift.slice(0, 3).map(d => `${d.name} (total ${d.rollup}, sizes add up to ${d.variant_sum})`).join(", ")}${data.drift.length > 3 ? `, and ${data.drift.length - 3} more` : ""}. The nightly stock check reports the same. Count those sizes and use Adjust › I counted it, then tell the admin so the totals can be rebuilt.`}
                    </Banner>
                </div>
            )}
            {data && data.waiting > 0 && (
                <div className="cat-banners">
                    <Banner tone="info" title={`${plural(data.waiting, "customer")} asked to hear when something's back`}>
                        {restockAlertsOn
                            ? "They asked the WhatsApp assistant. Each is messaged within the hour once their piece is back in stock."
                            : "They asked the WhatsApp assistant. Back-in-stock alerts are switched off in Settings › Assistants, so nobody is told yet."}
                    </Banner>
                </div>
            )}

            <div className="grid-3 cat-kpis">
                <Kpi label="Items in stock" value={s ? s.items.toLocaleString("en-GB") : "—"} ctx={s ? `across ${plural(s.products, "active product")}` : "couldn't load"} />
                <Kpi label="Sizes running low" value={s ? s.low.toLocaleString("en-GB") : "—"} ctx="at or under each product's warning level" />
                <Kpi label="Sizes sold out" value={s ? s.out.toLocaleString("en-GB") : "—"} ctx="active and not taking pre-orders" />
            </div>

            <Card>
                <div className="list-tools cat-tools">
                    <Search value={term} onChange={setTerm} placeholder="Search products, SKUs or sizes" />
                    <div className="chips" role="group" aria-label="Stock views">
                        {INVENTORY_VIEWS.map(v => <Chip key={v.v} pressed={query.view === v.v} onClick={() => go({ view: v.v })} count={counts[v.v]}>{v.l}</Chip>)}
                    </div>
                </div>
                {!data ? <ErrorState what="stock" onRetry={() => start(() => router.refresh())} />
                    : pending ? <SkeletonRows n={8} cols={5} />
                    : data.rows.length === 0 ? (
                        query.q ? <Empty icon="search" title="Nothing matches" body={`No product, SKU or size has “${query.q}”.`} action={<Btn onClick={() => { setTerm(""); go({ q: "" }); }}>Clear search</Btn>} />
                        : query.view !== "all" ? <Empty icon="check" title={query.view === "low" ? "Nothing is running low" : "Nothing is sold out"} body="Every size in the shop has more than its warning level." />
                        : <Empty icon="box" title="No stock to show" body="Products that track stock appear here, one line per size and colour." />
                    ) : (
                        <div className="tbl-wrap">
                            <table className="tbl cat-tbl">
                                <thead><tr><th>Product</th><th>Size / colour</th><th className="r">In stock</th><th className="hide-sm">Status</th><th className="r"><span className="sr">Actions</span></th></tr></thead>
                                <tbody>
                                    {data.rows.map(r => {
                                        const [label, tone] = STATE_BADGE[r.state];
                                        return (
                                            <tr key={`${r.product_id}:${r.variant_id ?? "-"}`}>
                                                <td>
                                                    <div className="hrow">
                                                        <Thumb src={r.thumb} ph={!r.thumb} />
                                                        <div style={{ minWidth: 0 }}><div className="strong cat-name">{r.product_name}</div><div className="xs muted">{r.sku || r.product_sku || "No SKU"}</div></div>
                                                    </div>
                                                </td>
                                                <td>{optionText(r) || <span className="muted">One stock number</span>}</td>
                                                <td className={`r strong num ${r.state === "out" ? "cat-danger" : r.state === "low" ? "cat-warn" : ""}`}>{r.inventory_count}</td>
                                                <td className="hide-sm"><Badge tone={tone}>{label}</Badge></td>
                                                <td className="r">
                                                    <div className="hrow-sm end">
                                                        <Btn sm kind="ghost" onClick={() => setHistory(r)} aria-label={`Stock history for ${r.product_name} ${optionText(r)}`}>History</Btn>
                                                        <Btn sm onClick={() => setAdjust({ row: r, reason: "restock" })} aria-label={`Adjust stock for ${r.product_name} ${optionText(r)}`}>Adjust</Btn>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                {data && (
                    <div className="pager">
                        <span>{plural(data.total, "line")} · one per size and colour</span>
                        <span className="hrow-sm">
                            {pages > 1 && <span className="muted">Page {query.page} of {pages}</span>}
                            <Btn sm kind="ghost" disabled={query.page <= 1 || pending} onClick={() => go({ page: query.page - 1, view: query.view, q: query.q })}>Previous</Btn>
                            <Btn sm kind="ghost" disabled={query.page >= pages || pending} onClick={() => go({ page: query.page + 1, view: query.view, q: query.q })}>Next</Btn>
                        </span>
                    </div>
                )}
            </Card>

            {adjust && <AdjustPanel row={adjust.row} reason0={adjust.reason} onClose={() => setAdjust(null)} onSaved={() => { setAdjust(null); start(() => router.refresh()); }} />}
            {history && <StockHistoryPanel productId={history.product_id} productName={history.product_name} variantId={history.variant_id} option={optionText(history) || undefined} onClose={() => setHistory(null)} />}
        </>
    );
}

const newKey = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`);

/** Inventory › Adjust: why the stock changed, how many, and what it becomes. */
export function AdjustPanel({ row, reason0, onClose, onSaved }: { row: InventoryRow; reason0: AdjustReason; onClose: () => void; onSaved: () => void }) {
    const now = row.inventory_count;
    const [reason, setReason] = useState<AdjustReason>(reason0);
    const [qty, setQty] = useState(reason0 === "stock_count" ? String(now) : "");
    const [sign, setSign] = useState<"add" | "remove">("add");
    const [note, setNote] = useState("");
    const [busy, setBusy] = useState(false);
    // One key per panel: a double tap or a retry after a dropped connection is recorded once.
    const key = useMemo(newKey, []);
    const n = Number(qty) || 0;
    const typed = reason === "correction" && sign === "remove" ? -n : n;
    const plan = planAdjust(reason, now, typed);
    const ok = reason === "stock_count" ? qty !== "" && plan.delta !== 0 : n > 0 && plan.delta !== 0;
    const writeOff = reason === "write_off";
    const opt = optionText(row);

    const save = async () => {
        setBusy(true);
        try {
            const res = await fetch("/api/admin/stock/adjust", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ product_id: row.product_id, variant_id: row.variant_id, reason, quantity: typed, counted: reason === "stock_count" ? n : undefined, note, idempotency_key: key }),
            });
            const json = await res.json().catch(() => ({}));
            if (!res.ok) { toast.fromResponse(json, { audience: "staff" }); return; }
            if (json.unchanged) toast.success(`Count matches: still ${json.after} in stock. Nothing to record.`);
            else toast.success(`${row.product_name}${opt ? ` ${opt}` : ""}: ${json.before ?? now} → ${json.after}`);
            onSaved();
        } catch {
            toast.code("NET-01", { audience: "staff" });
        } finally {
            setBusy(false);
        }
    };

    return (
        <Panel open onClose={onClose} title="Adjust stock" sub={`${row.product_name}${opt ? ` · ${opt}` : ""} · ${now} in stock`}
            footer={<><Btn kind="ghost" onClick={onClose} disabled={busy}>Cancel</Btn>
                <Btn kind={writeOff ? "danger-solid" : "primary"} disabled={!ok || busy} onClick={save}>{busy ? "Saving…" : writeOff ? `Write off ${n || ""}`.trim() : "Save adjustment"}</Btn></>}>
            <RadioCards<AdjustReason> label="Reason" value={reason} onChange={v => { setReason(v); setQty(v === "stock_count" ? String(now) : ""); }} options={[
                { v: "restock", title: "New stock arrived", desc: "Adds to what's there. Use it for deliveries from the workshop." },
                { v: "stock_count", title: "I counted it", desc: "Replaces the number with what you counted on the shelf." },
                { v: "write_off", title: "Damaged or lost", desc: "Removes items that can't be sold. Shows in the write-off report." },
                { v: "correction", title: "Fix a mistake", desc: "Adds or removes a few to correct an earlier entry." },
            ]} />
            {reason === "correction" && (
                <Field label="Add or remove?"><Seg label="Add or remove" value={sign} onChange={setSign} options={[{ v: "add", l: "Add" }, { v: "remove", l: "Remove" }]} /></Field>
            )}
            <Field label={reason === "stock_count" ? "How many did you count?" : writeOff ? "How many to write off?" : reason === "correction" ? `How many to ${sign}?` : "How many arrived?"} htmlFor="adj-qty"
                help={writeOff && n > now ? `Only ${now} ${now === 1 ? "is" : "are"} in stock, so ${now} will be written off.` : undefined}>
                <input id="adj-qty" data-autofocus className="input cat-qty" inputMode="numeric" value={qty} onChange={e => setQty(e.target.value.replace(/[^\d]/g, ""))} />
            </Field>
            <Field label="Note" htmlFor="adj-note" help="Optional. Shows in stock history.">
                <input id="adj-note" className="input" value={note} maxLength={300} onChange={e => setNote(e.target.value)} placeholder={writeOff ? "e.g. Zip broken during fitting" : "e.g. Delivery from Adum workshop"} />
            </Field>
            {ok ? (
                <Banner tone={writeOff ? "danger" : "neutral"} title={`Stock goes from ${now} to ${plan.after}`}>
                    {writeOff
                        ? `${plural(-plan.delta, "item")} ${plan.delta === -1 ? "is" : "are"} removed and can't be sold. This is recorded as a write-off by you and can't be undone.`
                        : `Recorded in stock history as “${ADJUST_LABEL[reason]}” by you.`}
                </Banner>
            ) : reason === "stock_count" && qty !== "" ? (
                <Banner tone="ok" title={`The count matches: ${now} in stock`}>{"Nothing changes, so nothing is recorded."}</Banner>
            ) : null}
        </Panel>
    );
}
