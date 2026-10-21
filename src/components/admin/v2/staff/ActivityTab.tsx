"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Badge, Btn, Card, Empty, ErrorState, Pager, Select, initials, when } from "@/components/admin/ui";
import type { ActivityFilters, ActivityItem, StaffMember } from "./data";
import { ACTION_FILTERS, ACTIVITY_PAGE, changedFields, roleLabel } from "./staffCopy";

function hrefFor(path: string, f: ActivityFilters, patch: Partial<ActivityFilters>): string {
    const n = { ...f, ...patch };
    const q = new URLSearchParams();
    if (n.who) q.set("who", n.who);
    if (n.action) q.set("action", n.action);
    if (n.date) q.set("date", n.date);
    if (n.page > 1) q.set("page", String(n.page));
    const s = q.toString();
    return s ? `${path}?${s}` : path;
}

/** "from → to" for each changed field; long values are cut short. */
function short(v: unknown): string {
    if (v === null || v === undefined || v === "") return "empty";
    if (Array.isArray(v)) return v.length ? v.map(x => (typeof x === "object" ? "…" : String(x))).join(", ").slice(0, 60) : "empty";
    if (typeof v === "object") return "a set of values";
    const t = String(v);
    return t.length > 60 ? `${t.slice(0, 57)}…` : t;
}

const HIDDEN_KEYS = new Set(["changes", "resource_name", "logged_at", "action", "sessionId"]);

function Details({ d }: { d: Record<string, unknown> }) {
    const changes = d.changes && typeof d.changes === "object" ? Object.entries(d.changes as Record<string, { from?: unknown; to?: unknown }>) : [];
    const rest = Object.entries(d).filter(([k, v]) => !HIDDEN_KEYS.has(k) && v != null && v !== "");
    if (!changes.length && !rest.length) return null;
    return (
        <dl className="dl stf-details">
            {changes.map(([k, c]) => (
                <div key={k} style={{ display: "contents" }}>
                    <dt>{k.replace(/_/g, " ")}</dt>
                    <dd>{short(c?.from)} → <span className="strong">{short(c?.to)}</span></dd>
                </div>
            ))}
            {!changes.length && rest.map(([k, v]) => (
                <div key={k} style={{ display: "contents" }}>
                    <dt>{k.replace(/_/g, " ")}</dt>
                    <dd>{short(v)}</dd>
                </div>
            ))}
        </dl>
    );
}

function hasDetails(d: Record<string, unknown> | null): boolean {
    if (!d) return false;
    if (d.changes && typeof d.changes === "object" && Object.keys(d.changes).length) return true;
    return Object.entries(d).some(([k, v]) => !HIDDEN_KEYS.has(k) && v != null && v !== "");
}

export function ActivityTab({ items, hasMore, failed, filters, members }: { items: ActivityItem[]; hasMore: boolean; failed: boolean; filters: ActivityFilters; members: StaffMember[] }) {
    const router = useRouter();
    const path = usePathname();
    const [open, setOpen] = useState<string | null>(null);
    const go = (patch: Partial<ActivityFilters>) => router.push(hrefFor(path, filters, { page: 1, ...patch }), { scroll: false });
    const filtered = !!(filters.who || filters.action || filters.date);
    const groups = [...new Set(ACTION_FILTERS.map(a => a.group))];
    const first = (filters.page - 1) * ACTIVITY_PAGE + 1;

    return (
        <Card>
            <div className="list-tools stf-tools">
                <label className="stf-filter">
                    <span className="label">Person</span>
                    <Select label="Person" value={filters.who || "all"} onChange={v => go({ who: v === "all" ? "" : v })}
                        options={[{ v: "all", l: "Everyone" }, ...members.map(m => ({ v: m.id, l: m.deactivated ? `${m.name} (deactivated)` : m.name }))]} />
                </label>
                <label className="stf-filter">
                    <span className="label">Action</span>
                    <select className="select" aria-label="Action" value={filters.action || "all"} onChange={e => go({ action: e.target.value === "all" ? "" : e.target.value })}>
                        <option value="all">Every action</option>
                        {groups.map(g => (
                            <optgroup key={g} label={g}>
                                {ACTION_FILTERS.filter(a => a.group === g).map(a => <option key={a.v} value={a.v}>{a.l}</option>)}
                            </optgroup>
                        ))}
                    </select>
                </label>
                <label className="stf-filter">
                    <span className="label">Day</span>
                    <input type="date" className="input" aria-label="Day" value={filters.date} max={new Date().toISOString().slice(0, 10)}
                        onChange={e => go({ date: e.target.value })} />
                </label>
                {filtered && <Btn sm kind="ghost" onClick={() => go({ who: "", action: "", date: "" })}>Clear filters</Btn>}
            </div>
            {failed ? <ErrorState what="the activity log" onRetry={() => router.refresh()} />
                : items.length === 0 ? (
                    <Empty icon="clock" title={filtered ? "Nothing matches these filters" : "No activity yet"}
                        body={filtered ? "Try another person, action or day." : "Sign-ins, order changes, discounts, product edits and staff changes show here as they happen."} />
                ) : (
                    <div className="rows">
                        {items.map(a => {
                            const can = hasDetails(a.details);
                            const isOpen = open === a.id;
                            const fields = changedFields(a.details?.changes);
                            const inner = (
                                <>
                                    <span className="avatar" aria-hidden="true">{initials(a.who)}</span>
                                    <div className="row-main">
                                        <div className="row-title" style={{ fontWeight: 500 }}><span className="strong">{a.who}</span> · {a.sentence}</div>
                                        <div className="row-sub">{when(a.at)} · {roleLabel(a.role)}{fields ? ` · Changed ${fields}` : ""}</div>
                                        {isOpen && a.details && <Details d={a.details} />}
                                    </div>
                                    <Badge plain>{a.area}</Badge>
                                </>
                            );
                            return can
                                ? <button type="button" key={a.id} className="row click stf-act" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : a.id)}>{inner}</button>
                                : <div key={a.id} className="row stf-act">{inner}</div>;
                        })}
                    </div>
                )}
            {!failed && (items.length > 0 || filters.page > 1) && (
                <Pager left={items.length ? `Showing ${first}–${first + items.length - 1}` : `Page ${filters.page}`}
                    prevHref={filters.page > 1 ? hrefFor(path, filters, { page: filters.page - 1 }) : null}
                    nextHref={hasMore ? hrefFor(path, filters, { page: filters.page + 1 }) : null} />
            )}
        </Card>
    );
}
