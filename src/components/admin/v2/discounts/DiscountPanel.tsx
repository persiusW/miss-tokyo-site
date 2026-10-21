"use client";

// The discount panel (admin v2): create or change a code or an automatic
// discount, switch it off or on, delete it, and see its results. Every field
// the old Discounts and Auto Discounts pages had is here. Saving goes through
// the server actions in ./actions, which check the role again.
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
    Banner, Btn, Chip, Empty, ErrorState, Field, Kpi, Money, Panel, Percent, RadioCards, Search, Seg, Select, SkeletonRows, SRow,
    Switch, TwoTap, ghs0, plural, toast, when,
} from "@/components/admin/ui";
import {
    CODE_TYPE_LABEL, defaultEnd, emptyForm, formForServer, formFromAuto, formFromCoupon, makeCode, normaliseCode,
    summarySentence, validateForm,
    type AppliesTo, type AutoRow, type AutoType, type CodeType, type Condition, type CouponRow, type Discount, type DiscountForm,
    type FormErrors, type Kind, type OverlapBanner, type QtyScope,
} from "@/lib/admin/v2/discounts";
import type { DiscountData, ProductPick, ResultOrder } from "@/lib/admin/v2/discountsLoad";
import { deleteDiscount, findProducts, getRecentOrders, saveAuto, saveCode, setDiscountActive } from "./actions";

type Tab = "setup" | "results";

