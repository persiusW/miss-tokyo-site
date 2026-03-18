import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { Resend } from "resend";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ORDER_TOPICS = new Set(["Order help", "Returns", "Delivery"]);

export async function POST(req: NextRequest) {
    let body: any;
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ success: false, message: "Invalid request" }, { status: 400 });
    }

    const { first_name, last_name, email, topic, order_number, message } = body;

    // ── Server-side validation ────────────────────────────────────────────────
    const errors: Record<string, string> = {};
    if (!first_name?.trim()) errors.first_name = "First name is required.";
    if (!email?.trim()) {
        errors.email = "Email address is required.";
    } else if (!EMAIL_REGEX.test(email.trim())) {
        errors.email = "Please enter a valid email address.";
    }
    if (!topic?.trim()) errors.topic = "Please select a topic.";
    if (!message?.trim()) {
        errors.message = "Message is required.";
    } else if (message.trim().length < 10) {
        errors.message = "Message must be at least 10 characters.";
    }
    if (Object.keys(errors).length > 0) {
        return NextResponse.json({ success: false, errors }, { status: 400 });
    }

    // ── Rate limit: max 3 submissions per IP per 10 minutes ──────────────────
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
               req.headers.get("x-real-ip") || "unknown";

    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const { count } = await supabaseAdmin
        .from("contact_submissions")
        .select("id", { count: "exact", head: true })
        .eq("ip_address", ip)
        .gte("submitted_at", tenMinutesAgo);

    if ((count ?? 0) >= 3) {
        return NextResponse.json(
            { success: false, message: "Too many submissions. Please try again later." },
            { status: 429 }
        );
    }

    // ── Insert submission ─────────────────────────────────────────────────────
    const { data: submission, error: insertError } = await supabaseAdmin
        .from("contact_submissions")
        .insert({
            first_name: first_name.trim(),
            last_name: last_name?.trim() || null,
            email: email.trim().toLowerCase(),
            topic,
            order_number: ORDER_TOPICS.has(topic) ? (order_number?.trim() || null) : null,
            message: message.trim(),
            ip_address: ip,
        })
        .select("id, submitted_at")
        .single();

    if (insertError) {
        console.error("[contact] insert error:", insertError);
        return NextResponse.json({ success: false, message: "Something went wrong" }, { status: 500 });
    }

    // ── Fetch store contact details for emails ────────────────────────────────
    const { data: settings } = await supabaseAdmin
        .from("site_settings")
        .select("store_email, store_name")
        .eq("id", "singleton")
        .single();

    const { data: biz } = await supabaseAdmin
        .from("business_settings")
        .select("business_name, email")
        .eq("id", "default")
        .single();

    const storeEmail = settings?.store_email || biz?.email || process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";
    const storeName = biz?.business_name || settings?.store_name || "Miss Tokyo";
    const fromEmail = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";
    const resendKey = process.env.RESEND_API_KEY;

    if (resendKey) {
        const resend = new Resend(resendKey);
        const fullName = [first_name.trim(), last_name?.trim()].filter(Boolean).join(" ");
        const submittedAt = new Date(submission.submitted_at).toLocaleString("en-GB", {
            day: "2-digit", month: "short", year: "numeric",
            hour: "2-digit", minute: "2-digit", hour12: false,
        });

        // Notification to store
        await resend.emails.send({
            from: `${storeName} <${fromEmail}>`,
            to: storeEmail,
            replyTo: `${fullName} <${email.trim()}>`,
            subject: `New contact form submission — ${topic}`,
            html: `
<div style="font-family:sans-serif;max-width:600px;color:#141210">
  <h2 style="margin-bottom:4px">New contact form submission</h2>
  <p style="color:#8C8479;margin-top:0">Submitted via the Miss Tokyo contact page</p>
  <table style="border-collapse:collapse;width:100%;margin:24px 0">
    <tr><td style="padding:8px 0;color:#8C8479;width:140px">From</td><td style="padding:8px 0;font-weight:600">${fullName} &lt;${email}&gt;</td></tr>
    <tr><td style="padding:8px 0;color:#8C8479">Topic</td><td style="padding:8px 0">${topic}</td></tr>
    <tr><td style="padding:8px 0;color:#8C8479">Order number</td><td style="padding:8px 0">${order_number?.trim() || "N/A"}</td></tr>
  </table>
  <p style="font-weight:600;margin-bottom:8px">Message:</p>
  <div style="background:#F7F2EC;padding:16px;border-radius:4px;white-space:pre-wrap;line-height:1.6">${message.trim()}</div>
  <hr style="margin:24px 0;border:none;border-top:1px solid #E8E4DE"/>
  <p style="color:#8C8479;font-size:13px">Submitted: ${submittedAt}<br/>Reply directly to this email to respond to the customer.</p>
</div>`,
        }).catch(e => console.error("[contact] admin email failed:", e));

        // Confirmation to customer
        const preview = message.trim().length > 200
            ? message.trim().slice(0, 200) + "…"
            : message.trim();

        await resend.emails.send({
            from: `${storeName} <${fromEmail}>`,
            to: email.trim(),
            subject: `We got your message, ${first_name.trim()}! — Miss Tokyo`,
            html: `
<div style="font-family:sans-serif;max-width:600px;color:#141210">
  <h2>Hi ${first_name.trim()},</h2>
  <p style="line-height:1.7">Thanks for reaching out! We've received your message and will get back to you within 24 hours — usually much sooner during business hours.</p>
  <div style="background:#F7F2EC;border-left:3px solid #C8A97A;padding:16px 20px;margin:24px 0;color:#8C8479;font-style:italic;line-height:1.6">"${preview}"</div>
  <p style="line-height:1.7">In the meantime, you can browse our latest drops at <a href="https://misstokyo.shop" style="color:#C8A97A">misstokyo.shop</a></p>
  <p style="margin-top:32px">— The Miss Tokyo Team</p>
</div>`,
        }).catch(e => console.error("[contact] customer email failed:", e));
    } else {
        console.warn("[contact] RESEND_API_KEY not configured — emails skipped");
    }

    return NextResponse.json({ success: true });
}
