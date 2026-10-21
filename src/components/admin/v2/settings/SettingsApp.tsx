"use client";

// Settings home and section pages. The only place the explicit save model is
// used: edits stay in the draft until Save changes, the bar counts them, the
// nav dot and the leave guard come from the shell (setDirty / setDiscard),
// and each section saves in one server action and one transaction.
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { BtnLink, Btn, Card, Empty, Icon, PageHeader, Search, Select, UnsavedBar, plural, toast } from "@/components/admin/ui";
import { useAdminV2 } from "@/components/admin/shell/AdminV2Context";
import { useMissTokyoAi } from "@/lib/ai/missTokyoAi/client/store";
import { saveSettingsSection } from "./actions";
import { changedKeys, draftStore, useDraft } from "./draft";
import { AccountSection } from "./AccountSection";
import { AiUse, AssistantCards } from "./AssistantCards";
import { LegacyContent } from "./LegacyContent";
import { MessagePanel } from "./MessagePanel";
import { PushDevice, PushTemplate } from "./PushDevice";
import { RidersPanel } from "./RidersPanel";
import { RowControl } from "./RowControl";
import { MESSAGE_EVENTS, channelsLine, type MessageEvent } from "./messages";
import type { AiActivity, SettingsData } from "./load";
import {
    ANCHOR_SECTION, GROUPS, LEGACY_TAB_SECTION, rowId, searchSettings, valueKeys, visibleSections,
    type Row, type Section, type Val, type Values,
} from "./schema";
import "./settings.css";

type Props = { data: SettingsData; section: string | null; ai?: AiActivity | null; hl?: string | null; legacyTab?: string | null };

