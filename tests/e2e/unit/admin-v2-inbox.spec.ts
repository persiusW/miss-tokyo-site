import { test, expect } from "@playwright/test";
import fs from "fs";
import path from "path";
import {
    REQUEST_STATUSES, chatItem, contactReplyEmail, contactReplyEvent, filtersFor, formItem, inFilter, isRequestStatus, parseKey,
    questionItem, replyText, requestChoices, requestItem, sortItems, windowLeft, type FormRow, type QuestionRow, type RequestRow,
} from "../../../src/lib/admin/v2/inbox";
import { shapeConversation, type ConversationRow } from "../../../src/lib/whatsapp/inbox";
import { FLAGS_ALL, FLAGS_OFF, V2_READY_AREAS, v2Redirect } from "../../../src/lib/admin/v2/routeMap";

// Admin v2 Inbox: one list for WhatsApp chats, contact forms, custom requests
// and questions for admin. Pure: no database.

const ROOT = path.resolve(__dirname, "../../..");
const ID = "c90ace37-332e-4947-8601-a841661ad450";
const NOW = Date.parse("2026-10-21T12:00:00Z");
const iso = (msAgo: number) => new Date(NOW - msAgo).toISOString();

const form = (o: Partial<FormRow> = {}): FormRow => ({
    id: ID, first_name: "Ama", last_name: "Mensah", email: "ama@example.com", topic: "Delivery", order_number: null,
    message: "Where is my parcel?\nThanks", status: "unread", submitted_at: iso(3600_000), replied_at: null, ...o,
});
const request = (o: Partial<RequestRow> = {}): RequestRow => ({
    id: ID, customer_name: "Efua", customer_email: "efua@example.com", customizations: { strap_color: "Tan", sole_tone: "" },
    status: "inquiry", details: "Slides in tan", reference_product: null, created_at: iso(7200_000), ...o,
});
const question = (o: Partial<QuestionRow> = {}): QuestionRow => ({
    id: ID, role: "sales_staff", question: "Can she pay half?", excerpt: [], page_path: "/pos", status: "open", answer: null,
    answered_at: null, saved_answer_id: null, created_at: iso(600_000), asker: "Abena", ...o,
});
const conv = (o: Partial<ConversationRow> = {}): ConversationRow => ({
    id: ID, wa_phone_number: "233241234567", wa_contact_name: null, state: { reason: "customer_asked" },
    handed_off_at: iso(5 * 3600_000), dealt_with_at: null, last_message_at: iso(60_000), last_inbound_at: iso(60_000), created_at: iso(86_400_000), ...o,
});

test("a conversation key is <source>:<id>; a bare id is a WhatsApp chat, as the old inbox linked them", () => {
    expect(parseKey(`form:${ID}`)).toEqual({ source: "form", id: ID });
    expect(parseKey(`ai:${ID}`)).toEqual({ source: "ai", id: ID });
    expect(parseKey(ID)).toEqual({ source: "whatsapp", id: ID });
    expect(parseKey("form:not-a-uuid")).toBeNull();
    expect(parseKey(`orders:${ID}`)).toBeNull();
    expect(parseKey(null)).toBeNull();
});

test("custom requests show only while switched on, questions for admin only to the admin", () => {
    expect(filtersFor("admin", true)).toEqual(["needs", "all", "whatsapp", "form", "request", "ai"]);
    expect(filtersFor("owner", true)).toEqual(["needs", "all", "whatsapp", "form", "request"]);
    expect(filtersFor("sales_staff", false)).toEqual(["needs", "all", "whatsapp", "form"]);
});

test("needs a person matches the side-nav rules for every source", () => {
    expect(formItem(form()).needs).toBe(true);
    expect(formItem(form({ status: "read" }))).toMatchObject({ needs: false, done: false, status: "Read" });
    expect(formItem(form({ status: "replied" }))).toMatchObject({ needs: false, done: true });
    expect(requestItem(request()).needs).toBe(true);
    expect(requestItem(request({ status: "new" })).needs).toBe(true);
    expect(requestItem(request({ status: null })).needs).toBe(true);
    expect(requestItem(request({ status: "production" }))).toMatchObject({ needs: false, done: false, status: "Production" });
    expect(requestItem(request({ status: "cancelled" })).done).toBe(true);
    expect(questionItem(question()).needs).toBe(true);
    expect(questionItem(question({ status: "dismissed" }))).toMatchObject({ needs: false, done: true });
    const chat = chatItem(shapeConversation(conv(), null, NOW));
    expect(chat).toMatchObject({ key: `whatsapp:${ID}`, needs: true, name: "0241234567" });
    const dealt = chatItem(shapeConversation(conv({ dealt_with_at: iso(30_000) }), null, NOW));
    expect(dealt).toMatchObject({ needs: false, done: true });
    expect(chatItem(shapeConversation(conv({ handed_off_at: null }), null, NOW)).status).toBe("With the assistant");
});

