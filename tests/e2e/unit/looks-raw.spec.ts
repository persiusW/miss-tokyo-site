import { test, expect } from "@playwright/test";
import fs from "fs";
import path from "path";
import { looksRaw } from "../../../src/lib/errors/looksRaw";
import { calmMessage } from "../../../src/lib/toast";

test("technical text is raw", () => {
    for (const m of [
        'duplicate key value violates unique constraint "x"', 'relation "orders" does not exist', "JWT expired",
        "Unexpected token '<', \"<html>\" is not valid JSON", "fetch failed", "TypeError: Cannot read properties of undefined",
        "mNotify returned HTML — check API key", "Invalid key", "Request failed with status code 500", "<html><body>504</body></html>",
        "[object Object]", "x".repeat(301), "", "   ",
    ]) expect(looksRaw(m), m).toBe(true);
    expect(looksRaw(undefined)).toBe(true);
});

test("calm app messages pass, including ones that name Paystack", () => {
    for (const m of [
        "Product saved", "Copied!", "Verify with Paystack found no payment for this order.",
        "Paystack didn't create the link. Please try again.", "Cash received — order ABCD1234 created",
        '"Kay Ali Set" (M — 10 / Black) only has 1 left. "Ombre Bag" is sold out.',
    ]) expect(looksRaw(m), m).toBe(false);
});

test("calmMessage swaps raw text for the calm generic line", () => {
    expect(calmMessage("relation \"x\" does not exist")).toBe("Something happened. Please try again shortly.");
    expect(calmMessage("Product saved")).toBe("Product saved");
});

test("no literal toast.error string in the app is mistaken for raw text", () => {
    const root = path.resolve(__dirname, "../../../src");
    const files: string[] = [];
    const walk = (d: string) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) walk(p); else if (/\.tsx?$/.test(e.name)) files.push(p); } };
    walk(root);
    const offenders: string[] = [];
    for (const f of files) {
        for (const m of fs.readFileSync(f, "utf8").matchAll(/toast\.error\(\s*(["'])((?:(?!\1).){1,400})\1\s*\)/g)) {
            if (looksRaw(m[2])) offenders.push(`${path.relative(root, f)}: ${m[2]}`);
        }
    }
    expect(offenders).toEqual([]);
});
