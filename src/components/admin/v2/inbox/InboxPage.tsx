"use client";

// Admin v2 Inbox: WhatsApp chats, contact-form messages, custom requests and
// (for the admin) the questions Miss Tokyo AI sent them, in one list with the
// open conversation beside it. The chip (?f=), the search (?q=), the WhatsApp
// view (?w=) and the open conversation (?c=<source>:<id>) live in the URL so
// links and refresh land in the same place. Below 1180px one pane shows at a
// time. WhatsApp data comes from /api/whatsapp/inbox (unchanged); the rest from
// /api/admin/v2/inbox, whose "needs" figure is the side-nav count.
import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
    Badge, Btn, Card, Chip, Empty, ErrorState, Icon, Kpi, PageHeader, Search, SkeletonRows, Tabs, ghs, initials, when,
    type IconName,
} from "@/components/admin/ui";
import { useAdminV2 } from "@/components/admin/shell/AdminV2Context";
import {
    FILTER_LABEL, SOURCE_LABEL, chatItem, filtersFor, isFilter, itemKey, parseKey, sortItems,
    type InboxFilter, type InboxItem, type InboxSource,
} from "@/lib/admin/v2/inbox";
import { waitingFor, type InboxConversation, type InboxTab } from "@/lib/whatsapp/inbox";
import { call } from "./api";
import { ChatView } from "./ChatView";
import { FormView, QuestionView, RequestView } from "./SourceViews";
import "./inbox.css";

const SRC_ICON: Record<InboxSource, IconName> = { whatsapp: "wa", form: "mail", request: "spark", ai: "spark" };
type Stats = { days: number; chats: number; waiting: number; assistantOrders: number; assistantSalesGhs: number; handedOver: number };
type WaList = { conversations: InboxConversation[]; counts: Record<InboxTab, number>; stats?: Stats | null };
type SrcList = {
    items: InboxItem[]; more: boolean; totals: { form: number; request: number; ai: number };
    needs: { chats: number; forms: number; requests: number; questions: number; total: number }; showRequests: boolean;
};
const WA_VIEWS: { v: InboxTab; l: string }[] = [
    { v: "all", l: "All" }, { v: "needs", l: "Needs a person" }, { v: "assistant", l: "With the assistant" }, { v: "notices", l: "Order updates only" }, { v: "dealt", l: "Done" },
];
const isWaView = (v: unknown): v is InboxTab => WA_VIEWS.some(x => x.v === v);
const PAGE = 50;

/** The page header and the two route tabs, shared by /inbox and /inbox/teach. */
export function InboxHeader({ tab, needs, canTeachTab, action }: { tab: "inbox" | "teach"; needs: number | null; canTeachTab: boolean; action?: React.ReactNode }) {
    return (
        <>
            <PageHeader title="Inbox" sub="WhatsApp chats, contact-form messages, custom requests and staff questions, in one place." actions={action} />
            <Tabs label="Inbox sections" value={tab} tabs={[
                { v: "inbox", l: "Conversations", c: needs, href: "/inbox" },
                ...(canTeachTab ? [{ v: "teach" as const, l: "Teach the assistant", href: "/inbox/teach" }] : []),
            ]} />
        </>
    );
}

