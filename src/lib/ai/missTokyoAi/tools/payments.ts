// payment_help: what happened to a sale's payments, and whether another way
// to pay may be suggested. The rule decides (altPaymentRule); the model only
// explains. Behind the mtai_error_help_enabled switch.
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { ERRORS, isErrorCode, type ErrorCode } from "@/lib/errors/catalogue";
import { failuresForSale, outageErrors } from "@/lib/payments/attempts";
import { altPayment, owedFrom, type AltChannel, type AltOption } from "@/lib/payments/altPaymentRule";
import { findOrder } from "./orders";
import { err, ok, str, UUID_RE, type ToolDef } from "./shared";

const OPTION_TEXT: Record<AltOption, string> = {
    new_link: "Send a new payment link.",
    card_or_momo: "The customer can pay the link with a card instead of mobile money, or with another mobile money network.",
    gift_card_plus_link: "Use a gift card for part of the total and a link for the rest.",
};

type Attempt = { sale_key: string; status: string; error_code: string | null; paystack_status: string | null; created_at: string; channel: string };

export const paymentTools: ToolDef[] = [
    {
        feature: "errorHelp",
        def: {
            name: "payment_help",
            description: "For any payment problem: what happened to the sale's payment attempts, the plain steps to fix it, and whether another way to pay may be suggested (rule.allowed and rule.options). Give one of order_ref, pos_session_id or sale_key.",
            input_schema: {
                type: "object",
                properties: {
                    order_ref: { type: "string", description: "8-character order reference or order id." },
                    pos_session_id: { type: "string", description: "Till session id." },
                    sale_key: { type: "string", description: "Sale key." },
                },
            },
        },
        async run(input, ctx) {
            let attempts: Attempt[] = [];
            let owed = true;
            let channel: AltChannel = "online";
            let saleKey: string | null = null;
            const cols = "sale_key, status, error_code, paystack_status, created_at, channel";

            const sessionId = str(input?.pos_session_id, 60);
            const orderRef = str(input?.order_ref, 60);
            const key = str(input?.sale_key, 60);
            if (sessionId) {
                if (!UUID_RE.test(sessionId)) return err("That till session id isn't valid.");
                const { data: s } = await supabaseAdmin.from("pos_sessions").select("id, status, created_by").eq("id", sessionId).maybeSingle();
                if (!s) return err("That till sale wasn't found.");
                if (ctx.role === "sales_staff" && s.created_by !== ctx.userId) return err("That till sale belongs to someone else. Ask them, or an admin or owner.");
                owed = owedFrom(s.status);
                channel = "pos";
                const { data } = await supabaseAdmin.from("sale_payment_attempts").select(cols).eq("pos_session_id", sessionId).order("created_at", { ascending: false }).limit(10);
                attempts = data ?? [];
            } else if (orderRef) {
                const found = await findOrder(orderRef);
                if ("error" in found) return err(found.error as string);
                if (!found.order) return err("That order wasn't found.");
                owed = owedFrom(found.order.payment_status);
                channel = found.order.source === "dashboard" ? "ai" : found.order.source === "pos" ? "pos" : "online";
                const { data } = await supabaseAdmin.from("sale_payment_attempts").select(cols).eq("order_id", found.order.id).order("created_at", { ascending: false }).limit(10);
                attempts = data ?? [];
            } else if (key) {
                if (!UUID_RE.test(key)) return err("That sale key isn't valid.");
                const { data } = await supabaseAdmin.from("sale_payment_attempts").select(cols).eq("sale_key", key).order("created_at", { ascending: false }).limit(10);
                attempts = data ?? [];
                owed = !attempts.some(a => a.status === "paid");
                if (attempts[0]?.channel === "pos") channel = "pos";
            } else {
                return err("Give the order reference or the till sale.");
            }

            saleKey = attempts[0]?.sale_key ?? (key || null);
            const [failures, outage] = await Promise.all([saleKey ? failuresForSale(saleKey) : Promise.resolve(0), outageErrors()]);
            const rule = altPayment({ owed, channel, failures, outageErrors: outage });

            const last = attempts[0];
            const lastCode: ErrorCode | null = last
                ? (isErrorCode(last.error_code) ? last.error_code : last.status === "failed" ? "PAY-04" : last.status === "unfinished" ? "PAY-05" : null)
                : null;

            return ok({
                still_owed: owed,
                attempts: attempts.map(a => ({ status: a.status, code: a.error_code, paystack: a.paystack_status, at: a.created_at })),
                last_problem: lastCode ? ERRORS[lastCode].staff : null,
                failures,
                paystack_outage: outage >= 2,
                rule,
                steps: lastCode ? (ERRORS[lastCode] as { steps?: string[] }).steps ?? [] : [],
                options_explained: rule.options.map(o => OPTION_TEXT[o]),
                never: "Never suggest cash.",
            });
        },
    },
];
