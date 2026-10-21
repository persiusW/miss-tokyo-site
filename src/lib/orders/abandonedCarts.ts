// Abandoned-cart reminders: the one implementation behind the hourly cron
// (/api/cron/abandoned-cart, Vercel; /api/cron/abandoned-carts, the external
// cron, now an alias) and the admin's "Send reminder". Server only.
//
// The cron's rule is unchanged from the two routes it replaces: pending
// orders with no Paystack reference, created 24 to 48 hours ago, with an
// email, not reminded before; one email each; abandoned_history records it.
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { sendEmail } from "@/lib/email";

const esc = (s: string) => s.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

export function reminderEmail(a: { bizName: string; name: string | null; itemCount: number; siteUrl: string }): { subject: string; html: string } {
    const items = a.itemCount > 0 ? `${a.itemCount} item${a.itemCount > 1 ? "s" : ""}` : "items";
    return {
        subject: `You left something behind at ${a.bizName}`,
        html: `
                    <div style="font-family:Georgia,serif;background:#fafaf9;padding:40px 20px;">
                      <div style="max-width:560px;margin:0 auto;background:#fff;border:1px solid #e5e5e5;padding:48px;">
                        <h1 style="font-size:20px;letter-spacing:.15em;text-transform:uppercase;margin:0 0 6px;">${esc(a.bizName)}</h1>
                        <p style="color:#737373;font-size:11px;letter-spacing:.2em;text-transform:uppercase;margin:0 0 36px;">Your Cart Is Waiting</p>
                        <p style="font-size:15px;color:#171717;margin:0 0 16px;">
                          Hello${a.name ? ` ${esc(a.name)}` : ""},
                        </p>
                        <p style="font-size:14px;color:#525252;line-height:1.8;margin:0 0 28px;">
                          You left ${items} in your cart.
                          Your selection is still here — complete your order before it sells out.
                        </p>
                        <div style="background:#171717;padding:14px 24px;display:inline-block;margin-bottom:32px;">
                          <a href="${a.siteUrl}/shop" style="color:#fff;font-size:11px;letter-spacing:.2em;text-transform:uppercase;text-decoration:none;">
                            Return to Shop →
                          </a>
                        </div>
                        <div style="border-top:1px solid #e5e5e5;padding-top:20px;margin-top:20px;">
                          <p style="font-size:11px;color:#a3a3a3;text-transform:uppercase;letter-spacing:.15em;margin:0;">${esc(a.bizName)}</p>
                        </div>
                      </div>
                    </div>`,
    };
}

async function bizName(): Promise<string> {
    const { data } = await supabaseAdmin.from("business_settings").select("business_name").eq("id", "default").maybeSingle();
    return data?.business_name || "Miss Tokyo";
}

type CartOrder = { id: string; customer_name: string | null; customer_email: string | null; items: unknown };

/** Send one reminder and record it. True when the email went. */
export async function remindOne(order: CartOrder, name?: string): Promise<boolean> {
    if (!order.customer_email) return false;
    const { subject, html } = reminderEmail({
        bizName: name ?? await bizName(), name: order.customer_name,
        itemCount: Array.isArray(order.items) ? order.items.length : 0, siteUrl: process.env.NEXT_PUBLIC_SITE_URL || "",
    });
    const { ok } = await sendEmail({ to: order.customer_email, subject, html }, { event: "abandoned_cart_reminder", orderId: order.id });
    if (!ok) return false;
    const { error } = await supabaseAdmin.from("abandoned_history").insert([{
        order_id: order.id, customer_email: order.customer_email, customer_name: order.customer_name,
    }]);
    if (error) console.error("[abandoned] reminder sent but not recorded", { code: error.code });
    return true;
}

export type CronResult = { sent: number; failed: string[]; message?: string } | { error: unknown };

/** The hourly sweep. */
export async function runAbandonedReminders(now = new Date()): Promise<CronResult> {
    const windowStart = new Date(now.getTime() - 48 * 60 * 60 * 1000);
    const windowEnd = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const { data: abandoned, error } = await supabaseAdmin
        .from("orders")
        .select("id, customer_name, customer_email, total_amount, items, created_at")
        .eq("status", "pending")
        .is("paystack_reference", null)
        .gte("created_at", windowStart.toISOString())
        .lte("created_at", windowEnd.toISOString())
        .not("customer_email", "is", null);
    if (error) return { error };
    if (!abandoned?.length) return { sent: 0, failed: [], message: "No eligible carts" };

    const { data: already } = await supabaseAdmin.from("abandoned_history").select("order_id").in("order_id", abandoned.map(o => o.id));
    const done = new Set((already ?? []).map(r => r.order_id));
    const toRemind = abandoned.filter(o => !done.has(o.id) && !!o.customer_email);
    if (!toRemind.length) return { sent: 0, failed: [], message: "All already reminded" };

    const name = await bizName();
    let sent = 0;
    const failed: string[] = [];
    for (const o of toRemind) {
        if (await remindOne(o, name)) sent++;
        else failed.push(o.id);
    }
    console.log(`[cron/abandoned-cart] sent=${sent} failed=${failed.length}`);
    return { sent, failed };
}
