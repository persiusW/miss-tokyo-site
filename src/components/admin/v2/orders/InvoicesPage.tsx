"use client";

// Orders › Invoices and pay links (was Finance › Invoices, Pay Links and the
// /finance documents page; owners and admins). Invoices, quotes and pay links
// are rows in `documents`, so the old /finance page's rows are already here.
// Pay links made on the old Pay Links page (pay_links) are listed read-only.
// Amounts are always worked out on the server from the lines.
import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
    Badge, Btn, BtnLink, Card, Chip, Empty, ErrorState, Field, IconBtn, Money, Panel, Percent, RadioCards, SRow, TwoTap,
    ghs, toast, when, type Tone,
} from "@/components/admin/ui";
import type { DocumentRow, LegacyLinkRow } from "@/lib/admin/v2/ordersLoad";
import { emailDocument, saveDocument, setDocumentStatus, type DocInput } from "./actions";
import { OrdersHeader } from "./OrdersHeader";
import "./orders.css";

export type DocsData = { docs: DocumentRow[]; links: LegacyLinkRow[]; taxRate: number; feePct: number; feeLabel: string; abandoned: number | null };
type Kind = "invoice" | "quotation" | "pay_link";
type Filter = "all" | Kind;

const KIND: Record<string, string> = { invoice: "Invoice", quotation: "Quote", pay_link: "Pay link" };
const PREFIX: Record<string, string> = { invoice: "INV", quotation: "QUO", pay_link: "LINK" };
const STATUS: Record<string, [string, Tone]> = {
    draft: ["Draft", "neutral"], pending: ["Waiting for payment", "warn"], paid: ["Paid", "ok"], cancelled: ["Cancelled", "neutral"],
};
export const docNumber = (d: { id: string; type: string }) => `${PREFIX[d.type] ?? "DOC"}-${d.id.slice(0, 6).toUpperCase()}`;
const UUID_PATH = /^\/orders\/invoices\/([0-9a-f-]{36})\/?$/i;