export function DiscountPanel({ kind, disc, row, data, overlaps, onClose, onChanged, onCreated, onDeleted }: {
    kind: Kind;
    disc: Discount | null;
    row: CouponRow | AutoRow | null;
    data: DiscountData;
    overlaps: OverlapBanner[];
    onClose: () => void;
    onChanged: () => void;
    onCreated: () => void;
    onDeleted: () => void;
}) {
    const isNew = !disc || !row;
    const [tab, setTab] = useState<Tab>("setup");
    const [f, setF] = useState<DiscountForm>(() =>
        row ? (kind === "code" ? formFromCoupon(row as CouponRow) : formFromAuto(row as AutoRow)) : emptyForm(kind));
    const [err, setErr] = useState<FormErrors>({});
    const [saving, setSaving] = useState(false);
    const [busy, setBusy] = useState(false);
    const [productNames, setProductNames] = useState<Record<string, string>>(data.names.products);
    const up = (p: Partial<DiscountForm>) => setF(x => ({ ...x, ...p }));

    const names = useMemo(() => ({ categories: data.names.categories, products: productNames }), [data.names.categories, productNames]);
    const summary = summarySentence(f, names);
    const coupon = kind === "code" ? (row as CouponRow | null) : null;
    const used = coupon ? Number(coupon.used_count) || 0 : 0;
    const codeLocked = !!coupon && used > 0;

    const save = async () => {
        const e = validateForm(f, !coupon || coupon.code.toUpperCase() !== normaliseCode(f.code));
        setErr(e);
        if (Object.keys(e).length) { setTab("setup"); toast.error("Check the highlighted fields."); return; }
        setSaving(true);
        const res = kind === "code" ? await saveCode(isNew ? null : row!.id, formForServer(f)) : await saveAuto(isNew ? null : row!.id, formForServer(f));
        setSaving(false);
        if (!res.ok) {
            if (res.fields) setErr(res.fields);
            toast.error(res.error);
            return;
        }
        toast.success(isNew ? "Discount created" : "Discount saved");
        if (isNew) onCreated(); else { onChanged(); onClose(); }
    };

    const toggle = async () => {
        if (!disc) return;
        const next = !f.isActive;
        setBusy(true);
        const res = await setDiscountActive(kind, disc.id, next);
        setBusy(false);
        if (!res.ok) { toast.error(res.error); return; }
        up({ isActive: next });
        toast.success(`${disc.name} switched ${next ? "on" : "off"}`);
        onChanged();
    };

    const remove = async () => {
        if (!disc) return;
        setBusy(true);
        const res = await deleteDiscount(kind, disc.id);
        setBusy(false);
        if (!res.ok) { toast.error(res.error); return; }
        toast.success(`${disc.name} deleted`);
        onDeleted();
    };

    const title = isNew ? (kind === "code" ? "New discount code" : "New automatic discount") : disc!.name;
    const sub = isNew
        ? "Starts as soon as you save, unless you pick a later date."
        : `${disc!.statusLabel} · used ${plural(disc!.used, "time")}`;

    // Owners, admins and sales staff can all change codes and automatic
    // discounts (the server actions check again), so there is no read-only view.
    const footerLeft = isNew ? (
        <span className="hrow-sm"><Switch label="Turn on when saved" checked={f.isActive} onChange={v => up({ isActive: v })} /><span className="sm">Turn on when saved</span></span>
    ) : (
        <>
            <Btn kind="ghost" onClick={toggle} disabled={busy || saving}>{f.isActive ? "Switch off" : "Switch on"}</Btn>
            <TwoTap label="Delete" onConfirm={remove} disabled={busy || saving} />
        </>
    );
    const footer = (
        <>
            <Btn kind="ghost" onClick={onClose}>Cancel</Btn>
            <Btn kind="primary" onClick={save} disabled={saving || busy}>{saving ? "Saving…" : isNew ? "Create discount" : "Save discount"}</Btn>
        </>
    );

    return (
        <Panel open wide onClose={onClose} title={title} sub={sub}
            tabs={isNew ? null : [{ v: "setup", l: "Set up" }, { v: "results", l: "Results" }]} tab={tab} onTab={setTab}
            footerLeft={footerLeft} footer={footer}>
            {tab === "setup" || isNew ? (
                <>
                    <div className="inset" aria-live="polite">
                        <div className="section-t">Summary</div>
                        <div className="ink2">{summary}</div>
                    </div>
                    {overlaps.map(o => <Banner key={o.key} tone="warn" title={o.title}>{o.body}</Banner>)}
                    <fieldset className="disc-fields stack">
                        <legend className="sr">Discount details</legend>
                        <NameField f={f} up={up} err={err} locked={codeLocked} />
                        <ValueFields f={f} up={up} err={err} />
                        <AppliesFields f={f} up={up} err={err} data={data} productNames={productNames} setProductNames={setProductNames} />
                        <ConditionFields f={f} up={up} err={err} />
                        <ScheduleFields f={f} up={up} err={err} />
                    </fieldset>
                </>
            ) : (
                <ResultsTab kind={kind} disc={disc!} />
            )}
        </Panel>
    );
}

type Part = { f: DiscountForm; up: (p: Partial<DiscountForm>) => void; err: FormErrors };

function NameField({ f, up, err, locked }: Part & { locked: boolean }) {
    if (f.kind === "auto") {
        return (
            <Field label="Title" htmlFor="disc-title" error={err.title} help="Customers see this in their cart and at the POS. Results are counted by title, so a new title starts its count again.">
                <input id="disc-title" data-autofocus className="input" value={f.title} maxLength={120} placeholder="Slides: 2 for GH₵ 600" onChange={e => up({ title: e.target.value })} />
            </Field>
        );
    }
    return (
        <Field label="Code" htmlFor="disc-code" error={err.code}
            help={locked ? "This code has been used, so it keeps its name and its results stay linked." : "Customers type this at checkout. Not case-sensitive."}>
            <div className="hrow disc-code-row">
                <input id="disc-code" data-autofocus className="input disc-code" value={f.code} maxLength={30} placeholder="HARMATTAN20" readOnly={locked}
                    autoCapitalize="characters" autoComplete="off" spellCheck={false}
                    onChange={e => up({ code: normaliseCode(e.target.value) })} />
                {!locked && <Btn onClick={() => up({ code: makeCode() })}>Make one up</Btn>}
            </div>
        </Field>
    );
}

