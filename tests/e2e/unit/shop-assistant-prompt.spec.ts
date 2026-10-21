import { createHash } from "crypto";
import { test, expect } from "@playwright/test";
import { SHOP_SYSTEM_PROMPT, systemPromptFor } from "../../../src/lib/ai/shopAssistant/prompt";
import { customerFacts, GAP_NOTE_MS } from "../../../src/lib/ai/shopAssistant/facts";

const hash = (s: string) => createHash("sha256").update(s).digest("hex").slice(0, 16);

// Any change to the assistant's wording moves these on purpose: update the hash in the same
// commit, and read the new wording through once (it changes how every customer is answered).
test("the assistant's prompt is pinned", () => {
    expect(hash(SHOP_SYSTEM_PROMPT)).toBe("80cb68cfc9cd26b5");
    expect(hash(systemPromptFor("whatsapp", "233200000041", { choices: true, restock: true, returns: true, withTeam: true }))).toBe("d58fc7fba72fe75e");
});

test("the prompt carries the behaviour rules from the shared spec", () => {
    const wa = systemPromptFor("whatsapp", "233200000041");
    for (const rule of [
        /Answer the customer's latest message first/,
        /Never repeat your previous question word for word/,
        /complains .* say sorry in one short line and pass them to our team/,
        /greet them by first name, and never ask again/,
        /quiet for hours or days, answer their new message first/,
        /my_orders lists the orders placed with their WhatsApp number/,
        /photo lessons .* look that piece up by its SKU first/,
        /add it with update_cart .* read the basket back .* from_cart true/,
    ]) expect(wa).toMatch(rule);
    // Per-turn facts never enter the cached prompt.
    expect(wa).not.toMatch(/Today is/);
});

const NOW = new Date("2026-10-21T09:30:00Z");   // 09:30 in Accra (GMT all year)

test("facts: date and greeting in Accra, a returning customer's details, and a long gap", () => {
    const f = customerFacts({
        now: NOW, lastMessageAt: new Date(NOW.getTime() - 3 * 24 * 3600_000).toISOString(),
        record: { orders: 8, name: "Enam Mensah", email: "enam@example.com", address: "12 Oxford St, Osu · Greater Accra" },
    });
    expect(f).toContain("Today is Wednesday 21 October 2026, 09:30 in Accra (\"Good morning\")");
    expect(f).toContain("Returning customer: 8 earlier orders on this number; name on their last order: Enam Mensah (call them Enam); email: enam@example.com; last delivery address: 12 Oxford St, Osu · Greater Accra.");
    expect(f).toContain("This chat was quiet for 3 days before this message.");
    expect(f).toMatch(/^Facts from our own records/);
});

test("facts: a new number, no gap note inside the same conversation, an evening greeting", () => {
    const f = customerFacts({ now: new Date("2026-10-21T19:05:00Z"), lastMessageAt: new Date(Date.parse("2026-10-21T19:05:00Z") - GAP_NOTE_MS + 60_000).toISOString(), record: { orders: 0, name: null, email: null, address: null } });
    expect(f).toContain("No earlier orders on this number.");
    expect(f).toContain("\"Good evening\"");
    expect(f).not.toContain("quiet for");
    expect(customerFacts({ now: NOW, lastMessageAt: null, record: null })).toContain("No earlier orders on this number.");
    // Only what we have: one order, no name or email.
    expect(customerFacts({ now: NOW, lastMessageAt: null, record: { orders: 1, name: null, email: null, address: null } }))
        .toContain("Returning customer: 1 earlier order on this number.");
});