export function InboxPage({ canTeachTab }: { canTeachTab: boolean }) {
    const { role, showCustomRequests } = useAdminV2();
    const router = useRouter();
    const pathname = usePathname();
    const params = useSearchParams();
    const [src, setSrc] = useState<{ state: "loading" | "error" } | { state: "ok"; data: SrcList }>({ state: "loading" });
    const [wa, setWa] = useState<WaList | null>(null);
    const [waFailed, setWaFailed] = useState(false);
    const [limit, setLimit] = useState(PAGE);
    const [search, setSearch] = useState(params.get("q") ?? "");
    const [now, setNow] = useState(0);

    const chips = filtersFor(role, showCustomRequests);
    const fParam = params.get("f");
    const filter: InboxFilter = isFilter(fParam) && chips.includes(fParam) ? fParam : "needs";
    const wView: InboxTab = isWaView(params.get("w")) ? (params.get("w") as InboxTab) : "all";
    const q = params.get("q") ?? "";
    const selected = parseKey(params.get("c"));
    const selKey = selected ? itemKey(selected.source, selected.id) : null;

    const setParams = useCallback((patch: Record<string, string | null>) => {
        const next = new URLSearchParams(params.toString());
        for (const [k, v] of Object.entries(patch)) { if (v == null || v === "") next.delete(k); else next.set(k, v); }
        const s = next.toString();
        router.replace(s ? `${pathname}?${s}` : pathname, { scroll: false });
    }, [params, pathname, router]);

    // The search box writes to the URL once typing pauses.
    useEffect(() => {
        const t = setTimeout(() => { if (search.trim() !== q) setParams({ q: search.trim() || null }); }, 300);
        return () => clearTimeout(t);
    }, [search, q, setParams]);
    useEffect(() => { setLimit(PAGE); }, [filter, q]);

    // One pane at a time below 1180px: show the top of whichever pane just opened.
    useEffect(() => {
        if (typeof window !== "undefined" && window.matchMedia("(max-width: 1180px)").matches) {
            document.querySelector(".adm2 .inbox .twopane")?.scrollIntoView({ block: "start" });
        }
    }, [selKey]);

    const waTab: InboxTab = filter === "needs" ? "needs" : filter === "whatsapp" ? wView : "all";
    const [tick, setTick] = useState(0);
    const shownKey = useRef("");
    const reload = useCallback(() => setTick(t => t + 1), []);

    // Loads when the chip, search, page size or WhatsApp view changes, every 20 s
    // while the page is visible, and after any action (reload). A refresh keeps
    // what is on screen; only a new view shows the skeleton.
    useEffect(() => {
        const key = `${filter}|${q}|${limit}|${waTab}`;
        const quiet = shownKey.current === key;
        shownKey.current = key;
        let alive = true;
        const qs = (o: Record<string, string>) => new URLSearchParams(Object.fromEntries(Object.entries(o).filter(([, v]) => v !== ""))).toString();
        const run = async (soft: boolean) => {
            if (!soft) setSrc({ state: "loading" });
            const [s, w] = await Promise.all([
                call<SrcList>(`/api/admin/v2/inbox?${qs({ f: filter, q, limit: String(limit) })}`),
                call<WaList>(`/api/whatsapp/inbox?${qs({ tab: waTab, q })}`),
            ]);
            if (!alive) return;
            setNow(Date.now());
            if (s.ok && s.data) setSrc({ state: "ok", data: s.data });
            else if (!soft) setSrc({ state: "error" });
            if (w.ok && w.data?.counts) { setWa(w.data); setWaFailed(false); }
            else if (!soft) { setWa(null); setWaFailed(true); }
        };
        void run(quiet);
        const t = setInterval(() => { if (document.visibilityState === "visible") void run(true); }, 20_000);
        return () => { alive = false; clearInterval(t); };
    }, [filter, q, limit, waTab, tick]);
    const retry = () => { shownKey.current = ""; setTick(t => t + 1); };

    const fromWa = filter === "needs" || filter === "all" || filter === "whatsapp" ? (wa?.conversations ?? []).map(chatItem) : [];
    const items = sortItems([...fromWa, ...(src.state === "ok" ? src.data.items : [])]);

    const counts: Partial<Record<InboxFilter, number | null>> = src.state === "ok" ? {
        needs: src.data.needs.total, all: null, whatsapp: wa?.counts.all ?? null,
        form: src.data.totals.form, request: src.data.totals.request, ai: src.data.totals.ai,
    } : {};
    const needsTotal = src.state === "ok" ? src.data.needs.total : null;

    const open = (key: string) => setParams({ c: key });
    const back = () => setParams({ c: null });
    const pick = (f: InboxFilter) => setParams({ f: f === "needs" ? null : f, w: null, c: null });

    const emptyFor = () => {
        if (q) return { title: "Nothing matches that search", body: "Try a name, a phone number, an email address or words from the message." };
        if (filter === "needs") return { title: "Nothing needs you", body: "When the assistant can't help, or someone sends the contact form or a custom request, it lands here." };
        if (filter === "whatsapp") return { title: "No WhatsApp chats here", body: "Chats with Ask Miss Tokyo on WhatsApp show here as customers write in." };
        if (filter === "form") return { title: "No contact-form messages", body: "Messages sent from the Contact page on the website show here." };
        if (filter === "request") return { title: "No custom requests", body: "Bespoke requests customers send from the website show here." };
        if (filter === "ai") return { title: "No questions for admin", body: "When Miss Tokyo AI can't answer a member of staff, they can send the question here with Send to admin." };
        return { title: "No conversations yet", body: "WhatsApp chats, contact-form messages and custom requests show here." };
    };

    const loading = src.state === "loading" && !wa;
    const listError = src.state === "error" && waFailed;
    const stats = wa?.stats;

    return (
        <div className={`inbox${selKey ? " has-sel" : ""}`}>
            <InboxHeader tab="inbox" needs={needsTotal} canTeachTab={canTeachTab} />

            <div className="chips" role="group" aria-label="Show">
                {chips.map(f => <Chip key={f} pressed={filter === f} onClick={() => pick(f)} count={counts[f] ?? null}>{FILTER_LABEL[f]}</Chip>)}
            </div>

            {filter === "whatsapp" && stats && (
                <div className="grid-4 inbox-stats">
                    <Kpi label="Chats" value={stats.chats} ctx={`Customers who wrote in the last ${stats.days} days`} />
                    <Kpi label="Ordered with the assistant" value={stats.assistantOrders}
                        ctx={stats.assistantOrders ? `${ghs(stats.assistantSalesGhs)} paid, last ${stats.days} days` : `Last ${stats.days} days`} />
                    <Kpi label="Handed to your team" value={stats.handedOver} ctx={`Chats, last ${stats.days} days`} />
                    <Kpi label="Waiting on your team" value={stats.waiting} ctx={stats.waiting ? "Needs a person now" : "Nobody is waiting"} />
                </div>
            )}

            <div className={`twopane${selKey ? " has-sel" : ""}`}>
                <Card className="pane-list">
                    <div className="card-body inbox-tools">
                        <Search value={search} onChange={setSearch} placeholder="Search name, number, email or message" label="Search conversations" />
                        {filter === "whatsapp" && wa && (
                            <div className="chips inbox-subchips" role="group" aria-label="WhatsApp chats">
                                {WA_VIEWS.map(v => <Chip key={v.v} pressed={wView === v.v} onClick={() => setParams({ w: v.v === "all" ? null : v.v, c: null })} count={wa.counts[v.v]}>{v.l}</Chip>)}
                            </div>
                        )}
                    </div>
                    <div className="inbox-list-scroll">
                        {loading ? <SkeletonRows n={6} cols={2} />
                            : listError ? <ErrorState what="the inbox" onRetry={retry} />
                            : items.length === 0 ? <div className="card-body"><Empty icon="check" {...emptyFor()} /></div>
                            : (
                                <div className="rows">
                                    {items.map(i => <ListRow key={i.key} i={i} now={now} on={i.key === selKey} onOpen={() => open(i.key)} />)}
                                </div>
                            )}
                        {(src.state === "error" && !listError) && <p className="help card-body">Contact forms and requests didn&apos;t load. <button type="button" className="link-btn" onClick={retry}>Try again</button></p>}
                        {(waFailed && !listError && (filter === "needs" || filter === "all" || filter === "whatsapp")) && <p className="help card-body">WhatsApp chats didn&apos;t load. <button type="button" className="link-btn" onClick={retry}>Try again</button></p>}
                        {src.state === "ok" && src.data.more && (
                            <div className="card-body"><Btn block onClick={() => setLimit(l => Math.min(500, l + PAGE))}>Show older</Btn></div>
                        )}
                    </div>
                </Card>

                <div className="pane-detail">
                    {!selected ? (
                        <Card pad><Empty icon="inbox" title="Choose a conversation" body="Pick one from the list to read it and reply." /></Card>
                    ) : selected.source === "whatsapp" ? <ChatView key={selKey} id={selected.id} onBack={back} onChanged={reload} />
                        : selected.source === "form" ? <FormView key={selKey} id={selected.id} onBack={back} onChanged={reload} />
                        : selected.source === "request" ? <RequestView key={selKey} id={selected.id} onBack={back} onChanged={reload} />
                        : role === "admin" ? <QuestionView key={selKey} id={selected.id} onBack={back} onChanged={reload} />
                        : <Card pad><Empty icon="lock" title="Only the admin answers these" body="Questions Miss Tokyo AI sends with Send to admin go to the admin." /></Card>}
                </div>
            </div>
        </div>
    );
}