function ValueFields({ f, up, err }: Part) {
    if (f.kind === "auto") {
        return (
            <>
                <Field label="Discount">
                    <Seg<AutoType> label="Discount kind" value={f.autoType} onChange={v => up({ autoType: v })}
                        options={[{ v: "PERCENTAGE", l: "Percentage" }, { v: "FIXED", l: "Fixed amount" }]} />
                </Field>
                <Field label={f.autoType === "PERCENTAGE" ? "Percentage off" : "Amount off"} htmlFor="disc-value" error={err.value}
                    help={f.autoType === "FIXED" ? "Comes off the qualifying items together, never more than they cost." : undefined}>
                    {f.autoType === "PERCENTAGE"
                        ? <Percent id="disc-value" value={f.value} onChange={v => up({ value: v })} width={180} />
                        : <div className="disc-narrow"><Money id="disc-value" value={f.value} onChange={v => up({ value: v })} /></div>}
                </Field>
            </>
        );
    }
    const inCategory = f.applies === "SPECIFIC_CATEGORIES";
    return (
        <>
            <Field label="Discount">
                <Seg<CodeType> label="Discount kind" value={f.codeType} onChange={v => up({ codeType: v })}
                    options={(["percentage", "fixed", "buy_x_get_y", "free_shipping", "sale_price"] as CodeType[]).map(v => ({ v, l: CODE_TYPE_LABEL[v] }))} />
            </Field>
            {f.codeType === "percentage" && (
                <Field label="Percentage off" htmlFor="disc-value" error={err.value}
                    help={inCategory ? "Comes off the category's items only, never the delivery fee." : "Comes off the products, never the delivery fee."}>
                    <Percent id="disc-value" value={f.value} onChange={v => up({ value: v })} width={180} />
                </Field>
            )}
            {f.codeType === "fixed" && (
                <Field label="Amount off" htmlFor="disc-value" error={err.value}
                    help={inCategory ? "Comes off the category's items only, never more than they cost and never the delivery fee." : "Comes off the products first; anything left over comes off delivery."}>
                    <div className="disc-narrow"><Money id="disc-value" value={f.value} onChange={v => up({ value: v })} /></div>
                </Field>
            )}
            {f.codeType === "sale_price" && (
                <Field label="Sale price" htmlFor="disc-value" error={err.value}
                    help="Each item the code covers sells for this price. Items already at or under it stay as they are. Never the delivery fee.">
                    <div className="disc-narrow"><Money id="disc-value" value={f.value} onChange={v => up({ value: v })} /></div>
                </Field>
            )}
            {f.codeType === "free_shipping" && <p className="help">Takes the whole delivery fee off. Nothing comes off the products.</p>}
            {f.codeType === "buy_x_get_y" && (
                <div className="grid-2">
                    <Field label="Customer buys" htmlFor="disc-bx" error={err.buyQty}>
                        <input id="disc-bx" className="input" inputMode="numeric" value={f.buyQty} onChange={e => up({ buyQty: e.target.value.replace(/\D/g, "") })} />
                    </Field>
                    <Field label="Gets free" htmlFor="disc-by" error={err.getQty}>
                        <input id="disc-by" className="input" inputMode="numeric" value={f.getQty} onChange={e => up({ getQty: e.target.value.replace(/\D/g, "") })} />
                    </Field>
                    <p className="help disc-span">For every {Number(f.buyQty) + Number(f.getQty) || "?"} items the code covers in a cart, the cheapest {f.getQty || "?"} {Number(f.getQty) === 1 ? "is" : "are"} free. Never the delivery fee.</p>
                </div>
            )}
        </>
    );
}

