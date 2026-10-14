// Order tools: returning customers, one order, order lists, and a line-by-line
// explanation of an order's total.
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import {
    cleanSearch, DATE_RE, dayBounds, err, intIn, isPlaceholderEmail, last9, maskGiftCode, money, ok,
    ORDER_STATUSES, str, UUID_RE, type ToolDef,
} from "./shared";

export function orderSummary(o: any, withItems: boolean) {
    const items: any[] = Array.isArray(o.items) ? o.items : [];
    return {
        ref: o.ref ?? String(o.id).slice(0, 8).toUpperCase(),
        order_id: o.id,
        created_at: o.created_at,
        source: o.source,
        status: o.status,
        payment_status: o.payment_status,
        payment_method: o.payment_method ?? null,
        fulfillment_status: o.fulfillment_status,
        customer: { name: o.customer_name, phone: o.customer_phone, email: isPlaceholderEmail(o.customer_email) ? null : o.customer_email },
        total_ghs: money(o.total_amount),
        delivery: {
            method: o.delivery_method,
            zone: o.delivery_zone,
            fee_ghs: money(o.delivery_fee),
            address: o.shipping_address?.text ?? null,
            region: o.shipping_address?.region ?? null,
        },
        ...(withItems
            ? {
                items: items.slice(0, 30).map(i => ({
                    name: i.name, size: i.size || null, colour: i.color || null, brand: i.brand || null,
                    quantity: i.quantity, pre_order: i.isPreOrder === true,
                })),
                discount: o.discount_code ? { code: maskGiftCode(o.discount_code), amount_ghs: money(o.discount_amount) } : null,
                paystack_fee_ghs: o.paystack_fee != null ? money(o.paystack_fee) : null,
                paid_at: o.paid_at ?? null,
            }
            : { item_count: items.reduce((n, i) => n + (Number(i.quantity) || 1), 0) }),
    };
}


