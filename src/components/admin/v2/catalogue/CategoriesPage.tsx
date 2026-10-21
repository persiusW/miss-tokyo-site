"use client";

// Products › Categories (/catalogue/categories). Everything the old
// Categories page did: add, edit, web address, description, image, show on
// the home page (at most 3), show in the shop, wholesale with tier prices,
// pre-order with weeks (applied to its products), position in the shop menu,
// "Duplicate as wholesale", and delete once nothing points at it.
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
    Badge, Banner, Btn, Card, Chip, Empty, ErrorState, Field, IconBtn, Menu, Money, Panel, Search, SRow, Switch, Thumb, TwoTap, plural, toast,
} from "@/components/admin/ui";
import { ImageUploader } from "@/components/ui/miss-tokyo/ImageUploader";
import { slugify } from "@/lib/admin/v2/catalogue";
import type { CategoryRow, StoreOptions } from "@/lib/admin/v2/catalogueLoad";
import { CatalogueHeader } from "./CatalogueHeader";
import { deleteCategory, duplicateAsWholesale, saveCategory, setCategoryFlag, type CategoryInput } from "./actions";

type View = "all" | "active" | "hidden" | "featured" | "wholesale" | "preorder";
const VIEWS: { v: View; l: string; f: (c: CategoryRow) => boolean }[] = [
    { v: "all", l: "All", f: () => true },
    { v: "active", l: "In the shop", f: c => c.is_active },
    { v: "hidden", l: "Hidden", f: c => !c.is_active },
    { v: "featured", l: "On the home page", f: c => c.is_featured },
    { v: "wholesale", l: "Wholesale", f: c => c.is_wholesale },
    { v: "preorder", l: "Pre-order", f: c => c.preorder_enabled },
];

export function CategoriesPage({ data }: { data: { rows: CategoryRow[]; wholesale: StoreOptions["wholesale"] } | null }) {
    const router = useRouter();
    const [, start] = useTransition();
    const [view, setView] = useState<View>("all");
    const [q, setQ] = useState("");
    const [open, setOpen] = useState<CategoryRow | "new" | null>(null);
    const [flags, setFlags] = useState<Record<string, Partial<CategoryRow>>>({});
    const refresh = () => start(() => router.refresh());

    const rows = useMemo(() => (data?.rows ?? []).map(c => ({ ...c, ...flags[c.id] })), [data, flags]);
    const t = q.trim().toLowerCase();
    const shown = rows.filter(VIEWS.find(v => v.v === view)!.f).filter(c => !t || [c.name, c.slug, c.description ?? ""].some(x => x.toLowerCase().includes(t)));
    const featured = rows.filter(c => c.is_featured).length;

    const flip = async (c: CategoryRow, flag: "is_featured" | "is_active", on: boolean, undo = false) => {
        setFlags(f => ({ ...f, [c.id]: { ...f[c.id], [flag]: on } }));
        const r = await setCategoryFlag(c.id, flag, on);
        if (!r.ok) { setFlags(f => ({ ...f, [c.id]: { ...f[c.id], [flag]: !on } })); toast.error(r.error); return; }
        if (undo) return;
        const msg = flag === "is_featured" ? (on ? `${c.name} shown on the home page` : `${c.name} taken off the home page`) : (on ? `${c.name} is back in the shop` : `${c.name} hidden from the shop`);
        toast.success(msg, { action: { label: "Undo", onClick: () => void flip(c, flag, !on, true) } });
    };

    return (
        <>
            <CatalogueHeader tab="categories" actions={<Btn kind="primary" icon="plus" onClick={() => setOpen("new")}>Add category</Btn>} />
            <Card>
                <div className="list-tools cat-tools">
                    <Search value={q} onChange={setQ} placeholder="Search categories" />
                    <div className="chips" role="group" aria-label="Category views">
                        {VIEWS.map(v => <Chip key={v.v} pressed={view === v.v} onClick={() => setView(v.v)} count={v.v === "all" ? null : rows.filter(v.f).length}>{v.l}</Chip>)}
                    </div>
                </div>
                {!data ? <ErrorState what="categories" onRetry={refresh} />
                    : shown.length === 0 ? (
                        rows.length === 0 ? <Empty icon="tag" title="Add your first category" body="Categories group products in the shop menu and filters." action={<Btn kind="primary" onClick={() => setOpen("new")}>Add category</Btn>} />
                        : <Empty icon="search" title="No categories match" body="Try another word, or show every category." action={<Btn onClick={() => { setQ(""); setView("all"); }}>Show all</Btn>} />
                    ) : (
                        <div className="rows">
                            {shown.map(c => (
                                <div className="row" key={c.id}>
                                    <Thumb src={c.image_url} ph={!c.image_url} label={c.name.slice(0, 2).toUpperCase()} />
                                    <button type="button" className="row-main cat-row-btn" onClick={() => setOpen(c)}>
                                        <div className="row-title">{c.name}{!c.is_active && <> <Badge tone="neutral">Hidden</Badge></>}</div>
                                        <div className="row-sub">{[
                                            `${plural(c.product_count, "product")} in the shop`,
                                            c.is_wholesale && "Wholesale customers only",
                                            c.preorder_enabled && `Pre-order${c.preorder_estimated_weeks ? ` · ${plural(c.preorder_estimated_weeks, "week")}` : ""}`,
                                        ].filter(Boolean).join(" · ")}</div>
                                    </button>
                                    <span className="sm muted hide-sm">On home page</span>
                                    <Switch label={`Show ${c.name} on the home page`} checked={c.is_featured} disabled={!c.is_featured && featured >= 3}
                                        onChange={v => void flip(c, "is_featured", v)} />
                                    <IconBtn label={`Edit ${c.name}`} icon="chev" onClick={() => setOpen(c)} />
                                </div>
                            ))}
                        </div>
                    )}
                {data && <div className="pager"><span>{plural(rows.length, "category", "categories")} · {featured} of 3 on the home page</span><span>In shop-menu order</span></div>}
            </Card>
            {open && <CategoryPanel c={open === "new" ? null : open} wholesale={data?.wholesale ?? { enabled: false, tiers: [[3, 5], [8, 10], [12, 24]] }} featured={featured}
                onClose={() => setOpen(null)} onSaved={() => { setOpen(null); setFlags({}); refresh(); }} />}
        </>
    );
}