function AppliesFields({ f, up, err, data, productNames, setProductNames }: Part & {
    data: DiscountData; productNames: Record<string, string>; setProductNames: (fn: (x: Record<string, string>) => Record<string, string>) => void;
}) {
    const catOpts = data.categories.map(c => ({ v: c.id, l: c.name }));
    if (f.kind === "code") {
        if (f.codeType === "free_shipping") return null;
        // A code holds one category (coupons.category_id). Checkout takes it off
        // that category's items only (lib/couponValue).
        const inCategory = f.applies === "SPECIFIC_CATEGORIES";
        return (
            <Field label="Applies to" error={err.targets}>
                <div className="stack-sm">
                    <Seg<AppliesTo> label="Applies to" value={inCategory ? "SPECIFIC_CATEGORIES" : "ALL_PRODUCTS"}
                        onChange={v => up(v === "SPECIFIC_CATEGORIES" ? { applies: v } : { applies: "ALL_PRODUCTS", categoryIds: [] })}
                        options={[{ v: "ALL_PRODUCTS", l: "Everything" }, { v: "SPECIFIC_CATEGORIES", l: "One category" }]} />
                    {inCategory && (
                        catOpts.length === 0
                            ? <p className="help">There are no categories yet. Add them under Products › Categories.</p>
                            : <Select id="disc-cat" value={f.categoryIds[0] ?? ""} onChange={v => up({ categoryIds: v ? [v] : [] })}
                                options={[{ v: "", l: "Pick a category" }, ...catOpts]} />
                    )}
                    <p className="help">{inCategory
                        ? "The code comes off items in this category only. Items that already have an automatic discount keep that instead."
                        : "The code comes off every item that has no automatic discount."}</p>
                </div>
            </Field>
        );
    }
    const toggleCat = (id: string) => up({ categoryIds: f.categoryIds.includes(id) ? f.categoryIds.filter(x => x !== id) : [...f.categoryIds, id] });
    return (
        <Field label="Applies to" error={err.targets}>
            <div className="stack-sm">
                <Seg<AppliesTo> label="Applies to" value={f.applies} onChange={v => up({ applies: v })}
                    options={[{ v: "ALL_PRODUCTS", l: "Everything" }, { v: "SPECIFIC_CATEGORIES", l: "Categories" }, { v: "SPECIFIC_PRODUCTS", l: "Products" }]} />
                {f.applies === "SPECIFIC_CATEGORIES" && (
                    catOpts.length === 0
                        ? <p className="help">There are no categories yet. Add them under Products › Categories.</p>
                        : <div className="chips" role="group" aria-label="Categories">
                            {catOpts.map(c => <Chip key={c.v} pressed={f.categoryIds.includes(c.v)} onClick={() => toggleCat(c.v)}>{c.l}</Chip>)}
                        </div>
                )}
                {f.applies === "SPECIFIC_PRODUCTS" && (
                    <ProductPicker ids={f.productIds} onChange={ids => up({ productIds: ids })} names={productNames} setNames={setProductNames} />
                )}
            </div>
        </Field>
    );
}

function ProductPicker({ ids, onChange, names, setNames }: {
    ids: string[]; onChange: (ids: string[]) => void; names: Record<string, string>; setNames: (fn: (x: Record<string, string>) => Record<string, string>) => void;
}) {
    const [q, setQ] = useState("");
    const [found, setFound] = useState<ProductPick[] | null>(null);
    const [failed, setFailed] = useState(false);
    useEffect(() => {
        let live = true;
        const t = setTimeout(async () => {
            const res = await findProducts(q);
            if (!live) return;
            if (!res.ok) { setFailed(true); return; }
            setFailed(false);
            setFound(res.products);
            setNames(x => ({ ...x, ...Object.fromEntries(res.products.map(p => [p.id, p.name])) }));
        }, 250);
        return () => { live = false; clearTimeout(t); };
    }, [q, setNames]);
    const toggle = (id: string) => onChange(ids.includes(id) ? ids.filter(x => x !== id) : [...ids, id]);
    return (
        <div className="stack-sm">
            {ids.length > 0 && (
                <div className="hrow-sm wrap" aria-label="Picked products">
                    {ids.map(id => (
                        <span key={id} className="chip-x">{names[id] ?? "A product that was removed"}
                            <button type="button" aria-label={`Remove ${names[id] ?? "product"}`} onClick={() => toggle(id)}>×</button>
                        </span>
                    ))}
                </div>
            )}
            <Search value={q} onChange={setQ} placeholder="Search products by name" />
            {failed ? <p className="help">{"We couldn't search products just now. Try again in a moment."}</p>
                : found === null ? <SkeletonRows n={2} cols={2} />
                : found.length === 0 ? <p className="help">No products match “{q}”.</p>
                : (
                    <div className="chips disc-picks" role="group" aria-label="Products">
                        {found.map(p => <Chip key={p.id} pressed={ids.includes(p.id)} onClick={() => toggle(p.id)}>{p.name}</Chip>)}
                    </div>
                )}
            <p className="help">{ids.length ? `${plural(ids.length, "product")} picked.` : "Tap products to pick them."} Showing up to 30 matches; search to find others.</p>
        </div>
    );
}

