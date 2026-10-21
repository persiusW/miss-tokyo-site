import { test, expect } from "@playwright/test";
import fs from "fs";
import path from "path";
import { STAGGER_CAP, STAGGER_MS, nodeText, staggerDelayMs } from "../../../src/components/admin/ui/motion";
import { pageKey } from "../../../src/components/admin/shell/nav";

const ROOT = path.resolve(__dirname, "../../..");
const CSS = fs.readFileSync(path.join(ROOT, "src/components/admin/ui/admin-v2.css"), "utf8");

/** The body of every @media (prefers-reduced-motion:reduce) block, braces balanced. */
function reducedBlocks(css: string): string[] {
    const out: string[] = [];
    const re = /@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(css))) {
        let depth = 1, i = re.lastIndex;
        while (i < css.length && depth) { if (css[i] === "{") depth++; else if (css[i] === "}") depth--; i++; }
        out.push(css.slice(re.lastIndex, i - 1));
    }
    return out;
}

test("tokens from the motion spec are declared on .adm2", () => {
    const tokens = /\.adm2\{[^}]*\}/.exec(CSS)![0];
    for (const t of ["--dur-fast:140ms", "--dur:220ms", "--dur-slow:320ms", "--ease:cubic-bezier(.2,.7,.2,1)", "--ease-in:cubic-bezier(.4,0,1,1)", "--stagger:35ms"]) {
        expect(tokens, t).toContain(t);
    }
});

test("reduced motion turns off every animation and transition under .adm2 and html.theming", () => {
    const blocks = reducedBlocks(CSS);
    expect(blocks.length).toBeGreaterThan(0);
    const rule = blocks.map(b => /([^{}]+)\{([^}]*)\}/.exec(b)).find(r => r && /animation:none!important/.test(r[2]) && /transition:none!important/.test(r[2]));
    expect(rule, "a rule with animation:none!important and transition:none!important").toBeTruthy();
    const sel = rule![1].split(",").map(s => s.trim());
    for (const s of [".adm2", ".adm2 *", ".adm2 *::before", ".adm2 *::after", "html.theming", "html.theming *", "html.theming *::before", "html.theming *::after"]) {
        expect(sel, s).toContain(s);
    }
    // The route cross-fade is off too.
    expect(blocks.join("")).toMatch(/::view-transition-old\(\*\)[^{]*\{animation:none!important/);
});

test("page stagger: 35ms steps, the 6th child and later share the last step", () => {
    expect(STAGGER_MS).toBe(35);
    expect(STAGGER_CAP).toBe(6);
    expect([0, 1, 2, 3, 4, 5, 6, 7, 40].map(i => staggerDelayMs(i))).toEqual([0, 35, 70, 105, 140, 175, 175, 175, 175]);
    expect(staggerDelayMs(-1)).toBe(0);
    expect(staggerDelayMs(Number.NaN)).toBe(0);
});

test("the CSS page stagger matches staggerDelayMs", () => {
    for (let i = 1; i < STAGGER_CAP - 1; i++) {
        const want = i === 1 ? "var(--stagger)" : `calc(var(--stagger)*${i})`;
        expect(CSS, `child ${i + 1}`).toContain(`.adm2 .page>:nth-child(${i + 1}){animation-delay:${want}}`);
    }
    expect(CSS).toContain(`.adm2 .page>:nth-child(n+${STAGGER_CAP}){animation-delay:calc(var(--stagger)*${STAGGER_CAP - 1})}`);
});

test("nodeText keys a KPI value by what it shows", () => {
    expect(nodeText("GH₵ 3,860")).toBe("GH₵ 3,860");
    expect(nodeText(12)).toBe("12");
    expect(nodeText(null)).toBe("");
    expect(nodeText(false)).toBe("");
    expect(nodeText(["a", 1, null, ["b"]])).toBe("a1b");
    expect(nodeText({ props: { children: { props: { children: ["GH₵ ", 40] } } } })).toBe("GH₵ 40");
});

test("pageKey keeps a list's key while a panel is open over it", () => {
    expect(pageKey("/orders")).toBe("/orders");
    expect(pageKey("/orders/3f2b1c9e-0000-4000-8000-000000000000")).toBe("/orders");
    expect(pageKey("/orders/abandoned")).toBe("/orders/abandoned");
    expect(pageKey("/orders/invoices")).toBe("/orders/invoices");
    expect(pageKey("/orders/invoices/abc")).toBe("/orders/invoices");
    expect(pageKey("/catalogue/new")).toBe("/catalogue");
    expect(pageKey("/catalogue/p-1")).toBe("/catalogue");
    expect(pageKey("/catalogue/inventory")).toBe("/catalogue/inventory");
    expect(pageKey("/catalogue/gift-cards")).toBe("/catalogue/gift-cards");
    expect(pageKey("/customers/ama%40example.com")).toBe("/customers");
    expect(pageKey("/customers/whatsapp")).toBe("/customers/whatsapp");
    expect(pageKey("/discounts/d1")).toBe("/discounts");
    // Real pages keep their own key.
    expect(pageKey("/settings/delivery")).toBe("/settings/delivery");
    expect(pageKey("/settings")).toBe("/settings");
    expect(pageKey("/till/today")).toBe("/till/today");
    expect(pageKey("/home/")).toBe("/home");
    expect(pageKey("/")).toBe("/");
});
