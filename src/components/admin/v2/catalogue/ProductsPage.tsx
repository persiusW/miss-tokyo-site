"use client";

// Products › Products (/catalogue). The list is paged, filtered and counted on
// the server (fn_admin_product_rows), so the chips, search and page live in the
// URL and changing one asks the server for the page again. Opening a product
// pushes /catalogue/<id> without a reload; /catalogue/new opens an empty panel.
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
    Badge, BulkBar, Btn, Card, Chip, ConfirmPanel, Empty, ErrorState, Field, Menu, Modal, Money, RadioCards, Search, Seg, SkeletonRows, SRow, Switch, Thumb,
    TwoTap, ghs, plural, toast,
} from "@/components/admin/ui";
import {
    PAGE_SIZE, PRODUCT_VIEWS, STATUS_BADGE, marginPct, productIdFromPath, querySearch, stockCell, type ListQuery, type ProductRow, type ProductView,
} from "@/lib/admin/v2/catalogue";
import type { ProductListData } from "@/lib/admin/v2/catalogueLoad";
import { CatalogueHeader } from "./CatalogueHeader";
import { ProductPanel } from "./ProductPanel";
import { assignWholesale, restoreProductStatus, setPreorder, setProductStatus, stopTracking, updatePrices, type PanelData } from "./actions";