function ConditionFields({ f, up, err }: Part) {
    const isCode = f.kind === "code";
    return (
        <>
            <Field label="Conditions">
                <RadioCards<Condition> label="Conditions" value={f.condition} onChange={v => up({ condition: v })}
                    options={[
                        { v: "none", title: "No conditions", desc: isCode ? "Any order can use it." : "Any cart with a qualifying item gets it." },
                        { v: "min", title: "Minimum order total", desc: "Only when the cart is over an amount, before delivery." },
                        isCode
                            ? { v: "qty", title: "Minimum number of items", desc: "Automatic discounts only. Codes can need an order total instead.", disabled: true }
                            : { v: "qty", title: "Minimum number of items", desc: "Only when they buy enough qualifying items." },
                    ]} />
            </Field>
            {f.condition === "min" && (
                <Field label="Order total over" htmlFor="disc-min" error={err.minTotal}>
                    <div className="disc-narrow"><Money id="disc-min" value={f.minTotal} onChange={v => up({ minTotal: v })} /></div>
                </Field>
            )}
            {f.condition === "qty" && !isCode && (
                <>
                    <Field label="At least" htmlFor="disc-qty" error={err.minQty}>
                        <input id="disc-qty" className="input disc-qty" inputMode="numeric" value={f.minQty} onChange={e => up({ minQty: e.target.value.replace(/\D/g, "") })} />
                    </Field>
                    <Field label="Counted">
                        <RadioCards<QtyScope> label="How items are counted" value={f.qtyScope} onChange={v => up({ qtyScope: v })}
                            options={[
                                { v: "ACROSS_TARGET", title: "Across all qualifying items", desc: "Any mix counts: 1 of one product and 1 of another make 2." },
                                { v: "PER_PRODUCT", title: "Each product on its own", desc: "They need that many of the same product. Only complete sets get the discount; extras are full price." },
                            ]} />
                    </Field>
                    <Field label="And an order total over (optional)" htmlFor="disc-min2" error={err.minTotal} help="Leave empty if the number of items is enough.">
                        <div className="disc-narrow"><Money id="disc-min2" value={f.minTotal} onChange={v => up({ minTotal: v })} placeholder="No minimum" /></div>
                    </Field>
                </>
            )}
        </>
    );
}

