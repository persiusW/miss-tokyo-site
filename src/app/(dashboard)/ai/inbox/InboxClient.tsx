"use client";

// Admin's Miss Tokyo AI inbox: answer or dismiss Send to admin questions, and
// manage the saved answers the assistant gives staff. Nothing is ever deleted.
import { useCallback, useEffect, useState } from "react";

type Line = { role: "user" | "assistant"; text: string };
type Question = {
    id: string; role: string; question: string; excerpt: Line[]; page_path: string | null;
    status: "open" | "answered" | "dismissed"; answer: string | null; answered_at: string | null;
    saved_answer_id: string | null; created_at: string; asker: string;
};
type Saved = { id: string; title: string; body: string; roles: string[]; active: boolean; updated_at: string };
type Data = { open: Question[]; handled: Question[]; saved: Saved[] };

const ROLE_LABEL: Record<string, string> = { admin: "Admin", owner: "Owner", sales_staff: "Sales staff" };
const ROLES = ["admin", "owner", "sales_staff"] as const;
const CALM = "Something happened. Please try again shortly.";

const when = (iso: string | null) => (iso ? new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "");

async function call(url: string, init?: RequestInit): Promise<{ ok: boolean; data: any }> {
    try {
        const res = await fetch(url, init);
        const data = await res.json().catch(() => null);
        return { ok: res.ok, data };
    } catch {
        return { ok: false, data: null };
    }
}

const json = (method: string, body: unknown): RequestInit => ({ method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

function QuestionCard({ q, onDone }: { q: Question; onDone: (note: string) => void }) {
    const [answer, setAnswer] = useState("");
    const [save, setSave] = useState(false);
    const [title, setTitle] = useState(q.question.slice(0, 160));
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [confirmDismiss, setConfirmDismiss] = useState(false);

    useEffect(() => {
        if (!confirmDismiss) return;
        const t = setTimeout(() => setConfirmDismiss(false), 4000);
        return () => clearTimeout(t);
    }, [confirmDismiss]);

    const reply = async () => {
        if (!answer.trim()) { setError("Write a reply first."); return; }
        setBusy(true); setError(null);
        const r = await call(`/api/ai/inbox/${q.id}/answer`, json("POST", { answer, save: save ? { title } : null }));
        setBusy(false);
        if (!r.ok) { setError(r.data?.error ?? CALM); return; }
        onDone(r.data?.warning ?? (r.data?.saved ? "Reply sent and saved for staff." : "Reply sent."));
    };

    const dismiss = async () => {
        if (!confirmDismiss) { setConfirmDismiss(true); return; }
        setBusy(true); setError(null);
        const r = await call(`/api/ai/inbox/${q.id}/dismiss`, { method: "POST" });
        setBusy(false);
        if (!r.ok) { setError(r.data?.error ?? CALM); return; }
        onDone("Question dismissed.");
    };

    return (
        <div className="ac-card" style={{ display: "grid", gap: 12 }}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "baseline", justifyContent: "space-between" }}>
                <div style={{ fontSize: 13, color: "var(--ac-ink-3)" }}>
                    <strong style={{ color: "var(--ac-ink)" }}>{q.asker}</strong> · {ROLE_LABEL[q.role] ?? q.role} · {when(q.created_at)}
                    {q.page_path && <> · on <span className="ac-mono">{q.page_path}</span></>}
                </div>
            </div>
            <div style={{ fontSize: 15, color: "var(--ac-ink)", fontWeight: 500 }}>{q.question}</div>
            {q.excerpt.length > 0 && (
                <details>
                    <summary style={{ cursor: "pointer", fontSize: 12.5, color: "var(--ac-ink-3)" }}>Chat before they asked ({q.excerpt.length})</summary>
                    <div style={{ display: "grid", gap: 6, marginTop: 8 }}>
                        {q.excerpt.map((l, i) => (
                            <div key={i} style={{ fontSize: 13, whiteSpace: "pre-wrap", color: "var(--ac-ink-2, var(--ac-ink))" }}>
                                <span style={{ fontWeight: 600, color: "var(--ac-ink-3)" }}>{l.role === "user" ? "Staff" : "Miss Tokyo AI"}: </span>{l.text}
                            </div>
                        ))}
                    </div>
                </details>
            )}
            <label>
                <span className="ac-label">Your reply</span>
                <textarea className="ac-textarea" rows={4} maxLength={4000} value={answer} onChange={e => setAnswer(e.target.value)} />
            </label>
            <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13, color: "var(--ac-ink)" }}>
                <input type="checkbox" className="ac-checkbox" checked={save} onChange={e => setSave(e.target.checked)} />
                Also save as an answer for all staff
            </label>
            {save && (
                <label>
                    <span className="ac-label">Saved answer title</span>
                    <input className="ac-input" maxLength={160} value={title} onChange={e => setTitle(e.target.value)} />
                </label>
            )}
            {error && <div role="alert" style={{ fontSize: 13, color: "var(--ac-danger)" }}>{error}</div>}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                <button type="button" className="ac-btn ac-btn-primary" onClick={reply} disabled={busy}>{busy ? "Sending…" : "Send reply"}</button>
                <button type="button" className="ac-btn ac-btn-ghost" onClick={dismiss} disabled={busy}>
                    {confirmDismiss ? "Tap again to dismiss" : "Dismiss"}
                </button>
            </div>
        </div>
    );
}