export function ProductsPage({ query, data, preload, missing }: { query: ListQuery; data: ProductListData | null; preload: PanelData | null; missing: boolean }) {
    const router = useRouter();
    const pathname = usePathname();
    const [pending, start] = useTransition();
    const [term, setTerm] = useState(query.q);
    const [sel, setSel] = useState<string[]>([]);
    const [modal, setModal] = useState<"prices" | "wholesale" | "preorder" | "untrack" | null>(null);
    const openedHere = useRef(false);
    const search = querySearch(query);

    useEffect(() => { setTerm(query.q); }, [query.q]);
    useEffect(() => { setSel([]); }, [query.view, query.q, query.page]);

    const go = (patch: Partial<ListQuery>) => {
        const next = querySearch(query, { page: 1, ...patch });
        start(() => router.push(`/catalogue${next}`, { scroll: false }));
    };
    useEffect(() => {
        if (term.trim() === query.q) return;
        const t = setTimeout(() => go({ q: term.trim() }), 350);
        return () => clearTimeout(t);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [term]);

    const openId = productIdFromPath(pathname);
    const isNew = pathname === "/catalogue/new";
    const open = (id: string) => { openedHere.current = true; window.history.pushState(null, "", `/catalogue/${id}${search}`); };
    const openNew = () => { openedHere.current = true; window.history.pushState(null, "", `/catalogue/new${search}`); };
    const close = () => {
        if (openedHere.current) { openedHere.current = false; window.history.back(); }
        else window.history.pushState(null, "", `/catalogue${search}`);
    };
    const refresh = () => start(() => router.refresh());

    const rows = data?.rows ?? [];
    const allSel = rows.length > 0 && rows.every(r => sel.includes(r.id));
    const chosen = rows.filter(r => sel.includes(r.id));
    const pages = Math.max(1, Math.ceil((data?.total ?? 0) / PAGE_SIZE));
    const canCost = data?.costs != null;

    const status = async (s: "active" | "draft" | "archived") => {
        const r = await setProductStatus(sel, s);
        if (!r.ok) { toast.error(r.error); return; }
        const n = plural(sel.length, "product");
        const msg = s === "archived" ? `${n} archived` : s === "draft" ? `${n} hidden from the shop` : `${n} back in the shop`;
        toast.success(msg, { action: { label: "Undo", onClick: () => { void restoreProductStatus(r.before).then(x => { if (x.ok) { toast.success("Undone"); refresh(); } else toast.error(x.error); }); } } });
        setSel([]);
        refresh();
    };

    const narrowed = query.view !== "all" || !!query.q;
    const viewLabel = PRODUCT_VIEWS.find(v => v.v === query.view)?.l.toLowerCase() ?? "";

    return (
        <>
            <CatalogueHeader tab="products" actions={<Btn kind="primary" icon="plus" onClick={openNew} data-assist="products.new">Add product</Btn>} />
            <Card>
                <div className="list-tools" style={{ paddingBottom: 0 }}>
                    <div className="chips" role="group" aria-label="Product views">
                        {PRODUCT_VIEWS.map(v => {
                            const chip = <Chip key={v.v} pressed={query.view === v.v} onClick={() => go({ view: v.v as ProductView })} count={v.v === "all" || !data ? null : data.counts[v.v] ?? 0}>{v.l}</Chip>;
                            // Miss Tokyo AI's "Show me" for the old Low Stock button lands here.
                            return v.v === "low" ? <span key={v.v} data-assist="products.low-stock" style={{ display: "contents" }}>{chip}</span> : chip;
                        })}
                    </div>
                </div>
                <div className="list-tools cat-tools"><Search value={term} onChange={setTerm} placeholder="Search by name or SKU" /></div>

                <BulkBar count={sel.length} onClear={() => setSel([])}>
                    <Btn sm icon="edit" onClick={() => setModal("prices")}>Edit prices</Btn>
                    <Btn sm onClick={() => status("draft")}>Set as draft</Btn>
                    <Btn sm onClick={() => status("active")}>Make active</Btn>
                    <TwoTap sm label="Archive" onConfirm={() => status("archived")} />
                    <Menu label="More bulk actions" trigger={(toggle, isOpen) => <Btn sm icon="more" aria-haspopup="menu" aria-expanded={isOpen} onClick={toggle}>More</Btn>} items={[
                        { l: "Assign wholesale category…", icon: "tag", onClick: () => setModal("wholesale") },
                        { l: "Pre-orders…", icon: "clock", onClick: () => setModal("preorder") },
                        { l: "Stop tracking stock…", icon: "box", onClick: () => setModal("untrack") },
                    ]} />
                </BulkBar>

                {missing && !openId && (
                    <div className="card-body"><Empty icon="products" title="That product isn't here any more" body="It may have been deleted. Everything that's left is in the list below." /></div>
                )}

                {!data ? <ErrorState what="products" onRetry={refresh} />
                    : pending ? <SkeletonRows n={8} cols={5} />
                    : rows.length === 0 ? (
                        query.q ? <Empty icon="search" title="No products match" body={`Nothing has “${query.q}” in its name or SKU${query.view !== "all" ? ` in ${viewLabel}` : ""}.`} action={<Btn onClick={() => { setTerm(""); go({ q: "", view: "all" }); }}>Clear search</Btn>} />
                        : narrowed ? <Empty icon="check" title={`No products ${query.view === "all" ? "here" : `in ${viewLabel}`}`} body="Nothing needs attention in this view." action={<Btn onClick={() => go({ view: "all" })}>Show all products</Btn>} />
                        : <Empty icon="products" title="Add your first product" body="Products you add here appear in the shop, at the till and in the WhatsApp assistant's answers." action={<Btn kind="primary" icon="plus" onClick={openNew}>Add product</Btn>} />
                    ) : (
                        <div className="tbl-wrap">
                            <table className="tbl cat-tbl">
                                <thead>
                                    <tr>
                                        <th className="w-cbx"><span className="cbx-hit"><input type="checkbox" className="cbx" aria-label="Select all products on this page" checked={allSel} onChange={() => setSel(allSel ? [] : rows.map(r => r.id))} /></span></th>
                                        <th>Product</th><th>Status</th><th>Stock</th><th className="hide-sm">Category</th><th className="r">Price</th>
                                        {canCost && <th className="r hide-sm">Margin</th>}
                                    </tr>
                                </thead>
                                <tbody>
                                    {rows.map(p => <ProductRowView key={p.id} p={p} selected={sel.includes(p.id)} cost={data.costs?.[p.id]} canCost={canCost}
                                        onToggle={() => setSel(s => (s.includes(p.id) ? s.filter(x => x !== p.id) : [...s, p.id]))} onOpen={() => open(p.id)} />)}
                                </tbody>
                            </table>
                        </div>
                    )}
                {data && (
                    <div className="pager">
                        <span>{plural(data.total, "product")} · newest first</span>
                        <span className="hrow-sm">
                            {pages > 1 && <span className="muted">Page {query.page} of {pages}</span>}
                            <Btn sm kind="ghost" disabled={query.page <= 1 || pending} onClick={() => go({ page: query.page - 1, view: query.view, q: query.q })}>Previous</Btn>
                            <Btn sm kind="ghost" disabled={query.page >= pages || pending} onClick={() => go({ page: query.page + 1, view: query.view, q: query.q })}>Next</Btn>
                        </span>
                    </div>
                )}
            </Card>

            {(openId || isNew) && (
                <ProductPanel key={openId ?? "new"} id={openId} preload={preload && preload.bundle?.product.id === openId ? preload : null}
                    onClose={close} onSaved={() => { close(); refresh(); }} onGone={() => { close(); refresh(); }} />
            )}

            {modal === "prices" && <PricesModal rows={chosen} onClose={() => setModal(null)} onSaved={() => { setModal(null); setSel([]); refresh(); }} />}
            {modal === "wholesale" && <WholesaleModal ids={sel} cats={data?.categories.filter(c => c.is_wholesale) ?? []} onClose={() => setModal(null)} onSaved={() => { setModal(null); setSel([]); refresh(); }} />}
            {modal === "preorder" && <PreorderModal ids={sel} onClose={() => setModal(null)} onSaved={() => { setModal(null); setSel([]); refresh(); }} />}
            <ConfirmPanel open={modal === "untrack"} onClose={() => setModal(null)} tone="warn" title={`Stop tracking stock for ${plural(sel.length, "product")}`}
                consequenceTitle="They will never sell out"
                consequence="The stock numbers are replaced with “not tracked”, so the shop and the till always sell them. To count stock again, open each product and switch Track stock back on, then enter the stock."
                confirmLabel="Stop tracking stock"
                onConfirm={async () => {
                    const r = await stopTracking(sel);
                    if (!r.ok) { toast.error(r.error); return; }
                    toast.success(`Stock is no longer tracked for ${plural(sel.length, "product")}`);
                    setModal(null); setSel([]); refresh();
                }} />
        </>
    );
}

function ProductRowView({ p, selected, cost, canCost, onToggle, onOpen }: { p: ProductRow; selected: boolean; cost?: number; canCost: boolean; onToggle: () => void; onOpen: () => void }) {
    const s = stockCell(p);
    const m = canCost ? marginPct(p.price_ghs, cost) : null;
    const [label, tone] = STATUS_BADGE[p.status];
    return (
        <tr className="click" tabIndex={0} aria-selected={selected} onClick={onOpen} onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); onOpen(); } }}>
            <td onClick={e => e.stopPropagation()}><span className="cbx-hit"><input type="checkbox" className="cbx" aria-label={`Select ${p.name}`} checked={selected} onChange={onToggle} /></span></td>
            <td>
                <div className="hrow">
                    <Thumb src={p.thumb} ph={!p.thumb} label={p.name.split(/\s+/).map(w => w[0]).join("").slice(0, 2).toUpperCase()} />
                    <div style={{ minWidth: 0 }}>
                        <div className="strong cat-name">{p.name}</div>
                        <div className="xs muted">{p.sku || "No SKU"}{p.photos === 0 && <span className="cat-warn"> · No photo</span>}</div>
                    </div>
                </div>
            </td>
            <td><Badge tone={tone}>{label}</Badge></td>
            <td className="sm">
                <span className={s.tone === "danger" ? "strong cat-danger" : s.tone === "muted" ? "ink2" : undefined}>{s.main}</span>
                {s.sub && <span className={`xs ${s.tone === "warn" ? "cat-warn" : "muted"}`} style={{ display: "block" }}>{s.sub}</span>}
            </td>
            <td className="hide-sm">{p.category_type || <span className="muted">—</span>}</td>
            <td className="r nowrap num">{ghs(p.price_ghs)}{p.compare_at_price_ghs != null && Number(p.compare_at_price_ghs) > 0 && <div className="xs muted cat-was">{ghs(p.compare_at_price_ghs)}</div>}</td>
            {canCost && <td className="r hide-sm num">{m != null ? `${m}%` : <span className="muted">—</span>}</td>}
        </tr>
    );
}

