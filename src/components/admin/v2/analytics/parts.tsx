"use client";

// Small pieces the Analytics page and its report panels share: the report
// table, bar lists, a button pager and the CSV download.
import type { ReactNode } from "react";
import { Btn, ghs, when } from "@/components/admin/ui";
import { isYmd, type Cell, type Col, type Table } from "@/lib/admin/v2/analytics";

const WD = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "Wed 21 Oct" for a shop date; a timestamp reads like the rest of the admin. */
export function dateCell(v: string): string {
    if (isYmd(v)) {
        const [y, m, d] = v.split("-").map(Number);
        const wd = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
        return `${WD[wd]} ${d} ${MON[m - 1]}`;
    }
    return when(v);
}

export function fmtCell(v: Cell, c: Col): ReactNode {
    if (v == null || v === "") return c.kind === "text" ? "—" : "";
    if (c.kind === "money") return ghs(Number(v));
    if (c.kind === "pct") return `${v}%`;
    if (c.kind === "int") return Number(v).toLocaleString("en-GB");
    if (c.kind === "date") return dateCell(String(v));
    return v;
}

/** A report as a table. `onRow` makes rows open something; `cell` overrides one cell's content. */
export function ReportTable({ t, onRow, rowLabel, cell, label }: {
    t: Table;
    onRow?: (i: number) => void;
    rowLabel?: (i: number) => string;
    cell?: (i: number, j: number) => ReactNode | undefined;
    label: string;
}) {
    return (
        <div className="card inset an-tbl">
            <div className="tbl-wrap">
                <table className="tbl" aria-label={label}>
                    <thead><tr>{t.cols.map(c => <th key={c.h} className={c.kind === "text" || c.kind === "date" ? "" : "r"} scope="col">{c.h}</th>)}</tr></thead>
                    <tbody>
                        {t.rows.map((r, i) => (
                            <tr key={i} className={onRow ? "click" : undefined}
                                {...(onRow ? {
                                    tabIndex: 0, role: "button", "aria-label": rowLabel?.(i),
                                    onClick: () => onRow(i),
                                    onKeyDown: (e: React.KeyboardEvent) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onRow(i); } },
                                } : {})}>
                                {t.cols.map((c, j) => {
                                    const over = cell?.(i, j);
                                    return <td key={j} className={`${c.kind === "text" ? "" : c.kind === "date" ? "nowrap" : "r num nowrap"}${j === 0 ? " strong" : ""}`}>{over !== undefined ? over : fmtCell(r[j], c)}</td>;
                                })}
                            </tr>
                        ))}
                    </tbody>
                    {t.foot && (
                        <tfoot><tr>{t.cols.map((c, j) => <td key={j} className={`strong ${c.kind === "text" || c.kind === "date" ? "" : "r num"}`}>{j === 0 ? t.foot![0] : t.foot![j] == null ? "" : fmtCell(t.foot![j], c)}</td>)}</tr></tfoot>
                    )}
                </table>
            </div>
        </div>
    );
}

export type Bar = { label: ReactNode; value: number; right: ReactNode; key: string };

/** Labelled bars, each sized against the biggest. */
export function Bars({ items, label }: { items: Bar[]; label: string }) {
    const top = Math.max(1, ...items.map(b => b.value));
    return (
        <ul className="an-bars" aria-label={label}>
            {items.map(b => (
                <li key={b.key} className="stack-sm">
                    <div className="hrow between"><span className="strong an-bar-l">{b.label}</span><span className="sm nowrap">{b.right}</span></div>
                    <div className="bar-track" aria-hidden="true"><div className="bar-fill" key={`${b.value}/${top}`} style={{ width: `${Math.max(b.value > 0 ? 2 : 0, (b.value / top) * 100)}%` }} /></div>
                </li>
            ))}
        </ul>
    );
}

/** Previous / Next for a list loaded a page at a time. */
export function PageButtons({ page, size, total, onPage, noun }: { page: number; size: number; total: number; onPage: (p: number) => void; noun: [string, string] }) {
    if (total <= size) return <div className="pager"><span>{total.toLocaleString("en-GB")} {total === 1 ? noun[0] : noun[1]}</span></div>;
    const first = (page - 1) * size + 1, last = Math.min(total, page * size);
    return (
        <div className="pager">
            <span>{first.toLocaleString("en-GB")}–{last.toLocaleString("en-GB")} of {total.toLocaleString("en-GB")} {noun[1]}</span>
            <span className="hrow-sm">
                <Btn sm kind="ghost" disabled={page <= 1} onClick={() => onPage(page - 1)}>Previous</Btn>
                <Btn sm kind="ghost" disabled={last >= total} onClick={() => onPage(page + 1)}>Next</Btn>
            </span>
        </div>
    );
}

/** Saves text as a .csv file. The BOM keeps "GH₵" readable in Excel. */
export function downloadCsv(csv: string, name: string) {
    const url = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function getJson<T>(url: string): Promise<T> {
    const r = await fetch(url, { cache: "no-store" });
    if (!r.ok) throw new Error(`analytics ${r.status}`);
    return r.json() as Promise<T>;
}
