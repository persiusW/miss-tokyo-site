// POST /api/admin/orders/[id]/note { channel: "whatsapp" | "email", body }
// Send the customer a note about their order (BACKEND_GAPS 6). Order staff
// (admin, owner, sales staff), the same roles that can reply to WhatsApp chats.
// WhatsApp goes through lib/whatsapp/staffSend.ts (the shop's line, inside the
// 24-hour window, under the chat's turn lock; the assistant keeps the chat);
// email through lib/email.ts. Both write notification_log with the order id,
// which is how the note shows in the order's Timeline.
import { NextRequest, NextResponse, after } from "next/server";
import { requireStaff } from "@/lib/ai/requireStaff";
import { apiError } from "@/lib/errors/apiError";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { sendEmail } from "@/lib/email";
import { normaliseOrderPhone } from "@/lib/phone";
import { composerOn } from "@/lib/whatsapp/flags";
import { staffName } from "@/lib/whatsapp/events";
import { sendAsStaff, STAFF_TEXT_MAX } from "@/lib/whatsapp/staffSend";
import { logActivity } from "@/lib/utils/logActivity";
import { PLACEHOLDER_EMAIL_DOMAIN } from "@/lib/checkout/createCheckoutOrder";
import { NOTE_EVENT } from "@/lib/admin/v2/orders";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
type Ctx = { params: Promise<{ id: string }> };
const esc = (s: string) => s.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));


export async function POST(req: NextRequest, { params }: Ctx) {
    const auth = await requireStaff(["admin", "owner", "sales_staff"]);
    if ("status" in auth) return NextResponse.json({ error: auth.status === 401 ? "Please sign in again." : "Only order staff can message customers." }, { status: auth.status });
    const { id } = await params;
    if (!UUID.test(id)) return NextResponse.json({ error: "That order isn't there any more. Please refresh." }, { status: 404 });
    const body = await req.json().catch(() => null);
    const channel = body?.channel === "email" ? "email" : body?.channel === "whatsapp" ? "whatsapp" : null;
    const text = String(body?.body ?? "").trim();
    if (!channel) return NextResponse.json({ error: "Choose WhatsApp or email." }, { status: 400 });
    if (!text) return NextResponse.json({ error: "Write a message first." }, { status: 400 });
    if (text.length > STAFF_TEXT_MAX) return NextResponse.json({ error: `Keep it under ${STAFF_TEXT_MAX} characters.` }, { status: 400 });

    try {
        const { data: order } = await supabaseAdmin.from("orders")
            .select("id, ref, customer_name, customer_email, customer_phone, customer_metadata").eq("id", id).maybeSingle();
        if (!order) return NextResponse.json({ error: "That order isn't there any more. Please refresh." }, { status: 404 });
        const ref = order.ref ?? id.slice(0, 8).toUpperCase();
        let to = "";

        if (channel === "whatsapp") {
            if (!composerOn()) return NextResponse.json({ error: "Sending WhatsApp messages from the admin is switched off. Message the customer from your WhatsApp phone." }, { status: 403 });
            const meta = (order.customer_metadata ?? {}) as Record<string, unknown>;
            const phone = normaliseOrderPhone(typeof meta.whatsapp === "string" && meta.whatsapp ? meta.whatsapp : order.customer_phone);
            const { data: chat } = phone
                ? await supabaseAdmin.from("whatsapp_conversations").select("id, opted_out_at").eq("wa_phone_number", phone).maybeSingle()
                : { data: null };
            if (!chat || chat.opted_out_at) {
                return NextResponse.json({ error: "This customer hasn't messaged the shop on WhatsApp, so WhatsApp won't deliver a note from here. Send it by email, or message them from your WhatsApp phone." }, { status: 409 });
            }
            const r = await sendAsStaff({
                conversationId: chat.id, text, staffId: auth.userId, staffName: await staffName(auth.userId).catch(() => null),
                takeOver: false, event: NOTE_EVENT, orderId: id,
            });
            if (!r.ok) return NextResponse.json({ error: r.error }, { status: r.status });
            to = phone!;
        } else {
            const email = (order.customer_email ?? "").trim();
            if (!email || email.toLowerCase().endsWith(`@${PLACEHOLDER_EMAIL_DOMAIN}`)) {
                return NextResponse.json({ error: "There's no email address on this order. Send the note on WhatsApp instead." }, { status: 409 });
            }
            const { data: biz } = await supabaseAdmin.from("business_settings").select("business_name, email").eq("id", "default").maybeSingle();
            const bizName = biz?.business_name || "Miss Tokyo";
            const first = (order.customer_name ?? "").trim().split(/\s+/)[0];
            const r = await sendEmail({
                to: email,
                subject: `About your order #${ref}`,
                ...(biz?.email ? { replyTo: biz.email } : {}),
                html: `
                <div style="font-family:Georgia,serif;background:#fafaf9;padding:40px 20px;">
                  <div style="max-width:560px;margin:0 auto;background:#fff;border:1px solid #e5e5e5;padding:48px;">
                    <h1 style="font-size:20px;letter-spacing:.15em;text-transform:uppercase;margin:0 0 6px;">${esc(bizName)}</h1>
                    <p style="color:#737373;font-size:11px;letter-spacing:.2em;text-transform:uppercase;margin:0 0 36px;">Order #${esc(ref)}</p>
                    <p style="font-size:15px;color:#171717;margin:0 0 16px;">Hello${first ? ` ${esc(first)}` : ""},</p>
                    <p style="font-size:14px;color:#525252;line-height:1.8;margin:0;white-space:pre-wrap;">${esc(text)}</p>
                  </div>
                </div>`,
            }, { event: NOTE_EVENT, orderId: id });
            if (!r.ok) return apiError("EML-01", { status: 502, audience: "staff", cause: r.error, context: { route: "admin/orders/[id]/note" } });
            to = email;
        }

        after(() => logActivity({
            userId: auth.userId, userRole: auth.role, actionType: "NOTE_TO_CUSTOMER", resource: "order", resourceId: id,
            details: { order_number: ref, resource_name: `Order #${ref}`, channel, note: text.slice(0, 200) },
        }));
        return NextResponse.json({ ok: true, channel, to });
    } catch (e) {
        return apiError("GEN-00", { status: 500, audience: "staff", cause: e, context: { route: "admin/orders/[id]/note" } });
    }
}
