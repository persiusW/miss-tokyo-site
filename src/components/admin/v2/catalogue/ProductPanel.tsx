"use client";

// One panel for adding and editing a product (it replaces /catalog/products/new
// and /catalog/products/<id>/edit). It saves through /api/admin/products, the
// route both old forms used, so the rules there (stock saved as a difference,
// variant rows matched in place, held rows never deleted) are unchanged.
// Stock typed here goes into the ledger as a correction by this person; for
// deliveries and counts the panel points at Inventory › Adjust.
import { useEffect, useMemo, useState } from "react";
import {
    Badge, Banner, Btn, Chip, Empty, ErrorState, Field, Menu, Modal, Money, Panel, Percent, RadioCards, Select, SkeletonRows, SRow, Switch, TwoTap,
    ghs, plural, toast,
} from "@/components/admin/ui";
import { ImageUploader } from "@/components/ui/miss-tokyo/ImageUploader";
import {
    baselineOf, changedCount, combos, emptyProductForm, firstErrorTab, formFromProduct, marginPct, optionText, productPayload, profitText, salePrice,
    slugify, validateProductForm, type Baseline, type FormErrors, type PanelTab, type ProductForm, type ProductStatus,
} from "@/lib/admin/v2/catalogue";
import { deleteProduct, productPanelData, restoreProductStatus, setProductStatus, type PanelData } from "./actions";
import { StockHistoryPanel } from "./StockHistoryPanel";

const LOW_LEVELS = ["0", "1", "2", "3", "5", "10"];

