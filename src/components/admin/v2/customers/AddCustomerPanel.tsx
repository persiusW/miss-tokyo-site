"use client";

// Add customer: someone who shops in person or by phone. Saved to contacts
// (source "manual"); the marketing switch is that contact's subscribed_status.
import { useState } from "react";
import { Btn, Card, Field, Panel, SRow, Switch, toast } from "@/components/admin/ui";
import { contactKey } from "@/lib/admin/v2/customers";
import { addCustomer } from "./actions";

export function AddCustomerPanel({ onClose, onAdded, onOpen }: { onClose: () => void; onAdded: (key: string) => void; onOpen: (key: string) => void }) {
    const [f, setF] = useState({ name: "", email: "", phone: "", marketing: false });
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const ok = f.name.trim() && contactKey(f.email);

    const save = async () => {
        setBusy(true);
        setError(null);
        const res = await addCustomer(f);
        setBusy(false);
        if (res.ok) { toast.success(`${f.name.trim()} added`); onAdded(res.key); return; }
        if (res.existing) {
            const key = res.existing;
            toast.info(res.error, { action: { label: "Open them", onClick: () => onOpen(key) } });
            setError(res.error);
            return;
        }
        setError(res.error);
    };

    return (
        <Panel open onClose={onClose} title="Add customer" sub="For someone who shops in person or by phone."
            footer={<><Btn kind="ghost" onClick={onClose} disabled={busy}>Cancel</Btn><Btn kind="primary" disabled={!ok || busy} onClick={save}>{busy ? "Adding…" : "Add customer"}</Btn></>}>
            <Field label="Full name" htmlFor="ac-name">
                <input data-autofocus id="ac-name" className="input" autoComplete="off" maxLength={120} value={f.name} onChange={e => setF({ ...f, name: e.target.value })} />
            </Field>
            <Field label="Phone" htmlFor="ac-phone" help="Used for order updates by SMS and WhatsApp.">
                <input id="ac-phone" className="input" type="tel" inputMode="tel" autoComplete="off" maxLength={40} value={f.phone} onChange={e => setF({ ...f, phone: e.target.value })} placeholder="024 123 4567" />
            </Field>
            <Field label="Email" htmlFor="ac-email" help="Needed: it keeps their orders, messages and notes together." error={error}>
                <input id="ac-email" className="input" type="email" autoComplete="off" maxLength={254} value={f.email} onChange={e => setF({ ...f, email: e.target.value })} placeholder="name@example.com" />
            </Field>
            <Card inset>
                <SRow label="They agreed to marketing email" help="Only switch this on if the customer said yes.">
                    <Switch label="They agreed to marketing email" checked={f.marketing} onChange={v => setF({ ...f, marketing: v })} />
                </SRow>
            </Card>
        </Panel>
    );
}
