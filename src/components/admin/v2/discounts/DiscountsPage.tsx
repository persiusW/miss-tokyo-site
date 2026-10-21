"use client";

// Discounts list (admin v2): codes and automatic discounts in one list. The
// chips, type and search live in the URL (replaced in place, no reload) and
// filter in the browser; every row is already loaded. Opening a discount
// pushes /discounts/<id> without a reload, and closing goes back the same way.
import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
    Badge, Banner, Btn, Card, Chip, Empty, ErrorState, Modal, PageHeader, RadioCards, Search, Seg, ghs0,
} from "@/components/admin/ui";
import {
    STATUS_CHIPS, STATUS_TONE, chipCounts, datesText, discountHref, filterList, findOverlaps, fromAuto, fromCoupon, idFromPath, listSearch,
    overlapBanners, sortList, type Discount, type Kind, type ListQuery, type TypeFilter,
} from "@/lib/admin/v2/discounts";
import type { DiscountData } from "@/lib/admin/v2/discountsLoad";
import { DiscountPanel } from "./DiscountPanel";
import "./discounts.css";


export function DiscountsPage({ query, data, missing }: { query: ListQuery; data: DiscountData | null; missing: boolean }) {
    const router = useRouter();
    const pathname = usePathname();
    const [q, setQ] = useState<ListQuery>(query);
    const [term, setTerm] = useState(query.q);
    const [picking, setPicking] = useState(false);
    const [newKind, setNewKind] = useState<Kind | null>(null);
    const [allOverlaps, setAllOverlaps] = useState(false);
    const openedHere = useRef(false);

    // The URL follows the filters without asking the server for the page again
    const search = listSearch(q);
    useEffect(() => {
        const base = idFromPath(window.location.pathname) ? window.location.pathname : "/discounts";
        if (window.location.search !== search) window.history.replaceState(window.history.state, "", `${base}${search}`);
    }, [search]);
    useEffect(() => {
        const t = setTimeout(() => setQ(x => (x.q === term.trim() ? x : { ...x, q: term.trim() })), 250);
        return () => clearTimeout(t);
    }, [term]);

    const rows = useMemo(() => {
        if (!data) return [];
        const now = new Date();
        return sortList([
            ...data.coupons.map(c => fromCoupon(c, data.names, data.results[`code:${c.id}`] ?? null, now)),
            ...data.autos.map(a => fromAuto(a, data.names, data.results[`auto:${a.id}`] ?? null, now)),
        ]);
    }, [data]);
    const overlaps = useMemo(() => (data ? findOverlaps(rows, data.names, data.productCategories) : []), [rows, data]);
    const banners = useMemo(() => overlapBanners(overlaps), [overlaps]);
    const shown = filterList(rows, q);
    const counts = chipCounts(rows, q);

    const openId = idFromPath(pathname);
    const open = openId ? rows.find(r => r.id === openId) ?? null : null;
    const openRow = open ? (open.kind === "code" ? data?.coupons.find(c => c.id === open.id) : data?.autos.find(a => a.id === open.id)) ?? null : null;

    const openDiscount = (id: string) => {
        openedHere.current = true;
        window.history.pushState(null, "", discountHref(id, search));
    };
    const close = () => {
        setNewKind(null);
        if (!openId) return;
        if (openedHere.current) {
            openedHere.current = false;
            window.history.back();
        } else {
            window.history.pushState(null, "", `/discounts${search}`);
        }
    };
    const changed = () => {
        // Same cache refresh the old pages asked for after every change
        fetch("/api/admin/revalidate-discounts", { method: "POST" }).catch(() => {});
        router.refresh();
    };

    const create = () => setPicking(true);
    const narrowed = q.status !== "all" || q.type !== "all" || !!q.q;
    const clear = () => { setTerm(""); setQ({ status: "all", type: "all", q: "" }); };

    return (
        <>
            <PageHeader title="Discounts" sub="Codes customers type at checkout and offers that apply on their own."
                actions={<Btn kind="primary" icon="plus" onClick={create} data-assist="discounts.new">Create discount</Btn>} />

            {missing && !open && (
                <Banner tone="neutral" title="That discount isn't here any more">{"It may have been deleted. Everything that's left is in the list below."}</Banner>
            )}

            {banners.length > 0 && (
                <div className="stack-sm disc-overlaps">
                    {(allOverlaps ? banners : banners.slice(0, 1)).map(b => (
                        <Banner key={b.key} tone="warn" title={b.title} actionLabel="Review" onAction={() => openDiscount(b.reviewId)}>{b.body}</Banner>
                    ))}
                    {banners.length > 1 && (
                        <div><Btn sm kind="ghost" onClick={() => setAllOverlaps(v => !v)}>
                            {allOverlaps ? "Show only the first overlap" : `Show ${banners.length - 1} more ${banners.length === 2 ? "overlap" : "overlaps"}`}
                        </Btn></div>
                    )}
                </div>
            )}

            <Card>
                <div className="list-tools disc-tools">
                    <Search value={term} onChange={setTerm} placeholder="Search codes and titles" />
                    <div className="chips" role="group" aria-label="Status">
                        {STATUS_CHIPS.map(s => (
                            <Chip key={s.v} pressed={q.status === s.v} onClick={() => setQ(x => ({ ...x, status: s.v }))} count={data ? counts[s.v] : null}>{s.l}</Chip>
                        ))}
                    </div>
                    <Seg<TypeFilter> label="Type" value={q.type} onChange={v => setQ(x => ({ ...x, type: v }))}
                        options={[{ v: "all", l: "All types" }, { v: "code", l: "Codes" }, { v: "auto", l: "Automatic" }]} />
                </div>

                {!data ? (
                    <ErrorState what="discounts" onRetry={() => router.refresh()} />
                ) : shown.length === 0 ? (
                    narrowed && rows.length > 0 ? (
                        <Empty icon="search" title="No discounts match" body="Search looks at codes, titles, amounts and what they apply to. The chips and type narrow it further."
                            action={<Btn onClick={clear}>Show every discount</Btn>} />
                    ) : (
                        <Empty icon="discounts" title="No discounts here" body="Create a code to share with customers, or an automatic offer that applies when the cart qualifies."
                            action={<Btn kind="primary" onClick={create}>Create discount</Btn>} />
                    )
                ) : (
                    <div className="tbl-wrap">
                        <table className="tbl disc-tbl">
                            <thead>
                                <tr>
                                    <th>Discount</th>
                                    <th>Status</th>
                                    <th className="hide-sm">Applies to</th>
                                    <th className="hide-sm">Dates</th>
                                    <th className="r">Used</th>
                                    <th className="r hide-sm">Sales</th>
                                </tr>
                            </thead>
                            <tbody>
                                {shown.map(d => <DiscountRow key={`${d.kind}:${d.id}`} d={d} onOpen={() => openDiscount(d.id)} />)}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>

            <Modal open={picking} onClose={() => setPicking(false)} title="What kind of discount?">
                <RadioCards<Kind> label="Discount type" value={null}
                    onChange={v => { setPicking(false); setNewKind(v); }}
                    options={[
                        {
                            v: "code", title: "Discount code",
                            desc: "Customers type a code like HARMATTAN20 at checkout, or you enter it at the till. Nothing comes off until someone uses the code.",
                        },
                        { v: "auto", title: "Automatic discount", desc: "Applies by itself when the cart qualifies, for example 2 slides for GH₵ 600. No code needed, and every customer whose cart qualifies gets it." },
                    ]} />
            </Modal>

            {data && (newKind || (open && openRow)) && (
                <DiscountPanel
                    key={newKind ? `new-${newKind}` : `${open!.kind}:${open!.id}`}
                    kind={newKind ?? open!.kind}
                    disc={newKind ? null : open}
                    row={newKind ? null : openRow}
                    data={data}
                    overlaps={newKind || !open ? [] : overlapBanners(overlaps, open.id)}
                    onClose={close}
                    onChanged={changed}
                    onCreated={() => { setNewKind(null); changed(); }}
                    onDeleted={() => { close(); changed(); }}
                />
            )}
        </>
    );
}

function DiscountRow({ d, onOpen }: { d: Discount; onOpen: () => void }) {
    return (
        <tr className="click" tabIndex={0} onClick={onOpen} onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onOpen(); } }}>
            <td>
                <div className="strong disc-name">{d.name}</div>
                <div className="xs muted">{d.kind === "code" ? "Code" : "Automatic"} · {d.value}</div>
            </td>
            <td><Badge tone={STATUS_TONE[d.status]}>{d.statusLabel}</Badge></td>
            <td className="hide-sm disc-applies">{d.applies}</td>
            <td className="hide-sm sm">{datesText(d.start, d.end)}</td>
            <td className="r num">{d.used.toLocaleString("en-GB")}{d.limit != null && <div className="xs muted">of {d.limit.toLocaleString("en-GB")}</div>}</td>
            <td className="r hide-sm num">{d.results ? ghs0(d.results.sales) : <span className="muted">—</span>}</td>
        </tr>
    );
}
