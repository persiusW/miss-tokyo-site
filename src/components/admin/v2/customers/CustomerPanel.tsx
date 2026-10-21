"use client";

// One customer, over the list: Overview (spend, contact, wholesale, orders),
// Tags and notes, Activity. Wholesale access goes through the existing
// /api/admin/set-wholesale (owners and admins, checked there).
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
    Badge, Btn, BtnLink, Card, Empty, ErrorState, Field, FulBadge, Kpi, Modal, PayBadge, Panel, RowLink, SkeletonRows, TagEditor, TwoTap,
    firstName, fulKey, ghs, ghs0, initials, payKey, plural, toast, when,
} from "@/components/admin/ui";
import { displayPhone, normaliseOrderPhone } from "@/lib/phone";
import {
    cameFromPhrase, canDelete, cleanTags, displayName, orderRefOf, sinceText, wholesaleState,
} from "@/lib/admin/v2/customers";
import type { CustomerDetail } from "@/lib/admin/v2/customersLoad";
import { addNote, deleteCustomers, deleteNote, getCustomer, saveTags } from "./actions";

type Tab = "overview" | "notes" | "activity";
type Role = "admin" | "owner" | "sales_staff";

const phoneText = (p: string) => {
    const n = normaliseOrderPhone(p);
    return n ? displayPhone(n) : p;
};

export function CustomerPanel({ contactKey, role, meId, initial, onClose, onChanged }: {
    contactKey: string;
    role: Role;
    meId: string;
    initial: CustomerDetail | null | "error";
    onClose: () => void;
    onChanged: () => void;
}) {
    const [tab, setTab] = useState<Tab>("overview");
    const [detail, setDetail] = useState<CustomerDetail | null>(initial && initial !== "error" ? initial : null);
    const [knownTags, setKnownTags] = useState<string[]>([]);
    const [state, setState] = useState<"loading" | "ready" | "error" | "gone">(initial === "error" ? "error" : initial ? "ready" : "loading");
    const [wholesaleAsk, setWholesaleAsk] = useState(false);

    const load = useCallback(async () => {
        const res = await getCustomer(contactKey);
        if (res.ok) {
            setDetail(res.detail);
            setKnownTags(res.knownTags);
            setState("ready");
        } else {
            setState(res.error.includes("isn't in the list") ? "gone" : "error");
        }
    }, [contactKey]);

    // Always fetch once: the server copy has no tag suggestions, and a reopened panel may be stale.
    useEffect(() => { void load(); }, [load]);

    const changed = () => { void load(); onChanged(); };

    if (!detail) {
        return (
            <Panel open wide onClose={onClose} title={state === "gone" ? "Customer not found" : "Customer"} label="Customer">
                {state === "loading" && <SkeletonRows n={5} cols={3} />}
                {state === "error" && <ErrorState what="this customer" onRetry={() => { setState("loading"); void load(); }} />}
                {state === "gone" && <Empty icon="customers" title="This customer isn't in the list" body="They may have been deleted, or the link has a typing mistake. Search the list by name, email or phone."
                    action={<Btn onClick={onClose}>Back to customers</Btn>} />}
            </Panel>
        );
    }

    const r = detail.row;
    const name = displayName(r);
    const ws = wholesaleState(r);
    const canWholesale = role === "owner" || role === "admin";
    const sub = [r.location, sinceText(r.first_seen), `Came from ${cameFromPhrase(r.came_from)}`].filter(Boolean).join(" · ");

    const remove = async () => {
        const res = await deleteCustomers([r.contact_key]);
        if (!res.ok) { toast.error(res.error); return; }
        if (!res.deleted) { toast.error("Only customers the team added who have never ordered can be deleted."); return; }
        toast.success(`${name} deleted`);
        // Close first: a refresh started before the URL changes would reopen this panel.
        onClose();
        onChanged();
    };

    return (
        <>
            <Panel open wide onClose={onClose} label={`Customer ${name}`}
                head={
                    <div className="hrow" style={{ marginBottom: 8 }}>
                        <span className="avatar lg" aria-hidden="true">{initials(name)}</span>
                        <div className="hrow-sm wrap">
                            {r.wholesale && <Badge tone="info">Wholesale</Badge>}
                            {r.tags.map(t => <Badge key={t} plain>{t}</Badge>)}
                        </div>
                    </div>
                }
                title={name} sub={sub}
                tabs={[{ v: "overview", l: "Overview" }, { v: "notes", l: "Tags and notes", c: detail.notes.length || null }, { v: "activity", l: "Activity" }]}
                tab={tab} onTab={setTab}
                footerLeft={canDelete(r) ? <TwoTap label="Delete customer" onConfirm={remove} /> : undefined}
                footer={<>
                    {detail.chatId && <BtnLink icon="wa" href={`/inbox?c=${detail.chatId}`}>WhatsApp</BtnLink>}
                    <BtnLink kind="primary" icon="plus" href={`/till?customer=${encodeURIComponent(r.email)}`}>Create order</BtnLink>
                </>}>
                {tab === "overview" && <Overview d={detail} ws={ws} canWholesale={canWholesale} onWholesale={() => setWholesaleAsk(true)} />}
                {tab === "notes" && <TagsAndNotes d={detail} knownTags={knownTags} role={role} meId={meId} onChanged={changed} />}
                {tab === "activity" && <Activity d={detail} />}
            </Panel>
            {wholesaleAsk && r.profile_id && (
                <WholesaleModal name={name} on={ws === "on"} profileId={r.profile_id} onClose={() => setWholesaleAsk(false)}
                    onDone={() => { setWholesaleAsk(false); changed(); }} />
            )}
        </>
    );
}

