"use client";

// One order, over the list (README › Orders › Order panel). Details and
// Timeline tabs; one primary action that depends on where the order is; the
// money and stock flows open as level-2 panels (OrderFlows.tsx). Status only
// changes through those actions: the raw status selects are gone.
import { useCallback, useEffect, useState } from "react";
import {
    Badge, Banner, Btn, BtnLink, Card, ConfirmPanel, Empty, ErrorState, Field, FulBadge, Menu, PayBadge, Panel, SkeletonRows, Thumb,
    firstName, ghs, plural, toast, when,
} from "@/components/admin/ui";
import { zoneLabel } from "@/lib/delivery";
import { displayPhone, normaliseOrderPhone } from "@/lib/phone";
import {
    STEPS_DELIVERY, STEPS_PICKUP, canCancel, canRefund, channelLabel, fulKeyOf, isPickup, nextStep, orderRef, payKeyOf, stepIndex, unpaidFor,
    type TimelineItem,
} from "@/lib/admin/v2/orders";
import type { OrderDetail } from "@/lib/admin/v2/ordersLoad";
import { getOrder, getTimeline, markFinished, markPaid, saveStaffNote } from "./actions";
import { CancelPanel, NoteModal, PackPanel, RefundPanel, ShipPanel } from "./OrderFlows";
import { Receipt } from "./PrintSheets";

type Role = "admin" | "owner" | "sales_staff";
type Sub = null | "pack" | "ship" | "refund" | "cancel" | "note" | "apply" | "paid";

type Verdict = {
    checked: boolean; reason?: string; message?: string; mismatch?: boolean; alreadyFulfilled?: boolean;
    paystack?: { status: string; amount: number | null; requestedAmount: number | null; fees: number | null; paidAt: string | null; channel: string | null; unknown: boolean };
    order?: { payment_status: string; total_amount: number };
};

const PAID_STATUSES = ["paid", "processing", "packed", "shipped", "ready_for_pickup", "fulfilled", "delivered"];
const METHOD: Record<string, string> = { paystack: "Card or Mobile money", cash: "Cash", gift_card: "Gift card" };

async function postJson(url: string, body: unknown): Promise<{ ok: boolean; data: any }> {
    try {
        const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
        return { ok: res.ok, data: await res.json().catch(() => ({})) };
    } catch {
        return { ok: false, data: { code: "NET-01" } };
    }
}

function verdictText(v: Verdict, total: number): { ok: boolean; title: string; body: string } {
    if (!v.checked) return { ok: false, title: "No payment found yet", body: v.message ?? "Paystack has nothing for this order." };
    const p = v.paystack!;
    if (p.unknown) return { ok: false, title: "No payment found yet", body: "Paystack doesn't know this payment reference, so the customer never reached the payment page." };
    if (p.status === "success") {
        const at = p.paidAt ? ` on ${when(p.paidAt)}` : "";
        const by = p.channel ? ` by ${p.channel === "mobile_money" ? "Mobile money" : p.channel.replace(/_/g, " ")}` : "";
        return { ok: true, title: "Payment confirmed", body: `Paystack confirms ${ghs(p.amount ?? total)} paid${by}${at}.` };
    }
    if (p.status === "abandoned" || p.status === "ongoing" || p.status === "pending") {
        return { ok: false, title: "No payment found yet", body: "The customer started paying and hasn't finished. Mobile money can take a few minutes, so check again before you cancel." };
    }
    if (p.status === "failed") return { ok: false, title: "No payment found yet", body: "Paystack says the payment was declined, so nothing was charged." };
    if (p.status === "reversed") return { ok: false, title: "Payment reversed", body: "Paystack says this payment was reversed." };
    return { ok: false, title: "No payment found yet", body: `Paystack hasn't confirmed a payment for this order.` };
}