function SavedCard({ s, onSaved }: { s: Saved; onSaved: (s: Saved, note: string) => void }) {
    const [title, setTitle] = useState(s.title);
    const [body, setBody] = useState(s.body);
    const [roles, setRoles] = useState<string[]>(s.roles);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const dirty = title !== s.title || body !== s.body || roles.slice().sort().join() !== s.roles.slice().sort().join();

    const patch = async (changes: Partial<Saved>, note: string) => {
        setBusy(true); setError(null);
        const r = await call("/api/ai/saved-answers", json("PATCH", { id: s.id, ...changes }));
        setBusy(false);
        if (!r.ok || !r.data?.saved) { setError(r.data?.error ?? CALM); return; }
        onSaved(r.data.saved, note);
    };

    return (
        <div className="ac-card" style={{ display: "grid", gap: 10, opacity: s.active ? 1 : 0.7 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <span className="ac-badge">{s.active ? "On" : "Off"}</span>
                <span style={{ fontSize: 12, color: "var(--ac-ink-3)" }}>Updated {when(s.updated_at)}</span>
            </div>
            <label><span className="ac-label">Title</span><input className="ac-input" maxLength={160} value={title} onChange={e => setTitle(e.target.value)} /></label>
            <label><span className="ac-label">Answer</span><textarea className="ac-textarea" rows={4} maxLength={4000} value={body} onChange={e => setBody(e.target.value)} /></label>
            <div style={{ display: "flex", gap: 14, flexWrap: "wrap", fontSize: 13, color: "var(--ac-ink)" }}>
                {ROLES.map(r => (
                    <label key={r} style={{ display: "flex", gap: 6, alignItems: "center" }}>
                        <input type="checkbox" className="ac-checkbox" checked={roles.includes(r)}
                            onChange={e => setRoles(e.target.checked ? [...roles, r] : roles.filter(x => x !== r))} />
                        {ROLE_LABEL[r]}
                    </label>
                ))}
            </div>
            {error && <div role="alert" style={{ fontSize: 13, color: "var(--ac-danger)" }}>{error}</div>}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button type="button" className="ac-btn ac-btn-primary" disabled={busy || !dirty} onClick={() => patch({ title, body, roles }, "Saved answer updated.")}>Save changes</button>
                <button type="button" className="ac-btn ac-btn-ghost" disabled={busy} onClick={() => patch({ active: !s.active }, s.active ? "Saved answer switched off." : "Saved answer switched on.")}>
                    {s.active ? "Switch off" : "Switch on"}
                </button>
            </div>
        </div>
    );
}

function NewSaved({ onAdded }: { onAdded: (s: Saved) => void }) {
    const [title, setTitle] = useState("");
    const [body, setBody] = useState("");
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const add = async () => {
        if (!title.trim() || !body.trim()) { setError("A saved answer needs a title and an answer."); return; }
        setBusy(true); setError(null);
        const r = await call("/api/ai/saved-answers", json("POST", { title, body }));
        setBusy(false);
        if (!r.ok || !r.data?.saved) { setError(r.data?.error ?? CALM); return; }
        setTitle(""); setBody("");
        onAdded(r.data.saved);
    };
    return (
        <div className="ac-card" style={{ display: "grid", gap: 10 }}>
            <div className="ac-card-title">Add a saved answer</div>
            <label><span className="ac-label">Title (the question staff ask)</span><input className="ac-input" maxLength={160} value={title} onChange={e => setTitle(e.target.value)} /></label>
            <label><span className="ac-label">Answer</span><textarea className="ac-textarea" rows={3} maxLength={4000} value={body} onChange={e => setBody(e.target.value)} /></label>
            {error && <div role="alert" style={{ fontSize: 13, color: "var(--ac-danger)" }}>{error}</div>}
            <div><button type="button" className="ac-btn ac-btn-primary" onClick={add} disabled={busy}>{busy ? "Adding…" : "Add"}</button></div>
        </div>
    );
}

export default function InboxClient() {
    const [data, setData] = useState<Data | null>(null);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [tab, setTab] = useState<"open" | "saved">("open");
    const [note, setNote] = useState<string | null>(null);

    const load = useCallback(async () => {
        const r = await call("/api/ai/inbox");
        if (!r.ok || !r.data) { setLoadError(r.data?.error ?? "We couldn't load the inbox. Please refresh and try again."); return; }
        setLoadError(null);
        setData(r.data as Data);
        window.dispatchEvent(new Event("mtai:badge-refresh"));
    }, []);

    useEffect(() => { void load(); }, [load]);

    if (loadError) return <div className="ac-card"><div className="ac-empty"><div className="ac-empty-title">{loadError}</div></div></div>;
    if (!data) return <div className="ac-card"><div style={{ fontSize: 13, color: "var(--ac-ink-3)" }}>Loading…</div></div>;

    return (
        <div style={{ display: "grid", gap: 16 }}>
            <div className="ac-tabs">
                <button type="button" className={`ac-tab${tab === "open" ? " active" : ""}`} onClick={() => setTab("open")}>
                    Open <span className="ac-tab-count">{data.open.length}</span>
                </button>
                <button type="button" className={`ac-tab${tab === "saved" ? " active" : ""}`} onClick={() => setTab("saved")}>
                    Saved answers <span className="ac-tab-count">{data.saved.length}</span>
                </button>
            </div>
            {note && <div role="status" className="ac-card" style={{ fontSize: 13, color: "var(--ac-ink)" }}>{note}</div>}

            {tab === "open" ? (
                <>
                    {data.open.length === 0 ? (
                        <div className="ac-card"><div className="ac-empty"><div className="ac-empty-title">No open questions.</div></div></div>
                    ) : data.open.map(q => (
                        <QuestionCard key={q.id} q={q} onDone={n => { setNote(n); void load(); }} />
                    ))}
                    {data.handled.length > 0 && (
                        <div className="ac-card flush">
                            <div className="ac-card-head" style={{ padding: "16px 22px 0" }}><div className="ac-card-title">Recently handled</div></div>
                            <div className="ac-table-wrap">
                                <table className="ac-table">
                                    <thead><tr><th>Asked</th><th>By</th><th>Question</th><th>Outcome</th></tr></thead>
                                    <tbody>
                                        {data.handled.map(q => (
                                            <tr key={q.id}>
                                                <td style={{ whiteSpace: "nowrap" }}>{when(q.created_at)}</td>
                                                <td>{q.asker}</td>
                                                <td>{q.question}</td>
                                                <td>{q.status === "dismissed" ? "Dismissed" : q.saved_answer_id ? "Answered · saved" : "Answered"}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </>
            ) : (
                <>
                    <NewSaved onAdded={s => { setNote("Saved answer added."); setData({ ...data, saved: [s, ...data.saved] }); }} />
                    {data.saved.length === 0 ? (
                        <div className="ac-card"><div className="ac-empty"><div className="ac-empty-title">No saved answers yet.</div></div></div>
                    ) : data.saved.map(s => (
                        <SavedCard key={`${s.id}:${s.updated_at}`} s={s} onSaved={(next, n) => {
                            setNote(n);
                            setData({ ...data, saved: data.saved.map(x => (x.id === next.id ? next : x)) });
                        }} />
                    ))}
                </>
            )}
        </div>
    );
}
