"use client";

import { useCallback, useEffect, useState } from "react";
import { Btn, Card, Empty, ErrorState, Field, Panel, Percent, SRow, SkeletonRows, Switch, plural, toast, when } from "@/components/admin/ui";
import type { HomeData } from "../data";
import { exportSubscribers, listSubscribers, saveNewsletter, type Subscriber } from "../actions";
import { run } from "../shared";

const PAGE = 20;

/** The sign-up block's wording and welcome coupon, plus everyone who signed up. */
export function NewsletterPanel({ value, onClose, onSaved }: { value: HomeData["newsletter"]; onClose: () => void; onSaved: () => void }) {
    const [title, setTitle] = useState(value.title);
    const [subtitle, setSubtitle] = useState(value.subtitle);
    const [couponEnabled, setCouponEnabled] = useState(value.couponEnabled);
    const [couponCode, setCouponCode] = useState(value.couponCode);
    const [pct, setPct] = useState(String(value.couponPct));
    const [saving, setSaving] = useState(false);
    const pctN = Number(pct);
    const pctOk = Number.isInteger(pctN) && pctN >= 1 && pctN <= 100;

    const save = async () => {
        setSaving(true);
        const r = await run(saveNewsletter({ title, subtitle, couponEnabled, couponCode, couponPct: pctN }));
        setSaving(false);
        if (!r?.ok) return;
        toast.success("Newsletter sign-up saved");
        onSaved();
    };

    return (
        <Panel open wide onClose={onClose} title="Newsletter sign-up" sub="The email sign-up block on the home page, and the people who signed up."
            footer={<>
                <Btn kind="ghost" onClick={onClose} disabled={saving}>Cancel</Btn>
                <Btn kind="primary" onClick={save} disabled={saving || !pctOk}>{saving ? "Saving…" : "Save sign-up"}</Btn>
            </>}>
            <Field label="Headline" htmlFor="nl-t">
                <input id="nl-t" data-autofocus className="input" value={title} onChange={e => setTitle(e.target.value)} placeholder="Get 10% Off Your First Order" />
            </Field>
            <Field label="Text under the headline" htmlFor="nl-s">
                <textarea id="nl-s" className="textarea" value={subtitle} onChange={e => setSubtitle(e.target.value)} />
            </Field>
            <Card inset>
                <SRow label="Welcome coupon" help="People who sign up are shown this code.">
                    <Switch label="Welcome coupon" checked={couponEnabled} onChange={setCouponEnabled} />
                </SRow>
                <div className="card-body">
                    <div className="grid-2">
                        <Field label="Coupon code" htmlFor="nl-c" help="Create the same code in Discounts so it works at checkout.">
                            <input id="nl-c" className="input" value={couponCode} onChange={e => setCouponCode(e.target.value.toUpperCase())} placeholder="WELCOME10" />
                        </Field>
                        <Field label="Discount" htmlFor="nl-p" error={pctOk ? null : "Between 1 and 100%."}>
                            <Percent id="nl-p" value={pct} onChange={setPct} />
                        </Field>
                    </div>
                </div>
            </Card>
            <Subscribers total={value.subscribers} />
        </Panel>
    );
}

function Subscribers({ total: initialTotal }: { total: number }) {
    const [page, setPage] = useState(0);
    const [rows, setRows] = useState<Subscriber[] | null>(null);
    const [total, setTotal] = useState(initialTotal);
    const [failed, setFailed] = useState(false);
    const [exporting, setExporting] = useState(false);

    const load = useCallback(async (p: number) => {
        setFailed(false);
        setRows(null);
        try {
            const r = await listSubscribers(p);
            if (!r.ok || !r.data) { setFailed(true); return; }
            setRows(r.data.rows);
            setTotal(r.data.total);
            setPage(p);
        } catch {
            setFailed(true);
        }
    }, []);
    // Load the first page when the panel opens.
    useEffect(() => { void load(0); }, [load]);

    const exportCsv = async () => {
        setExporting(true);
        const r = await run(exportSubscribers());
        setExporting(false);
        if (!r?.ok || !r.data) return;
        if (r.data.count === 0) { toast.info("There are no subscribers to export yet"); return; }
        const url = URL.createObjectURL(new Blob([r.data.csv], { type: "text/csv" }));
        const a = document.createElement("a");
        a.href = url;
        a.download = "subscribers.csv";
        a.click();
        URL.revokeObjectURL(url);
        toast.success(`Exported ${plural(r.data.count, "subscriber")}`);
    };

    const pages = Math.max(1, Math.ceil(total / PAGE));
    return (
        <Card title={`Subscribers · ${total.toLocaleString("en-GB")}`} action={<Btn sm icon="download" onClick={exportCsv} disabled={exporting || total === 0}>{exporting ? "Exporting…" : "Export CSV"}</Btn>}>
            {failed ? <ErrorState what="subscribers" body="Nothing was changed. Try again in a moment." onRetry={() => load(page)} />
                : rows === null ? <SkeletonRows n={4} cols={3} />
                    : rows.length === 0 ? <Empty icon="mail" title="No subscribers yet" body="People who sign up with the form on the home page appear here." />
                        : (
                            <>
                                <div className="tbl-wrap">
                                    <table className="tbl">
                                        <thead><tr><th>Email</th><th>Signed up</th><th className="ct-hide-sm">Coupon</th><th className="ct-hide-sm">Where</th></tr></thead>
                                        <tbody>
                                            {rows.map(s => (
                                                <tr key={s.id}>
                                                    <td style={{ wordBreak: "break-all" }}>{s.email}</td>
                                                    <td className="nowrap">{when(s.subscribed_at)}</td>
                                                    <td className="ct-hide-sm">{s.coupon_code ?? "—"}</td>
                                                    <td className="ct-hide-sm">{s.source === "homepage_optin" ? "Home page" : s.source ?? "—"}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                {total > PAGE && (
                                    <div className="pager">
                                        <span>Page {page + 1} of {pages}</span>
                                        <span className="hrow-sm">
                                            <Btn sm kind="ghost" disabled={page === 0} onClick={() => load(page - 1)}>Previous</Btn>
                                            <Btn sm kind="ghost" disabled={page + 1 >= pages} onClick={() => load(page + 1)}>Next</Btn>
                                        </span>
                                    </div>
                                )}
                            </>
                        )}
        </Card>
    );
}