export function OrderPanel({ orderId, role, initial, onClose, onChanged }: {
    orderId: string; role: Role; initial: OrderDetail | null | "error"; onClose: () => void; onChanged: () => void;
}) {
    const [tab, setTab] = useState<"details" | "timeline">("details");
    const [d, setD] = useState<OrderDetail | null>(initial && initial !== "error" ? initial : null);
    const [state, setState] = useState<"loading" | "ready" | "error" | "gone">(initial === "error" ? "error" : initial ? "ready" : "loading");
    const [sub, setSub] = useState<Sub>(null);
    const [verify, setVerify] = useState<Verdict | "loading" | null>(null);
    const [note, setNote] = useState<string>(initial && initial !== "error" ? initial.order.notes ?? "" : "");
    const [timeline, setTimeline] = useState<TimelineItem[] | "loading" | "error">("loading");
    const [busy, setBusy] = useState(false);
    const [printing, setPrinting] = useState(false);

    const load = useCallback(async () => {
        const r = await getOrder(orderId);
        if (r.ok) { setD(r.detail); setNote(r.detail.order.notes ?? ""); setState("ready"); }
        else setState(r.error.includes("isn't there") ? "gone" : "error");
    }, [orderId]);
    const loadTimeline = useCallback(async () => {
        setTimeline("loading");
        const r = await getTimeline(orderId);
        setTimeline(r.ok ? r.items : "error");
    }, [orderId]);

    // A server copy can be a moment old, and a reopened panel stale: always fetch once.
    useEffect(() => { void load(); }, [load]);
    useEffect(() => { if (tab === "timeline") void loadTimeline(); }, [tab, loadTimeline]);
    useEffect(() => {
        if (!printing) return;
        const t = setTimeout(() => { window.print(); setPrinting(false); }, 50);
        return () => clearTimeout(t);
    }, [printing]);

    const changed = () => { setSub(null); void load(); if (tab === "timeline") void loadTimeline(); onChanged(); };

    if (!d) {
        return (
            <Panel open wide onClose={onClose} title={state === "gone" ? "Order not found" : "Order"} label="Order">
                {state === "loading" && <SkeletonRows n={6} cols={3} />}
                {state === "error" && <ErrorState what="this order" onRetry={() => { setState("loading"); void load(); }} />}
                {state === "gone" && <Empty icon="orders" title="This order isn't there" body="The link may have a typing mistake. Search the list by order number, name or phone."
                    action={<Btn onClick={onClose}>Back to orders</Btn>} />}
            </Panel>
        );
    }

    const o = d.order;
    const ref = orderRef(o);
    const pay = payKeyOf(o);
    const ful = fulKeyOf(o);
    const pickup = isPickup(o);
    const full = role === "owner" || role === "admin";
    const step = nextStep(o);
    const steps = pickup ? STEPS_PICKUP : STEPS_DELIVERY;
    const si = stepIndex(o);
    const total = Number(o.total_amount ?? 0);
    const refunded = Number(o.refunded_total ?? 0);
    const meta = (o.customer_metadata ?? {}) as Record<string, unknown>;
    const phone = normaliseOrderPhone(o.customer_phone);
    const wa = normaliseOrderPhone(typeof meta.whatsapp === "string" && meta.whatsapp ? meta.whatsapp : o.customer_phone);
    const email = o.customer_email && !String(o.customer_email).toLowerCase().endsWith("@misstokyo.store") ? String(o.customer_email) : null;
    const addr = typeof o.shipping_address === "string" ? o.shipping_address : o.shipping_address?.text ?? null;
    const units = d.lines.reduce((s, l) => s + l.quantity, 0);
    const packedUnits = d.lines.reduce((s, l) => s + Math.min(l.packed, l.quantity), 0);
    const preLines = d.lines.filter(l => l.preorder);
    const wholesale = Array.isArray(o.items) && o.items.some((i: any) => i?.isWholesale === true);
    const charged = o.paystack_charged != null ? Number(o.paystack_charged) : null;
    const fee = o.paystack_fee != null ? Number(o.paystack_fee) : null;
    const hasRef = !!o.paystack_reference && o.paystack_reference !== "dummy-ref";
    const stale = unpaidFor(o);
    const failedRefunds = d.refunds.filter(r => r.status === "failed");
    const pendingRefunds = d.refunds.filter(r => r.status === "pending");
    const lastParcel = d.fulfilments[d.fulfilments.length - 1];
    // The store's processing fee isn't stored on its own; it is what the total
    // holds beyond the items, less discounts, plus delivery. Shown only when the
    // items add up (a line with no price leaves it out rather than guess).
    const itemsTotal = d.lines.every(l => l.price > 0) ? Math.round(d.lines.reduce((s, l) => s + l.price * l.quantity, 0) * 100) / 100 : 0;
    const processing = itemsTotal > 0
        ? Math.round((total - (itemsTotal - Number(o.discount_amount ?? 0) - Number(o.auto_discount_amount ?? 0) + Number(o.delivery_fee ?? 0))) * 100) / 100
        : 0;

    const check = async (apply = false) => {
        setVerify(apply ? verify : "loading");
        setBusy(apply);
        const { ok, data } = await postJson("/api/admin/orders/verify-payment", { orderId: o.id, apply });
        setBusy(false);
        if (!ok && !data?.reason) { setVerify(null); toast.fromResponse(data, { audience: "staff", fallback: "PAY-01" }); return; }
        setVerify(data as Verdict);
        if (apply) {
            setSub(null);
            if (data.applied) { toast.success(data.message ?? `#${ref} marked paid`); changed(); }
            else if (data.message) toast.info(data.message);
        } else if (data.checked && data.paystack?.status === "success") {
            void load();
        }
    };

    const tellReady = async () => {
        setBusy(true);
        const { ok, data } = await postJson("/api/pickup-ready", { orderIds: [o.id] });
        setBusy(false);
        if (!ok) { toast.fromResponse(data, { audience: "staff" }); return; }
        toast.success(`#${ref}: ${firstName(o.customer_name) || "the customer"} was told it's ready to collect`);
        changed();
    };

    const finish = async () => {
        setBusy(true);
        const r = await markFinished(o.id);
        if (!r.ok) { setBusy(false); toast.error(r.error); return; }
        const n = await postJson("/api/email/fulfillment", { orderId: o.id, type: "fulfilled" });
        setBusy(false);
        toast.success(`#${ref} marked as ${pickup ? "collected" : "delivered"}`);
        if (!n.ok) toast.error("The order was updated, but the customer email didn't go out. (EML-01)");
        changed();
    };

    const paid = async () => {
        setBusy(true);
        const r = await markPaid(o.id);
        setBusy(false);
        if (!r.ok) { toast.error(r.error); return; }
        toast.success(`#${ref} marked as paid`);
        changed();
    };

    const resend = async () => {
        const { ok, data } = await postJson("/api/admin/orders/resend-confirmation", { orderId: o.id });
        if (!ok) { toast.fromResponse(data, { audience: "staff", fallback: "EML-01" }); return; }
        toast.success(`Confirmation sent again to ${email ?? "the customer"}`);
    };

    const copyDetails = async () => {
        const text = [
            `Order #${ref}`,
            o.customer_name, phone ? displayPhone(phone) : o.customer_phone, email,
            pickup ? "Pickup in store" : addr,
            ...d.lines.map(l => `${l.quantity} × ${l.name}${l.variant ? ` (${l.variant})` : ""}`),
            `Total ${ghs(total)}`,
        ].filter(Boolean).join("\n");
        try { await navigator.clipboard.writeText(text); toast.success("Name, phone, address and items copied"); }
        catch { toast.error("Copying isn't allowed in this browser. Select the details and copy them instead."); }
    };

    const saveNote = async () => {
        if ((note ?? "").trim() === (o.notes ?? "").trim()) return;
        const r = await saveStaffNote(o.id, note);
        if (!r.ok) { toast.error(r.error); return; }
        toast.success("Staff note saved");
        setD({ ...d, order: { ...o, notes: note.trim() || null } });
    };

    const primary = (() => {
        switch (step) {
            case "check": return hasRef ? <Btn kind="primary" onClick={() => check()} disabled={verify === "loading"}>Check with Paystack</Btn> : null;
            case "pack": return <Btn kind="primary" onClick={() => setSub("pack")}>Mark as packed</Btn>;
            case "send-rest": return <Btn kind="primary" onClick={() => setSub("pack")}>Send remaining items</Btn>;
            case "ready": return <Btn kind="primary" onClick={tellReady} disabled={busy} data-assist="order.pickup-ready">{busy ? "Sending…" : "Tell customer it's ready"}</Btn>;
            case "ship": return <Btn kind="primary" icon="truck" onClick={() => setSub("ship")} data-assist="order.assign-rider">Assign rider and send</Btn>;
            case "delivered": return <Btn kind="primary" onClick={finish} disabled={busy} data-assist="order.mark-fulfilled">{busy ? "Saving…" : "Mark as delivered"}</Btn>;
            case "collected": return <Btn kind="primary" onClick={finish} disabled={busy} data-assist="order.mark-collected">{busy ? "Saving…" : "Mark as collected"}</Btn>;
            default: return null;
        }
    })();

    const more = (
        <span data-assist="orders.row-menu" style={{ display: "contents" }}>
            <Menu up label="More order actions" items={[
                ...(o.payment_status !== "paid" && o.payment_status !== "refunded" ? [{ l: "Mark as paid", icon: "check" as const, onClick: () => setSub("paid") }] : []),
                ...(PAID_STATUSES.includes(String(o.status)) && email ? [{ l: "Resend confirmation", icon: "mail" as const, onClick: () => void resend() }] : []),
                { l: "Print receipt", icon: "print" as const, onClick: () => setPrinting(true) },
                { l: "Copy delivery details", icon: "copy" as const, onClick: () => void copyDetails() },
                ...(o.customer_email ? [{ l: "Open customer", icon: "user" as const, onClick: () => window.location.assign(`/customers/${encodeURIComponent(String(o.customer_email).toLowerCase())}`) }] : []),
                // The till opens with this customer already chosen (by email, else phone).
                ...(o.customer_email || o.customer_phone ? [{ l: "New sale for this customer", icon: "till" as const, onClick: () => window.location.assign(`/till?customer=${encodeURIComponent(String(o.customer_email || o.customer_phone))}`) }] : []),
            ]} />
        </span>
    );

    const v = verify && verify !== "loading" ? verdictText(verify, total) : null;

    return (
        <>
            <Panel open wide onClose={onClose} label={`Order ${ref}`}
                head={<div className="hrow-sm wrap" style={{ marginBottom: 6 }}>
                    <PayBadge s={pay} /><FulBadge s={ful} pickup={pickup} />
                    {o.has_preorder && <Badge tone="info" plain>Includes pre-order</Badge>}
                    {o.is_mixed_order && <Badge plain>Mixed order</Badge>}
                    {wholesale && <Badge plain>Wholesale</Badge>}
                </div>}
                title={`Order #${ref}`}
                sub={`${o.customer_name || o.customer_email || "No name"} · ${when(o.created_at)} · ${channelLabel(o.source)}`}
                tabs={[{ v: "details", l: "Details" }, { v: "timeline", l: "Timeline" }]} tab={tab} onTab={setTab}
                footerLeft={<>
                    {full && canRefund(o) && d.refundable > 0 && <Btn kind="ghost" icon="refund" onClick={() => setSub("refund")} data-assist="order.refund">Refund</Btn>}
                    {canCancel(o) && <Btn kind="ghost" onClick={() => setSub("cancel")} data-assist="order.cancel">Cancel order</Btn>}
                </>}
                footer={<>{more}{primary || <Btn onClick={onClose}>Close</Btn>}</>}>
                {tab === "details" ? (
                    <>
                        {stale && (
                            <Banner tone="warn" title={stale} action={hasRef ? <Btn sm onClick={() => check()}>Check with Paystack</Btn> : undefined}>
                                Check whether the customer paid before you cancel. Cancelling releases the stock held for this order.
                            </Banner>
                        )}
                        {preLines.length > 0 && ful !== "cancelled" && (
                            <Banner tone="info" title={preLines.length === d.lines.length ? "The whole order is on pre-order" : preLines.length === 1 ? "One item is on pre-order" : `${preLines.length} items are on pre-order`}>
                                {preLines.map(l => l.name).join(", ")}. {preLines.length === d.lines.length
                                    ? "Pack it when the stock arrives."
                                    : `You can send the other items now and the rest when ${preLines.length === 1 ? "it arrives" : "they arrive"}.`}
                            </Banner>
                        )}
                        {ful === "partly" && (
                            <Banner tone="warn" title={`${units - packedUnits} of ${plural(units, "item")} still to send`}>
                                {lastParcel ? `The last parcel was packed ${when(lastParcel.created_at)}${lastParcel.who ? ` by ${lastParcel.who}` : ""}.` : "Part of the order has been packed."}
                            </Banner>
                        )}
                        {failedRefunds.map(r => (
                            <Banner key={r.id} tone="danger" title={`Paystack couldn't complete the refund of ${ghs(r.amount_ghs)}`}>
                                Nothing went back to the customer. Refund it in your Paystack dashboard, then record it here.
                            </Banner>
                        ))}
                        {pendingRefunds.length > 0 && (
                            <Banner tone="info" title={`${ghs(pendingRefunds.reduce((s, r) => s + r.amount_ghs, 0))} is on its way back through Paystack`}>
                                Paystack is still processing it. It usually arrives within 5–10 working days.
                            </Banner>
                        )}
                        {verify === "loading" ? (
                            <div className="inset ord-verify"><div className="skel ord-spin" /><span className="muted">Checking with Paystack…</span></div>
                        ) : v && verify && (
                            <Banner tone={v.ok && !verify.mismatch ? "ok" : "warn"} title={v.title}
                                action={verify.mismatch ? <Btn sm kind="primary" onClick={() => setSub("apply")}>Mark this order paid</Btn> : undefined}>
                                {v.body}
                                {verify.mismatch && ` This customer paid, but the order is marked ${verify.order?.payment_status === "cancelled" ? "cancelled" : "unpaid"}.`}
                                {verify.mismatch && verify.alreadyFulfilled && " The goods have already gone out, so only the record is wrong."}
                                {verify.checked && verify.paystack?.requestedAmount != null && Math.abs(verify.paystack.requestedAmount - total) > 0.005 &&
                                    ` Paystack was asked for ${ghs(verify.paystack.requestedAmount)} but this order totals ${ghs(total)}. The order has changed since checkout.`}
                            </Banner>
                        )}

                        {si >= 0 && (
                            <div className="steps" aria-label="Order progress" data-assist="order.fulfillment-status">
                                {steps.map((s, i) => <div key={s} className={`step${i < si ? " done" : i === si ? " now" : ""}`}><div className="step-bar" />{s}</div>)}
                            </div>
                        )}

                        <Card inset title="Items" action={<span className="muted sm">{plural(units, "item")}</span>}>
                            {d.lines.length === 0 ? (
                                <div className="card-body muted">No line items were stored for this order. Total {ghs(total)}.</div>
                            ) : (
                                <div className="rows ord-lines">
                                    {d.lines.map(l => (
                                        <div className="row" key={l.index}>
                                            <Thumb src={l.image} label={l.name.split(/\s+/).map(w => w[0]).join("").slice(0, 2)} />
                                            <div className="row-main">
                                                <div className="row-title">{l.name}</div>
                                                <div className="row-sub">{[l.variant, l.sku ? `SKU ${l.sku}` : "", l.preorder ? "Pre-order" : "", ful === "partly" ? `${Math.min(l.packed, l.quantity)} of ${l.quantity} sent` : ""].filter(Boolean).join(" · ")}<span className="ord-unit-sm"> · {l.quantity} × {ghs(l.price)}</span></div>
                                            </div>
                                            <div className="sm muted nowrap hide-sm">{l.quantity} × {ghs(l.price)}</div>
                                            <div className="strong nowrap ord-line-total">{ghs(l.price * l.quantity)}</div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </Card>

                        <div className="grid-2">
                            <Card inset title="Payment" action={hasRef ? <Btn sm kind="ghost" onClick={() => check()} disabled={verify === "loading"} data-assist="order.verify">Check with Paystack</Btn> : undefined}>
                                <div className="card-body">
                                    <dl className="dl">
                                        {itemsTotal > 0 && <><dt>Items</dt><dd>{ghs(itemsTotal)}</dd></>}
                                        {Number(o.auto_discount_amount ?? 0) > 0 && <><dt>Discount · {o.auto_discount_title || "automatic"}</dt><dd>−{ghs(o.auto_discount_amount)}</dd></>}
                                        {Number(o.discount_amount ?? 0) > 0 && <><dt>Discount · {o.discount_code}</dt><dd>−{ghs(o.discount_amount)}</dd></>}
                                        {Number(o.delivery_fee ?? 0) > 0 && <><dt>Delivery · {zoneLabel(o.delivery_zone)}</dt><dd>{ghs(o.delivery_fee)}</dd></>}
                                        {processing > 0.005 && <><dt>Processing fee</dt><dd>{ghs(processing)}</dd></>}
                                        <dt className="strong" style={{ color: "var(--ink)" }}>Total</dt><dd className="strong">{ghs(total)}</dd>
                                        {refunded > 0 && <><dt>Refunded</dt><dd>−{ghs(refunded)}</dd></>}
                                        <dt>Paid by</dt><dd>{["unpaid", "failed", "void"].includes(pay) ? "Not paid yet" : METHOD[(o.payment_method ?? "paystack").toLowerCase()] ?? "Card or Mobile money"}</dd>
                                        {charged != null && Math.abs(charged - total) > 0.005 && <><dt>Customer was charged</dt><dd>{ghs(charged)}</dd></>}
                                        {fee != null && fee > 0 && charged != null && (
                                            <>
                                                <dt>Paystack fee</dt><dd>−{ghs(fee)}{charged - total > 0.005 ? " · paid by the customer" : ""}</dd>
                                                <dt>You receive</dt><dd className="strong">{ghs(Math.max(0, charged - fee - refunded))}</dd>
                                            </>
                                        )}
                                        {hasRef && <><dt>Reference</dt><dd className="xs" style={{ overflowWrap: "anywhere" }}>{o.paystack_reference}</dd></>}
                                    </dl>
                                </div>
                            </Card>
                            <Card inset title="Customer" action={o.customer_email ? <BtnLink sm kind="ghost" href={`/customers/${encodeURIComponent(String(o.customer_email).toLowerCase())}`}>Open</BtnLink> : undefined}>
                                <div className="card-body stack-sm">
                                    <div className="strong">{o.customer_name || "No name"}</div>
                                    <div className="sm ink2 ord-contact">
                                        {email && <a href={`mailto:${email}`}>{email}</a>}
                                        {phone && <a href={`tel:+${phone}`}>{displayPhone(phone)}</a>}
                                        {typeof meta.instagram === "string" && meta.instagram && <span>Instagram: {meta.instagram}</span>}
                                        {typeof meta.snapchat === "string" && meta.snapchat && <span>Snapchat: {meta.snapchat}</span>}
                                    </div>
                                    <div className="hrow-sm wrap">
                                        {wa && <BtnLink sm icon="wa" href={`https://wa.me/${wa}`} external>WhatsApp</BtnLink>}
                                        {email && <BtnLink sm icon="mail" href={`mailto:${email}`} external>Email</BtnLink>}
                                    </div>
                                    <div className="sm" style={{ marginTop: 6 }}>
                                        <span className="strong">{pickup ? "Collect from the shop" : `Delivery${o.delivery_zone ? ` · ${zoneLabel(o.delivery_zone)}` : ""}`}</span>
                                        {!pickup && addr && <div className="ink2">{addr}</div>}
                                        {pickup && d.pickup && (
                                            <div className="ink2">
                                                {d.pickup.instructions && <div>{d.pickup.instructions}</div>}
                                                {d.pickup.address && <div>{d.pickup.address}</div>}
                                                {d.pickup.phone && <div>{d.pickup.phone}</div>}
                                                {d.pickup.wait && <div>Ready in {d.pickup.wait}</div>}
                                            </div>
                                        )}
                                        {d.rider && <div className="ink2">Rider: {d.rider.full_name} · {displayPhone(normaliseOrderPhone(d.rider.phone_number) ?? d.rider.phone_number)}{d.rider.bike_reg ? ` · ${d.rider.bike_reg}` : ""}</div>}
                                        {o.ready_at && ful === "ready" && <div className="ink2">Ready since {when(o.ready_at)}</div>}
                                    </div>
                                </div>
                            </Card>
                        </div>

                        <div className="stack-sm">
                            <Field label="Staff notes" help="Only your team sees this. Saved when you click away." htmlFor="snote">
                                <textarea id="snote" className="textarea" value={note} maxLength={1000} onChange={e => setNote(e.target.value)} onBlur={() => void saveNote()}
                                    placeholder="e.g. Customer will send a rider at 4pm" />
                            </Field>
                            <div><Btn sm icon="mail" onClick={() => setSub("note")}>Send a note to the customer</Btn></div>
                        </div>
                    </>
                ) : timeline === "loading" ? (
                    <SkeletonRows n={5} cols={2} />
                ) : timeline === "error" ? (
                    <ErrorState what="the timeline" onRetry={() => void loadTimeline()} />
                ) : timeline.length === 0 ? (
                    <Empty icon="clock" title="Nothing recorded yet" body="Payments, packing, messages to the customer and refunds show here as they happen." />
                ) : (
                    <div className="tl">
                        {timeline.map((t, i) => (
                            <div className="tl-item" key={i}><span className={`tl-dot ${t.tone}`} /><div><div>{t.text}</div><div className="xs muted">{when(t.at)}</div></div></div>
                        ))}
                    </div>
                )}
            </Panel>

            {sub === "pack" && <PackPanel d={d} onClose={() => setSub(null)} onDone={changed} />}
            {sub === "ship" && <ShipPanel orders={[{ id: o.id, ref, name: o.customer_name }]} onClose={() => setSub(null)} onDone={changed} />}
            {sub === "refund" && <RefundPanel d={d} onClose={() => setSub(null)} onDone={changed} />}
            {sub === "cancel" && <CancelPanel d={d} role={role} onClose={() => setSub(null)} onDone={changed} />}
            {sub === "note" && <NoteModal d={d} onClose={() => setSub(null)} onSent={() => { setSub(null); if (tab === "timeline") void loadTimeline(); }} />}
            {sub === "apply" && verify && verify !== "loading" && (
                <ConfirmPanel open level={2} onClose={() => setSub(null)} title="Mark this order paid" sub={`Order #${ref}`} tone="warn" busy={busy}
                    confirmLabel="Mark paid" onConfirm={() => void check(true)}
                    consequenceTitle={`Paystack confirms ${ghs(verify.paystack?.amount ?? total)} was paid`}
                    consequence={<>The order is marked paid and its items are taken from stock. {verify.alreadyFulfilled ? "It has already been delivered, so no email goes to the customer." : "The customer gets the order confirmation email."}</>} />
            )}
            {sub === "paid" && (
                <ConfirmPanel open level={2} onClose={() => setSub(null)} title="Mark as paid" sub={`Order #${ref}`} tone="warn" busy={busy}
                    confirmLabel="Mark paid" onConfirm={() => void paid()}
                    consequenceTitle={`${ghs(total)} is recorded as paid`}
                    consequence={<>Use this when you've seen the money arrive another way (cash, bank transfer, Mobile money outside Paystack). Paystack isn't checked. The order is marked paid and its items are taken from stock. No email goes to the customer.</>} />
            )}
            {printing && <Receipt d={d} />}
        </>
    );
}
