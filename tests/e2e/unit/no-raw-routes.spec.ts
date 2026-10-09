import { test, expect } from "@playwright/test";
import fs from "fs";
import path from "path";

// No API route may hand provider, database or exception text to the client.
const RAW = [
    /(error|message)\s*:\s*(err|error|e|retryError|linkError|recoveryError|profileError|inviteError|fetchError|insertErr|readErr|reserveError)\??\.message/,
    /(error|message)\s*:\s*(data|paystackData)\.message/,
    /(error|message)\s*:\s*`[^`]*\$\{\s*(err|insertErr|readErr)\??\.message/,
    /error\s*:\s*result\.error\b/,
    /emailErrors\.push\(`[^`]*\$\{\s*err\?*\.message/,
    /\b(smsError|emailError)\s*[,}]/,
    /error\s*:\s*["']Internal (Server )?Error["']/i,
];

test("no API route returns raw error text", () => {
    const root = path.resolve(__dirname, "../../../src/app/api");
    const files: string[] = [];
    const walk = (d: string) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) walk(p); else if (e.name === "route.ts") files.push(p); } };
    walk(root);
    files.push(path.resolve(__dirname, "../../../src/lib/checkout/createCheckoutOrder.ts"));
    const hits: string[] = [];
    for (const f of files) {
        fs.readFileSync(f, "utf8").split("\n").forEach((line, i) => {
            if (line.trim().startsWith("//") || /console\.(error|warn|log)/.test(line) || line.includes("// calm-text")) return;
            if (RAW.some(r => r.test(line))) hits.push(`${path.relative(root, f)}:${i + 1}: ${line.trim()}`);
        });
    }
    expect(hits).toEqual([]);
});