function PricesModal({ rows, onClose, onSaved }: { rows: ProductRow[]; onClose: () => void; onSaved: () => void }) {
    const [v, setV] = useState(() => Object.fromEntries(rows.map(p => [p.id, { price: String(Number(p.price_ghs)), compare: p.compare_at_price_ghs != null ? String(Number(p.compare_at_price_ghs)) : "" }])));
    const [busy, setBusy] = useState(false);
    const changed = rows.filter(p => v[p.id].price !== String(Number(p.price_ghs)) || v[p.id].compare !== (p.compare_at_price_ghs != null ? String(Number(p.compare_at_price_ghs)) : ""));
    const save = async () => {
        setBusy(true);
        const r = await updatePrices(changed.map(p => ({ id: p.id, ...v[p.id] })));
        setBusy(false);
        if (!r.ok) { toast.error(r.error); return; }
        toast.success(`${plural(r.count, "product")} updated`);
        onSaved();
    };
    return (
        <Modal open wide onClose={onClose} title={`Edit ${plural(rows.length, "product")}`}
            footer={<><Btn kind="ghost" onClick={onClose}>Cancel</Btn><Btn kind="primary" disabled={!changed.length || busy} onClick={save}>{busy ? "Saving…" : `Save ${changed.length ? plural(changed.length, "change") : "changes"}`}</Btn></>}>
            <div className="tbl-wrap" style={{ margin: "0 -24px" }}>
                <table className="tbl cat-bulk-tbl">
                    <thead><tr><th>Product</th><th>Price</th><th>Was price</th></tr></thead>
                    <tbody>{rows.map(p => (
                        <tr key={p.id}>
                            <td className="strong">{p.name}</td>
                            <td><Money label={`Price for ${p.name}`} value={v[p.id].price} onChange={x => setV({ ...v, [p.id]: { ...v[p.id], price: x } })} /></td>
                            <td><Money label={`Was price for ${p.name}`} value={v[p.id].compare} placeholder="None" onChange={x => setV({ ...v, [p.id]: { ...v[p.id], compare: x } })} /></td>
                        </tr>
                    ))}</tbody>
                </table>
            </div>
            <p className="help">To change stock for many sizes at once, use Inventory › Adjust.</p>
        </Modal>
    );
}