export async function findOrder(raw: string) {
    const v = raw.replace(/^#/, "").trim();
    let q = supabaseAdmin.from("orders").select("*");
    if (UUID_RE.test(v)) q = q.eq("id", v);
    else {
        const ref = v.toUpperCase().replace(/[^A-F0-9]/g, "");
        if (ref.length !== 8) return { error: "Give the 8-character order reference or the full order id." };
        q = q.eq("ref", ref);
    }
    const { data, error } = await q.limit(1).maybeSingle();
    if (error) throw error;
    return { order: data };
}

export const orderTools: ToolDef[] = [
    {
        def: {
            name: "lookup_customer",
            description: "Find a returning customer by phone number: their name, email and the delivery details of their last order.",
            input_schema: { type: "object", properties: { phone: { type: "string" } }, required: ["phone"] },
        },
        async run(input) {
            const l9 = last9(input?.phone);
            if (!l9) return err("That does not look like a phone number.");
            const [{ data: orders, error }, { data: profiles }] = await Promise.all([
                supabaseAdmin.rpc("fn_orders_by_phone", { p_last9: l9, p_limit: 5 }),
                supabaseAdmin.from("profiles").select("full_name, email").ilike("phone", `%${l9}`).limit(1),
            ]);
            if (error) throw error;
            const list: any[] = (orders as any[]) ?? [];
            const profile = profiles?.[0];
            if (list.length === 0 && !profile) return ok({ found: false });
            const last = list[0];
            const realEmail = [profile?.email, ...list.map(o => o.customer_email)].find(e => e && !isPlaceholderEmail(e)) ?? null;
            return ok({
                found: true,
                name: profile?.full_name ?? last?.customer_name ?? null,
                email: realEmail,
                recent_orders: list.length,
                last_order: last ? orderSummary(last, false) : null,
            });
        },
    },
    {
        def: {
            name: "get_order",
            description: "One order by its 8-character reference (e.g. 7D4D75EE) or full id: status, payment, items, totals, delivery.",
            input_schema: { type: "object", properties: { order: { type: "string" } }, required: ["order"] },
        },
        async run(input) {
            const found = await findOrder(str(input?.order, 60));
            if ("error" in found) return err(found.error!);
            if (!found.order) return ok({ found: false });
            return ok(orderSummary(found.order, true));
        },
    },
    {
        def: {
            name: "list_orders",
            description: "Orders, newest first. Filter by status, customer phone, customer name, and/or a day (YYYY-MM-DD).",
            input_schema: {
                type: "object",
                properties: {
                    status: { type: "string", enum: ORDER_STATUSES },
                    customer_phone: { type: "string" },
                    customer_name: { type: "string" },
                    date: { type: "string", description: "A single day, YYYY-MM-DD (Ghana time)." },
                    limit: { type: "integer", minimum: 1, maximum: 25 },
                },
            },
        },
        async run(input) {
            const limit = intIn(input?.limit, 1, 25, 10);
            const status = ORDER_STATUSES.includes(input?.status) ? input.status : null;
            const date = str(input?.date, 10);
            if (date && !DATE_RE.test(date)) return err("Give the date as YYYY-MM-DD.");
            const name = cleanSearch(input?.customer_name, 80);
            const phone = input?.customer_phone ? last9(input.customer_phone) : null;
            if (input?.customer_phone && !phone) return err("That does not look like a phone number.");

            let rows: any[] = [];
            if (phone) {
                const { data, error } = await supabaseAdmin.rpc("fn_orders_by_phone", { p_last9: phone, p_limit: 50 });
                if (error) throw error;
                rows = ((data as any[]) ?? []).filter(o =>
                    (!status || o.status === status) &&
                    (!name || String(o.customer_name ?? "").toLowerCase().includes(name.toLowerCase())) &&
                    (!date || String(o.created_at).slice(0, 10) === date));
                rows = rows.slice(0, limit);
            } else {
                let q = supabaseAdmin.from("orders").select("*").order("created_at", { ascending: false }).limit(limit);
                if (status) q = q.eq("status", status);
                if (name) q = q.ilike("customer_name", `%${name}%`);
                if (date) { const b = dayBounds(date); q = q.gte("created_at", b.from).lt("created_at", b.to); }
                const { data, error } = await q;
                if (error) throw error;
                rows = data ?? [];
            }
            return ok({ orders: rows.map(o => orderSummary(o, false)) });
        },
    },
    {
        def: {
            name: "explain_order_total",
            description: "Explain an order's total line by line from what was stored: items, discounts, service fee, delivery, and what Paystack actually charged. Use for 'why is the total different' or 'why did the SMS say a different amount'.",
            input_schema: { type: "object", properties: { order: { type: "string", description: "8-character ref or full id." } }, required: ["order"] },
        },
        async run(input) {
            const found = await findOrder(str(input?.order, 60));
            if ("error" in found) return err(found.error!);
            const o = found.order;
            if (!o) return ok({ found: false });
            const items: any[] = Array.isArray(o.items) ? o.items : [];
            const lines = items.map(i => ({
                name: i.name, size: i.size || null, colour: i.color || null, brand: i.brand || null,
                quantity: Number(i.quantity) || 1, unit_ghs: money(i.price),
                line_ghs: money((Number(i.price) || 0) * (Number(i.quantity) || 1)),
                pre_order: i.isPreOrder === true,
            }));
            const itemsTotal = money(lines.reduce((n, l) => n + l.line_ghs, 0));
            const auto = money(o.auto_discount_amount);
            const coupon = money(o.discount_amount);
            const delivery = money(o.delivery_fee);
            const total = money(o.total_amount);
            // The order row does not store the service fee; it is what is left.
            const serviceFee = money(total - (itemsTotal - auto - coupon) - delivery);
            const charged = o.paystack_charged != null ? money(o.paystack_charged) : null;
            return ok({
                ref: o.ref ?? String(o.id).slice(0, 8).toUpperCase(),
                status: o.status, payment_status: o.payment_status, payment_method: o.payment_method ?? null,
                items: lines,
                items_total_ghs: itemsTotal,
                auto_discount: auto > 0 ? { title: o.auto_discount_title, amount_ghs: auto } : null,
                code_discount: coupon > 0 ? { code: maskGiftCode(String(o.discount_code ?? "")), amount_ghs: coupon } : null,
                service_fee_ghs: serviceFee,
                service_fee_note: "Derived: order total minus items, discounts and delivery. Small differences can come from item prices stored at checkout.",
                delivery: { method: o.delivery_method, zone: o.delivery_zone, fee_ghs: delivery },
                order_total_ghs: total,
                paystack: charged == null
                    ? { verified: false, note: "Not verified yet. Press 'Verify with Paystack' on the order page." }
                    : {
                        verified: true,
                        charged_ghs: charged,
                        fee_ghs: o.paystack_fee != null ? money(o.paystack_fee) : null,
                        differs_from_total_by_ghs: money(charged - total),
                        note: charged !== total
                            ? "The customer was charged more than the order total because the Paystack fee was passed on to them."
                            : "The customer was charged exactly the order total.",
                    },
            });
        },
    },
];
