"use client";

/**
 * ⌘K command palette.
 *
 * The topbar carried a search box with no handler behind it and a ⌘K badge
 * that did nothing, so the most prominent search in the dashboard was the one
 * that could not find anything. This is what it now opens.
 *
 * Every query runs server-side against the whole table — an order is found by
 * the ref printed on its receipt, a product by a variant-level SKU, a customer
 * by any of name / email / phone — so results never depend on which page of
 * which list happens to be loaded.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { buildSearchClause, isMissingColumn, sanitiseTerm } from "@/lib/refSearch";

type Result = {
    id: string;
    group: "Orders" | "Products" | "Customers";
    title: string;
    subtitle: string;
    href: string;
};

const GROUP_ORDER: Result["group"][] = ["Orders", "Products", "Customers"];
const PER_GROUP = 5;

function money(n: unknown): string {
    const v = Number(n);
    return Number.isFinite(v) ? `GH₵${v.toFixed(2)}` : "—";
}

export default function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
    const router = useRouter();
    const [term, setTerm] = useState("");
    const [debounced, setDebounced] = useState("");
    const [results, setResults] = useState<Result[]>([]);
    const [loading, setLoading] = useState(false);
    const [active, setActive] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);
    const listRef = useRef<HTMLDivElement>(null);
    // Only the newest query may write results — a slow early keystroke must not
    // land after a fast later one.
    const runId = useRef(0);

    useEffect(() => {
        if (!open) return;
        setTerm("");
        setDebounced("");
        setResults([]);
        setActive(0);
        const t = setTimeout(() => inputRef.current?.focus(), 30);
        return () => clearTimeout(t);
    }, [open]);

    useEffect(() => {
        const t = setTimeout(() => setDebounced(term), 200);
        return () => clearTimeout(t);
    }, [term]);

    const search = useCallback(async (raw: string) => {
        const q = sanitiseTerm(raw);
        if (q.length < 2) { setResults([]); setLoading(false); return; }

        const mine = ++runId.current;
        setLoading(true);

        // `ref` may not be migrated in yet; naming a missing column fails the
        // whole or(), so the orders leg retries without it.
        const orderTextCols = ["customer_name", "customer_email", "customer_phone", "paystack_reference"];
        const ordersQuery = (includeRef: boolean) => supabase
            .from("orders")
            .select("id, customer_name, customer_email, total_amount, status")
            .or(buildSearchClause(q, orderTextCols, { includeRef }))
            .order("created_at", { ascending: false })
            .limit(PER_GROUP);

        const [ordersFirst, products, contacts] = await Promise.all([
            ordersQuery(true),
            supabase
                .from("products")
                .select("id, name, sku, price_ghs")
                .or(`name.ilike.%${q}%,sku.ilike.%${q}%`)
                .order("created_at", { ascending: false })
                .limit(PER_GROUP),
            supabase
                .from("contact_directory")
                .select("id, name, email, phone")
                .or(`name.ilike.%${q}%,email.ilike.%${q}%,phone.ilike.%${q}%`)
                .order("created_at", { ascending: false })
                .limit(PER_GROUP),
        ]);

        const orders = isMissingColumn(ordersFirst.error, "ref")
            ? await ordersQuery(false)
            : ordersFirst;

        if (mine !== runId.current) return;

        const next: Result[] = [];
        for (const o of (orders.data ?? [])) {
            next.push({
                id: `order-${o.id}`,
                group: "Orders",
                title: `#${String(o.id).slice(0, 8).toUpperCase()} · ${o.customer_name || "No name"}`,
                subtitle: `${money(o.total_amount)} · ${o.status ?? ""}`.trim(),
                href: `/sales/orders/${o.id}`,
            });
        }
        for (const p of (products.data ?? [])) {
            next.push({
                id: `product-${p.id}`,
                group: "Products",
                title: p.name ?? "Untitled",
                subtitle: [p.sku, money(p.price_ghs)].filter(Boolean).join(" · "),
                href: `/catalog/products/${p.id}/edit`,
            });
        }
        for (const c of (contacts.data ?? [])) {
            next.push({
                id: `contact-${c.id}`,
                group: "Customers",
                title: c.name || c.email,
                subtitle: [c.email, c.phone].filter(Boolean).join(" · "),
                href: `/customers/${encodeURIComponent(c.email)}`,
            });
        }

        next.sort((a, b) => GROUP_ORDER.indexOf(a.group) - GROUP_ORDER.indexOf(b.group));
        setResults(next);
        setActive(0);
        setLoading(false);
    }, []);

    useEffect(() => { if (open) search(debounced); }, [debounced, open, search]);

    const go = useCallback((r: Result) => {
        onClose();
        router.push(r.href);
    }, [onClose, router]);

    const onKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "ArrowDown") {
            e.preventDefault();
            setActive(i => Math.min(results.length - 1, i + 1));
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive(i => Math.max(0, i - 1));
        } else if (e.key === "Enter") {
            e.preventDefault();
            const r = results[active];
            if (r) go(r);
        } else if (e.key === "Escape") {
            e.preventDefault();
            onClose();
        }
    };

    // Keep the highlighted row in view during keyboard navigation.
    useEffect(() => {
        listRef.current?.querySelector<HTMLElement>(`[data-idx="${active}"]`)
            ?.scrollIntoView({ block: "nearest" });
    }, [active]);

    const grouped = useMemo(() => {
        const out: { group: Result["group"]; items: { r: Result; idx: number }[] }[] = [];
        results.forEach((r, idx) => {
            const bucket = out.find(g => g.group === r.group);
            if (bucket) bucket.items.push({ r, idx });
            else out.push({ group: r.group, items: [{ r, idx }] });
        });
        return out;
    }, [results]);

    if (!open) return null;

    const q = sanitiseTerm(term);

    // Rendered into <body>, not where it sits in the tree.
    //
    // This component lives inside .admin-topbar, which carries
    // backdrop-filter: blur(8px). A filtered ancestor becomes the containing
    // block for position:fixed descendants, so inset:0 resolved to the topbar's
    // own box — the scrim covered a 1280x124 strip at the top of the screen and
    // left the rest of the page undimmed and clickable. A portal takes it out
    // of that containing block without moving the state that drives it.
    if (typeof document === "undefined") return null;

    return createPortal(
        <div
            onClick={e => { if (e.target === e.currentTarget) onClose(); }}
            style={{
                position: "fixed", inset: 0, zIndex: 200, background: "rgba(0,0,0,0.45)",
                display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "12vh 16px 16px",
            }}
        >
            <div
                onKeyDown={onKeyDown}
                style={{
                    width: "100%", maxWidth: 620, background: "var(--ac-panel)",
                    border: "1px solid var(--ac-line)", borderRadius: "var(--r-md, 10px)",
                    boxShadow: "0 24px 60px rgba(0,0,0,0.35)", overflow: "hidden",
                    display: "flex", flexDirection: "column", maxHeight: "70vh",
                }}
            >
                <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 16px", borderBottom: "1px solid var(--ac-line)" }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--ac-ink-4)" strokeWidth="1.8" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
                    <input
                        ref={inputRef}
                        value={term}
                        onChange={e => setTerm(e.target.value)}
                        placeholder="Search orders by ref, products, customers…"
                        style={{ flex: 1, background: "transparent", border: 0, outline: 0, color: "var(--ac-ink)", font: "inherit", fontSize: 14 }}
                    />
                    <kbd style={{ fontFamily: "var(--f-mono)", fontSize: 9, padding: "2px 5px", border: "1px solid var(--ac-line)", borderRadius: 4, color: "var(--ac-ink-4)" }}>ESC</kbd>
                </div>

                <div ref={listRef} style={{ overflowY: "auto", padding: 6 }}>
                    {q.length < 2 ? (
                        <p style={{ padding: "18px 12px", fontSize: 12, color: "var(--ac-ink-4)" }}>
                            Type at least two characters. Orders match on the ref from the receipt, products on name or SKU, customers on name, email or phone.
                        </p>
                    ) : loading && results.length === 0 ? (
                        <p style={{ padding: "18px 12px", fontSize: 12, color: "var(--ac-ink-4)" }}>Searching…</p>
                    ) : results.length === 0 ? (
                        <p style={{ padding: "18px 12px", fontSize: 12, color: "var(--ac-ink-4)" }}>
                            Nothing matches “{q}”.
                        </p>
                    ) : (
                        grouped.map(({ group, items }) => (
                            <div key={group} style={{ marginBottom: 4 }}>
                                <p style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: ".16em", color: "var(--ac-ink-4)", padding: "8px 10px 4px" }}>
                                    {group}
                                </p>
                                {items.map(({ r, idx }) => (
                                    <button
                                        key={r.id}
                                        data-idx={idx}
                                        type="button"
                                        // onMouseMove, not onMouseEnter: a row rendering
                                        // under a stationary cursor would otherwise steal
                                        // the selection from the keyboard.
                                        onMouseMove={() => setActive(idx)}
                                        onClick={() => go(r)}
                                        style={{
                                            display: "block", width: "100%", textAlign: "left",
                                            padding: "8px 10px", border: 0, borderRadius: 6, cursor: "pointer",
                                            background: idx === active ? "var(--ac-panel-2)" : "transparent",
                                        }}
                                    >
                                        <span style={{ display: "block", fontSize: 13, color: "var(--ac-ink)", fontWeight: 500 }}>{r.title}</span>
                                        <span style={{ display: "block", fontSize: 11, color: "var(--ac-ink-4)" }}>{r.subtitle}</span>
                                    </button>
                                ))}
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>,
        document.body,
    );
}
