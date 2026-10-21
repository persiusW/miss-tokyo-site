"use client";

// The order panel's money and stock flows, each a level-2 panel over it:
// Mark as packed (all or part), Assign rider and send, Refund, Cancel order,
// and the Send a note modal. Every write goes to a server action or API route
// that checks the role again; these panels only say what will happen.
import { useEffect, useState } from "react";
import {
    Banner, Btn, Card, ConfirmPanel, Empty, Field, Modal, Money, Panel, Qty, RadioCards, SRow, Seg, Select, SkeletonRows, Switch,
    firstName, ghs, plural, toast,
} from "@/components/admin/ui";
import { displayPhone, normaliseOrderPhone } from "@/lib/phone";
import { REFUND_REASONS, planRefund, refundedUnits, type RefundItem, type RefundMode } from "@/lib/orders/refundMath";
import type { OrderDetail, RiderOption } from "@/lib/admin/v2/ordersLoad";
import { cancelOrder, getRiders, packOrder } from "./actions";

type Role = "admin" | "owner" | "sales_staff";
const newKey = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `k${Date.now()}${Math.random().toString(36).slice(2, 10)}`);

async function postJson(url: string, body: unknown): Promise<{ ok: boolean; data: any }> {
    try {
        const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
        return { ok: res.ok, data: await res.json().catch(() => ({})) };
    } catch {
        return { ok: false, data: { code: "NET-01" } };
    }
}

// ── Mark as packed ───────────────────────────────────────────────────────────

export function PackPanel({ d, onClose, onDone }: { d: OrderDetail; onClose: () => void; onDone: () => void }) {
    const todo = d.lines.map(l => Math.max(0, l.quantity - l.packed));
    const partlySent = d.fulfilments.length > 0;
    const [q, setQ] = useState(todo);
    const [busy, setBusy] = useState(false);
    const units = q.reduce((a, b) => a + b, 0);
    const all = q.every((v, i) => v === todo[i]);
    const ref = (d.order.ref || d.order.id.slice(0, 8)).toUpperCase();

    const go = async () => {
        setBusy(true);
        const res = await packOrder(d.order.id, all ? "all" : d.lines.map((l, i) => ({ index: l.index, quantity: q[i] })).filter(x => x.quantity > 0));
        setBusy(false);
        if (!res.ok) { toast.error(res.error); return; }
        toast.success(res.completes ? `#${ref} marked as packed` : `#${ref}: ${plural(res.units, "item")} packed, ${res.left} still to send`);
        onDone();
    };

    return (
        <Panel open level={2} onClose={onClose} title={partlySent ? "Send remaining items" : "Mark as packed"} sub={`Order #${ref}`}
            footer={<><Btn kind="ghost" onClick={onClose} disabled={busy}>Cancel</Btn>
                <Btn kind="primary" disabled={units === 0 || busy} onClick={go}>{busy ? "Saving…" : `Mark ${plural(units, "item")} as packed`}</Btn></>}>
            <p className="ink2">Choose what&apos;s going in the parcel. Anything you leave out stays on the order as still to send.</p>
            <Card inset>
                <div className="rows">
                    {d.lines.map((l, i) => (
                        <div className="row" key={l.index}>
                            <div className="row-main">
                                <div className="row-title">{l.name}</div>
                                <div className="row-sub">{[l.variant, `${todo[i]} to pack`, l.preorder ? "Pre-order" : ""].filter(Boolean).join(" · ")}</div>
                            </div>
                            <Qty label={l.name} value={q[i]} max={todo[i]} onChange={n => setQ(q.map((v, j) => (j === i ? n : v)))} />
                        </div>
                    ))}
                </div>
            </Card>
            {!all && units > 0 && <Banner tone="neutral" title="This will be a partial shipment">The order shows as “Partly sent” until the rest goes out.</Banner>}
        </Panel>
    );
}

// ── Assign rider and send ────────────────────────────────────────────────────

