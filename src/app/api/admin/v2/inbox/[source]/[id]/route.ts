// One Inbox conversation that isn't a WhatsApp chat (GET), and what staff do
// with it (POST):
//   form    { action: "reply", body }    emails the customer from the shop's address,
//                                          logs it (notification_log) and marks the form replied.
//                                          Read / unread / replied without an email stay on
//                                          PATCH /api/admin/contact-submissions/[id].
//   request { action: "status", status } one of the statuses the old page offered.
// Questions for admin are answered and dismissed through /api/ai/inbox/[id]/*.
// Every staff role; questions for the admin only. The role is checked here.
import { NextResponse } from "next/server";
import { requireStaff } from "@/lib/ai/requireStaff";
import { apiError } from "@/lib/errors/apiError";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { sendEmail } from "@/lib/email";
import { CONTACT_REPLY_MAX, contactReplyEmail, contactReplyEvent, isRequestStatus, parseKey } from "@/lib/admin/v2/inbox";
import { emailReplyOn, loadDetail } from "@/lib/admin/v2/inboxLoad";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

type Ctx = { params: Promise<{ source: string; id: string }> };

async function target(ctx: Ctx) {
    const { source, id } = await ctx.params;
    const k = parseKey(`${source}:${id}`);
    return k && k.source !== "whatsapp" ? (k as { source: "form" | "request" | "ai"; id: string }) : null;
}

export async function GET(_req: Request, ctx: Ctx) {
    const auth = await requireStaff();
    if ("status" in auth) return apiError("AUTH-01", { status: auth.status, audience: "staff" });
    const k = await target(ctx);
    if (!k) return NextResponse.json({ error: "That conversation isn't there any more. Please refresh." }, { status: 404 });
    try {
        const d = await loadDetail(k.source, k.id, auth.role);
        if (!d) return NextResponse.json({ error: "That conversation isn't there any more. Please refresh." }, { status: 404 });
        return NextResponse.json(d);
    } catch (cause) {
        return apiError("GEN-00", { status: 500, audience: "staff", cause, context: { route: "admin/v2/inbox/[source]/[id]", source: k.source } });
    }
}

export async function POST(req: Request, ctx: Ctx) {
    const auth = await requireStaff();
    if ("status" in auth) return apiError("AUTH-01", { status: auth.status, audience: "staff" });
    const k = await target(ctx);
    if (!k) return NextResponse.json({ error: "That conversation isn't there any more. Please refresh." }, { status: 404 });
    const body = await req.json().catch(() => null);
    try {
        if (k.source === "form" && body?.action === "reply") {
            if (!emailReplyOn()) return NextResponse.json({ error: "Replying by email from here is switched off. Use your email app." }, { status: 403 });
            const text = typeof body.body === "string" ? body.body.trim() : "";
            if (!text) return NextResponse.json({ error: "Write your reply first." }, { status: 400 });
            if (text.length > CONTACT_REPLY_MAX) return NextResponse.json({ error: `Keep the reply under ${CONTACT_REPLY_MAX} characters.` }, { status: 400 });
            const { data: row, error } = await supabaseAdmin.from("contact_submissions").select("id, first_name, email, message").eq("id", k.id).maybeSingle();
            if (error) throw error;
            if (!row) return NextResponse.json({ error: "That message isn't there any more. Please refresh." }, { status: 404 });

            // The same sender and reply-to address the contact page's own emails use.
            const [{ data: site }, { data: biz }] = await Promise.all([
                supabaseAdmin.from("site_settings").select("store_email, store_name").eq("id", "singleton").maybeSingle(),
                supabaseAdmin.from("business_settings").select("business_name, email").eq("id", "default").maybeSingle(),
            ]);
            const storeName = biz?.business_name || site?.store_name || "Miss Tokyo";
            const storeEmail = site?.store_email || biz?.email || null;
            const fromEmail = process.env.RESEND_FROM_EMAIL || "info@info.misstokyo.shop";
            const mail = contactReplyEmail({ firstName: row.first_name ?? "", reply: text, message: row.message ?? "", storeName });
            const sent = await sendEmail({
                from: `${storeName} <${fromEmail}>`, to: row.email, subject: mail.subject, html: mail.html, text: mail.text,
                ...(storeEmail ? { replyTo: storeEmail } : {}),
            }, { event: contactReplyEvent(row.id) });
            if (!sent.ok) return apiError("EML-01", { status: 502, audience: "staff", cause: "contact reply not sent", context: { route: "admin/v2/inbox form reply" } });

            const { error: upError } = await supabaseAdmin.from("contact_submissions")
                .update({ status: "replied", replied_at: new Date().toISOString() }).eq("id", row.id);
            // The email went out; only the status didn't change. Say so rather than fail.
            if (upError) return NextResponse.json({ ok: true, warning: "Your reply was emailed, but the message couldn't be marked replied. Mark it from the menu." });
            return NextResponse.json({ ok: true });
        }

        if (k.source === "request" && body?.action === "status") {
            if (!isRequestStatus(body.status)) return NextResponse.json({ error: "Choose one of the statuses in the list." }, { status: 400 });
            const { data, error } = await supabaseAdmin.from("custom_requests").update({ status: body.status }).eq("id", k.id).select("id").maybeSingle();
            if (error) throw error;
            if (!data) return NextResponse.json({ error: "That request isn't there any more. Please refresh." }, { status: 404 });
            return NextResponse.json({ ok: true });
        }

        return NextResponse.json({ error: "Please refresh and try again." }, { status: 400 });
    } catch (cause) {
        return apiError("GEN-00", { status: 500, audience: "staff", cause, context: { route: "admin/v2/inbox/[source]/[id] POST", source: k.source } });
    }
}