function Overview({ d, ws, canWholesale, onWholesale }: { d: CustomerDetail; ws: ReturnType<typeof wholesaleState>; canWholesale: boolean; onWholesale: () => void }) {
    const r = d.row;
    return (
        <>
            <div className="grid-3">
                <Kpi label="Spent" value={<span className="nowrap">{ghs0(r.spent)}</span>} ctx={r.orders ? `across ${plural(r.orders, "paid order")}` : "no paid orders yet"} />
                <Kpi label="Average order" value={<span className="nowrap">{r.avg_order != null ? ghs0(r.avg_order) : "—"}</span>} ctx="paid orders only" />
                <Kpi label="Last order" value={<span className="cust-kpi-sm">{r.last_order_at ? when(r.last_order_at) : "—"}</span>}
                    ctx={d.lastPaidRef ? `#${d.lastPaidRef.toUpperCase()}` : "No paid orders yet"} />
            </div>
            <div className="grid-2">
                <div className="inset stack-sm">
                    <div className="section-t">Contact</div>
                    <div className="sm cust-contact">
                        <a href={`mailto:${r.email}`}>{r.email}</a>
                        {r.phone ? <a href={`tel:${normaliseOrderPhone(r.phone) ? `+${normaliseOrderPhone(r.phone)}` : r.phone}`}>{phoneText(r.phone)}</a> : <span className="muted">No phone number</span>}
                        {d.address && <span>{d.address}</span>}
                    </div>
                    <div className="sm muted">{r.marketing ? "Agreed to marketing email" : "Doesn't get marketing email"}</div>
                </div>
                <div className="inset stack-sm">
                    <div className="section-t">Wholesale</div>
                    {ws === "on" && <div className="sm">Sees wholesale prices and wholesale-only products in the shop.</div>}
                    {ws === "off" && <div className="sm">Pays retail prices.</div>}
                    {ws === "no_account" && <div className="sm">Pays retail prices. Wholesale prices need a shop account: ask them to sign up with {r.email}, then come back here.</div>}
                    {ws === "staff" && <div className="sm">This is a team member&apos;s account. Team roles are changed in Staff.</div>}
                    {(ws === "on" || ws === "off") && (canWholesale
                        ? <div><Btn sm onClick={onWholesale}>{ws === "on" ? "Remove wholesale access" : "Give wholesale access"}</Btn></div>
                        : <div className="xs muted">Owners and admins can change this.</div>)}
                </div>
            </div>
            <Card inset title="Orders">
                {d.orders.length === 0 ? (
                    <div className="card-body muted sm">No orders yet. Orders placed with {r.email} appear here.</div>
                ) : (
                    <div className="rows">
                        {d.orders.map(o => {
                            const pk = payKey(o);
                            return (
                                <RowLink key={o.id} href={`/orders/${o.id}`}>
                                    <div className="row-main">
                                        <div className="row-title">{orderRefOf(o)}</div>
                                        <div className="row-sub">{when(o.created_at)} · {plural(o.items, "item")}{o.discount_code ? ` · code ${o.discount_code}` : ""}</div>
                                    </div>
                                    {pk === "paid" ? <FulBadge s={fulKey(o)} pickup={(o.delivery_method || "").includes("pick")} /> : <PayBadge s={pk} />}
                                    <span className="strong nowrap">{ghs(o.total_amount)}</span>
                                </RowLink>
                            );
                        })}
                        {d.orders.length >= 200 && <div className="card-body xs muted">Showing the latest 200 orders.</div>}
                    </div>
                )}
            </Card>
        </>
    );
}

