"use client";

// Products › Gift cards (/catalogue/gift-cards). Issue (free of charge, sent by
// email through /api/gift-cards/issue), resend (/api/gift-cards/resend), the
// balance and every redemption, and cancel through a confirmation panel. The
// buy-a-gift-card page's settings are in Content › Pages.
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
    Badge, Banner, Btn, BtnLink, Card, Chip, ConfirmPanel, Empty, ErrorState, Field, Kpi, Menu, Money, Panel, Search, Seg, SkeletonRows, SRow,
    firstName, ghs, plural, toast, when,
} from "@/components/admin/ui";
import { PAGE_SIZE, giftStatus } from "@/lib/admin/v2/catalogue";
import type { GiftCardRow, GiftQuery, GiftStats } from "@/lib/admin/v2/catalogueLoad";
import { CatalogueHeader } from "./CatalogueHeader";
import { cancelGiftCard, giftCardDetail, type Redemption } from "./actions";

const STATUSES: { v: string; l: string }[] = [
    { v: "all", l: "All" }, { v: "active", l: "Active" }, { v: "redeemed", l: "Used up" }, { v: "pending_payment", l: "Waiting for payment" },
    { v: "expired", l: "Expired" }, { v: "cancelled", l: "Cancelled" },
];

const searchOf = (q: GiftQuery, patch: Partial<GiftQuery> = {}) => {
    const m = { ...q, ...patch };
    const p = new URLSearchParams();
    if (m.status !== "all") p.set("status", m.status);
    if (m.q.trim()) p.set("q", m.q.trim());
    if (m.page > 1) p.set("page", String(m.page));
    const s = p.toString();
    return s ? `?${s}` : "";
};

const canResend = (g: GiftCardRow) => g.status === "active" && g.delivery_mode === "email" && !!g.recipient_email;

