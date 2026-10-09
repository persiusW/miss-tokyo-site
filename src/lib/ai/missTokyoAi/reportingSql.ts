// Pure checks for reporting_query's SQL (no server imports, so unit tests can
// load it). They mirror fn_ai_reporting_query's own checks, which are the
// real guard, and add a clear message for other schemas.

export const MAX_SQL = 4000;
export const ROW_CAP = 200;

export function checkReportingSql(sql: string): string | null {
    if (!sql) return "Write one SELECT query.";
    if (sql.length > MAX_SQL) return `Keep the query under ${MAX_SQL} characters.`;
    if (sql.includes(";")) return "One statement only, with no semicolon.";
    if (!/^\s*(select|with)\s/i.test(sql)) return "Only SELECT (or WITH … SELECT) queries are allowed.";
    if (/(current_setting|set_config|pg_settings|pg_show_all_settings|_to_xml|ts_stat|pg_sleep|dblink|lo_\w+\s*\()/i.test(sql)) {
        return "That function is not allowed here.";
    }
    if (/\b(public|auth|vault|storage|cron|extensions|pg_catalog|information_schema|realtime|net|supabase_\w+)\s*\./i.test(sql)) {
        return "Query only the reporting views (orders, paid_orders, sales_lines, products, stock), unqualified.";
    }
    return null;
}