function TagsAndNotes({ d, knownTags, role, meId, onChanged }: { d: CustomerDetail; knownTags: string[]; role: Role; meId: string; onChanged: () => void }) {
    const r = d.row;
    const [tags, setTags] = useState(r.tags);
    const [note, setNote] = useState("");
    const [saving, setSaving] = useState(false);
    useEffect(() => { setTags(r.tags); }, [r.tags]);

    const save = async (next: string[]) => {
        const clean = cleanTags(next, knownTags);
        setTags(clean);
        const res = await saveTags(r.contact_key, clean);
        if (!res.ok) { toast.error(res.error); setTags(r.tags); return; }
        setTags(res.tags);
        onChanged();
    };
    const suggestions = knownTags.filter(t => !tags.some(x => x.toLowerCase() === t.toLowerCase())).slice(0, 12);

    const add = async () => {
        setSaving(true);
        const res = await addNote(r.contact_key, note);
        setSaving(false);
        if (!res.ok) { toast.error(res.error); return; }
        setNote("");
        toast.success("Note added");
        onChanged();
    };
    const drop = async (id: string) => {
        const res = await deleteNote(id);
        if (!res.ok) { toast.error(res.error); return; }
        toast.success("Note removed");
        onChanged();
    };

    return (
        <>
            <div className="stack-sm">
                <TagEditor label="Tags" values={tags} onChange={v => void save(v)} placeholder="Add tag" />
                {suggestions.length > 0 && (
                    <div className="hrow-sm wrap" aria-label="Tags already in use">
                        <span className="xs muted">In use:</span>
                        {suggestions.map(t => <Btn key={t} sm kind="ghost" icon="plus" onClick={() => void save([...tags, t])}>{t}</Btn>)}
                    </div>
                )}
                <div className="help">Use tags to group customers, for example VIP or Stylist. Each tag becomes a filter on the customer list; VIP has its own chip.</div>
            </div>
            <div className="stack-sm">
                <Field label="Private note" htmlFor="cust-note" help="Only your team sees notes. They're kept with the customer, not an order.">
                    <textarea id="cust-note" className="textarea" maxLength={2000} value={note} onChange={e => setNote(e.target.value)} placeholder="e.g. Prefers fittings on Saturday mornings" />
                </Field>
                <div><Btn sm kind="primary" disabled={!note.trim() || saving} onClick={add}>{saving ? "Adding…" : "Add note"}</Btn></div>
                {d.notes.length === 0
                    ? <div className="sm muted">No notes yet. Notes you add appear here, newest first, with who wrote them.</div>
                    : d.notes.map(n => (
                        <div className="inset" key={n.id}>
                            <div className="sm" style={{ whiteSpace: "pre-wrap" }}>{n.body}</div>
                            <div className="hrow-sm cust-note-foot">
                                <span className="xs muted grow">{n.author} · {when(n.created_at)}</span>
                                {(n.author_id === meId || role !== "sales_staff") && <TwoTap sm kind="ghost" label="Remove" armed="Tap again to remove" onConfirm={() => void drop(n.id)} />}
                            </div>
                        </div>
                    ))}
            </div>
        </>
    );
}

function Activity({ d }: { d: CustomerDetail }) {
    if (d.activity.length === 0) {
        return <Empty icon="clock" title="Nothing yet" body="Orders, WhatsApp chats, contact forms, custom requests and invoices for this customer appear here." />;
    }
    return (
        <div className="tl">
            {d.activity.map((a, i) => (
                <div className="tl-item" key={i}>
                    <span className={`tl-dot ${a.tone}`} />
                    <div>
                        <div>{a.href ? <Link href={a.href}>{a.text}</Link> : a.text}</div>
                        <div className="xs muted">{when(a.at)}</div>
                    </div>
                </div>
            ))}
        </div>
    );
}

function WholesaleModal({ name, on, profileId, onClose, onDone }: { name: string; on: boolean; profileId: string; onClose: () => void; onDone: () => void }) {
    const [busy, setBusy] = useState(false);
    const first = firstName(name) || name;
    const go = async () => {
        setBusy(true);
        try {
            const res = await fetch("/api/admin/set-wholesale", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId: profileId, action: on ? "revoke" : "promote" }),
            });
            const data = await res.json().catch(() => null);
            if (!res.ok) { toast.fromResponse(data, { audience: "staff" }); return; }
            toast.success(on ? `${name} is back on retail prices` : `${name} now sees wholesale prices`);
            onDone();
        } catch {
            toast.error("Couldn't reach the server. Nothing was changed. Please try again.");
        } finally {
            setBusy(false);
        }
    };
    return (
        <Modal open onClose={onClose} title={on ? "Remove wholesale access?" : "Give wholesale access?"}
            footer={<><Btn kind="ghost" onClick={onClose} disabled={busy}>Cancel</Btn><Btn kind="primary" onClick={go} disabled={busy}>{busy ? "Saving…" : on ? "Remove access" : "Give access"}</Btn></>}>
            <p className="ink2">
                {on
                    ? `${first} will see retail prices from their next visit, and wholesale-only products are hidden from them. Orders already placed keep their prices. We tell them by email.`
                    : `${first} will see wholesale prices and wholesale-only products when they're signed in to their shop account. We tell them by email, and by text message if their account has a phone number.`}
            </p>
        </Modal>
    );
}
