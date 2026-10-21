"use client";

// What prints: an order's receipt (the old order page's Print Receipt) and
// packing slips for ticked orders. Hidden on screen; orders.css shows only
// .ord-print when printing. Portalled into .adm2 so the print rule finds it.
import { createPortal } from "react-dom";
import { portalHost, ghs } from "@/components/admin/ui";
import { FUL, PAY } from "@/components/admin/ui/status";
import { zoneLabel } from "@/lib/delivery";
import { fulKeyOf, isPickup, orderRef, payKeyOf } from "@/lib/admin/v2/orders";
import type { OrderDetail } from "@/lib/admin/v2/ordersLoad";
import type { SlipOrder } from "./actions";

const day = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "Africa/Accra" });

export function Receipt({ d }: { d: OrderDetail }) {
    const host = portalHost();
    if (!host) return null;
    const o = d.order;
    const pickup = isPickup(o);
    const addr = typeof o.shipping_address === "string" ? o.shipping_address : o.shipping_address?.text ?? null;
    const discount = Number(o.discount_amount ?? 0) + Number(o.auto_discount_amount ?? 0);
    return createPortal(
        <div className="ord-print" aria-hidden="true">
            <div className="sheet">
                <div style={{ display: "flex", justifyContent: "space-between", gap: 24 }}>
                    <div><h2>{d.business.name}</h2><div>Order receipt</div>{d.business.address && <div>{d.business.address}</div>}{d.business.contact && <div>{d.business.contact}</div>}</div>
                    <div style={{ textAlign: "right" }}><div><strong>#{orderRef(o)}</strong></div><div>{day(o.created_at)}</div><div>{PAY[payKeyOf(o)][0]} · {FUL[fulKeyOf(o)][0]}</div></div>
                </div>
                <div style={{ display: "flex", gap: 48, marginTop: 16 }}>
                    <div><div><strong>Customer</strong></div><div>{o.customer_name}</div><div>{o.customer_phone}</div><div>{o.customer_email}</div></div>
                    <div><div><strong>{pickup ? "Pickup" : "Delivery address"}</strong></div><div>{pickup ? d.pickup?.address || d.business.address || "In store" : addr || "—"}</div></div>
                </div>
                <table>
                    <thead><tr><th>Item</th><th className="r">Qty</th><th className="r">Price</th><th className="r">Total</th></tr></thead>
                    <tbody>{d.lines.map(l => <tr key={l.index}><td>{l.name}{l.variant ? ` · ${l.variant}` : ""}{l.sku ? ` · ${l.sku}` : ""}</td><td className="r">{l.quantity}</td><td className="r">{ghs(l.price)}</td><td className="r">{ghs(l.price * l.quantity)}</td></tr>)}</tbody>
                </table>
                <table>
                    <tbody>
                        {discount > 0 && <tr><td>Subtotal</td><td className="r">{ghs(d.subtotal)}</td></tr>}
                        {Number(o.auto_discount_amount ?? 0) > 0 && <tr><td>Discount · {o.auto_discount_title}</td><td className="r">−{ghs(o.auto_discount_amount)}</td></tr>}
                        {Number(o.discount_amount ?? 0) > 0 && <tr><td>Discount · {o.discount_code}</td><td className="r">−{ghs(o.discount_amount)}</td></tr>}
                        {Number(o.delivery_fee ?? 0) > 0 && <tr><td>Delivery · {zoneLabel(o.delivery_zone)}</td><td className="r">{ghs(o.delivery_fee)}</td></tr>}
                        <tr><td><strong>Total</strong></td><td className="r"><strong>{ghs(o.total_amount)}</strong></td></tr>
                        {Number(o.refunded_total ?? 0) > 0 && <tr><td>Refunded</td><td className="r">−{ghs(o.refunded_total)}</td></tr>}
                        {o.paystack_reference && <tr><td>Reference</td><td className="r">{o.paystack_reference}</td></tr>}
                    </tbody>
                </table>
            </div>
        </div>,
        host,
    );
}

export function PackingSlips({ orders, business }: { orders: SlipOrder[]; business: string }) {
    const host = portalHost();
    if (!host) return null;
    return createPortal(
        <div className="ord-print" aria-hidden="true">
            {orders.map(o => (
                <div className="sheet" key={o.id}>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <div><h2>{business}</h2><div>Packing slip</div></div>
                        <div style={{ textAlign: "right" }}><strong>#{o.ref}</strong><div>{day(o.created_at)}</div></div>
                    </div>
                    <div style={{ marginTop: 12 }}>
                        <div><strong>{o.customer_name || "No name"}</strong> {o.customer_phone}</div>
                        <div>{(o.delivery_method ?? "").toLowerCase().includes("pick") ? "Pickup in store" : o.address || "Delivery"}</div>
                    </div>
                    <table>
                        <thead><tr><th>Item</th><th className="r">Qty</th><th className="r">Packed</th></tr></thead>
                        <tbody>{o.lines.map((l, i) => <tr key={i}><td>{l.name}{l.variant ? ` · ${l.variant}` : ""}</td><td className="r">{l.quantity}</td><td className="r">☐</td></tr>)}</tbody>
                    </table>
                    {o.notes && <p style={{ marginTop: 12 }}><strong>Staff notes:</strong> {o.notes}</p>}
                </div>
            ))}
        </div>,
        host,
    );
}