test("every status the old Custom Requests page had is still offered", () => {
    expect(REQUEST_STATUSES.map(s => s.v)).toEqual(["inquiry", "material_confirmation", "production", "completed", "cancelled"]);
    expect(isRequestStatus("production")).toBe(true);
    expect(isRequestStatus("deleted")).toBe(false);
    expect(requestChoices(request())).toEqual(["Strap color: Tan"]);
    expect(requestChoices(request({ customizations: null }))).toEqual([]);
});

test("chips filter by source, and what waits comes first, longest wait first", () => {
    const items = [
        { ...formItem(form({ status: "read" })), key: "a" },
        { ...formItem(form({ submitted_at: iso(60_000) })), key: "b" },
        { ...questionItem(question({ created_at: iso(9_000_000) })), key: "c" },
    ];
    expect(sortItems(items).map(i => i.key)).toEqual(["c", "b", "a"]);
    expect(items.filter(i => inFilter(i, "needs")).map(i => i.key)).toEqual(["b", "c"]);
    expect(items.filter(i => inFilter(i, "ai")).map(i => i.key)).toEqual(["c"]);
    expect(items.filter(i => inFilter(i, "all"))).toHaveLength(3);
});

test("the 24-hour WhatsApp window says how long is left", () => {
    expect(windowLeft(iso(3600_000), NOW)).toBe("another 23 hours");
    expect(windowLeft(iso(24 * 3600_000 - 40 * 60_000), NOW)).toBe("another 40 minutes");
    expect(windowLeft(iso(24 * 3600_000 + 1), NOW)).toBeNull();
    expect(windowLeft(null, NOW)).toBeNull();
    expect(shapeConversation(conv(), null, NOW).lastInboundAt).toBe(iso(60_000));
});

test("the contact-form reply escapes what staff type and quotes the customer's message", () => {
    const m = contactReplyEmail({ firstName: "Ama", reply: "Yes <b>today</b> & tomorrow", message: "Where is it?", storeName: "Miss Tokyo" });
    expect(m.subject).toBe("Re: your Miss Tokyo enquiry");
    expect(m.html).toContain("Yes &lt;b&gt;today&lt;/b&gt; &amp; tomorrow");
    expect(m.html).not.toContain("<b>today</b>");
    expect(m.text).toContain("> Where is it?");
    // What the inbox shows back is the email as notification_log keeps it (as text), minus the quote.
    const shown = replyText("Hi Ama,\nYes <b>today</b> & tomorrow\nMiss Tokyo\nYour message:\nWhere is it?");
    expect(shown).toContain("Yes <b>today</b> & tomorrow");
    expect(shown).not.toContain("Where is it?");
    expect(contactReplyEvent(ID).length).toBeLessThanOrEqual(80);
});

test("the inbox is built and its old URLs go forward and back", () => {
    expect(V2_READY_AREAS).toContain("inbox");
    expect(v2Redirect("/customers/whatsapp", `c=${ID}`, FLAGS_ALL)).toBe(`/inbox?c=${ID}`);
    expect(v2Redirect("/customers/whatsapp/teach", "", FLAGS_ALL)).toBe("/inbox/teach");
    expect(v2Redirect("/customers/forms", "", FLAGS_ALL)).toBe("/inbox?f=form");
    expect(v2Redirect("/customers/requests", "", FLAGS_ALL)).toBe("/inbox?f=request");
    expect(v2Redirect("/ai/inbox", "", FLAGS_ALL)).toBe("/inbox?f=ai");
    expect(v2Redirect("/inbox", "", FLAGS_OFF)).toBe("/customers/whatsapp");
    expect(v2Redirect("/inbox/teach", "", FLAGS_OFF)).toBe("/customers/whatsapp/teach");
});

test("the flashcard count function is closed to the browser roles", () => {
    const dir = path.join(ROOT, "supabase", "migrations");
    const file = fs.readdirSync(dir).find(f => f.endsWith("_flashcard_coverage.sql"));
    expect(file).toBeTruthy();
    const sql = fs.readFileSync(path.join(dir, file!), "utf8");
    expect(sql).toMatch(/revoke execute on function public\.fn_flashcard_coverage\(\) from public, anon, authenticated/);
    expect(sql).not.toMatch(/\bdrop\b/i);
    expect(sql).not.toMatch(/security definer/i);
});