export function ProductPanel({ id, preload, onClose, onSaved, onGone }: {
    id: string | null;
    preload?: PanelData | null;
    onClose: () => void;
    onSaved: (id: string | null) => void;
    onGone: () => void;
}) {
    const [data, setData] = useState<PanelData | null>(preload ?? null);
    const [failed, setFailed] = useState<string | null>(null);
    const [form, setForm] = useState<ProductForm | null>(null);
    const [initial, setInitial] = useState<ProductForm | null>(null);
    const [base, setBase] = useState<Baseline>({ stock: 0, variants: {} });
    const [tab, setTab] = useState<PanelTab>("details");
    const [errors, setErrors] = useState<FormErrors>({});
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [history, setHistory] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [leaving, setLeaving] = useState(false);

    useEffect(() => {
        let live = true;
        const start = (d: PanelData) => {
            const f = d.bundle ? formFromProduct(d.bundle.product, d.bundle.variants, d.bundle.costs) : emptyProductForm();
            setData(d); setForm(f); setInitial(f); setBase(baselineOf(d.bundle?.product ?? null, d.bundle?.variants ?? []));
        };
        if (preload) { start(preload); return; }
        setFailed(null);
        productPanelData(id).then(r => {
            if (!live) return;
            if (r.ok) start(r.data); else setFailed(r.error);
        }).catch(() => live && setFailed("We couldn't open that product just now. Please try again."));
        return () => { live = false; };
    }, [id, preload]);

    const up = (patch: Partial<ProductForm>) => setForm(f => (f ? { ...f, ...patch } : f));
    const dirty = form && initial ? changedCount(form, initial) : 0;
    const product = data?.bundle?.product ?? null;
    const isNew = !id;

    const close = () => { if (dirty && !saving) setLeaving(true); else onClose(); };

    const save = async () => {
        if (!form || !data) return;
        const e = validateProductForm(form);
        setErrors(e);
        const t = firstErrorTab(e);
        if (t) { setTab(t); toast.error("Check the highlighted fields."); return; }
        setSaving(true);
        try {
            const body = productPayload(form, base, { id: id ?? undefined, withCost: data.canCost });
            const res = await fetch("/api/admin/products", { method: id ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
            const json = await res.json().catch(() => ({}));
            if (!res.ok) { toast.fromResponse(json, { audience: "staff" }); return; }
            const name = form.name.trim();
            toast.success(isNew ? `${name} added${form.status === "draft" ? " as a draft" : ""}` : `${name} saved`);
            onSaved(id ?? json?.product?.id ?? null);
        } catch {
            toast.code("NET-01", { audience: "staff" });
        } finally {
            setSaving(false);
        }
    };

    const archive = async () => {
        if (!id || !form) return;
        const r = await setProductStatus([id], "archived");
        if (!r.ok) { toast.error(r.error); return; }
        toast.success(`${form.name} archived. It's hidden from the shop and the POS.`, {
            action: { label: "Undo", onClick: () => { void restoreProductStatus(r.before).then(x => { if (x.ok) { toast.success("Archive undone"); onSaved(id); } else toast.error(x.error); }); } },
        });
        onSaved(id);
    };

    const remove = async () => {
        if (!id || !form) return;
        const r = await deleteProduct(id);
        if (!r.ok) { toast.error(r.error); setDeleting(false); return; }
        toast.success(`${form.name} deleted`);
        onGone();
    };

    const tabs = [
        { v: "details" as const, l: "Details", dot: !!(errors.name || errors.slug) },
        { v: "stock" as const, l: "Sizes and stock", dot: !!(errors.stock || errors.lowStockAt) },
        { v: "pricing" as const, l: "Pricing", dot: !!(errors.price || errors.compare || errors.discount || errors.cost || errors.tiers) },
        { v: "visibility" as const, l: "Visibility", dot: !!errors.preorderWeeks },
    ];

    const total = useMemo(() => {
        if (!form) return 0;
        if (!form.trackInventory) return null;
        if (!form.trackVariants) return Number(form.stock) || 0;
        return combos(form).reduce((n, c) => n + (Number(form.variants[c.key]?.stock) || 0), 0);
    }, [form]);

    const title = isNew ? "Add product" : form?.name.trim() || product?.name || "Product";
    const sub = isNew ? "Saved as a draft until you make it active."
        : [product?.sku, total == null ? "Stock not tracked" : `${plural(total, "item")} in stock`].filter(Boolean).join(" · ");

    const footerLeft = !isNew && form && data ? (
        deleting
            ? <><TwoTap label="Delete for good" armed="Tap again to delete for good" onConfirm={remove} /><Btn kind="ghost" onClick={() => setDeleting(false)}>Keep it</Btn></>
            : <>
                {initial?.status !== "archived" && <TwoTap label="Archive" onConfirm={archive} />}
                {data.canDelete && <Menu label="More product actions" up items={[{ l: "Delete for good…", icon: "trash", danger: true, onClick: () => setDeleting(true) }]} />}
            </>
    ) : null;

    return (
        <>
            <Panel open wide onClose={close} title={title} sub={form ? sub : undefined} label={isNew ? "Add product" : "Edit product"}
                head={!isNew && initial ? <div className="hrow-sm" style={{ marginBottom: 4 }}><StatusBadge s={initial.status} /></div> : undefined}
                tabs={form ? tabs : null} tab={tab} onTab={setTab}
                footerLeft={footerLeft}
                footer={<>
                    <Btn kind="ghost" onClick={close} disabled={saving}>Cancel</Btn>
                    <Btn kind="primary" onClick={save} disabled={!form || saving || uploading}>{saving ? "Saving…" : uploading ? "Uploading…" : isNew ? "Add product" : "Save product"}</Btn>
                </>}>
                {failed ? <ErrorState what="this product" body={failed} onRetry={() => { setFailed(null); setData(null); productPanelData(id).then(r => { if (r.ok) { const f = r.data.bundle ? formFromProduct(r.data.bundle.product, r.data.bundle.variants, r.data.bundle.costs) : emptyProductForm(); setData(r.data); setForm(f); setInitial(f); setBase(baselineOf(r.data.bundle?.product ?? null, r.data.bundle?.variants ?? [])); } else setFailed(r.error); }); }} />
                    : !form || !data ? <SkeletonRows n={6} cols={2} />
                    : tab === "details" ? <DetailsTab f={form} up={up} errors={errors} data={data} isNew={isNew} setUploading={setUploading} />
                    : tab === "stock" ? <StockTab f={form} up={up} errors={errors} data={data} isNew={isNew} base={base} onHistory={() => setHistory(true)} />
                    : tab === "pricing" ? <PricingTab f={form} up={up} errors={errors} data={data} />
                    : <VisibilityTab f={form} up={up} errors={errors} />}
            </Panel>
            {history && id && <StockHistoryPanel level={2} productId={id} productName={form?.name || product?.name || ""} variantId={null} onClose={() => setHistory(false)} />}
            <Modal open={leaving} onClose={() => setLeaving(false)} title="Leave without saving?"
                footer={<><Btn kind="ghost" onClick={() => setLeaving(false)}>Keep editing</Btn><Btn kind="danger-solid" onClick={() => { setLeaving(false); onClose(); }}>Discard {plural(dirty, "change")}</Btn></>}>
                <p className="sm">Your changes to {form?.name.trim() || "this product"} haven't been saved.</p>
            </Modal>
        </>
    );
}

function StatusBadge({ s }: { s: ProductStatus }) {
    return <Badge tone={s === "active" ? "ok" : "neutral"}>{s === "active" ? "Active" : s === "draft" ? "Draft" : "Archived"}</Badge>;
}

type TabProps = { f: ProductForm; up: (p: Partial<ProductForm>) => void; errors: FormErrors };

function DetailsTab({ f, up, errors, data, isNew, setUploading }: TabProps & { data: PanelData; isNew: boolean; setUploading: (v: boolean) => void }) {
    const retail = data.categories.filter(c => !c.is_wholesale);
    const catOptions = [{ v: "", l: "Choose a category" }, ...retail.map(c => ({ v: c.name, l: c.is_active ? c.name : `${c.name} (hidden)` }))];
    if (f.categoryType && !retail.some(c => c.name === f.categoryType)) catOptions.push({ v: f.categoryType, l: f.categoryType });
    const toggleCat = (cid: string) => up({ categoryIds: f.categoryIds.includes(cid) ? f.categoryIds.filter(x => x !== cid) : [...f.categoryIds, cid] });
    const photos = f.imageUrls.filter(u => !/\.(mp4|mov|webm|m4v)(\?|$)/i.test(u)).length;
    return (
        <>
            <Field label="Name" htmlFor="pp-name" error={errors.name}>
                <input id="pp-name" data-autofocus className="input" value={f.name} placeholder="e.g. Pink Off Shoulder Dress"
                    onChange={e => up({ name: e.target.value, ...(isNew && (!f.slug || f.slug === slugify(f.name)) ? { slug: slugify(e.target.value) } : {}) })} />
            </Field>
            <Field label="Web address" htmlFor="pp-slug" error={errors.slug} help={`misstokyo.shop/products/${slugify(f.slug || f.name) || "…"}${isNew ? "" : ". Changing it breaks links people already have."}`}>
                <input id="pp-slug" className="input" value={f.slug} onChange={e => up({ slug: e.target.value })} onBlur={() => up({ slug: slugify(f.slug) })} />
            </Field>
            <Field label="Description" htmlFor="pp-desc" help="Shown on the product page and used by the shop assistant to answer questions.">
                <textarea id="pp-desc" className="textarea" rows={5} value={f.description} placeholder="Fabric, fit, how it's made, care" onChange={e => up({ description: e.target.value })} />
            </Field>
            <div className="grid-2">
                <Field label="Category" htmlFor="pp-cat" help={retail.length ? "Where it's listed in the shop menu." : "Add a category in Products › Categories first."}>
                    <Select id="pp-cat" value={f.categoryType} onChange={v => up({ categoryType: v })} options={catOptions} />
                </Field>
                <Field label="SKU" htmlFor="pp-sku" help="Printed on receipts and found by the search. Each size can have its own in Sizes and stock.">
                    <input id="pp-sku" className="input" value={f.sku} placeholder="MT-DR-040" onChange={e => up({ sku: e.target.value })} />
                </Field>
            </div>
            {data.categories.length > 0 && (
                <div className="field">
                    <span className="label">Also in these categories</span>
                    <div className="cat-opts" role="group" aria-label="Also in these categories">
                        {data.categories.map(c => (
                            <Chip key={c.id} pressed={f.categoryIds.includes(c.id)} onClick={() => toggleCat(c.id)}>{c.name}{c.is_wholesale ? " · Wholesale" : ""}</Chip>
                        ))}
                    </div>
                    <div className="help">Wholesale categories give the product their wholesale prices. A product only in wholesale categories is hidden from retail customers.</div>
                </div>
            )}
            <div className="field cat-photos">
                <span className="label">Photos and video</span>
                {photos === 0 && <Banner tone="warn" title="No photos yet">{"Products without a photo can't be shown well in the shop grid, and the WhatsApp assistant can't send a picture of it."}</Banner>}
                <ImageUploader bucket="product-images" folder="products" currentUrls={f.imageUrls} onUpload={(urls: string[]) => up({ imageUrls: urls })}
                    onUploading={setUploading} maxFiles={10} label="Product media" />
                <div className="help">Up to 10. Drag to reorder; the first is the main photo in the shop grid. Photos are compressed and videos converted as they upload.</div>
            </div>
        </>
    );
}

function OptionChips({ label, all, chosen, onChange }: { label: string; all: string[]; chosen: string[]; onChange: (v: string[]) => void }) {
    const list = [...all, ...chosen.filter(x => !all.includes(x))];
    return (
        <div className="field">
            <span className="label">{label}</span>
            {list.length === 0
                ? <div className="help">None set up yet. An owner or admin adds them in Settings › Store.</div>
                : <div className="cat-opts" role="group" aria-label={label}>
                    {list.map(x => (
                        <Chip key={x} pressed={chosen.includes(x)} onClick={() => onChange(chosen.includes(x) ? chosen.filter(y => y !== x) : list.filter(y => y === x || chosen.includes(y)))}>{x}</Chip>
                    ))}
                </div>}
        </div>
    );
}

function StockTab({ f, up, errors, data, isNew, base, onHistory }: TabProps & { data: PanelData; isNew: boolean; base: Baseline; onHistory: () => void }) {
    const low = Number(f.lowStockAt) || 0;
    const list = combos(f);
    const cell = (k: string) => f.variants[k] ?? { sku: "", stock: "0", cost: "" };
    const setCell = (k: string, patch: Partial<{ sku: string; stock: string; cost: string }>) => up({ variants: { ...f.variants, [k]: { ...cell(k), ...patch } } });
    const tint = (n: number) => (n <= 0 ? " is-out" : n <= low ? " is-low" : "");
    const levels = LOW_LEVELS.includes(f.lowStockAt) ? LOW_LEVELS : [...LOW_LEVELS, f.lowStockAt].sort((a, b) => Number(a) - Number(b));
    const waiting = data.bundle?.waiting ?? 0;
    const hasOptions = f.sizes.length + f.colors.length + f.brands.length > 0;
    const productCost = f.cost.trim() ? `GH₵ ${f.cost}` : "Product cost";
    return (
        <>
            <div className="stack">
                <OptionChips label="Sizes" all={data.store.sizes} chosen={f.sizes} onChange={v => up({ sizes: v })} />
                <OptionChips label="Colours" all={data.store.colors} chosen={f.colors} onChange={v => up({ colors: v })} />
                <OptionChips label="Brands" all={data.store.brands} chosen={f.brands} onChange={v => up({ brands: v })} />
            </div>
            <div className="card cat-inset">
                <div className="rows">
                    <SRow label="Track stock" help={f.trackInventory ? "It sells out when the stock reaches 0." : "Not tracked: it never sells out."}>
                        <Switch label="Track stock" checked={f.trackInventory} onChange={v => up({ trackInventory: v, trackVariants: v ? f.trackVariants : false })} />
                    </SRow>
                    {f.trackInventory && (
                        <SRow label="Separate stock for each size and colour" help={f.trackVariants ? "Each option below has its own count." : "All options share one stock number."}>
                            <Switch label="Separate stock for each size and colour" checked={f.trackVariants} onChange={v => up({ trackVariants: v })} />
                        </SRow>
                    )}
                </div>
            </div>

            {f.trackInventory && !f.trackVariants && (
                <Field label="In stock" htmlFor="pp-stock" error={errors.stock} help={isNew ? "Saved in stock history as opening stock." : `${base.stock} when you opened this. Only the difference is saved, so sales made meanwhile are kept.`}>
                    <input id="pp-stock" className={`input cat-qty${tint(Number(f.stock) || 0)}`} inputMode="numeric" value={f.stock} onChange={e => up({ stock: e.target.value.replace(/[^\d]/g, "") })} />
                </Field>
            )}

            {f.trackInventory && f.trackVariants && (
                <div className="card cat-inset">
                    <div className="card-h"><h2>Stock by option</h2><span className="muted sm">{plural(list.reduce((n, c) => n + (Number(cell(c.key).stock) || 0), 0), "item")} in total</span></div>
                    {!hasOptions && <div className="card-body"><Banner tone="info" title="Choose sizes, colours or brands above">{"Each one you pick gets its own row here with its own stock and SKU."}</Banner></div>}
                    <div className="tbl-wrap">
                        <table className="tbl cat-vtbl">
                            <thead><tr><th>Option</th><th>SKU</th><th>In stock</th>{data.canCost && <th>Cost</th>}</tr></thead>
                            <tbody>
                                {list.map(c => {
                                    const v = cell(c.key);
                                    const n = Number(v.stock) || 0;
                                    const name = optionText(c) || "One size";
                                    return (
                                        <tr key={c.key}>
                                            <td className="strong nowrap">{name}</td>
                                            <td><input className="input cat-sku" aria-label={`SKU for ${name}`} value={v.sku} placeholder="e.g. MT-DR-040-M" onChange={e => setCell(c.key, { sku: e.target.value })} /></td>
                                            <td><input className={`input cat-stock${tint(n)}`} inputMode="numeric" aria-label={`Stock for ${name}`} value={v.stock} onChange={e => setCell(c.key, { stock: e.target.value.replace(/[^\d]/g, "") })} /></td>
                                            {data.canCost && <td><Money label={`Cost for ${name}`} value={v.cost} placeholder={productCost} onChange={x => setCell(c.key, { cost: x })} /></td>}
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                    {errors.stock && <div className="card-body"><div className="err-text" role="alert">{errors.stock}</div></div>}
                </div>
            )}

            <div className="hrow between wrap">
                <p className="help grow">Changes here are saved in stock history as a correction by you. For deliveries and counts, use Inventory › Adjust.</p>
                {!isNew && <Btn sm kind="ghost" icon="clock" onClick={onHistory}>Stock history</Btn>}
            </div>
            {waiting > 0 && <Banner tone="info" title={`${plural(waiting, "customer")} asked to hear when it's back`}>{"They asked the WhatsApp assistant. When back-in-stock alerts are on (Settings › Assistants), they're messaged within the hour once it's in stock."}</Banner>}
            {f.trackInventory && (
                <div className="card cat-inset">
                    <SRow label="Warn me when a size drops to" help="Shows on Home and in Inventory › Running low.">
                        <Select label="Low-stock level" value={f.lowStockAt} onChange={v => up({ lowStockAt: v })}
                            options={levels.map(x => ({ v: x, l: x === "0" ? "Only when sold out" : `${x} left` }))} />
                    </SRow>
                </div>
            )}
        </>
    );
}

function PricingTab({ f, up, errors, data }: TabProps & { data: PanelData }) {
    const m = data.canCost ? marginPct(f.price, f.cost) : null;
    const pay = f.isSale ? salePrice(f.price, f.discount) : null;
    const tiers = data.store.wholesale.tiers;
    const showWholesale = data.store.wholesale.enabled || f.wholesaleOverride;
    return (
        <>
            <div className="grid-2">
                <Field label="Price" htmlFor="pp-price" error={errors.price} help="What customers pay, before delivery."><Money id="pp-price" value={f.price} onChange={v => up({ price: v })} /></Field>
                <Field label="Was price" htmlFor="pp-was" error={errors.compare} help="Shown crossed out next to the price. Leave empty for no sale."><Money id="pp-was" value={f.compare} placeholder="None" onChange={v => up({ compare: v })} /></Field>
            </div>
            <div className="card cat-inset">
                <div className="rows">
                    <SRow label="On sale" help={f.isSale ? "Shows the Sale ribbon and takes the discount off the price at checkout and the POS." : "Takes a percentage off the price everywhere it's sold."}>
                        <Switch label="On sale" checked={f.isSale} onChange={v => up({ isSale: v, discount: v ? f.discount || "10" : "" })} />
                    </SRow>
                    {f.isSale && (
                        <SRow label="Discount" help={errors.discount ?? (pay != null ? `Customers pay ${ghs(pay)} instead of ${ghs(f.price)}.` : "A percentage between 1 and 99.")}>
                            <Percent label="Discount percentage" value={f.discount} onChange={v => up({ discount: v })} />
                        </SRow>
                    )}
                </div>
            </div>
            {data.canCost && (
                <div className="grid-2">
                    <Field label="Cost per item" htmlFor="pp-cost" error={errors.cost} help="What it costs you to make or buy. Customers never see it, and only owners and admins do.">
                        <Money id="pp-cost" value={f.cost} placeholder="Not set" onChange={v => up({ cost: v })} />
                    </Field>
                    <div className="inset stack-sm cat-margin">
                        <div className="kpi-label">Margin</div>
                        <div className="kpi-value">{m != null ? `${m}%` : "—"}</div>
                        <div className="kpi-ctx">{m != null ? profitText(f.price, f.cost) : "Add a cost to see your margin"}</div>
                    </div>
                </div>
            )}
            {showWholesale && (
                <div className="card cat-inset">
                    <div className="card-h"><h2>Wholesale prices</h2><span className="help">Only wholesale customers see these.</span></div>
                    <div className="rows">
                        <SRow label="Set this product's own wholesale prices" help={f.wholesaleOverride ? "These replace its wholesale category's prices." : "Off: it uses the prices of its wholesale category."}>
                            <Switch label="Set this product's own wholesale prices" checked={f.wholesaleOverride} onChange={v => up({ wholesaleOverride: v })} />
                        </SRow>
                    </div>
                    {f.wholesaleOverride && (
                        <div className="card-body grid-3">
                            {(["tier1", "tier2", "tier3"] as const).map((k, i) => (
                                <Field key={k} label={`Tier ${i + 1}`} htmlFor={`pp-${k}`} help={`${tiers[i][0]}–${tiers[i][1]} pieces`}>
                                    <Money id={`pp-${k}`} value={f[k]} placeholder="Category price" onChange={v => up({ [k]: v } as Partial<ProductForm>)} />
                                </Field>
                            ))}
                            {errors.tiers && <div className="err-text" role="alert">{errors.tiers}</div>}
                        </div>
                    )}
                </div>
            )}
        </>
    );
}

function VisibilityTab({ f, up, errors }: TabProps) {
    return (
        <>
            <RadioCards<ProductStatus> label="Status" value={f.status} onChange={v => up({ status: v })} options={[
                { v: "active", title: "Active", desc: "In the shop, at the POS and known to the assistants." },
                { v: "draft", title: "Draft", desc: "Hidden everywhere while you work on it." },
                { v: "archived", title: "Archived", desc: "Hidden everywhere and filed under Archived. Past orders and reports still show it." },
            ]} />
            <div className="card cat-inset">
                <div className="rows">
                    <SRow label="Take pre-orders" help={f.preorder ? `Customers can buy it even when it's sold out. The shop says it ships in about ${plural(Number(f.preorderWeeks) || 1, "week")}.` : "When it's sold out, the shop shows Sold out."}>
                        <Switch label="Take pre-orders" checked={f.preorder} onChange={v => up({ preorder: v })} />
                    </SRow>
                    {f.preorder && (
                        <SRow label="Ships in about" help={errors.preorderWeeks ?? "Weeks from today. The date is worked out when you save."}>
                            <div className="input-affix cat-narrow">
                                <input aria-label="Weeks until it ships" inputMode="numeric" value={f.preorderWeeks} onChange={e => up({ preorderWeeks: e.target.value.replace(/[^\d]/g, "") })} />
                                <span>weeks</span>
                            </div>
                        </SRow>
                    )}
                    <SRow label="Wholesale customers only" help="The assistants (website chat and WhatsApp) won't offer it, and it's left out of the product feed. To hide it from the shop too, put it only in wholesale categories.">
                        <Switch label="Wholesale customers only" checked={f.wholesaleOnly} onChange={v => up({ wholesaleOnly: v })} />
                    </SRow>
                </div>
            </div>
        </>
    );
}

/** The empty state when a link points at a product that's gone. */
export function ProductGone({ onClose }: { onClose: () => void }) {
    return (
        <Panel open onClose={onClose} title="Product not found" footer={<Btn onClick={onClose}>Close</Btn>}>
            <Empty icon="products" title="That product isn't here any more" body="It may have been deleted. Everything that's left is in the list." />
        </Panel>
    );
}