function ScheduleFields({ f, up, err }: Part) {
    return (
        <div className="card disc-schedule">
            <div className="rows">
                <SRow label="Starts" help={err.start ?? "Pick a later date and time to schedule it."}>
                    <input className="input disc-date" type="datetime-local" aria-label="Start date and time" value={f.start} onChange={e => up({ start: e.target.value })} />
                </SRow>
                <SRow label="Has an end date" help={f.hasEnd ? "It stops working at this date and time." : "Runs until you switch it off."}>
                    <Switch label="Has an end date" checked={f.hasEnd} onChange={v => up({ hasEnd: v, end: v && !f.end ? defaultEnd() : f.end })} />
                </SRow>
                {f.hasEnd && (
                    <SRow label="Ends" help={err.end}>
                        <input className="input disc-date" type="datetime-local" aria-label="End date and time" value={f.end} min={f.start || undefined}
                            onChange={e => up({ end: e.target.value })} aria-invalid={!!err.end} />
                    </SRow>
                )}
                {f.kind === "code" && (
                    <>
                        <SRow label="Limit total uses" help={err.limit ?? "Stops working after this many orders. Leave empty for no limit."}>
                            <input className="input disc-limit" aria-label="Total uses" inputMode="numeric" value={f.limit} placeholder="No limit"
                                onChange={e => up({ limit: e.target.value.replace(/\D/g, "") })} aria-invalid={!!err.limit} />
                        </SRow>
                        <SRow label="One use per customer" help="Checked by email and phone number when they pay. Walk-ins with neither can't be checked.">
                            <Switch label="One use per customer" checked={f.oncePerCustomer} onChange={v => up({ oncePerCustomer: v })} />
                        </SRow>
                    </>
                )}
            </div>
        </div>
    );
}

function ResultsTab({ kind, disc }: { kind: Kind; disc: Discount }) {
    const [orders, setOrders] = useState<ResultOrder[] | null>(null);
    const [failed, setFailed] = useState(false);
    const [n, setN] = useState(0);
    useEffect(() => {
        let live = true;
        getRecentOrders(kind, disc.id).then(res => {
            if (!live) return;
            if (res.ok) { setOrders(res.orders); setFailed(false); } else setFailed(true);
        }).catch(() => { if (live) setFailed(true); });
        return () => { live = false; };
    }, [kind, disc.id, n]);
    const r = disc.results;
    if (!r) return <ErrorState what="the results" body="The figures didn't load with the list. Close the panel and open it again." />;
    const pct = r.sales > 0 ? Math.round((r.given / r.sales) * 100) : null;
    return (
        <div className="stack">
            <div className="grid-3 disc-kpis">
                <Kpi label="Orders" value={r.orders.toLocaleString("en-GB")}
                    ctx={disc.limit != null ? `paid, out of ${disc.limit.toLocaleString("en-GB")} allowed` : "paid orders since it started"} />
                <Kpi label="Sales" value={ghs0(r.sales)} ctx="from orders using it" />
                <Kpi label="Given away" value={ghs0(r.given)} ctx={pct != null ? `${pct}% of those sales` : "nothing yet"} />
            </div>
            <p className="help">
                From the same calculation as Analytics › Reports › Discount performance. Only paid orders count; unpaid, cancelled and refunded orders are left out.
                {kind === "auto" && " Automatic discounts are matched by their title."}
                {r.shared > 0 && ` ${plural(r.shared, "order")} also had another automatic discount; ${r.shared === 1 ? "its" : "their"} saving can't be split, so ${r.shared === 1 ? "it isn't" : "they aren't"} in Given away.`}
            </p>
            <div className="card">
                <div className="card-h"><h2>Latest orders</h2></div>
                {failed ? <ErrorState what="the orders" onRetry={() => { setFailed(false); setOrders(null); setN(x => x + 1); }} />
                    : orders === null ? <SkeletonRows n={3} cols={3} />
                    : orders.length === 0 ? <Empty icon="orders" title="No paid orders yet" body="Orders that use this discount appear here once they're paid." />
                    : (
                        <div className="rows">
                            {orders.map(o => (
                                <Link key={o.id} href={`/sales/orders/${o.id}`} className="row click disc-order">
                                    <div className="row-main">
                                        <div className="row-title">#{o.ref} · {o.customer}</div>
                                        <div className="row-sub">{when(o.at)}{o.source === "pos" ? " · At the POS" : ""}</div>
                                    </div>
                                    <div className="r">
                                        <div className="strong num">{ghs0(o.total)}</div>
                                        <div className="xs muted">saved {ghs0(o.saved)}</div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
            </div>
        </div>
    );
}