export function SettingsApp({ data, section, ai = null, hl = null, legacyTab = null }: Props) {
    const { setDirty, setDiscard, go, role } = useAdminV2();
    const router = useRouter();
    const draft = useDraft();
    const ctx = data.ctx;
    const aiKeys = useMemo(() => new Set(data.aiKeys), [data.aiKeys]);

    // What was just saved shows straight away, before the refreshed page arrives.
    const [overlay, setOverlay] = useState<Values>({});
    const [seen, setSeen] = useState(data.saved);
    if (seen !== data.saved) { setSeen(data.saved); setOverlay({}); }
    const saved = useMemo(() => ({ ...data.saved, ...overlay }), [data.saved, overlay]);
    const v = useMemo(() => ({ ...saved, ...draft }), [saved, draft]);

    const sections = useMemo(() => visibleSections(ctx), [ctx]);
    const sec = section ? sections.find(s => s.k === section) ?? null : null;

    const rowShown = (r: Row) => (!r.adminOnly || role === "admin") && (!r.k.startsWith("ai.") || aiKeys.has(r.k.slice(3)));
    const keysOf = (s: Section) => valueKeys(s, role).filter(k => !k.startsWith("ai.") || aiKeys.has(k.slice(3)));
    const dirtyBy = useMemo(() => {
        const m: Record<string, string[]> = {};
        for (const s of sections) m[s.k] = changedKeys(draft, saved, keysOf(s));
        return m;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sections, draft, saved, role, aiKeys]);
    const total = Object.values(dirtyBy).reduce((n, ks) => n + ks.length, 0);

    useEffect(() => { setDirty(total); }, [total, setDirty]);
    useEffect(() => {
        setDiscard(() => draftStore.clear());
        return () => {
            // Leaving Settings another way (the browser's back button) drops the draft too.
            setTimeout(() => { if (!window.location.pathname.startsWith("/settings")) { draftStore.clear(); setDirty(0); } }, 0);
        };
    }, [setDiscard, setDirty]);

    // Old links (?tab=store) and Miss Tokyo AI's "Show me" land on the matching section.
    const spotlight = useMissTokyoAi(s => s.spotlight);
    useEffect(() => {
        const fromTab = !section && legacyTab ? LEGACY_TAB_SECTION[legacyTab] : undefined;
        const fromAnchor = spotlight ? ANCHOR_SECTION[spotlight.anchor] : undefined;
        const target = fromAnchor ?? fromTab;
        if (target && target !== section && sections.some(s => s.k === target)) router.replace(`/settings/${target}`);
    }, [legacyTab, spotlight, section, sections, router]);

    // Jump to a row from search: it flashes amber and fades out over 2.6 s (admin-v2.css, .srow.hl).
    const [lit, setLit] = useState<string | null>(hl);
    useEffect(() => {
        setLit(hl);
        if (!hl) return;
        const t1 = setTimeout(() => document.getElementById(rowId(hl))?.scrollIntoView({ block: "center", behavior: "smooth" }), 80);
        const t2 = setTimeout(() => setLit(null), 2600);
        return () => { clearTimeout(t1); clearTimeout(t2); };
    }, [hl, section]);

    const [q, setQ] = useState("");
    const results = useMemo(() => (q.trim().length > 1 ? searchSettings(q, ctx) : null), [q, ctx]);
    const jump = (s: Section, r: Row) => { setQ(""); go(`/settings/${s.k}?hl=${encodeURIComponent(r.k)}`); };

    const set = (k: string, val: Val) => draftStore.set(k, val, saved[k]);
    const [saving, setSaving] = useState(false);
    const save = async (secKeys: string[]) => {
        setSaving(true);
        let n = 0, reload = false;
        for (const sk of secKeys) {
            const keys = dirtyBy[sk] ?? [];
            if (!keys.length) continue;
            const changes: Values = Object.fromEntries(keys.map(k => [k, draft[k]]));
            const res = await saveSettingsSection(sk, changes);
            if (!res.ok) { setSaving(false); toast.error(res.error); if (n) router.refresh(); return; }
            setOverlay(o => ({ ...o, ...changes }));
            draftStore.clear(keys);
            n += keys.length;
            if (sk === "rollout") reload = true;
        }
        setSaving(false);
        toast.success(`${plural(n, "change")} saved`);
        if (reload) window.location.reload(); else router.refresh();
    };
    const discard = (secKeys: string[]) => {
        draftStore.clear(secKeys.flatMap(k => dirtyBy[k] ?? []));
        toast.info("Changes discarded");
    };

    const [riders, setRiders] = useState(false);
    const [msg, setMsg] = useState<MessageEvent | null>(null);
    const waIds = useMemo(() => {
        try { return JSON.parse(String(saved["ai.whatsapp_status_template_ids"] || "{}")) as Record<string, string>; } catch { return {}; }
    }, [saved]);

    const searchBox = <Search value={q} onChange={setQ} placeholder="Search every setting" label="Search settings" />;
    const resultsCard = results && (
        <Card title={results.length ? `${plural(results.length, "setting")} match “${q.trim()}”` : `No settings match “${q.trim()}”`}>
            {results.length === 0
                ? <Empty icon="search" title="No settings match" body="Try another word, like delivery, fee, pickup or WhatsApp." />
                : <div className="rows">{results.slice(0, sec ? 8 : 40).map(({ sec: s, row }) => (
                    <button type="button" key={s.k + row.k} className="row click" onClick={() => jump(s, row)}>
                        <div className="row-main"><div className="row-title">{row.label}</div><div className="row-sub">{s.g} › {s.t}</div></div>
                        <Icon n="chev" style={{ width: 16, height: 16, color: "var(--ink-3)" }} />
                    </button>
                ))}</div>}
        </Card>
    );

    // ── Home ────────────────────────────────────────────────────────────────
    if (!section) {
        const dirtySecs = Object.keys(dirtyBy).filter(k => dirtyBy[k].length);
        return (
            <>
                <PageHeader title="Settings" sub="How the shop works. Each change is saved when you press Save changes."
                    actions={<BtnLink kind="ghost" icon="user" href="/settings/account">Your account</BtnLink>} />
                <div className="stack">
                    {searchBox}
                    {resultsCard || <SectionNav mode="cards" sections={sections} current={null} dirtyBy={dirtyBy} saved={saved} ctx={ctx} go={go} />}
                    <UnsavedBar count={total} saving={saving} onDiscard={() => discard(dirtySecs)} onSave={() => void save(dirtySecs)} />
                </div>
            </>
        );
    }

    if (!sec) {
        return (
            <>
                <PageHeader title="Settings" crumb="Settings" crumbHref="/settings" />
                <Card pad><Empty icon="settings" title="That section isn't here" body="It may have moved. Pick a section from Settings." action={<BtnLink href="/settings">Go to Settings</BtnLink>} /></Card>
            </>
        );
    }

    // ── Section ─────────────────────────────────────────────────────────────
    const mine = dirtyBy[sec.k] ?? [];
    const rows = sec.rows.filter(rowShown);
    const special = (r: Row) => {
        switch (r.type) {
            case "riders":
                return <Btn sm onClick={() => setRiders(true)}>Manage riders · {ctx.riders.active} of {ctx.riders.total} available</Btn>;
            case "messages":
                return (
                    <div className="stack-sm" style={{ width: "100%" }}>
                        {(["order", "other"] as const).map(g => (
                            <div key={g} className="card inset">
                                <div className="rows">{MESSAGE_EVENTS.filter(m => m.group === g).map(m => (
                                    <button type="button" key={m.key} className="row click" onClick={() => setMsg(m)}>
                                        <div className="row-main"><div className="row-title">{m.label}</div><div className="row-sub">{channelsLine(m)}</div></div>
                                        <Icon n="chev" style={{ width: 16, height: 16, color: "var(--ink-3)" }} />
                                    </button>
                                ))}</div>
                            </div>
                        ))}
                    </div>
                );
            case "aiuse": return <AiUse ai={ai} isAdmin={role === "admin"} />;
            case "push-device": return <PushDevice />;
            case "push-template":
                return <PushTemplate title={String(v["push.title"] ?? "")} body={String(v["push.body"] ?? "")} onBody={x => set("push.body", x)} setupMissing={!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY} />;
            default: return null;
        }
    };

    let body;
    if (sec.k === "account") body = <AccountSection name={ctx.me.name} email={ctx.me.email} />;
    else if (sec.k === "content") body = <LegacyContent />;
    else {
        const card = (
            <Card>
                <div className="rows">
                    {rows.filter(r => r.type !== "assistant-cards").map(r => (
                        <RowControl key={r.k} row={r} v={v} set={set} ctx={ctx} hl={lit} categories={data.categories} go={go} special={special(r)} />
                    ))}
                </div>
            </Card>
        );
        body = <>
            {sec.k === "delivery" ? <div data-assist="settings.delivery-fees">{card}</div>
                : sec.k === "options" ? <div data-assist="settings.global-options">{card}</div>
                    : card}
            {rows.some(r => r.type === "assistant-cards") && <AssistantCards ai={ai} />}
        </>;
    }

    const sub = sec.mine ? "Only changes your own sign-in, not the business."
        : sec.g === "Admin" ? "Which parts of the new admin everyone sees. Owners and admins only."
            : `${sec.g} settings for the whole shop.`;

    return (
        <>
            <PageHeader title={sec.t} crumb="Settings" crumbHref="/settings" sub={sub} />
            <div className="set-layout">
                <SectionNav mode="side" sections={sections} current={sec.k} dirtyBy={dirtyBy} saved={saved} ctx={ctx} go={go} search={searchBox} />
                <div className="stack" style={{ minWidth: 0 }}>
                    {resultsCard}
                    {body}
                    <UnsavedBar count={mine.length} saving={saving} onDiscard={() => discard([sec.k])} onSave={() => void save([sec.k])} />
                    {mine.length === 0 && total > 0 && (
                        <p className="sm muted">You have {plural(total, "unsaved change")} in other sections, marked with a dot.</p>
                    )}
                </div>
            </div>
            {sec.k === "delivery" && <RidersPanel open={riders} onClose={() => setRiders(false)} riders={data.riders} />}
            {msg && <MessagePanel ev={msg} templates={data.templates} waIds={waIds} bizName={String(saved["biz.business_name"] || "Miss Tokyo")} onClose={() => setMsg(null)} />}
        </>
    );
}