export function GiftCardsPage({ query, data }: { query: GiftQuery; data: { rows: GiftCardRow[]; total: number; stats: GiftStats } | null }) {
    const router = useRouter();
    const [pending, start] = useTransition();
    const [term, setTerm] = useState(query.q);
    const [issuing, setIssuing] = useState(false);
    const [viewing, setViewing] = useState<GiftCardRow | null>(null);
    const [cancelling, setCancelling] = useState<GiftCardRow | null>(null);
    const [busy, setBusy] = useState(false);
    const refresh = () => start(() => router.refresh());
    const go = (patch: Partial<GiftQuery>) => start(() => router.push(`/catalogue/gift-cards${searchOf(query, { page: 1, ...patch })}`, { scroll: false }));

    useEffect(() => { setTerm(query.q); }, [query.q]);
    useEffect(() => {
        if (term.trim() === query.q) return;
        const t = setTimeout(() => go({ q: term.trim() }), 350);
        return () => clearTimeout(t);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [term]);

    const resend = async (g: GiftCardRow) => {
        try {
            const res = await fetch("/api/gift-cards/resend", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ gift_card_id: g.id }) });
            const json = await res.json().catch(() => ({}));
            if (!res.ok) { toast.fromResponse(json, { audience: "staff" }); return; }
            toast.success(`${g.code} sent again to ${g.recipient_email}`);
        } catch { toast.code("NET-01", { audience: "staff" }); }
    };
    const cancel = async () => {
        if (!cancelling) return;
        setBusy(true);
        const r = await cancelGiftCard(cancelling.id);
        setBusy(false);
        if (!r.ok) { toast.error(r.error); return; }
        toast.success(`${cancelling.code} cancelled`);
        setCancelling(null); setViewing(null); refresh();
    };

    const s = data?.stats;
    const pages = Math.max(1, Math.ceil((data?.total ?? 0) / PAGE_SIZE));

    return (
        <>
            <CatalogueHeader tab="gift-cards" actions={<Btn kind="primary" icon="plus" onClick={() => setIssuing(true)} data-assist="giftcards.issue">Issue gift card</Btn>} />
            <div className="grid-4 cat-kpis">
                <Kpi label="Cards issued" value={s ? s.issued.toLocaleString("en-GB") : "—"} ctx="active or used up" />
                <Kpi label="Value issued" value={s ? ghs(s.totalValue, 0) : "—"} ctx="every card, at its starting amount" />
                <Kpi label="Still to spend" value={s ? ghs(s.outstanding, 0) : "—"} ctx="left on active cards" />
                <Kpi label="Used up this month" value={s ? s.redeemedMonth.toLocaleString("en-GB") : "—"} ctx="cards issued this month and spent in full" />
            </div>
            <Card>
                <div className="list-tools cat-tools">
                    <Search value={term} onChange={setTerm} placeholder="Search code, name or email" />
                    <div className="chips" role="group" aria-label="Gift card status">
                        {STATUSES.map(x => <Chip key={x.v} pressed={query.status === x.v} onClick={() => go({ status: x.v })}>{x.l}</Chip>)}
                    </div>
                </div>
                {!data ? <ErrorState what="gift cards" onRetry={refresh} />
                    : pending ? <SkeletonRows n={6} cols={5} />
                    : data.rows.length === 0 ? (
                        query.q || query.status !== "all"
                            ? <Empty icon="search" title="No gift cards match" body="Try another code, name or email, or show every card." action={<Btn onClick={() => { setTerm(""); go({ q: "", status: "all" }); }}>Show all</Btn>} />
                            : <Empty icon="gift" title="No gift cards yet" body="Cards customers buy in the shop and cards you issue here appear in this list." action={<Btn kind="primary" onClick={() => setIssuing(true)}>Issue gift card</Btn>} />
                    ) : (
                        <div className="tbl-wrap">
                            <table className="tbl cat-tbl">
                                <thead><tr><th>Code</th><th>For</th><th className="hide-sm">From</th><th className="r">Balance</th><th>Status</th><th className="r"><span className="sr">Actions</span></th></tr></thead>
                                <tbody>
                                    {data.rows.map(g => {
                                        const [label, tone] = giftStatus(g.status);
                                        const items = [
                                            { l: "Details and balance", icon: "gift" as const, onClick: () => setViewing(g) },
                                            ...(canResend(g) ? [{ l: "Resend to recipient", icon: "mail" as const, onClick: () => void resend(g) }] : []),
                                            ...(g.status === "active" ? ["-" as const, { l: "Cancel gift card", icon: "x" as const, danger: true, onClick: () => setCancelling(g) }] : []),
                                        ];
                                        return (
                                            <tr key={g.id} className="click" tabIndex={0} onClick={() => setViewing(g)} onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); setViewing(g); } }}>
                                                <td><div className="strong cat-gift-code">{g.code}</div><div className="xs muted">Issued {when(g.created_at)}</div></td>
                                                <td><div>{g.recipient_name || g.recipient_email || "—"}</div>{g.recipient_name && g.recipient_email && <div className="xs muted">{g.recipient_email}</div>}</td>
                                                <td className="hide-sm">{g.sender_name || g.purchased_by_email || "—"}</td>
                                                <td className="r num">{ghs(g.remaining_value)}<div className="xs muted">of {ghs(g.initial_value)}</div></td>
                                                <td><Badge tone={tone}>{label}</Badge></td>
                                                <td className="r" onClick={e => e.stopPropagation()}><Menu label={`Actions for ${g.code}`} left items={items} /></td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                {data && (
                    <div className="pager">
                        <span>{plural(data.total, "gift card")} · newest first</span>
                        <span className="hrow-sm">
                            {pages > 1 && <span className="muted">Page {query.page} of {pages}</span>}
                            <Btn sm kind="ghost" disabled={query.page <= 1 || pending} onClick={() => go({ page: query.page - 1, status: query.status, q: query.q })}>Previous</Btn>
                            <Btn sm kind="ghost" disabled={query.page >= pages || pending} onClick={() => go({ page: query.page + 1, status: query.status, q: query.q })}>Next</Btn>
                        </span>
                    </div>
                )}
            </Card>
            <Card pad className="cat-kpis" title="The buy-a-gift-card page">
                <SRow label="Amounts, limits and wording customers see" help="Set on the Gift cards page in Content › Pages (Site Settings › CMS › Gift Cards in the old admin).">
                    <BtnLink href="/content/pages">Open Content › Pages</BtnLink>
                </SRow>
            </Card>

            {issuing && <IssuePanel onClose={() => setIssuing(false)} onIssued={() => { setIssuing(false); refresh(); }} />}
            {viewing && <GiftPanel g={viewing} onClose={() => setViewing(null)} onResend={() => void resend(viewing)} onCancel={() => setCancelling(viewing)} />}
            <ConfirmPanel open={!!cancelling} level={viewing ? 2 : 1} onClose={() => setCancelling(null)} busy={busy}
                title={cancelling ? `Cancel ${cancelling.code}` : "Cancel gift card"} sub={cancelling ? `For ${cancelling.recipient_name || cancelling.recipient_email || "the recipient"}` : undefined}
                consequenceTitle={cancelling ? `${ghs(cancelling.remaining_value)} can no longer be spent` : ""}
                consequence={cancelling ? `The code stops working at checkout and the till straight away. ${firstName(cancelling.recipient_name) || "The recipient"} isn't told. No money is refunded to the buyer; do that from the original order if you need to. This can't be undone.` : ""}
                cancelLabel="Keep gift card" confirmLabel="Cancel gift card" onConfirm={cancel} />
        </>
    );
}

function GiftPanel({ g, onClose, onResend, onCancel }: { g: GiftCardRow; onClose: () => void; onResend: () => void; onCancel: () => void }) {
    const [d, setD] = useState<{ card: GiftCardRow; redemptions: Redemption[] } | null>(null);
    const [failed, setFailed] = useState<string | null>(null);
    useEffect(() => {
        let live = true;
        giftCardDetail(g.id).then(r => { if (!live) return; if (r.ok) setD({ card: r.card, redemptions: r.redemptions }); else setFailed(r.error); });
        return () => { live = false; };
    }, [g.id]);
    const c = d?.card ?? g;
    const [label, tone] = giftStatus(c.status);
    const facts: [string, string][] = [
        ["Balance", `${ghs(c.remaining_value)} of ${ghs(c.initial_value)}`],
        ["Recipient", [c.recipient_name, c.recipient_email].filter(Boolean).join(" · ") || "—"],
        ["From", [c.sender_name, c.purchased_by_email].filter(Boolean).join(" · ") || "—"],
        ["Delivery", c.delivery_mode === "email" ? `By email${c.sent_at ? `, sent ${when(c.sent_at)}` : ""}` : "Given in person"],
        ["Expires", c.expires_at ? when(c.expires_at) : "Never"],
        ["Issued", when(c.created_at)],
    ];
    return (
        <Panel open onClose={onClose} title={c.code} sub={c.message ? `“${c.message}”` : undefined} head={<div style={{ marginBottom: 4 }}><Badge tone={tone}>{label}</Badge></div>}
            footerLeft={c.status === "active" ? <Btn kind="danger" onClick={onCancel}>Cancel gift card</Btn> : undefined}
            footer={<>{canResend(c) && <Btn kind="ghost" icon="mail" onClick={onResend}>Resend</Btn>}<Btn onClick={onClose}>Close</Btn></>}>
            <div className="card cat-inset"><div className="rows">{facts.map(([k, v]) => <SRow key={k} label={k}><span className="sm">{v}</span></SRow>)}</div></div>
            <div className="card cat-inset">
                <div className="card-h"><h2>Spent</h2></div>
                {failed ? <ErrorState what="the redemptions" body={failed} />
                    : !d ? <SkeletonRows n={2} cols={3} />
                    : d.redemptions.length === 0 ? <Empty icon="gift" title="Not used yet" body="Each time the code is used at checkout or the till, the amount appears here." />
                    : <div className="rows">{d.redemptions.map(r => (
                        <div className="row" key={r.id}>
                            <div className="row-main"><div className="row-title">{ghs(r.amount_used)} spent</div><div className="row-sub">{when(r.redeemed_at)} · {ghs(r.balance_before)} → {ghs(r.balance_after)}</div></div>
                        </div>
                    ))}</div>}
            </div>
        </Panel>
    );
}

const AMOUNTS = ["100", "300", "500", "other"] as const;

function IssuePanel({ onClose, onIssued }: { onClose: () => void; onIssued: () => void }) {
    const [amt, setAmt] = useState<(typeof AMOUNTS)[number]>("300");
    const [custom, setCustom] = useState("");
    const [to, setTo] = useState("");
    const [email, setEmail] = useState("");
    const [from, setFrom] = useState("Miss Tokyo");
    const [msg, setMsg] = useState("");
    const [busy, setBusy] = useState(false);
    const value = amt === "other" ? Number(custom) || 0 : Number(amt);
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
    const ok = value > 0 && value <= 100000 && emailOk;
    const issue = async () => {
        setBusy(true);
        try {
            const res = await fetch("/api/gift-cards/issue", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ recipient_email: email.trim(), recipient_name: to.trim(), sender_name: from.trim(), message: msg.trim(), initial_value: value }),
            });
            const json = await res.json().catch(() => ({}));
            if (!res.ok) { toast.fromResponse(json, { audience: "staff" }); return; }
            toast.success(`Gift card for ${ghs(value)} sent to ${email.trim()}`);
            onIssued();
        } catch { toast.code("NET-01", { audience: "staff" }); }
        finally { setBusy(false); }
    };
    return (
        <Panel open onClose={onClose} title="Issue a gift card" sub="Free of charge. To sell one, the customer buys it in the shop."
            footer={<><Btn kind="ghost" onClick={onClose} disabled={busy}>Cancel</Btn><Btn kind="primary" disabled={!ok || busy} onClick={issue}>{busy ? "Sending…" : `Send ${value ? ghs(value, 0) : ""} gift card`}</Btn></>}>
            <Field label="Amount"><Seg label="Amount" value={amt} onChange={setAmt} options={[{ v: "100", l: "GH₵ 100" }, { v: "300", l: "GH₵ 300" }, { v: "500", l: "GH₵ 500" }, { v: "other", l: "Other" }]} /></Field>
            {amt === "other" && <Field label="Other amount" htmlFor="gc-amt"><Money id="gc-amt" value={custom} onChange={setCustom} /></Field>}
            <div className="grid-2">
                <Field label="Recipient's name" htmlFor="gc-to"><input id="gc-to" className="input" value={to} onChange={e => setTo(e.target.value)} /></Field>
                <Field label="Recipient's email" htmlFor="gc-email" help="The code is sent here straight away." error={email && !emailOk ? "Check the email address." : null}>
                    <input id="gc-email" className="input" type="email" inputMode="email" value={email} onChange={e => setEmail(e.target.value)} />
                </Field>
            </div>
            <Field label="From" htmlFor="gc-from"><input id="gc-from" className="input" value={from} onChange={e => setFrom(e.target.value)} /></Field>
            <Field label="Message" htmlFor="gc-msg" help="Optional. Printed on the gift card email."><textarea id="gc-msg" className="textarea" rows={3} value={msg} onChange={e => setMsg(e.target.value)} /></Field>
            {ok && <Banner tone="neutral" title={`${ghs(value)} to ${to.trim() || email.trim()}`}>{"The code works at checkout and at the till until it's spent or cancelled."}</Banner>}
        </Panel>
    );
}
