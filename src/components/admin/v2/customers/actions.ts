"use server";

// Customers server actions. Server actions are public endpoints that run on
// the service role, so each one checks the caller's role itself; customer data
// is personal and only staff may read or change it. Wholesale access is
// changed through /api/admin/set-wholesale (owners and admins), unchanged.
import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { logActivity } from "@/lib/utils/logActivity";
import { logCause } from "@/lib/errors/apiError";
import {
    IMPORT_MAX, canDelete, cleanTags, contactKey, displayName, exportCsv, ilikeExact, parseListQuery, tagDiff,
    type ImportRow, type ListQuery,
} from "@/lib/admin/v2/customers";
import { loadAllMatching, loadCustomerDetail, loadCustomerRow, loadKnownTags, type CustomerDetail } from "@/lib/admin/v2/customersLoad";

type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string };
type Me = { userId: string; role: "admin" | "owner" | "sales_staff" };

const db = supabaseAdmin as any;
const STAFF = ["admin", "owner", "sales_staff"];
const DENIED = { ok: false as const, error: "Only the shop's team can see customers. Please sign in again." };
const FAILED = "We couldn't do that just now. Nothing was changed. Please try again.";
const GONE = "That customer isn't in the list any more. Please refresh.";

async function caller(): Promise<Me | null> {
    const sb = await createClient();
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return null;
    const { data: profile } = await supabaseAdmin.from("profiles").select("role").eq("id", user.id).single();
    const role = profile?.role as Me["role"] | undefined;
    if (!role || !STAFF.includes(role)) return null;
    return { userId: user.id, role };
}

const refresh = () => revalidatePath("/customers", "layout");

/** One customer's panel. */
export async function getCustomer(email: string): Promise<Result<{ detail: CustomerDetail; knownTags: string[] }>> {
    const me = await caller();
    if (!me) return DENIED;
    const key = contactKey(email);
    if (!key) return { ok: false, error: GONE };
    try {
        const [detail, knownTags] = await Promise.all([loadCustomerDetail(key), loadKnownTags()]);
        if (!detail) return { ok: false, error: GONE };
        return { ok: true, detail, knownTags };
    } catch (e) {
        logCause("GEN-00", e, { where: "customers.get" });
        return { ok: false, error: "We couldn't load this customer. Please try again." };
    }
}

/** Add someone who shops in person or by phone (contacts, source manual). */
export async function addCustomer(input: { name: string; email: string; phone: string; marketing: boolean }): Promise<{ ok: true; key: string } | { ok: false; error: string; existing?: string }> {
    const me = await caller();
    if (!me) return DENIED;
    const name = String(input?.name ?? "").replace(/\s+/g, " ").trim().slice(0, 120);
    const key = contactKey(input?.email);
    const phone = String(input?.phone ?? "").trim().slice(0, 40) || null;
    if (!name) return { ok: false, error: "Add their name." };
    if (!key) return { ok: false, error: "Add an email address like name@example.com. It keeps their orders and messages together." };
    try {
        const existing = await loadCustomerRow(key);
        if (existing) return { ok: false, error: `${displayName(existing)} is already a customer.`, existing: key };
        const { error } = await db.from("contacts").insert({ name, email: key, phone, source: "manual", subscribed_status: input?.marketing === true });
        if (error) throw error;
    } catch (e) {
        logCause("GEN-00", e, { where: "customers.add" });
        return { ok: false, error: FAILED };
    }
    after(() => logActivity({ userId: me.userId, userRole: me.role, actionType: "CREATE", resource: "customer", resourceId: key, details: { name } }));
    refresh();
    return { ok: true, key };
}

/**
 * Delete customers the team added (by hand or import) who have never placed an
 * order, as the old list allowed. Their contact rows go; tags and notes go too
 * when nothing else (an account, a newsletter sign-up, a message) keeps them
 * in the list. Anyone else is skipped and counted.
 */
export async function deleteCustomers(emails: string[]): Promise<Result<{ deleted: number; skipped: number }>> {
    const me = await caller();
    if (!me) return DENIED;
    const keys = [...new Set((Array.isArray(emails) ? emails : []).map(contactKey).filter(Boolean) as string[])].slice(0, 200);
    if (!keys.length) return { ok: true, deleted: 0, skipped: 0 };
    let deleted = 0;
    let skipped = 0;
    try {
        for (const key of keys) {
            const row = await loadCustomerRow(key);
            if (!row || !canDelete(row)) { skipped++; continue; }
            const { error } = await db.from("contacts").delete().ilike("email", ilikeExact(key));
            if (error) throw error;
            if (!row.has_other_sources) {
                const [t, n] = await Promise.all([
                    db.from("contact_tags").delete().eq("contact_key", key),
                    db.from("contact_notes").delete().eq("contact_key", key),
                ]);
                if (t.error) throw t.error;
                if (n.error) throw n.error;
            }
            deleted++;
            after(() => logActivity({ userId: me.userId, userRole: me.role, actionType: "DELETE", resource: "customer", resourceId: key, details: { name: displayName(row) } }));
        }
    } catch (e) {
        logCause("GEN-00", e, { where: "customers.delete", done: deleted });
        return { ok: false, error: deleted ? `${deleted} deleted, then something went wrong. Please refresh and try the rest again.` : FAILED };
    }
    refresh();
    return { ok: true, deleted, skipped };
}