function ListRow({ i, now, on, onOpen }: { i: InboxItem; now: number; on: boolean; onOpen: () => void }) {
    return (
        <button type="button" className={`row click inbox-row${on ? " on" : ""}`} aria-current={on ? "true" : undefined} onClick={onOpen}>
            <span className="avatar" aria-hidden>{initials(i.name)}</span>
            <span className="row-main">
                <span className="hrow-sm between">
                    <span className="row-title inbox-ellipsis" style={{ fontWeight: i.unread ? 800 : 600 }}>{i.name}</span>
                    <span className="xs muted nowrap">{when(i.at)}</span>
                </span>
                <span className="sm inbox-ellipsis" style={{ display: "block" }}>{i.subject}</span>
                <span className="hrow-sm wrap inbox-row-foot">
                    <span className="xs muted hrow-sm"><Icon n={SRC_ICON[i.source]} style={{ width: 12, height: 12 }} />{SOURCE_LABEL[i.source]}</span>
                    {i.needs && <Badge tone="warn">Needs a person</Badge>}
                    {i.needs && i.waitingSince && now > 0 && <span className="xs inbox-warn">{waitingFor(i.waitingSince, now)}</span>}
                    {i.done && <Badge plain>Done</Badge>}
                    {!i.needs && !i.done && i.status && <Badge plain>{i.status}</Badge>}
                </span>
            </span>
        </button>
    );
}