/** The list of sections: cards with live summaries on the home page, the
 *  grouped sub-navigation (a select under 1100px) on a section page. */
function SectionNav({ mode, sections, current, dirtyBy, saved, ctx, go, search }: {
    mode: "cards" | "side"; sections: Section[]; current: string | null; dirtyBy: Record<string, string[]>;
    saved: Values; ctx: SettingsData["ctx"]; go: (href: string) => void; search?: ReactNode;
}) {
    const groups = GROUPS.filter(g => sections.some(s => s.g === g));
    const dot = (k: string) => (dirtyBy[k]?.length ? <span className="nav-dot" aria-label="Unsaved changes" /> : null);
    return (
        <nav className={mode === "side" ? "set-nav" : "stack"} aria-label="Settings sections" data-assist="settings.tabs">
            {mode === "side" && <>
                {search}
                <div className="set-select">
                    <Select label="Settings section" value={current ?? ""} onChange={k => go(`/settings/${k}`)}
                        options={sections.map(s => ({ v: s.k, l: `${s.g} › ${s.t}${dirtyBy[s.k]?.length ? " •" : ""}` }))} />
                </div>
            </>}
            <div className={mode === "side" ? "set-groups stack-sm" : "stack"}>
                {groups.map(g => mode === "side" ? (
                    <div key={g} className="nav-group">
                        <div className="nav-title">{g}</div>
                        {sections.filter(s => s.g === g).map(s => (
                            <button key={s.k} type="button" className="nav-item set-nav-item" aria-current={s.k === current ? "page" : undefined} onClick={() => go(`/settings/${s.k}`)}>
                                <span>{s.t}</span>{dot(s.k)}
                            </button>
                        ))}
                    </div>
                ) : (
                    <section key={g} className="stack-sm" aria-label={g}>
                        <h2 className="set-group-t">{g}</h2>
                        <div className="grid-3">
                            {sections.filter(s => s.g === g).map(s => (
                                <button type="button" key={s.k} className="card card-pad set-card" onClick={() => go(`/settings/${s.k}`)}>
                                    <span className="hrow-sm between"><span className="strong">{s.t}</span>{dot(s.k)}</span>
                                    <span className="sm muted">{s.sum(saved, ctx)}</span>
                                </button>
                            ))}
                        </div>
                    </section>
                ))}
            </div>
        </nav>
    );
}
