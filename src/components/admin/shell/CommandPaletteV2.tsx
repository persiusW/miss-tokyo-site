"use client";

// ⌘K palette: 620px, a 56px input, grouped results, ↑ ↓ Enter Esc, plus a
// "Go to" group for pages. Search is server-side (lib/admin/paletteSearch).
import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@/components/admin/ui/Icon";
import { useExit, useLayer, portalHost } from "@/components/admin/ui/overlays";
import { EXIT_MS } from "@/components/admin/ui/motion";
import { FUL, fulKey, ghs } from "@/components/admin/ui";
import { paletteSearch, type PaletteHit } from "@/lib/admin/paletteSearch";
import type { NavDef } from "./nav";

type Row = { g: string; t: string; s: string; href: string };

function hitRow(h: PaletteHit): Row {
    if (h.kind === "order") {
        const ref = h.ref || `#${h.id.slice(0, 8).toUpperCase()}`;
        return { g: "Orders", t: `${ref} · ${h.name || "No name"}`, s: `${ghs(h.total)} · ${FUL[fulKey(h)][0]}`, href: `/orders/${h.id}` };
    }
    if (h.kind === "product") {
        return { g: "Products", t: h.name || "Untitled", s: [h.sku, ghs(h.price)].filter(Boolean).join(" · "), href: `/catalogue/${h.id}` };
    }
    return { g: "Customers", t: h.name || h.email, s: [h.email, h.phone].filter(Boolean).join(" · "), href: `/customers/${encodeURIComponent(h.email)}` };
}

export function CommandPaletteV2({ open, onClose, go, pages }: { open: boolean; onClose: () => void; go: (href: string) => void; pages: NavDef[] }) {
    const [q, setQ] = useState("");
    const [debounced, setDebounced] = useState("");
    const [hits, setHits] = useState<Row[]>([]);
    const [loading, setLoading] = useState(false);
    const [a, setA] = useState(0);
    const ref = useRef<HTMLDivElement>(null);
    const listRef = useRef<HTMLDivElement>(null);
    const runId = useRef(0);
    const wrapRef = useRef<HTMLDivElement>(null);
    useLayer(open, onClose, ref);

    useEffect(() => { if (open) { setQ(""); setDebounced(""); setHits([]); setA(0); } }, [open]);
    useEffect(() => { const t = setTimeout(() => setDebounced(q), 200); return () => clearTimeout(t); }, [q]);
    useEffect(() => {
        if (!open) return;
        const mine = ++runId.current;
        if (debounced.trim().length < 2) { setHits([]); setLoading(false); return; }
        setLoading(true);
        paletteSearch(debounced)
            .then(r => { if (mine === runId.current) { setHits(r.map(hitRow)); setA(0); } })
            .catch(() => { if (mine === runId.current) setHits([]); })
            .finally(() => { if (mine === runId.current) setLoading(false); });
    }, [debounced, open]);

    const rows = useMemo<Row[]>(() => {
        const t = q.trim().toLowerCase();
        const goTo = pages.map(p => ({ g: "Go to", t: p.label, s: "", href: p.href }));
        if (t.length < 2) return goTo.slice(0, 8);
        return [...hits, ...goTo.filter(x => x.t.toLowerCase().includes(t))];
    }, [q, hits, pages]);

    useEffect(() => {
        listRef.current?.querySelector<HTMLElement>(`[data-idx="${a}"]`)?.scrollIntoView({ block: "nearest" });
    }, [a]);

    const host = open ? portalHost() : null;
    useExit(open && !!host, EXIT_MS.modal, wrapRef);
    if (!open || !host) return null;
    const run = (r: Row) => { onClose(); go(r.href); };

    return createPortal(
        <div className="modal-wrap" style={{ placeItems: "start center" }} ref={wrapRef}>
            <div className="scrim" onClick={onClose} />
            <div className="palette" role="dialog" aria-modal="true" aria-label="Search" ref={ref}>
                <div className="palette-in">
                    <Icon n="search" style={{ width: 18, height: 18, color: "var(--ink-3)" }} />
                    <input data-autofocus value={q} placeholder="Search orders, products, customers" aria-label="Search"
                        role="combobox" aria-expanded="true" aria-controls="palette-list" aria-activedescendant={rows[a] ? `pal-${a}` : undefined}
                        onChange={e => { setQ(e.target.value); setA(0); }}
                        onKeyDown={e => {
                            if (e.key === "ArrowDown") { e.preventDefault(); setA(Math.min(rows.length - 1, a + 1)); }
                            if (e.key === "ArrowUp") { e.preventDefault(); setA(Math.max(0, a - 1)); }
                            if (e.key === "Enter" && rows[a]) { e.preventDefault(); run(rows[a]); }
                        }} />
                    <span className="kbd">Esc</span>
                </div>
                <div className="palette-list" role="listbox" id="palette-list" ref={listRef}>
                    {q.trim().length >= 2 && loading && hits.length === 0 ? (
                        <p className="muted sm" style={{ padding: 16 }}>Searching…</p>
                    ) : rows.length === 0 ? (
                        <p className="muted sm" style={{ padding: 16 }}>Nothing matches “{q}”. Orders match on the receipt number, products on name or SKU, customers on name, email or phone.</p>
                    ) : rows.map((r, i) => (
                        <Fragment key={`${r.g}-${r.href}-${i}`}>
                            {(i === 0 || rows[i - 1].g !== r.g) && <div className="xs muted strong" style={{ padding: "8px 12px 2px" }}>{r.g}</div>}
                            <button type="button" role="option" id={`pal-${i}`} data-idx={i} aria-selected={i === a} onMouseMove={() => setA(i)} onClick={() => run(r)}>
                                <span className="grow">
                                    <span className="strong" style={{ display: "block" }}>{r.t}</span>
                                    {r.s && <span className="xs muted">{r.s}</span>}
                                </span>
                            </button>
                        </Fragment>
                    ))}
                </div>
            </div>
        </div>,
        host,
    );
}