export function ShipPanel({ orders, bulk, level = 2, onClose, onDone }: {
    orders: { id: string; ref: string; name: string | null }[]; bulk?: boolean; level?: 1 | 2; onClose: () => void; onDone: () => void;
}) {
    const [riders, setRiders] = useState<RiderOption[] | null>(null);
    const [failed, setFailed] = useState(false);
    const [rider, setRider] = useState<string | null>(null);
    const [textRider, setTextRider] = useState(true);
    const [tell, setTell] = useState(true);
    const [busy, setBusy] = useState(false);

    const load = async () => {
        setFailed(false);
        const r = await getRiders();
        if (!r.ok) { setFailed(true); return; }
        setRiders(r.riders);
        setRider(cur => cur ?? r.riders[0]?.id ?? null);
    };
    useEffect(() => { void load(); }, []);

    const chosen = riders?.find(r => r.id === rider);
    const go = async () => {
        if (!rider) return;
        setBusy(true);
        const { ok, data } = await postJson("/api/dispatch", { orderIds: orders.map(o => o.id), riderId: rider, notifyRider: textRider, notifyCustomer: tell });
        setBusy(false);
        if (!ok) { toast.fromResponse(data, { audience: "staff" }); return; }
        const who = firstName(chosen?.full_name);
        toast.success(orders.length === 1
            ? `#${orders[0].ref} is out for delivery with ${who}${tell ? "" : ". The customer wasn't told."}`
            : `${plural(orders.length, "order")} out for delivery with ${who}${tell ? "" : ". Customers weren't told."}`);
        onDone();
    };

    const label = chosen ? `Send with ${firstName(chosen.full_name)}` : "Send";
    return (
        <Panel open level={level} onClose={onClose} title="Assign rider and send"
            sub={orders.length === 1 ? `Order #${orders[0].ref}` : `${plural(orders.length, "order")}: ${orders.slice(0, 4).map(o => `#${o.ref}`).join(", ")}${orders.length > 4 ? "…" : ""}`}
            footer={<><Btn kind="ghost" onClick={onClose} disabled={busy}>Cancel</Btn>
                {bulk
                    ? <Btn kind="primary" onClick={go} disabled={!rider || busy} data-assist="orders.dispatch-confirm">{busy ? "Sending…" : label}</Btn>
                    : <Btn kind="primary" onClick={go} disabled={!rider || busy} data-assist="order.confirm-ship">{busy ? "Sending…" : label}</Btn>}</>}>
            {failed ? (
                <Banner tone="danger" title="We couldn't load the riders" actionLabel="Try again" onAction={() => void load()}>Nothing was changed.</Banner>
            ) : !riders ? (
                <SkeletonRows n={3} cols={2} />
            ) : riders.length === 0 ? (
                <Empty icon="truck" title="No active riders" body="Add a rider, or switch one back on, in Settings › Riders. Then come back to send this order." />
            ) : (
                <RadioCards label="Rider" value={rider} onChange={setRider}
                    options={riders.map(r => ({ v: r.id, title: r.full_name, desc: `${displayPhone(normaliseOrderPhone(r.phone_number) ?? r.phone_number)}${r.bike_reg ? ` · ${r.bike_reg}` : ""} · ${plural(r.trips, "delivery", "deliveries")} this month` }))} />
            )}
            <Card inset>
                <div className="rows">
                    <SRow label="Text the rider" help="Sends the customer's name, phone and delivery address. It doesn't tell the customer anything.">
                        <Switch label="Text the rider" checked={textRider} onChange={setTextRider} />
                    </SRow>
                    <SRow label="Tell the customer" help={tell ? "Sends the dispatch email, SMS and app notification with the rider's name and phone number." : "Sends nothing to the customer."}>
                        <Switch label="Tell the customer" checked={tell} onChange={setTell} />
                    </SRow>
                </div>
            </Card>
        </Panel>
    );
}

// ── Refund ───────────────────────────────────────────────────────────────────

type Method = "paystack" | "cash" | "gift_card";
function methodOf(d: OrderDetail): Method {
    const m = (d.order.payment_method ?? "paystack").toLowerCase();
    return m === "cash" ? "cash" : m === "gift_card" ? "gift_card" : "paystack";
}

export function RefundPanel({ d, onClose, onDone }: { d: OrderDetail; onClose: () => void; onDone: () => void }) {
    const [key] = useState(newKey);
    const [mode, setMode] = useState<RefundMode>("full");
    const done = refundedUnits(d.refunds);
    const left = d.lines.map(l => Math.max(0, l.quantity - (done.get(l.index) ?? 0)));
    const [q, setQ] = useState(d.lines.map(() => 0));
    const [amt, setAmt] = useState("");
    const [restock, setRestock] = useState(true);
    const [reason, setReason] = useState<string>(REFUND_REASONS[0]);
    const [email, setEmail] = useState(true);
    const [busy, setBusy] = useState(false);

    const method = methodOf(d);
    const live = method === "paystack" && d.refundsLive;
    const recordOnly = method === "paystack" && !d.refundsLive;
    const first = firstName(d.order.customer_name) || "the customer";
    const ref = (d.order.ref || d.order.id.slice(0, 8)).toUpperCase();
    const hasEmail = !!d.order.customer_email && !String(d.order.customer_email).toLowerCase().endsWith("@misstokyo.store");

    const items: RefundItem[] = mode === "items" ? d.lines.map((l, i) => ({ index: l.index, quantity: q[i] })).filter(x => x.quantity > 0) : [];
    const plan = planRefund(d.order.total_amount, d.lines, d.refunds, { mode, amount: amt, items });
    const value = plan.ok ? plan.amount : 0;
    const units = plan.ok ? plan.items.reduce((s, i) => s + i.quantity, 0) : 0;
    const restocking = restock && units > 0;
    // An amount that empties the order closes it, and a closed order gives all its stock back.
    const amountCloses = mode === "amount" && plan.ok && plan.fully;

    const sentence = method === "cash"
        ? `Record a cash refund of ${ghs(value)}. Give the money to ${first} yourself; nothing is sent through Paystack.`
        : method === "gift_card"
            ? `Record a refund of ${ghs(value)} on this gift card order. Nothing goes back to the gift card or through Paystack from here.`
            : recordOnly
                ? `Record a refund of ${ghs(value)} you've already made in the Paystack dashboard. Nothing is sent through Paystack from here.`
                : `${ghs(value)} goes back to ${first}'s card or Mobile money through Paystack. It usually arrives within 5–10 working days.`;
    const stockLine = mode === "amount"
        ? (amountCloses ? "This refunds the whole order, so its items go back to stock." : "")
        : restocking ? `${plural(units, "item")} return${units === 1 ? "s" : ""} to stock.` : units > 0 ? "Nothing goes back to stock." : "";

    const go = async () => {
        if (!plan.ok) { toast.error(plan.error); return; }
        setBusy(true);
        const { ok, data } = await postJson(`/api/admin/orders/${d.order.id}/refund`, {
            mode, amount: mode === "amount" ? amt : undefined, items: mode === "items" ? items : undefined,
            restock, reason, notify: email && hasEmail, recordOnly, idempotencyKey: key,
        });
        setBusy(false);
        if (!ok) { toast.fromResponse(data, { audience: "staff" }); return; }
        const stockNote = data.stockMoved === 0 && (restocking || plan.fully) ? " Stock wasn't changed: this order is older than the stock record." : "";
        toast.success(`${data.method === "paystack" ? "Refunded" : "Recorded a refund of"} ${ghs(data.amount)} on #${ref}.${stockNote}`);
        onDone();
    };

    return (
        <ConfirmPanel open level={2} onClose={onClose} title={`Refund #${ref}`} sub={`${ghs(d.refundable)} can still be refunded`}
            tone="warn" busy={busy} onConfirm={go}
            confirmLabel={`${live ? "Refund" : "Record"} ${ghs(value)}`}
            consequenceTitle={method === "cash" ? "Cash refund" : method === "gift_card" ? "Gift card refund" : recordOnly ? "Record a Paystack refund" : "Refund through Paystack"}
            consequence={<>{sentence} {stockLine} This can&apos;t be undone.</>}>
            {recordOnly && (
                <Banner tone="info" title="Refunds through Paystack are switched off">
                    Refund {ghs(value || d.refundable)} in your Paystack dashboard first, then record it here so the order, the stock and the reports are right.
                </Banner>
            )}
            <Seg label="What to refund" value={mode} onChange={setMode} options={[{ v: "full", l: "Everything" }, { v: "items", l: "Choose items" }, { v: "amount", l: "An amount" }]} />
            {mode === "items" && (
                <Card inset>
                    <div className="rows">
                        {d.lines.map((l, i) => (
                            <div className="row" key={l.index}>
                                <div className="row-main">
                                    <div className="row-title">{l.name}</div>
                                    <div className="row-sub">{[l.variant, `${ghs(l.price)} each`, done.get(l.index) ? `${done.get(l.index)} refunded before` : ""].filter(Boolean).join(" · ")}</div>
                                </div>
                                <Qty label={l.name} value={q[i]} max={left[i]} onChange={n => setQ(q.map((v, j) => (j === i ? n : v)))} />
                            </div>
                        ))}
                    </div>
                </Card>
            )}
            {mode === "amount" && (
                <Field label="Amount to refund" htmlFor="ramt" help={`Up to ${ghs(d.refundable)}. Delivery and fees can be included.`}>
                    <Money id="ramt" value={amt} onChange={setAmt} />
                </Field>
            )}
            {!plan.ok && (mode === "amount" ? amt !== "" : mode === "items" ? items.length > 0 : true) && <div className="err-text" role="alert">{plan.error}</div>}
            <Card inset>
                <div className="rows">
                    {mode !== "amount" && (
                        <SRow label="Put the items back in stock" help={restock ? `${plural(units, "item")} go${units === 1 ? "es" : ""} back on sale straight away.` : "Use this when the items are damaged or not coming back."}>
                            <Switch label="Put the items back in stock" checked={restock} onChange={setRestock} />
                        </SRow>
                    )}
                    <SRow label="Reason" help="Shows in the order timeline.">
                        <Select label="Reason" value={reason} onChange={setReason} options={[...REFUND_REASONS]} />
                    </SRow>
                    <SRow label="Email the customer" help={hasEmail ? "Sends a refund receipt with the amount and how long it takes." : "There's no email address on this order."}>
                        <Switch label="Email the customer" checked={email && hasEmail} onChange={setEmail} disabled={!hasEmail} />
                    </SRow>
                </div>
            </Card>
        </ConfirmPanel>
    );
}

// ── Cancel order ─────────────────────────────────────────────────────────────

export function CancelPanel({ d, role, onClose, onDone }: { d: OrderDetail; role: Role; onClose: () => void; onDone: () => void }) {
    const [key] = useState(newKey);
    const paid = d.order.payment_status === "paid";
    const full = role === "owner" || role === "admin";
    const method = methodOf(d);
    const recordOnly = method === "paystack" && !d.refundsLive;
    const [v, setV] = useState<"refund" | "norefund">(paid && full && d.refundable > 0 ? "refund" : "norefund");
    const [tell, setTell] = useState(true);
    const [busy, setBusy] = useState(false);
    const units = d.lines.reduce((s, l) => s + l.quantity, 0);
    const ref = (d.order.ref || d.order.id.slice(0, 8)).toUpperCase();
    const hasEmail = !!d.order.customer_email;

    const refundDesc = !full ? "Only an owner or admin can refund."
        : method === "cash" ? "Records a cash refund. Give the money back yourself."
            : method === "gift_card" ? "Records a refund on this gift card order. Nothing goes back automatically."
                : recordOnly ? "Records a refund you've made in the Paystack dashboard. Refunds through Paystack are switched off."
                    : "The money goes back to the customer's card or Mobile money through Paystack.";

    const go = async () => {
        setBusy(true);
        let ok: boolean;
        let data: any = null;
        if (paid && v === "refund") {
            ({ ok, data } = await postJson(`/api/admin/orders/${d.order.id}/refund`, {
                mode: "full", restock: true, reason: "Other", notify: tell && hasEmail, recordOnly, cancel: true, idempotencyKey: key,
            }));
        } else {
            const r = await cancelOrder(d.order.id);
            ok = r.ok;
            if (!r.ok) data = { error: r.error };
        }
        if (ok && tell && hasEmail) {
            const n = await postJson("/api/email/fulfillment", { orderId: d.order.id, type: "cancelled" });
            if (!n.ok) toast.error("The order was cancelled, but the cancellation email didn't go out. (EML-01)");
        }
        setBusy(false);
        if (!ok) { toast.fromResponse(data, { audience: "staff" }); return; }
        toast.success(paid && v === "refund" ? `#${ref} cancelled and ${ghs(data.amount)} ${data.method === "paystack" ? "refunded" : "recorded as refunded"}` : `#${ref} cancelled`);
        onDone();
    };

    const money = paid
        ? v === "refund" ? `${ghs(d.refundable)} is ${method === "paystack" && !recordOnly ? "refunded through Paystack" : "recorded as refunded"}.` : "No money is returned from here."
        : "";
    return (
        <ConfirmPanel open level={2} onClose={onClose} title={`Cancel order #${ref}`} sub={d.order.customer_name || d.order.customer_email || undefined}
            busy={busy} onConfirm={go} confirmLabel="Cancel order" cancelLabel="Keep order"
            consequenceTitle="What happens"
            consequence={<>{paid ? `${plural(units, "item")} go${units === 1 ? "es" : ""} back to stock.` : "The order is closed and won't be packed."} {money} This can&apos;t be undone.</>}>
            {paid ? (
                <RadioCards label="Refund" value={v} onChange={setV} options={[
                    { v: "refund", title: `Cancel and refund ${ghs(d.refundable)}`, desc: refundDesc, disabled: !full || d.refundable <= 0 },
                    { v: "norefund", title: "Cancel without a refund", desc: "Only if you've already paid the customer back another way. No money is returned from here." },
                ]} />
            ) : (
                <p className="ink2">The customer hasn&apos;t paid, so there&apos;s nothing to refund.</p>
            )}
            <Card inset>
                <div className="rows">
                    <SRow label="Tell the customer" help={hasEmail ? "Sends the cancellation email and SMS." : "There's no email address on this order."}>
                        <Switch label="Tell the customer" checked={tell && hasEmail} onChange={setTell} disabled={!hasEmail} />
                    </SRow>
                </div>
            </Card>
        </ConfirmPanel>
    );
}

// ── Send a note ──────────────────────────────────────────────────────────────

export function NoteModal({ d, onClose, onSent }: { d: OrderDetail; onClose: () => void; onSent: () => void }) {
    const meta = (d.order.customer_metadata ?? {}) as Record<string, unknown>;
    const phone = normaliseOrderPhone(typeof meta.whatsapp === "string" && meta.whatsapp ? meta.whatsapp : d.order.customer_phone);
    const email = d.order.customer_email && !String(d.order.customer_email).toLowerCase().endsWith("@misstokyo.store") ? d.order.customer_email : null;
    const [via, setVia] = useState<"whatsapp" | "email">(phone ? "whatsapp" : "email");
    const [txt, setTxt] = useState("");
    const [busy, setBusy] = useState(false);
    const to = via === "whatsapp" ? (phone ? displayPhone(phone) : null) : email;

    const go = async () => {
        setBusy(true);
        const { ok, data } = await postJson(`/api/admin/orders/${d.order.id}/note`, { channel: via, body: txt });
        setBusy(false);
        if (!ok) { toast.fromResponse(data, { audience: "staff" }); return; }
        toast.success(`Note sent to ${firstName(d.order.customer_name) || "the customer"} by ${via === "whatsapp" ? "WhatsApp" : "email"}`);
        onSent();
    };

    return (
        <Modal open onClose={onClose} title="Send a note to the customer"
            footer={<><Btn kind="ghost" onClick={onClose} disabled={busy}>Cancel</Btn><Btn kind="primary" disabled={!txt.trim() || !to || busy} onClick={go}>{busy ? "Sending…" : "Send note"}</Btn></>}>
            <Seg label="Send by" value={via} onChange={setVia} options={[{ v: "whatsapp", l: "WhatsApp" }, { v: "email", l: "Email" }]} />
            <Field label="Message" htmlFor="cnote"
                help={to ? `Goes to ${to} and appears in the order timeline.${via === "whatsapp" ? " WhatsApp only delivers it if they've messaged the shop in the last 24 hours." : ""}` : via === "whatsapp" ? "There's no phone number on this order." : "There's no email address on this order."}>
                <textarea data-autofocus id="cnote" className="textarea" value={txt} maxLength={1000} onChange={e => setTxt(e.target.value)} placeholder="e.g. Your rider Kofi will call when he's 10 minutes away." />
            </Field>
        </Modal>
    );
}

