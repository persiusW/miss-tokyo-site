// Admin-only: one read-only SELECT over the reporting.* views, for questions
// the stats tool's fixed building blocks cannot express. The database does
// the real guarding (fn_ai_reporting_query runs as ai_reader: SELECT on
// reporting.* only, read-only, 5s, 200 rows); the checks here only turn the
// obvious mistakes into clear messages before a round trip. Every query is
// logged to ai_query_log, and the SQL is shown to the admin under the reply.
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { checkReportingSql, MAX_SQL, ROW_CAP } from "@/lib/ai/missTokyoAi/reportingSql";
import { err, ok, str, type ToolDef } from "./shared";

const DESCRIPTION = `Admin only. Run ONE read-only SQL SELECT (Postgres) over the shop's reporting views, for questions stats and stock_report cannot answer (cross-tabs, filters on several columns, ratios, first/last dates, rankings within groups). Prefer stats when it fits. Rules: one statement, no semicolon, SELECT or WITH only, unqualified view names, at most ${ROW_CAP} rows come back (aggregate instead of listing), 5 second limit. Dates: "day" is the shop day (Ghana = UTC); use current_date for today.

Views:
- paid_orders: sales only (payment_status = 'paid'). Same columns as orders. Use this for revenue.
- orders: every order. id, ref, created_at, day, channel ('pos' | 'online'), status, payment_status, fulfillment_status, payment_method, total_amount, delivery_fee, delivery_method, delivery_zone, discount_code, discount_amount, auto_discount_amount, has_preorder, customer_name, staff_name (who rang it up at the till; null online).
- sales_lines: one row per item sold on a paid order. order_id, ref, created_at, day, channel, payment_method, staff_name, product_id, product_name, category, size, colour, brand, quantity, unit_price, line_total, is_preorder.
- products: id, name, sku, price, is_sale, sale_discount_pct, active, track_inventory, track_variant_inventory, inventory_count, preorder_enabled, category, created_at.
- stock: one row per variant (size/colour/brand) of tracked products, or one row for products tracked without variants. product_id, product_name, sku, category, active, size, colour, brand, on_hand.

Money is GHS. Revenue = sum(total_amount) on paid_orders; product revenue = sum(line_total) on sales_lines.`;

export const reportingTools: ToolDef[] = [
    {
        roles: ["admin"],
        def: {
            name: "reporting_query",
            description: DESCRIPTION,
            input_schema: {
                type: "object",
                properties: {
                    sql: { type: "string", description: "One SELECT over the reporting views." },
                },
                required: ["sql"],
            },
        },
        run: async (input, ctx) => {
            const sql = str(input?.sql, MAX_SQL + 1);
            const log = async (row: { ok: boolean; row_count?: number | null; error?: string | null; duration_ms?: number | null }) => {
                const { error: logError } = await supabaseAdmin.from("ai_query_log").insert({ user_id: ctx.userId, sql: sql || "(empty)", ...row });
                if (logError) console.error("[miss-tokyo-ai] could not log reporting query", logError);
            };

            const problem = checkReportingSql(sql);
            if (problem) {
                await log({ ok: false, error: `refused: ${problem}` });
                return err(problem);
            }

            const started = Date.now();
            const { data, error } = await supabaseAdmin.rpc("fn_ai_reporting_query", { p_sql: sql });
            const rows = Array.isArray(data) ? data : [];
            await log({
                ok: !error,
                row_count: error ? null : rows.length,
                error: error ? error.message.slice(0, 500) : null,
                duration_ms: Date.now() - started,
            });

            if (error) {
                const timedOut = /statement timeout|canceling statement/i.test(error.message);
                return err(timedOut
                    ? "That query took longer than 5 seconds. Narrow the dates or aggregate more."
                    : `The query failed: ${error.message.slice(0, 300)}`);
            }
            ctx.effects.push({ kind: "query", sql, rows: rows.length });
            return ok({
                rows,
                row_count: rows.length,
                ...(rows.length >= ROW_CAP ? { note: `Only the first ${ROW_CAP} rows came back. Aggregate or filter for a complete answer.` } : {}),
            });
        },
    },
];