export function InvoicesPage({ role, data, openId: initialOpen, startNew, linkFilter }: { role: string; data: DocsData | null; openId: string | null; startNew: boolean; linkFilter: boolean }) {
    const router = useRouter();
    const pathname = usePathname();
    const openId = UUID_PATH.exec(pathname)?.[1] ?? null;
    const openedHere = useRef(false);
    const [filter, setFilter] = useState<Filter>(linkFilter ? "pay_link" : "all");
    const [creating, setCreating] = useState(startNew);
    const [legacy, setLegacy] = useState<LegacyLinkRow | null>(null);

    const open = (id: string) => { openedHere.current = true; window.history.pushState(null, "", `/orders/invoices/${id}`); };
    const close = () => {
        if (openedHere.current) { openedHere.current = false; window.history.back(); }
        else window.history.pushState(null, "", "/orders/invoices");
    };

    const docs = (data?.docs ?? []).filter(d => filter === "all" || d.type === filter);
    const links = filter === "all" || filter === "pay_link" ? data?.links ?? [] : [];
    const doc = data?.docs.find(d => d.id === (openId ?? initialOpen));

    return (
        <>
            <OrdersHeader tab="invoices" role={role} abandoned={data?.abandoned ?? null} />
            <Card title="Invoices, quotes and pay links" action={<Btn kind="primary" sm icon="plus" onClick={() => setCreating(true)}>New</Btn>}>
                <div className="list-tools">
                    <div className="chips" role="group" aria-label="Show">
                        {([["all", "All"], ["invoice", "Invoices"], ["quotation", "Quotes"], ["pay_link", "Pay links"]] as [Filter, string][]).map(([v, l]) => (
                            <Chip key={v} pressed={filter === v} onClick={() => setFilter(v)}>{l}</Chip>
                        ))}
                    </div>
                </div>
                {!data ? (
                    <ErrorState what="invoices" onRetry={() => router.refresh()} />
                ) : docs.length + links.length === 0 ? (
                    <Empty icon="link" title="Nothing here yet" body="Invoices, quotes and pay links you make show here, with whether they've been paid."
                        action={<Btn kind="primary" onClick={() => setCreating(true)}>New</Btn>} />
                ) : (
                    <div className="tbl-wrap">
                        <table className="tbl ord-tbl">
                            <thead><tr><th>Number</th><th>Customer</th><th className="hide-sm">Type</th><th>Status</th><th className="hide-sm">Made</th><th className="r">Amount</th></tr></thead>
                            <tbody>
                                {docs.map(d => {
                                    const [l, t] = STATUS[d.status] ?? [d.status, "neutral"];
                                    return (
                                        <tr key={d.id} className="click" tabIndex={0} onClick={() => open(d.id)} onKeyDown={e => { if (e.key === "Enter") open(d.id); }}>
                                            <td className="strong nowrap">{docNumber(d)}</td>
                                            <td><div className="ord-cust">{d.customer_name || d.customer_email || "No customer"}</div></td>
                                            <td className="hide-sm">{KIND[d.type] ?? "Document"}</td>
                                            <td><Badge tone={t}>{l}</Badge></td>
                                            <td className="hide-sm nowrap">{when(d.created_at)}</td>
                                            <td className="r strong nowrap">{ghs(d.amount)}</td>
                                        </tr>
                                    );
                                })}
                                {links.map(x => (
                                    <tr key={x.id} className="click" tabIndex={0} onClick={() => setLegacy(x)} onKeyDown={e => { if (e.key === "Enter") setLegacy(x); }}>
                                        <td className="strong nowrap">LINK-{x.id.slice(0, 6).toUpperCase()}</td>
                                        <td><div className="ord-cust">{x.email}</div></td>
                                        <td className="hide-sm">Pay link (old)</td>
                                        <td><Badge tone={x.status === "active" ? "warn" : "neutral"}>{x.status === "active" ? "Active" : "Archived"}</Badge></td>
                                        <td className="hide-sm nowrap">{when(x.created_at)}</td>
                                        <td className="r strong nowrap">{ghs(x.amount)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>

            {creating && data && <DocPanel data={data} onClose={() => setCreating(false)} onSaved={id => { setCreating(false); router.refresh(); open(id); }} />}
            {(openId ?? initialOpen) && data && (doc
                ? <DocPanel key={doc.id} data={data} doc={doc} onClose={close} onSaved={() => router.refresh()} />
                : <Panel open onClose={close} title="Not found"><Empty icon="link" title="This invoice isn't there" body="It may have been made on another device a moment ago. Refresh the list." action={<Btn onClick={() => router.refresh()}>Refresh</Btn>} /></Panel>)}
            {legacy && (
                <Panel open onClose={() => setLegacy(null)} title={`Pay link LINK-${legacy.id.slice(0, 6).toUpperCase()}`} sub={`Made on the old Pay Links page for ${legacy.email}`}
                    footer={<Btn onClick={() => setLegacy(null)}>Close</Btn>}>
                    <dl className="dl"><dt>Amount</dt><dd>{ghs(legacy.amount)}</dd><dt>For</dt><dd>{legacy.description || "—"}</dd><dt>Status</dt><dd>{legacy.status === "active" ? "Active" : "Archived"}</dd><dt>Made</dt><dd>{when(legacy.created_at)}</dd></dl>
                    {legacy.paystack_url && <BtnLink icon="link" href={legacy.paystack_url} external>Open the Paystack page</BtnLink>}
                </Panel>
            )}
        </>
    );
}

type Line = { description: string; qty: string; unit_price: string };

function DocPanel({ data, doc, onClose, onSaved }: { data: DocsData; doc?: DocumentRow; onClose: () => void; onSaved: (id: string) => void }) {
    const editable = !doc || doc.status === "draft";
    const [kind, setKind] = useState<Kind>((doc?.type as Kind) ?? "invoice");
    const [name, setName] = useState(doc?.customer_name ?? "");
    const [email, setEmail] = useState(doc?.customer_email ?? "");
    const [lines, setLines] = useState<Line[]>(doc?.line_items?.length
        ? doc.line_items.map(l => ({ description: l.description ?? "", qty: String(l.qty ?? 1), unit_price: String(l.unit_price ?? "") }))
        : [{ description: "", qty: "1", unit_price: "" }]);
    const [tax, setTax] = useState(String(doc ? doc.tax_rate : data.taxRate));
    const [notes, setNotes] = useState(doc?.notes ?? "");
    const [busy, setBusy] = useState(false);
    const [payUrl, setPayUrl] = useState<string | null>(null);

    const sub = lines.reduce((s, l) => s + (Number(l.qty) || 0) * (Number(l.unit_price) || 0), 0);
    const total = Math.round((sub + sub * ((Number(tax) || 0) / 100)) * 100) / 100;
    const ready = lines.every(l => l.description.trim() && Number(l.unit_price) > 0) && total > 0;
    const viewUrl = useMemo(() => (doc && typeof window !== "undefined" ? `${window.location.origin}/invoice/${doc.id}` : ""), [doc]);
    useEffect(() => { setPayUrl(null); }, [doc?.id]);

    const input = (status: "draft" | "pending"): DocInput => ({
        id: doc?.id ?? null, type: kind, customer_name: name, customer_email: email, tax_rate: Number(tax) || 0, notes, status,
        lines: lines.map(l => ({ description: l.description, qty: Number(l.qty) || 1, unit_price: Number(l.unit_price) || 0 })),
    });

    const save = async (status: "draft" | "pending") => {
        setBusy(true);
        const r = await saveDocument(input(status));
        setBusy(false);
        if (!r.ok) { toast.error(r.error); return; }
        toast.success(status === "draft" ? "Saved as a draft" : `${KIND[kind]} made for ${ghs(r.amount)}`);
        onSaved(r.id);
    };

    const getLink = async () => {
        if (!doc) return;
        setBusy(true);
        try {
            const res = await fetch("/api/invoice/paystack-link", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ invoiceId: doc.id, customerEmail: doc.customer_email || undefined }) });
            const body = await res.json().catch(() => ({}));
            if (!res.ok) { toast.fromResponse(body, { audience: "staff", fallback: "PAY-02" }); return; }
            setPayUrl(body.link);
            try { await navigator.clipboard.writeText(body.link); toast.success("Paystack pay link made and copied"); } catch { toast.success("Paystack pay link made"); }
        } catch {
            toast.code("NET-01", { audience: "staff" });
        } finally {
            setBusy(false);
        }
    };

    const sendEmail = async () => {
        if (!doc) return;
        setBusy(true);
        const r = await emailDocument(doc.id, payUrl);
        setBusy(false);
        if (!r.ok) { toast.error(r.error); return; }
        toast.success(`Sent to ${r.to} by email`);
        onSaved(doc.id);
    };

    const status = async (s: "paid" | "cancelled") => {
        if (!doc) return;
        setBusy(true);
        const r = await setDocumentStatus(doc.id, s);
        setBusy(false);
        if (!r.ok) { toast.error(r.error); return; }
        toast.success(s === "paid" ? `${docNumber(doc)} marked as paid` : `${docNumber(doc)} cancelled`);
        onSaved(doc.id);
    };

    const copy = async (url: string, what: string) => {
        try { await navigator.clipboard.writeText(url); toast.success(`${what} copied`); }
        catch { toast.error("Copying isn't allowed in this browser. Select the link and copy it instead."); }
    };

    const open = doc && doc.status !== "paid" && doc.status !== "cancelled";
    return (
        <Panel open onClose={onClose}
            title={doc ? docNumber(doc) : "New invoice, quote or pay link"}
            sub={doc ? `${KIND[doc.type] ?? "Document"} for ${doc.customer_name || doc.customer_email || "no customer yet"} · ${(STATUS[doc.status] ?? [doc.status])[0]}` : "The customer pays online with card or Mobile money through Paystack."}
            footerLeft={open ? <TwoTap label="Cancel it" armed="Tap again to cancel" onConfirm={() => void status("cancelled")} disabled={busy} /> : undefined}
            footer={<>
                <Btn kind="ghost" onClick={onClose} disabled={busy}>{doc ? "Close" : "Cancel"}</Btn>
                {editable && <Btn onClick={() => save("draft")} disabled={busy || !ready}>Save draft</Btn>}
                {editable && <Btn kind="primary" onClick={() => save("pending")} disabled={busy || !ready}>{`Make ${KIND[kind].toLowerCase()}`}</Btn>}
                {doc && doc.status === "pending" && <Btn kind="primary" onClick={() => void status("paid")} disabled={busy}>Mark as paid</Btn>}
                {doc && doc.status === "paid" && <BtnLink kind="primary" icon="download" href={viewUrl} external>Open receipt</BtnLink>}
            </>}>
            {!doc && (
                <RadioCards label="Type" value={kind} onChange={setKind} options={[
                    { v: "invoice", title: "Invoice", desc: "A bill for the customer to pay online. You can send it again until it's paid." },
                    { v: "quotation", title: "Quote", desc: "A price for the customer to approve. Nothing is charged until you send a pay link." },
                    { v: "pay_link", title: "Pay link", desc: "A one-off amount the customer pays online. No stock is held." },
                ]} />
            )}
            {editable ? (
                <>
                    <div className="grid-2">
                        <Field label="Customer name" htmlFor="dname"><input id="dname" className="input" value={name} onChange={e => setName(e.target.value)} maxLength={120} /></Field>
                        <Field label="Customer email" htmlFor="demail" help="Needed to email it."><input id="demail" className="input" type="email" value={email} onChange={e => setEmail(e.target.value)} /></Field>
                    </div>
                    <div className="stack-sm">
                        <div className="label">What it&apos;s for</div>
                        {lines.map((l, i) => (
                            <div className="ord-doc-line" key={i}>
                                <input className="input" aria-label={`Line ${i + 1} description`} value={l.description} placeholder="e.g. 6 sage satin bridesmaid dresses" maxLength={200}
                                    onChange={e => setLines(lines.map((x, j) => (j === i ? { ...x, description: e.target.value } : x)))} />
                                <input className="input" aria-label={`Line ${i + 1} quantity`} inputMode="numeric" value={l.qty}
                                    onChange={e => setLines(lines.map((x, j) => (j === i ? { ...x, qty: e.target.value.replace(/\D/g, "") } : x)))} />
                                <div className="ord-doc-amt"><Money label={`Line ${i + 1} amount each`} value={l.unit_price} onChange={a => setLines(lines.map((x, j) => (j === i ? { ...x, unit_price: a } : x)))} /></div>
                                {lines.length > 1 ? <IconBtn label={`Remove line ${i + 1}`} icon="x" onClick={() => setLines(lines.filter((_, j) => j !== i))} /> : <span />}
                            </div>
                        ))}
                        <div><Btn sm kind="ghost" icon="plus" onClick={() => setLines([...lines, { description: "", qty: "1", unit_price: "" }])}>Add a line</Btn></div>
                    </div>
                    <Card inset>
                        <div className="rows">
                            <SRow label="Tax" help="Added on top of the lines. Your default comes from Settings."><Percent label="Tax" value={tax} onChange={setTax} /></SRow>
                        </div>
                    </Card>
                    <Field label="Note for the customer" htmlFor="dnote"><textarea id="dnote" className="textarea" value={notes} onChange={e => setNotes(e.target.value)} maxLength={1000} /></Field>
                </>
            ) : (
                <Card inset>
                    <div className="rows">
                        {doc!.line_items.map((l, i) => (
                            <div className="row" key={i}>
                                <div className="row-main"><div className="row-title">{l.description || "Item"}</div></div>
                                <div className="sm muted nowrap">{l.qty ?? 1} × {ghs(l.unit_price)}</div>
                            </div>
                        ))}
                    </div>
                    {doc!.notes && <div className="card-body ink2">{doc!.notes}</div>}
                </Card>
            )}
            <div className="inset hrow between"><span className="strong">Total{Number(tax) > 0 ? ` (with ${tax}% tax)` : ""}</span><span className="ord-total">{ghs(editable ? total : doc!.amount)}</span></div>
            {data.feePct > 0 && <p className="help">{data.feeLabel} of {data.feePct}% is added when the customer pays by pay link, as set in Settings.</p>}

            {doc && doc.status !== "draft" && (
                <Card inset title="Send it">
                    <div className="card-body stack-sm">
                        {open && doc.type !== "quotation" && (
                            <div className="hrow-sm wrap">
                                <Btn sm icon="link" onClick={getLink} disabled={busy}>{payUrl ? "Make a new pay link" : "Make a Paystack pay link"}</Btn>
                                {payUrl && <Btn sm icon="copy" onClick={() => copy(payUrl, "Pay link")}>Copy pay link</Btn>}
                            </div>
                        )}
                        {payUrl && <div className="xs muted" style={{ overflowWrap: "anywhere" }}>{payUrl}</div>}
                        <div className="hrow-sm wrap">
                            {doc.customer_email && open && <Btn sm icon="mail" onClick={sendEmail} disabled={busy}>Email to {doc.customer_email}</Btn>}
                            <Btn sm icon="copy" onClick={() => copy(viewUrl, "Link to view it")}>Copy link to view it</Btn>
                            <BtnLink sm icon="print" href={viewUrl} external>Open printable copy</BtnLink>
                        </div>
                        <p className="help">To send it on WhatsApp or by SMS, copy a link and paste it into your message.</p>
                    </div>
                </Card>
            )}
            {doc && <p className="help">Made {when(doc.created_at)}.</p>}
        </Panel>
    );
}
