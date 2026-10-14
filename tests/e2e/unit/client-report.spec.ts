import { test, expect } from "@playwright/test";
import { allowReport, buildReport, createReporter, REPORT_MAX_PER_LOAD } from "../../../src/lib/errors/clientReport";

test("reports are short, redacted and code GEN-00", () => {
    const e = new Error("OTP is 482913 " + "x".repeat(400));
    const r = buildReport(e, "/pos?x=1");
    expect(r.code).toBe("GEN-00");
    expect(r.path).toBe("/pos");
    expect(r.message.length).toBeLessThanOrEqual(300);
    expect(r.message).not.toContain("482913");
    expect(buildReport("plain string", "/").message).toBe("plain string");
    expect(buildReport(undefined, "/").message).toBe("unknown");
});

test("the same error is sent once, at most 20 per load, and a failing send stops reporting", async () => {
    const sent: string[] = [];
    const report = createReporter(async r => { sent.push(r.message); });
    const r = buildReport(new Error("boom"), "/");
    report(r); report(r);
    expect(sent).toEqual(["boom"]);
    for (let i = 0; i < 50; i++) report(buildReport(new Error(`e${i}`), "/"));
    await new Promise(res => setTimeout(res, 0));
    expect(sent.length).toBe(REPORT_MAX_PER_LOAD);

    let calls = 0;
    const failing = createReporter(async () => { calls++; throw new Error("network"); });
    failing(buildReport(new Error("a"), "/"));
    await new Promise(res => setTimeout(res, 0));
    failing(buildReport(new Error("b"), "/"));
    await new Promise(res => setTimeout(res, 0));
    expect(calls).toBe(1);
});

test("server limiter allows 20 per IP per 10 minutes", () => {
    const t0 = 1_000_000;
    for (let i = 0; i < 20; i++) expect(allowReport("1.2.3.4", t0 + i)).toBe(true);
    expect(allowReport("1.2.3.4", t0 + 100)).toBe(false);
    expect(allowReport("5.6.7.8", t0 + 100)).toBe(true);
    expect(allowReport("1.2.3.4", t0 + 10 * 60_000 + 1)).toBe(true);
});

test("error screens and ErrorNet share one reporter, so a crash is reported once", async () => {
    const { sharedReporter } = await import("../../../src/lib/errors/clientReport");
    const sent: string[] = [];
    const a = sharedReporter(async r => { sent.push("a:" + r.message); });
    const b = sharedReporter(async r => { sent.push("b:" + r.message); });
    expect(a).toBe(b);
    const crash = new Error("render crash");
    a(buildReport(crash, "/pos"));
    b(buildReport(crash, "/pos"));
    await new Promise(res => setTimeout(res, 0));
    expect(sent).toEqual(["a:render crash"]);
});

test("log fields are single-line", async () => {
    const { oneLine } = await import("../../../src/lib/errors/clientReport");
    expect(oneLine("a\nb\r\nc")).toBe("a b c");
});

test("the IP map forgets quiet IPs", async () => {
    const { allowReport, ipCount } = await import("../../../src/lib/errors/clientReport");
    allowReport("9.9.9.9", 5_000_000);
    allowReport("8.8.8.8", 5_000_000 + 11 * 60_000);
    expect(ipCount()).toBeLessThanOrEqual(2);
});
