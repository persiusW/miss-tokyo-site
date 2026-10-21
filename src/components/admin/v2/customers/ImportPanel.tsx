"use client";

// Import customers from a CSV, with the old /admin/customers parser's columns
// (lib/admin/v2/customers › mapImport). The file is read in the browser; the
// rows are checked again on the server and added as contacts.
import { useRef, useState } from "react";
import { Banner, Btn, Panel, plural, toast } from "@/components/admin/ui";
import { IMPORT_MAX, mapImport, type ImportRow } from "@/lib/admin/v2/customers";
import { importCustomers } from "./actions";

export function ImportPanel({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
    const input = useRef<HTMLInputElement>(null);
    const [file, setFile] = useState<string | null>(null);
    const [parsed, setParsed] = useState<{ rows: ImportRow[]; skipped: number } | null>(null);
    const [readError, setReadError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    const pick = async (f: File | undefined) => {
        setParsed(null);
        setReadError(null);
        if (!f) return;
        setFile(f.name);
        const Papa = (await import("papaparse")).default;
        Papa.parse<Record<string, unknown>>(f, {
            header: true,
            skipEmptyLines: true,
            complete: res => {
                const m = mapImport(res.data);
                if (!m.rows.length) setReadError("No rows with an email address were found. Check the file has an Email column.");
                else if (m.rows.length > IMPORT_MAX) setReadError(`That's ${m.rows.length.toLocaleString("en-GB")} customers. Import up to ${IMPORT_MAX.toLocaleString("en-GB")} at a time: split the file and import each part.`);
                setParsed(m);
            },
            error: () => setReadError("That file couldn't be read. Check it's a CSV with an Email column."),
        });
    };

    const run = async () => {
        if (!parsed) return;
        setBusy(true);
        const res = await importCustomers(parsed.rows);
        setBusy(false);
        if (!res.ok) { toast.error(res.error); return; }
        toast.success(res.added
            ? `${plural(res.added, "customer")} added${res.existing ? `; ${plural(res.existing, "was", "were")} already in your contacts` : ""}`
            : "Everyone in the file was already in your contacts");
        onDone();
    };

    const ready = parsed && parsed.rows.length > 0 && parsed.rows.length <= IMPORT_MAX;
    return (
        <Panel open onClose={onClose} title="Import customers" sub="From a CSV file, for example an export from another shop or a spreadsheet."
            footer={<><Btn kind="ghost" onClick={onClose} disabled={busy}>Cancel</Btn>
                <Btn kind="primary" disabled={!ready || busy} onClick={run}>{busy ? "Importing…" : ready ? `Import ${plural(parsed.rows.length, "customer")}` : "Import"}</Btn></>}>
            <div className="stack-sm">
                <input ref={input} type="file" accept=".csv,text/csv" className="sr" aria-label="CSV file" onChange={e => void pick(e.target.files?.[0])} />
                <div className="hrow-sm wrap">
                    <Btn icon="upload" onClick={() => input.current?.click()}>{file ? "Choose another file" : "Choose a CSV file"}</Btn>
                    {file && <span className="sm muted">{file}</span>}
                </div>
                <div className="help">The file needs an Email column. These are read too when present: First Name and Last Name (or Name), Phone, Address 1, Address 2, Region, Country and Email Subscription (yes, true or subscribed means they agreed to marketing email).</div>
            </div>
            {readError && <Banner tone="danger" title="This file can't be imported">{readError}</Banner>}
            {parsed && parsed.rows.length > 0 && !readError && (
                <>
                    <Banner tone="info" title={`${plural(parsed.rows.length, "customer")} ready to import`}>
                        {parsed.skipped ? `${plural(parsed.skipped, "row")} skipped: no email, or the same email twice. ` : ""}
                        People already in your contacts are left as they are. Everyone added shows as Imported under Came from.
                    </Banner>
                    <div className="tbl-wrap">
                        <table className="tbl">
                            <thead><tr><th>Name</th><th>Email</th><th className="hide-sm">Phone</th><th className="hide-sm">Marketing email</th></tr></thead>
                            <tbody>
                                {parsed.rows.slice(0, 5).map(r => (
                                    <tr key={r.email}><td>{r.name || "—"}</td><td>{r.email}</td><td className="hide-sm">{r.phone || "—"}</td><td className="hide-sm">{r.marketing ? "Yes" : "No"}</td></tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {parsed.rows.length > 5 && <div className="xs muted">and {plural(parsed.rows.length - 5, "more")}.</div>}
                </>
            )}
        </Panel>
    );
}
