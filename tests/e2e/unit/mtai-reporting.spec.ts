import { test, expect } from "@playwright/test";
import fs from "fs";
import path from "path";
import { checkReportingSql } from "../../../src/lib/ai/missTokyoAi/reportingSql";

// reporting_query's app-side checks. The database function is the real guard
// (verified against production in a rolled-back transaction); these lock the
// clear-message layer and the admin-only registration.

test("plain SELECTs and CTEs over the views pass", () => {
    expect(checkReportingSql("select channel, sum(total_amount) from paid_orders group by 1")).toBeNull();
    expect(checkReportingSql("  WITH x AS (select * from sales_lines) select count(*) from x")).toBeNull();
    expect(checkReportingSql("select staff_name, count(*) from paid_orders where day >= current_date - 6 group by 1")).toBeNull();
});

test("writes, second statements and non-SELECTs are refused", () => {
    expect(checkReportingSql("")).not.toBeNull();
    expect(checkReportingSql("select 1; delete from orders")).toMatch(/one statement/i);
    expect(checkReportingSql("update orders set status = 'paid'")).toMatch(/SELECT/);
    expect(checkReportingSql("delete from orders")).toMatch(/SELECT/);
    expect(checkReportingSql("x".repeat(4001))).toMatch(/4000/);
});

test("settings readers, sleeps and query-in-a-string functions are refused", () => {
    for (const sql of [
        "select current_setting('request.headers', true)",
        "select set_config('role', 'postgres', true)",
        "select * from pg_settings",
        "select * from pg_show_all_settings()",
        "select query_to_xml('select 1', true, true, '')",
        "select pg_sleep(10)",
        "select lo_import('/etc/passwd')",
    ]) expect(checkReportingSql(sql), sql).toMatch(/not allowed/);
});

test("other schemas get a clear message", () => {
    for (const sql of [
        "select * from public.orders",
        "select email from auth.users",
        "select * from vault.decrypted_secrets",
        "select * from pg_catalog.pg_roles",
        "select * from information_schema.tables",
    ]) expect(checkReportingSql(sql), sql).toMatch(/reporting views/);
});

test("reporting_query is registered for admins only", () => {
    const src = fs.readFileSync(path.resolve(__dirname, "../../../src/lib/ai/missTokyoAi/tools/reporting.ts"), "utf8");
    expect(src).toMatch(/roles:\s*\["admin"\]/);
    const index = fs.readFileSync(path.resolve(__dirname, "../../../src/lib/ai/missTokyoAi/tools/index.ts"), "utf8");
    expect(index).toMatch(/\.\.\.reportingTools/);
});