const money = (v: number | null) => (v == null ? "" : String(Number(v)));

function CategoryPanel({ c, wholesale, featured, onClose, onSaved }: { c: CategoryRow | null; wholesale: StoreOptions["wholesale"]; featured: number; onClose: () => void; onSaved: () => void }) {
    const [f, setF] = useState<CategoryInput>(() => ({
        name: c?.name ?? "", slug: c?.slug ?? "", description: c?.description ?? "", image_url: c?.image_url ?? null,
        is_active: c?.is_active ?? true, is_featured: c?.is_featured ?? false, is_wholesale: c?.is_wholesale ?? false,
        tier1: money(c?.wholesale_tier_1_price ?? null), tier2: money(c?.wholesale_tier_2_price ?? null), tier3: money(c?.wholesale_tier_3_price ?? null),
        preorder_enabled: c?.preorder_enabled ?? false, preorder_weeks: c?.preorder_estimated_weeks ? String(c.preorder_estimated_weeks) : "4",
        sort_order: String(c?.sort_order ?? 0),
    }));
    const [busy, setBusy] = useState(false);
    const [uploading, setUploading] = useState(false);
    const up = (p: Partial<CategoryInput>) => setF(x => ({ ...x, ...p }));
    const slug = slugify(f.slug || f.name);
    const canFeature = f.is_featured || c?.is_featured || featured < 3;
    const preChanged = !!c && (c.preorder_enabled !== f.preorder_enabled || (f.preorder_enabled && String(c.preorder_estimated_weeks ?? "") !== f.preorder_weeks));

    const save = async () => {
        setBusy(true);
        const r = await saveCategory(c?.id ?? null, { ...f, slug });
        setBusy(false);
        if (!r.ok) { toast.error(r.error); return; }
        toast.success(c ? (r.preorderApplied ? `${f.name} saved. Pre-order updated on ${plural(r.preorderApplied, "product")}.` : `${f.name} saved`) : `${f.name} added`);
        onSaved();
    };
    const remove = async () => {
        if (!c) return;
        const r = await deleteCategory(c.id);
        if (!r.ok) { toast.error(r.error); return; }
        toast.success(`${c.name} deleted`);
        onSaved();
    };
    const copy = async () => {
        if (!c) return;
        const r = await duplicateAsWholesale(c.id);
        if (!r.ok) { toast.error(r.error); return; }
        toast.success(`${c.name} Wholesale added. ${plural(r.count, "product")} joined it.`);
        onSaved();
    };

    return (
        <Panel open onClose={onClose} title={c ? c.name : "Add category"}
            sub={c ? `${plural(c.product_count, "product")} in the shop${c.linked !== c.product_count ? ` · ${plural(c.linked, "product")} in all` : ""}` : "Groups products in the shop menu and filters."}
            footerLeft={c && (<>
                {c.linked === 0 ? <TwoTap label="Delete" onConfirm={remove} /> : <span className="help">Move its {plural(c.linked, "product")} first to delete it.</span>}
                {!c.is_wholesale && <Menu label="More category actions" up items={[{ l: "Make a wholesale copy", icon: "copy", onClick: () => void copy() }]} />}
            </>)}
            footer={<><Btn kind="ghost" onClick={onClose} disabled={busy}>Cancel</Btn>
                <Btn kind="primary" disabled={!f.name.trim() || !slug || busy || uploading} onClick={save}>{busy ? "Saving…" : c ? "Save category" : "Add category"}</Btn></>}>
            <Field label="Name" htmlFor="cat-name">
                <input id="cat-name" data-autofocus className="input" value={f.name} placeholder="e.g. Footwear"
                    onChange={e => up({ name: e.target.value, ...(!c && (!f.slug || f.slug === slugify(f.name)) ? { slug: slugify(e.target.value) } : {}) })} />
            </Field>
            <Field label="Web address" htmlFor="cat-slug" help={`misstokyo.shop/shop?category=${slug || "…"}${c ? ". Changing it breaks links people already have." : ""}`}>
                <input id="cat-slug" className="input" value={f.slug} onChange={e => up({ slug: e.target.value })} onBlur={() => up({ slug })} />
            </Field>
            <Field label="Description" htmlFor="cat-desc" help="Shown at the top of the category page.">
                <textarea id="cat-desc" className="textarea" rows={3} value={f.description} onChange={e => up({ description: e.target.value })} />
            </Field>
            <div className="field">
                <span className="label">Image</span>
                <ImageUploader bucket="product-images" folder="categories" currentUrl={f.image_url} onUpload={(url: string) => up({ image_url: url || null })}
                    onUploading={setUploading} aspectRatio="video" label="Category image" />
                <div className="help">Used for the tile on the home page and the top of the category page.</div>
            </div>
            <div className="card cat-inset">
                <div className="rows">
                    <SRow label="Show in the shop" help={f.is_active ? "Listed in the shop menu once it has products." : "Hidden from the shop menu. Its products stay on sale."}>
                        <Switch label="Show in the shop" checked={f.is_active} onChange={v => up({ is_active: v })} />
                    </SRow>
                    <SRow label="Show on the home page" help={canFeature ? "Adds a tile under Featured categories. Up to 3." : "3 categories are already on the home page. Take one off first."}>
                        <Switch label="Show on the home page" checked={f.is_featured} disabled={!canFeature} onChange={v => up({ is_featured: v })} />
                    </SRow>
                    <SRow label="Wholesale customers only" help="Products only in wholesale categories are hidden from retail customers, and get these tier prices.">
                        <Switch label="Wholesale customers only" checked={f.is_wholesale} onChange={v => up({ is_wholesale: v })} />
                    </SRow>
                    {f.is_wholesale && wholesale.enabled && (
                        <div className="card-body grid-3">
                            {(["tier1", "tier2", "tier3"] as const).map((k, i) => (
                                <Field key={k} label={`Tier ${i + 1}`} htmlFor={`cat-${k}`} help={`${wholesale.tiers[i][0]}–${wholesale.tiers[i][1]} pieces`}>
                                    <Money id={`cat-${k}`} value={f[k]} placeholder="Not set" onChange={v => up({ [k]: v } as Partial<CategoryInput>)} />
                                </Field>
                            ))}
                        </div>
                    )}
                    {f.is_wholesale && !wholesale.enabled && <div className="card-body"><Banner tone="neutral" title="Wholesale is switched off">{"Tier prices can be set once wholesale is on in Settings."}</Banner></div>}
                    <SRow label="Take pre-orders" help={c ? "Saving a change here applies it to every product in this category." : "Products you add to it later keep their own setting."}>
                        <Switch label="Take pre-orders" checked={f.preorder_enabled} onChange={v => up({ preorder_enabled: v })} />
                    </SRow>
                    {f.preorder_enabled && (
                        <SRow label="Ships in about" help="Weeks from today.">
                            <div className="input-affix cat-narrow"><input aria-label="Weeks until it ships" inputMode="numeric" value={f.preorder_weeks} onChange={e => up({ preorder_weeks: e.target.value.replace(/[^\d]/g, "") })} /><span>weeks</span></div>
                        </SRow>
                    )}
                    <SRow label="Position in the shop menu" help="Lower numbers come first. Categories with the same number go A to Z.">
                        <input className="input cat-narrow" aria-label="Position in the shop menu" inputMode="numeric" value={f.sort_order} onChange={e => up({ sort_order: e.target.value.replace(/[^\d-]/g, "") })} />
                    </SRow>
                </div>
            </div>
            {preChanged && c && c.linked > 0 && (
                <Banner tone="warn" title="Pre-orders change for its products">
                    {f.preorder_enabled ? `When you save, every product in ${c.name} takes pre-orders, shipping in about ${plural(Number(f.preorder_weeks) || 1, "week")}.` : `When you save, every product in ${c.name} stops taking pre-orders.`}
                </Banner>
            )}
        </Panel>
    );
}
