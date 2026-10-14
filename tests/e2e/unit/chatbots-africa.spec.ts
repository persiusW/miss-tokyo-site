import { test, expect } from "@playwright/test";
import { CHATBOTS_AFRICA_BASE, createChatbotsAfrica, shapeList, shapeQuickReply, shapeTemplate, toDestination, WA_LIMITS, type SendRecord } from "../../../src/lib/messaging/chatbotsAfrica";

type Call = { url: string; init: RequestInit; body: any };

function harness(reply: { status?: number; json?: unknown; throws?: boolean } = {}, apiKey: string | null = "test-key") {
    const calls: Call[] = [];
    const records: SendRecord[] = [];
    const fetchImpl = (async (url: string, init: RequestInit) => {
        calls.push({ url, init, body: init.body ? JSON.parse(String(init.body)) : null });
        if (reply.throws) throw new Error("socket hang up");
        return new Response(JSON.stringify(reply.json ?? { status: true, message_id: "wamid.ABC" }), { status: reply.status ?? 200 });
    }) as unknown as typeof fetch;
    const provider = createChatbotsAfrica({ apiKey, fetchImpl, record: async r => { records.push(r); } });
    return { provider, calls, records };
}

test("numbers go out as 233… with no plus", () => {
    expect(toDestination("0241234567")).toBe("233241234567");
    expect(toDestination("+233 24 123 4567")).toBe("233241234567");
    expect(toDestination("233241234567")).toBe("233241234567");
    expect(toDestination("024123456")).toBe(null);
    expect(toDestination("hello")).toBe(null);
});

test("a text message posts apikey, destination and message in the JSON body", async () => {
    const { provider, calls, records } = harness();
    const r = await provider.sendText("0241234567", "Your order is on its way.", { event: "dispatch" });
    expect(r).toEqual({ ok: true, messageId: "wamid.ABC" });
    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe(`${CHATBOTS_AFRICA_BASE}/send/message`);
    expect(calls[0].init.method).toBe("POST");
    expect(calls[0].body).toEqual({ apikey: "test-key", destination: "233241234567", message: "Your order is on its way." });
    expect(JSON.stringify(calls[0].init.headers)).not.toMatch(/authorization|bearer/i);
    expect(records).toHaveLength(1);
    expect(records[0]).toMatchObject({ to: "233241234567", body: "Your order is on its way.", meta: { event: "dispatch" } });
});

test("quick reply `interactive` is a JSON-encoded string, not an object", async () => {
    const { provider, calls } = harness();
    await provider.sendQuickReply("233241234567", { text: "Place this order?", caption: "Total GH₵ 153.75", options: ["Yes, place it", "No"] });
    const sent = calls[0].body;
    expect(calls[0].url).toBe(`${CHATBOTS_AFRICA_BASE}/send/quick/reply`);
    expect(typeof sent.interactive).toBe("string");
    expect(JSON.parse(sent.interactive)).toEqual({
        content: { text: "Place this order?", caption: "Total GH₵ 153.75" },
        options: [{ title: "Yes, place it" }, { title: "No" }],
    });
});

test("list `interactive` is a JSON-encoded string with the provider's list shape", async () => {
    const { provider, calls } = harness();
    await provider.sendList("233241234567", {
        title: "Dresses", body: "Pick one to see sizes.", footer: "Miss Tokyo", button: "See dresses",
        sections: [{ title: "In stock", rows: [{ id: "p1", title: "Lindsy Bodycon", description: "GH₵ 160" }, { id: "p2", title: "Snatch Shirt Dress" }] }],
    });
    const sent = calls[0].body;
    expect(calls[0].url).toBe(`${CHATBOTS_AFRICA_BASE}/send/list/message`);
    expect(typeof sent.interactive).toBe("string");
    expect(JSON.parse(sent.interactive)).toEqual({
        type: "list", title: "Dresses", body: "Pick one to see sizes.", footer: "Miss Tokyo",
        globalButtons: [{ title: "See dresses" }],
        items: [{ title: "In stock", options: [
            { postbackText: "p1", title: "Lindsy Bodycon", description: "GH₵ 160" },
            { postbackText: "p2", title: "Snatch Shirt Dress", description: "" },
        ] }],
    });
});

test("WhatsApp limits: at most 3 quick replies and 10 list rows, checked before any call", async () => {
    const four = shapeQuickReply({ text: "Pick", options: ["A", "B", "C", "D"] });
    expect(four).toMatchObject({ ok: false, code: "invalid" });
    expect(shapeQuickReply({ text: "Pick", options: ["A", "B", "C"] })).toHaveProperty("interactive");
    expect(shapeQuickReply({ text: "Pick", options: ["x".repeat(WA_LIMITS.quickReplyTitle + 1)] })).toMatchObject({ code: "invalid" });

    const rows = (n: number) => Array.from({ length: n }, (_, i) => ({ id: `r${i}`, title: `Row ${i}` }));
    expect(shapeList({ body: "b", button: "Open", sections: [{ title: "S", rows: rows(10) }] })).toHaveProperty("interactive");
    // Ten across sections is the cap, not ten per section.
    expect(shapeList({ body: "b", button: "Open", sections: [{ title: "S1", rows: rows(6) }, { title: "S2", rows: rows(5) }] })).toMatchObject({ code: "invalid" });
    expect(shapeList({ body: "b", button: "Open", sections: [{ title: "S", rows: [{ id: "r", title: "t".repeat(WA_LIMITS.listRowTitle + 1) }] }] })).toMatchObject({ code: "invalid" });

    const { provider, calls, records } = harness();
    const r = await provider.sendQuickReply("233241234567", { text: "Pick", options: ["A", "B", "C", "D"] });
    expect(r).toMatchObject({ ok: false, code: "invalid" });
    expect(calls).toHaveLength(0);
    expect(records).toHaveLength(1);           // a refused send is still recorded as failed
});