function WholesaleModal({ ids, cats, onClose, onSaved }: { ids: string[]; cats: { id: string; name: string }[]; onClose: () => void; onSaved: () => void }) {
    const [cat, setCat] = useState<string | null>(cats[0]?.id ?? null);
    const [mode, setMode] = useState<"add" | "replace">("add");
    const [busy, setBusy] = useState(false);
    const name = useMemo(() => cats.find(c => c.id === cat)?.name ?? "", [cats, cat]);
    const save = async () => {
        if (!cat) return;
        setBusy(true);
        const r = await assignWholesale(ids, cat, mode);
        setBusy(false);
        if (!r.ok) { toast.error(r.error); return; }
        toast.success(`${plural(r.count, "product")} now in ${name}`);
        onSaved();
    };
    return (
        <Modal open onClose={onClose} title={`Assign ${plural(ids.length, "product")} to a wholesale category`}
            footer={<><Btn kind="ghost" onClick={onClose}>Cancel</Btn><Btn kind="primary" disabled={!cat || busy} onClick={save}>{busy ? "Saving…" : "Assign category"}</Btn></>}>
            {cats.length === 0 ? <Empty icon="tag" title="No wholesale categories yet" body="Open Products › Categories, open a category and switch on Wholesale customers only. It then appears here." />
                : <>
                    <RadioCards label="Wholesale category" value={cat} onChange={setCat} options={cats.map(c => ({ v: c.id, title: c.name, desc: "Its tier prices apply unless a product sets its own." }))} />
                    <Field label="Their other categories">
                        <Seg label="Their other categories" value={mode} onChange={setMode} options={[{ v: "add", l: "Keep them" }, { v: "replace", l: "Replace them" }]} />
                    </Field>
                    <p className="help">{mode === "add" ? "The products stay in their current categories and join this one too." : "This becomes their only category. A product only in wholesale categories is hidden from retail customers."}</p>
                </>}
        </Modal>
    );
}

function PreorderModal({ ids, onClose, onSaved }: { ids: string[]; onClose: () => void; onSaved: () => void }) {
    const [on, setOn] = useState(true);
    const [weeks, setWeeks] = useState("3");
    const [busy, setBusy] = useState(false);
    const w = Number(weeks);
    const ok = !on || (w >= 1 && w <= 52);
    const save = async () => {
        setBusy(true);
        const r = await setPreorder(ids, on, w);
        setBusy(false);
        if (!r.ok) { toast.error(r.error); return; }
        toast.success(on ? `${plural(ids.length, "product")} take pre-orders, shipping in about ${plural(w, "week")}` : `${plural(ids.length, "product")} no longer take pre-orders`);
        onSaved();
    };
    return (
        <Modal open onClose={onClose} title={`Pre-orders for ${plural(ids.length, "product")}`}
            footer={<><Btn kind="ghost" onClick={onClose}>Cancel</Btn><Btn kind="primary" disabled={!ok || busy} onClick={save}>{busy ? "Saving…" : "Save"}</Btn></>}>
            <div className="rows">
                <SRow label="Take pre-orders" help={on ? "Customers can buy them even when they're sold out." : "When they're sold out, the shop shows Sold out."}>
                    <Switch label="Take pre-orders" checked={on} onChange={setOn} />
                </SRow>
                {on && (
                    <SRow label="Ships in about" help={ok ? "Weeks from today." : "Choose between 1 and 52 weeks."}>
                        <div className="input-affix cat-narrow"><input aria-label="Weeks until they ship" inputMode="numeric" value={weeks} onChange={e => setWeeks(e.target.value.replace(/[^\d]/g, ""))} /><span>weeks</span></div>
                    </SRow>
                )}
            </div>
        </Modal>
    );
}