/** Replace a customer's tags. */
export async function saveTags(email: string, tags: string[]): Promise<Result<{ tags: string[] }>> {
    const me = await caller();
    if (!me) return DENIED;
    const key = contactKey(email);
    if (!key) return { ok: false, error: GONE };
    try {
        const [row, known] = await Promise.all([loadCustomerRow(key), loadKnownTags()]);
        if (!row) return { ok: false, error: GONE };
        const next = cleanTags(Array.isArray(tags) ? tags : [], known);
        const { add, remove } = tagDiff(row.tags, next);
        if (remove.length) {
            const { error } = await db.from("contact_tags").delete().eq("contact_key", key).in("tag", remove);
            if (error) throw error;
        }
        if (add.length) {
            const { error } = await db.from("contact_tags").upsert(add.map(tag => ({ contact_key: key, tag, created_by: me.userId })), { onConflict: "contact_key,tag", ignoreDuplicates: true });
            if (error) throw error;
        }
        refresh();
        return { ok: true, tags: (await loadCustomerRow(key))?.tags ?? next };
    } catch (e) {
        logCause("GEN-00", e, { where: "customers.tags" });
        return { ok: false, error: "We couldn't save the tags. Nothing was changed. Please try again." };
    }
}

/** Add a private note (only the team sees notes). */
export async function addNote(email: string, body: string): Promise<Result> {
    const me = await caller();
    if (!me) return DENIED;
    const key = contactKey(email);
    const text = String(body ?? "").trim().slice(0, 2000);
    if (!key) return { ok: false, error: GONE };
    if (!text) return { ok: false, error: "Write the note first." };
    try {
        if (!(await loadCustomerRow(key))) return { ok: false, error: GONE };
        const { error } = await db.from("contact_notes").insert({ contact_key: key, body: text, author: me.userId });
        if (error) throw error;
        return { ok: true };
    } catch (e) {
        logCause("GEN-00", e, { where: "customers.note.add" });
        return { ok: false, error: "We couldn't save the note. Please try again." };
    }
}

/** Remove a note: the person who wrote it, or an owner or admin. */
export async function deleteNote(id: string): Promise<Result> {
    const me = await caller();
    if (!me) return DENIED;
    if (!/^[0-9a-f-]{36}$/i.test(String(id ?? ""))) return { ok: false, error: FAILED };
    try {
        const { data: note, error: readErr } = await db.from("contact_notes").select("id, author").eq("id", id).maybeSingle();
        if (readErr) throw readErr;
        if (!note) return { ok: true };
        if (note.author !== me.userId && me.role === "sales_staff") return { ok: false, error: "Only the person who wrote a note, or an owner or admin, can remove it." };
        const { error } = await db.from("contact_notes").delete().eq("id", id);
        if (error) throw error;
        return { ok: true };
    } catch (e) {
        logCause("GEN-00", e, { where: "customers.note.delete" });
        return { ok: false, error: FAILED };
    }
}

/**
 * Add the rows of an imported CSV (mapped in the browser by mapImport, checked
 * again here) as contacts with source "imported". Emails already in contacts
 * are left as they are.
 */
export async function importCustomers(rows: ImportRow[]): Promise<Result<{ added: number; existing: number }>> {
    const me = await caller();
    if (!me) return DENIED;
    const clean: ImportRow[] = [];
    const seen = new Set<string>();
    for (const r of (Array.isArray(rows) ? rows : []).slice(0, IMPORT_MAX)) {
        const email = contactKey(r?.email);
        if (!email || seen.has(email)) continue;
        seen.add(email);
        clean.push({
            email,
            name: String(r.name ?? "").replace(/\s+/g, " ").trim().slice(0, 120),
            phone: r.phone ? String(r.phone).trim().slice(0, 40) : null,
            address: r.address ? String(r.address).trim().slice(0, 300) : null,
            marketing: r.marketing === true,
        });
    }
    if (!clean.length) return { ok: false, error: "No rows with an email address were found. Check the file has an Email column." };
    try {
        const have = new Set<string>();
        for (let offset = 0; offset < 200_000; offset += 1000) {
            const { data, error } = await db.from("contacts").select("email").order("id").range(offset, offset + 999);
            if (error) throw error;
            for (const c of data ?? []) have.add(String(c.email).toLowerCase());
            if ((data ?? []).length < 1000) break;
        }
        const fresh = clean.filter(r => !have.has(r.email));
        for (let i = 0; i < fresh.length; i += 500) {
            const { error } = await db.from("contacts").insert(fresh.slice(i, i + 500).map(r => ({
                name: r.name, email: r.email, phone: r.phone, address: r.address, source: "imported", subscribed_status: r.marketing,
            })));
            if (error) throw error;
        }
        if (fresh.length) after(() => logActivity({ userId: me.userId, userRole: me.role, actionType: "CREATE", resource: "customer", details: { imported: fresh.length } }));
        refresh();
        return { ok: true, added: fresh.length, existing: clean.length - fresh.length };
    } catch (e) {
        logCause("GEN-00", e, { where: "customers.import" });
        return { ok: false, error: "The import didn't finish. Some rows may have been added; check the list, then import the file again. Rows already added are skipped." };
    }
}

/** The list as CSV: everyone the filters match, or only the customers picked. */
export async function exportCustomers(search: string, emails?: string[]): Promise<Result<{ csv: string; count: number }>> {
    const me = await caller();
    if (!me) return DENIED;
    const q: ListQuery = parseListQuery(new URLSearchParams(String(search ?? "")));
    const keys = emails ? [...new Set(emails.map(contactKey).filter(Boolean) as string[])].slice(0, 5000) : undefined;
    try {
        const rows = await loadAllMatching(q, keys);
        return { ok: true, csv: exportCsv(rows), count: rows.length };
    } catch (e) {
        logCause("GEN-00", e, { where: "customers.export" });
        return { ok: false, error: "The export didn't finish. Please try again." };
    }
}
