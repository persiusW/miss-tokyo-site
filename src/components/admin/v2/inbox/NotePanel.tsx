"use client";

// Add or edit one note the assistant uses (a lesson), and retire it with a
// two-tap. Saved through /api/whatsapp/teach/lessons, which checks the role,
// the 40-lesson limit and the no-prices-or-times rule.
import { useState } from "react";
import { Btn, Field, Panel, TwoTap, toast } from "@/components/admin/ui";
import { BODY_MAX, TITLE_MAX } from "@/lib/ai/teach/lessonRules";
import { call, send } from "./api";

export type Lesson = {
    id: string; kind: "note" | "correction" | "hint" | "photo"; title: string; body: string;
    createdByName: string | null; createdAt: string; imageUrl: string | null;
};

export function NotePanel({ lesson, fromChat, full, onClose, onSaved }: { lesson: Lesson | null; fromChat?: string; full?: boolean; onClose: () => void; onSaved: () => void }) {
    const [title, setTitle] = useState(lesson?.title ?? "");
    const [body, setBody] = useState(lesson?.body ?? "");
    const [busy, setBusy] = useState(false);

    const save = async () => {
        setBusy(true);
        const r = await call("/api/whatsapp/teach/lessons", lesson ? send("PATCH", { id: lesson.id, title, body }) : send("POST", { title, body }));
        setBusy(false);
        if (!r.ok) { toast.fromResponse(r.data, { audience: "staff" }); return; }
        toast.success("Saved. The assistant uses it from the next message.");
        onSaved();
        onClose();
    };
    const retire = async () => {
        if (!lesson) return;
        setBusy(true);
        const r = await call("/api/whatsapp/teach/lessons", send("PATCH", { id: lesson.id, retire: true }));
        setBusy(false);
        if (!r.ok) { toast.fromResponse(r.data, { audience: "staff" }); return; }
        toast.success("Note retired. The assistant stops using it.");
        onSaved();
        onClose();
    };

    return (
        <Panel open onClose={onClose} title={lesson ? "Edit note" : fromChat ? "Teach the assistant" : "Add a note"}
            sub={fromChat ? `From the chat with ${fromChat}` : "Facts about the shop and your pieces. The assistant uses these on WhatsApp and the website."}
            footerLeft={lesson && <TwoTap label="Retire note" onConfirm={() => void retire()} disabled={busy} />}
            footer={<>
                <Btn kind="ghost" onClick={onClose} disabled={busy}>Cancel</Btn>
                <Btn kind="primary" onClick={() => void save()} disabled={busy || (!lesson && full) || !title.trim() || !body.trim()}>{busy ? "Saving…" : "Save"}</Btn>
            </>}>
            <div className="stack">
                {!lesson && full && <p className="err-text" role="alert">The assistant is holding the most notes it can. Retire one first.</p>}
                <Field label="Title" htmlFor="note-title">
                    <input id="note-title" data-autofocus className="input" maxLength={TITLE_MAX} value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Pre-order deposits" />
                </Field>
                <Field label="What it should know" htmlFor="note-body"
                    help={`Write it the way you'd explain it to a new member of staff. Prices, stock and opening hours come from your products and settings, so leave them out. ${body.length}/${BODY_MAX}`}>
                    <textarea id="note-body" className="textarea" maxLength={BODY_MAX} value={body} onChange={e => setBody(e.target.value)}
                        placeholder="Pre-orders can be paid half now and half before dispatch. Send a pay link for each half." />
                </Field>
                {lesson && <p className="help">Added by {lesson.createdByName ?? "your team"} · {new Date(lesson.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Africa/Accra" })}</p>}
            </div>
        </Panel>
    );
}