test("templates send the id, type and placeholders as an array", async () => {
    expect(shapeTemplate({ templateId: 12, type: "text", placeholders: ["Abena", "GH₵ 1,250.00"] }))
        .toEqual({ template_id: 12, type: "text", placeholder: ["Abena", "GH₵ 1,250.00"] });
    expect(shapeTemplate({ templateId: 12, type: "image" })).toMatchObject({ code: "invalid" });
    expect(shapeTemplate({ templateId: 3, type: "image", link: "https://misstokyo.shop/x.jpg" })).toEqual({ template_id: 3, type: "image", link: "https://misstokyo.shop/x.jpg" });
    const { provider, calls } = harness();
    await provider.sendTemplate("0241234567", { templateId: 12, type: "text", placeholders: ["Abena"] });
    expect(calls[0].url).toBe(`${CHATBOTS_AFRICA_BASE}/send/message/template`);
    expect(calls[0].body).toEqual({ apikey: "test-key", destination: "233241234567", template_id: 12, type: "text", placeholder: ["Abena"] });
});

test("opt-out posts status false; balance is a GET with the key in the query string", async () => {
    const { provider, calls } = harness({ json: { balance: "42.50" } });
    await provider.optOut("0241234567");
    expect(calls[0].url).toBe(`${CHATBOTS_AFRICA_BASE}/send/opt/contact`);
    expect(calls[0].body).toEqual({ apikey: "test-key", destination: "233241234567", status: false });
    const b = await provider.balance();
    expect(b).toMatchObject({ ok: true, balance: 42.5 });
    expect(calls[1].init.method).toBe("GET");
    expect(calls[1].url).toBe(`${CHATBOTS_AFRICA_BASE}/wallet/balance?apikey=test-key`);
    expect(calls[1].body).toBe(null);
});

test("missing config answers not_configured without calling out or recording", async () => {
    const { provider, calls, records } = harness({}, null);
    expect(await provider.sendText("0241234567", "hi")).toEqual({ ok: false, code: "not_configured" });
    expect(await provider.balance()).toEqual({ ok: false, code: "not_configured" });
    expect(calls).toHaveLength(0);
    expect(records).toHaveLength(0);
});

test("provider failures map to the shared result codes", async () => {
    expect(await harness({ status: 422, json: { errors: ["The destination field is required."] } }).provider.sendText("0241234567", "hi"))
        .toMatchObject({ ok: false, code: "invalid" });
    expect(await harness({ status: 401, json: { message: "Invalid apikey" } }).provider.sendText("0241234567", "hi"))
        .toMatchObject({ ok: false, code: "rejected" });
    expect(await harness({ status: 200, json: { status: false, message: "Insufficient wallet balance" } }).provider.sendText("0241234567", "hi"))
        .toMatchObject({ ok: false, code: "rejected" });
    expect(await harness({ throws: true }).provider.sendText("0241234567", "hi")).toEqual({ ok: false, code: "network" });
    // An undocumented success body still counts as sent, with no id.
    expect(await harness({ json: {} }).provider.sendText("0241234567", "hi")).toEqual({ ok: true, messageId: null });
});

test("an image goes as image_url with an optional caption, https only", async () => {
    const { provider, calls } = harness();
    await provider.sendImage("0241234567", "https://misstokyo.shop/api/whatsapp/media/product/x", "Lindsy Bodycon");
    expect(calls[0].url).toBe(`${CHATBOTS_AFRICA_BASE}/send/image`);
    expect(calls[0].body).toEqual({ apikey: "test-key", destination: "233241234567", image_url: "https://misstokyo.shop/api/whatsapp/media/product/x", caption: "Lindsy Bodycon" });
    expect(await provider.sendImage("0241234567", "http://insecure/x.jpg")).toMatchObject({ ok: false, code: "invalid" });
});

test("the message id comes from message.message_id, as a live send returned it", async () => {
    const { provider } = harness({ json: { success: true, channel: "whatsapp", message: { input: "0200000001", whatsapp_id: "233200000001", message_id: "wamid.TESTLIVE==", status: 200, message_status: "sent" } } });
    expect(await provider.sendText("0200000001", "hi")).toEqual({ ok: true, messageId: "wamid.TESTLIVE==" });
});
