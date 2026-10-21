"use client";

// Till › New sale. The product grid on the left, the sale card on the right
// (sticky; stacked under 900px).
//
// The money path is the old till's (src/app/(dashboard)/pos/page.tsx): the same
// stock check, the same /api/pos/session and /api/pos/send-link bodies (built in
// lib/admin/v2/till.ts, compared with the old till in admin-v2-till.spec.ts),
// the same live payment status polling and the same till messages. Only the
// screen is new. The amounts shown are the ones send-link records, processing
// fee included, so staff are never asked for a figure the order doesn't carry.
import { useCallback, useEffect, useRef, useState } from "react";
import {
    Banner, Btn, BtnLink, Card, Chip, Empty, Field, IconBtn, Qty, RadioCards, Search, Seg, Select, Thumb, TwoTap,
    firstName, ghs, ghs0, plural, toast,
} from "@/components/admin/ui";
import { readJson } from "@/lib/http/readJson";
import { completedViaFrom, completionBanner, deliveryHeadline, deliveryToast, liveStatusText, TILL_GENERIC, TILL_SERVER_UNREACHABLE, type Delivery, type LiveStopped } from "@/lib/pos/tillMessages";
import { stopPolling } from "@/lib/payments/attemptRules";
import { resolveDeliveryFee, zoneLabel, type DeliveryZone } from "@/lib/delivery";
import { COUNTRIES, DEFAULT_COUNTRY, DEFAULT_REGION, GHANA_REGIONS } from "@/lib/geo";
import { normaliseOrderPhone } from "@/lib/phone";
import { useViewportHeight } from "@/hooks/useViewportHeight";
import type { PosAppliedDiscount, PosItem } from "@/types/pos";
import {
    addToCart, codeFromReply, mmss, saleEmail, saleProblem, sendLinkBody, sessionBody, stockCheckItems, stockProblems,
    tileStock, tillTotals, unclearText, validateCodeBody,
    type CustomerMode, type SaleDraft, type SendMode, type TillCustomer, type TillProduct,
} from "@/lib/admin/v2/till";
import type { TillCategory, TillSettings } from "@/lib/admin/v2/tillLoad";
import { tillCustomers, tillProducts, tillSaleState } from "./actions";
import { VariantModal, type Pick } from "./VariantModal";
import { CashPanel } from "./CashPanel";
import { useReceipt } from "./useReceipt";
import "./till.css";

type How = "now" | "accra" | "outside";
type Pay = "cash" | "link" | "gift";
type Live = { state: string; failures: number; orderRef?: string };
type Phase =
    | null
    | { kind: "waiting"; sessionId: string; total: number; paymentUrl: string; delivery: Delivery; sentAt: number; name: string; phone: string; email: string }
    | { kind: "done"; sessionId: string; via: "cash" | "gift_card"; orderRef: string | null; hadContact: boolean; total: number; change: number | null; name: string };

export function NewSale({ settings, categories, initialProducts, initialCustomer }: {
    settings: TillSettings;
    categories: TillCategory[];
    initialProducts: { products: TillProduct[]; matches: number } | null;
    initialCustomer: TillCustomer | null;
}) {
    // ── Product grid ────────────────────────────────────────────────────────
    const [q, setQ] = useState("");
    const [cat, setCat] = useState<string | null>(null);
    const [products, setProducts] = useState<TillProduct[]>(initialProducts?.products ?? []);
    const [matches, setMatches] = useState(initialProducts?.matches ?? 0);
    const [gridState, setGridState] = useState<"ready" | "loading" | "error">(initialProducts ? "ready" : "loading");
    const [pickFor, setPickFor] = useState<TillProduct | null>(null);
    const seen = useRef(new Map<string, TillProduct>((initialProducts?.products ?? []).map(p => [p.id, p])));
    const first = useRef(true);
    const reqId = useRef(0);

    const loadProducts = useCallback(async (term: string, category: string | null) => {
        const id = ++reqId.current;
        setGridState("loading");
        try {
            const r = await tillProducts(term, category);
            if (id !== reqId.current) return;
            if (!r.ok) { setGridState("error"); return; }
            for (const p of r.products) seen.current.set(p.id, p);
            setProducts(r.products);
            setMatches(r.matches);
            setGridState("ready");
        } catch {
            if (id === reqId.current) setGridState("error");
        }
    }, []);

    useEffect(() => {
        if (first.current && initialProducts) { first.current = false; return; }
        first.current = false;
        const t = setTimeout(() => void loadProducts(q, cat), q ? 300 : 0);
        return () => clearTimeout(t);
    }, [q, cat, loadProducts, initialProducts]);

    // ── The sale ────────────────────────────────────────────────────────────
    const [cart, setCart] = useState<PosItem[]>([]);
    const [customerMode, setCustomerMode] = useState<CustomerMode>("search");
    const [contactSearch, setContactSearch] = useState("");
    const [contacts, setContacts] = useState<TillCustomer[] | null>(null);
    const [contact, setContact] = useState<TillCustomer | null>(initialCustomer);
    const [newCustomer, setNewCustomer] = useState({ name: "", email: "" });
    const [phone, setPhone] = useState(initialCustomer?.phone ?? "");
    const [how, setHow] = useState<How>("now");
    const [address, setAddress] = useState("");
    const [country, setCountry] = useState(DEFAULT_COUNTRY);
    const [region, setRegion] = useState(DEFAULT_REGION);
    const [codeInput, setCodeInput] = useState("");
    const [applied, setApplied] = useState<PosAppliedDiscount | null>(null);
    const [checkingCode, setCheckingCode] = useState(false);
    const [notes, setNotes] = useState("");
    const [pay, setPay] = useState<Pay>("cash");
    const [sending, setSending] = useState(false);
    const [saleKey, setSaleKey] = useState(() => crypto.randomUUID());
    const [phase, setPhase] = useState<Phase>(null);
    const [unclear, setUnclear] = useState<string | null>(null);
    const [cashOpen, setCashOpen] = useState(false);
    const [received, setReceived] = useState("");
    const [live, setLive] = useState<Live | null>(null);
    const [liveStopped, setLiveStopped] = useState<LiveStopped>(null);
    const [expiresAt, setExpiresAt] = useState<number | null>(null);
    const [now, setNow] = useState(() => Date.now());
    const [resending, setResending] = useState(false);
    const [cancelling, setCancelling] = useState(false);
    const receipt = useReceipt();

    const deliveryMethod = how === "now" ? "pickup" : "delivery";
    const zone: DeliveryZone = how === "outside" ? "outside" : "accra";
    const deliveryFee = resolveDeliveryFee({ settings: settings.delivery, country, deliveryMethod, zone });
    const totals = tillTotals({ cart, deliveryFee, applied, feePct: settings.feePct });
    const units = cart.reduce((s, i) => s + i.quantity, 0);

    const draft: SaleDraft = {
        cart, customerMode, contact, newCustomer, phone, deliveryMethod, address, country, region, zone, applied, notes,
    };
    const hasCustomer = customerMode === "search" ? !!contact : !!newCustomer.name.trim();
    const customerName = (customerMode === "search" ? contact?.name : newCustomer.name)?.trim() || "";
    const email = saleEmail(draft);
    const nothingToPay = cart.length > 0 && totals.total <= 0;
    const isGiftCard = applied?.type === "gift_card";

    // A pay link needs somewhere to go; drop back to cash if the customer goes.
    useEffect(() => {
        if (pay !== "cash" && !hasCustomer) setPay("cash");
        else if (pay === "link" && !phone.trim()) setPay("cash");
    }, [hasCustomer, phone, pay]);

    // Customer search, the old till's: contacts first, then names from orders.
    useEffect(() => {
        const term = contactSearch.trim();
        if (!term || contact) { setContacts(null); return; }
        const t = setTimeout(async () => {
            const r = await tillCustomers(term);
            setContacts(r.ok ? r.customers : []);
            if (!r.ok) toast.error(r.error);
        }, 300);
        return () => clearTimeout(t);
    }, [contactSearch, contact]);

    const chooseContact = (c: TillCustomer) => {
        setContact(c);
        setContactSearch("");
        setContacts(null);
        setPhone(c.phone ?? "");
    };

    // ── Codes (gift cards and discounts) ────────────────────────────────────
    const lookupCode = useCallback(async (code: string, items: PosItem[], fee: number, who?: { email?: string | null; phone?: string | null }) => {
        const res = await fetch("/api/checkout/validate-code", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(validateCodeBody(code, items, fee, who)),
        });
        return codeFromReply(await res.json());
    }, []);

    const applyCode = async () => {
        const code = codeInput.trim();
        if (!code) { toast.error("Enter a gift card or discount code"); return; }
        if (cart.length === 0) { toast.error("Add items before applying a code"); return; }
        setCheckingCode(true);
        try {
            const result = await lookupCode(code, cart, deliveryFee, { email: email || null, phone: phone || contact?.phone || null });
            if (typeof result === "string") { toast.error(result); return; }
            setApplied(result);
            setCodeInput("");
            if (result.type === "gift_card" && hasCustomer) setPay("gift");
            toast.success(`${result.code} applied: ${result.label}`);
        } catch {
            toast.error("Could not check that code. Try again.");
        } finally {
            setCheckingCode(false);
        }
    };

    // A percentage code or a partly used gift card is worth a different amount
    // once the basket or the delivery changes: re-price it, as the old till does.
    const goodsTotal = totals.goods;
    useEffect(() => {
        if (!applied) return;
        if (cart.length === 0) { setApplied(null); return; }
        const t = setTimeout(async () => {
            try {
                const result = await lookupCode(applied.code, cart, deliveryFee);
                if (typeof result === "string") {
                    setApplied(null);
                    toast.error(`${applied.code} no longer applies: ${result}`);
                    return;
                }
                setApplied(prev => (prev && prev.code === result.code ? result : prev));
            } catch { /* keep the preview; send-link is the authority */ }
        }, 400);
        return () => clearTimeout(t);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [goodsTotal, deliveryFee, applied?.code, cart.length, lookupCode]);

    useEffect(() => { if (pay === "gift" && !isGiftCard && applied) setPay("cash"); }, [pay, isGiftCard, applied]);

    // ── Cart ────────────────────────────────────────────────────────────────
    const add = (p: TillProduct, pick: Pick) => {
        seen.current.set(p.id, p);
        setCart(c => addToCart(c, { id: p.id, name: p.name, price: p.price }, pick));
        setPickFor(null);
        toast.success(`${p.name} added`);
    };
    const tap = (p: TillProduct) => {
        if (p.sizes.length + p.colors.length + p.brands.length === 0) {
            const left = p.tracked && !p.preorder && p.available != null ? p.available - inSale(p.id, null) : Infinity;
            if (left <= 0) { toast.error(`All of ${p.name} in stock is already in this sale.`); return; }
            add(p, { size: null, color: null, brand: null });
        } else setPickFor(p);
    };
    const inSale = (productId: string, pick: Pick | null) => cart
        .filter(i => i.productId === productId && (!pick || (i.size === pick.size && i.color === pick.color && (i.brand ?? null) === pick.brand)))
        .reduce((s, i) => s + i.quantity, 0);
    const setQty = (idx: number, n: number) => setCart(c => c.map((i, k) => (k === idx ? { ...i, quantity: Math.max(1, n) } : i)));
    const remove = (idx: number) => setCart(c => c.filter((_, k) => k !== idx));

    const reset = () => {
        setCart([]); setPhase(null); setUnclear(null); setLive(null); setLiveStopped(null); setExpiresAt(null);
        setSaleKey(crypto.randomUUID()); setContact(null); setCustomerMode("search"); setContactSearch("");
        setNewCustomer({ name: "", email: "" }); setPhone(""); setHow("now"); setAddress("");
        setCountry(DEFAULT_COUNTRY); setRegion(DEFAULT_REGION); setApplied(null); setCodeInput(""); setNotes("");
        setPay("cash"); setReceived(""); setCashOpen(false);
    };

    // ── Sending ─────────────────────────────────────────────────────────────
    const expiredSession = () => {
        toast.error("Your sign-in has expired. Nothing was recorded. Sign in again in a new tab, then send this sale.");
    };

    // A sale with nothing to pay is sent as a link: if the server finds anything
    // still owed after all, it sends a pay link for it rather than recording
    // cash nobody took. It only needs what a cash sale needs (a phone or email).
    const send = async (mode: SendMode, checkAs: SendMode = mode): Promise<"ok" | "fail" | "unclear"> => {
        const problem = saleProblem(draft, checkAs);
        if (problem) { toast.error(problem); return "fail"; }
        setSending(true);
        setUnclear(null);
        let started = false;
        const total = totals.total;
        try {
            // The same live stock gate the old till and the shop run first.
            const stockRes = await fetch(`/api/inventory/check?items=${encodeURIComponent(JSON.stringify(stockCheckItems(cart)))}`);
            const { data: stockData } = await readJson<{ results?: unknown[] }>(stockRes);
            if (!stockData) { toast.error(TILL_SERVER_UNREACHABLE); return "fail"; }
            if (Array.isArray(stockData.results)) {
                const issues = stockProblems(stockData.results, cart);
                if (issues.length) { toast.error(issues.join(" ")); return "fail"; }
            }

            const sessionRes = await fetch("/api/pos/session", {
                method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(sessionBody(draft)),
            });
            if (sessionRes.status === 401) { expiredSession(); return "fail"; }
            const { data: sessionData, isJson } = await readJson<{ sessionId?: string; error?: string }>(sessionRes);
            if (!isJson) { toast.error(TILL_SERVER_UNREACHABLE); return "fail"; }
            if (!sessionRes.ok || !sessionData?.sessionId) { toast.fromResponse(sessionData, { audience: "staff", fallback: "GEN-00" }); return "fail"; }
            const sessionId = sessionData.sessionId;

            started = true;
            const sendRes = await fetch("/api/pos/send-link", {
                method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(sendLinkBody(sessionId, mode, saleKey)),
            });
            if (sendRes.status === 401) { expiredSession(); return "fail"; }
            const { data: sent, isJson: sentJson } = await readJson<{ paymentUrl?: string; delivery?: Delivery; completed?: boolean; orderRef?: string; paidBy?: string }>(sendRes);
            if (!sentJson) { const t = unclearText(mode); toast.error(t); if (mode === "cash") { setUnclear(t); return "unclear"; } return "fail"; }
            if (!sendRes.ok || !sent?.paymentUrl) {
                toast.fromResponse(sent, { audience: "staff", fallback: "GEN-00", ask: { posSessionId: sessionId, saleKey } });
                return "fail";
            }

            if (sent.completed) {
                const via = completedViaFrom(mode, sent.paidBy);
                const got = Number(received);
                setPhase({
                    kind: "done", sessionId, via, orderRef: sent.orderRef ?? null, total,
                    hadContact: Boolean(phone.trim() || email), name: customerName,
                    change: via === "cash" && received.trim() && Number.isFinite(got) ? Math.max(0, Math.round((got - total) * 100) / 100) : null,
                });
                toast.success(via === "cash" ? `Cash received. Order #${sent.orderRef ?? ""} created` : `Paid in full by gift card. Order #${sent.orderRef ?? ""} created`);
                return "ok";
            }

            setPhase({ kind: "waiting", sessionId, total, paymentUrl: sent.paymentUrl, delivery: sent.delivery ?? null, sentAt: Date.now(), name: customerName, phone: phone.trim(), email });
            const t = deliveryToast(sent.delivery);
            if (t.type === "success") toast.success(t.message); else toast.error(t.message);
            return "ok";
        } catch (e) {
            console.error("[till] send failed", e);
            const t = started ? unclearText(mode) : TILL_GENERIC;
            toast.error(t);
            if (started && mode === "cash") { setUnclear(t); return "unclear"; }
            return "fail";
        } finally {
            setSending(false);
        }
    };

    const takeCash = async () => {
        // Done, or not sure it went through: either way the panel closes so the
        // "check before trying again" banner is what staff see, not a live button.
        const r = await send("cash");
        if (r !== "fail") setCashOpen(false);
    };

    // ── Waiting for a pay link ──────────────────────────────────────────────
    const waitingId = phase?.kind === "waiting" ? phase.sessionId : null;
    const sentAt = phase?.kind === "waiting" ? phase.sentAt : 0;
    useEffect(() => {
        if (!waitingId) return;
        let gone = false;
        void tillSaleState(waitingId).then(r => {
            if (gone) return;
            const at = r.ok && r.sale?.expiresAt ? Date.parse(r.sale.expiresAt) : NaN;
            setExpiresAt(Number.isFinite(at) ? at : sentAt + settings.holdMinutes * 60_000);
        }).catch(() => { if (!gone) setExpiresAt(sentAt + settings.holdMinutes * 60_000); });
        const t = setInterval(() => setNow(Date.now()), 1000);
        return () => { gone = true; clearInterval(t); };
    }, [waitingId, sentAt, settings.holdMinutes]);

    // Live link status (Settings switch), polled exactly as the old till polls it.
    useEffect(() => {
        if (!settings.liveStatus || !waitingId) return;
        let stop = false;
        let lastState = "";
        let settlingSince: number | null = null;
        setLiveStopped(null);
        const tick = async () => {
            try {
                const res = await fetch(`/api/pos/session/${waitingId}/payment`);
                const { data } = await readJson<Live>(res);
                if (stop) return;
                if (!res.ok || !data) {
                    if (stopPolling({ state: "", httpStatus: res.status, settlingSince, now: Date.now() })) { stop = true; setLiveStopped("signed_out"); }
                    return;
                }
                setLive(data);
                if (data.state === "declined" && lastState !== "declined") toast.code("PAY-04", { audience: "staff", ask: { posSessionId: waitingId, saleKey } });
                if (data.state === "settling" && settlingSince === null) settlingSince = Date.now();
                lastState = data.state;
                if (stopPolling({ state: data.state, httpStatus: res.status, settlingSince, now: Date.now() })) {
                    stop = true;
                    if (data.state === "settling") setLiveStopped("settling_limit");
                }
            } catch { /* next tick */ }
        };
        void tick();
        const t = setInterval(() => { if (!stop) void tick(); }, 5000);
        return () => { stop = true; clearInterval(t); };
    }, [settings.liveStatus, waitingId, saleKey]);

    const sendAgain = async () => {
        if (phase?.kind !== "waiting") return;
        setResending(true);
        try {
            const res = await fetch("/api/pos/send-link", {
                method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(sendLinkBody(phase.sessionId, "link", saleKey)),
            });
            if (res.status === 401) { expiredSession(); return; }
            const { data, isJson } = await readJson<{ paymentUrl?: string; delivery?: Delivery }>(res);
            if (!isJson) { toast.error(TILL_SERVER_UNREACHABLE); return; }
            if (!res.ok || !data?.paymentUrl) { toast.fromResponse(data, { audience: "staff", fallback: "GEN-00", ask: { posSessionId: phase.sessionId, saleKey } }); return; }
            setPhase({ ...phase, paymentUrl: data.paymentUrl, delivery: data.delivery ?? null, sentAt: Date.now() });
            setLive(null);
            const t = deliveryToast(data.delivery);
            if (t.type === "success") toast.success(`Sent again. ${t.message}`); else toast.error(t.message);
        } catch {
            toast.error(TILL_SERVER_UNREACHABLE);
        } finally {
            setResending(false);
        }
    };

    const cancelSale = async () => {
        if (phase?.kind !== "waiting") return;
        setCancelling(true);
        try {
            const res = await fetch("/api/pos/cancel", {
                method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sessionId: phase.sessionId }),
            });
            const { data } = await readJson<{ ok?: boolean; error?: string }>(res);
            if (!res.ok || !data?.ok) { toast.fromResponse(data, { audience: "staff", fallback: "POS-03" }); return; }
            toast.success("Sale cancelled. The items are back on sale.");
            reset();
        } catch {
            toast.error(TILL_SERVER_UNREACHABLE);
        } finally {
            setCancelling(false);
        }
    };

    const copyLink = async () => {
        if (phase?.kind !== "waiting") return;
        try { await navigator.clipboard.writeText(phase.paymentUrl); toast.success("Pay link copied"); }
        catch { toast.error("Couldn't copy here. Select the link and copy it."); }
    };
    const waNumber = phase?.kind === "waiting" ? normaliseOrderPhone(phase.phone) : null;
    const waHref = phase?.kind === "waiting" && waNumber
        ? `https://wa.me/${waNumber}?text=${encodeURIComponent(`Hi ${firstName(phase.name) || "there"}, here is your Miss Tokyo payment link for ${ghs(phase.total)}: ${phase.paymentUrl} (it expires in ${settings.holdMinutes} minutes)`)}`
        : null;

    const printSale = async (sessionId: string) => {
        const r = await tillSaleState(sessionId);
        await receipt.print(r.ok ? r.sale?.orderId ?? null : null);
    };

    // The sale card scrolls inside the visible screen, so the on-screen keyboard
    // on an iPad never hides the button at the bottom of it.
    const viewport = useViewportHeight();
    const cartRef = useRef<HTMLDivElement>(null);
    const [cartMax, setCartMax] = useState<number | null>(null);
    useEffect(() => {
        const measure = () => {
            if (!viewport || !cartRef.current || window.innerWidth <= 900) { setCartMax(null); return; }
            const top = parseFloat(getComputedStyle(cartRef.current).top) || 0;
            setCartMax(Math.max(320, viewport - top - 16));
        };
        measure();
        window.addEventListener("resize", measure);
        return () => window.removeEventListener("resize", measure);
    }, [viewport]);

    // ── Render ──────────────────────────────────────────────────────────────
    const remaining = expiresAt != null ? expiresAt - now : null;
    const holdOver = remaining != null && remaining <= 0;
    const receiptBy = [phone.trim() && "a text", email && "an email"].filter(Boolean).join(" and ");

    const primary = (() => {
        if (cart.length === 0) return null;
        if (nothingToPay) {
            return <Btn kind="primary" block onClick={() => void send("link", "cash")} disabled={sending}>{sending ? "Completing…" : "Complete sale · nothing to pay"}</Btn>;
        }
        if (pay === "cash") {
            return <Btn kind="primary" block icon="cash" disabled={sending}
                onClick={() => { const p = saleProblem(draft, "cash"); if (p) toast.error(p); else { setReceived(""); setCashOpen(true); } }}>
                Take {ghs(totals.total)} cash
            </Btn>;
        }
        if (pay === "link") {
            return <Btn kind="primary" block icon="link" onClick={() => void send("link")} disabled={sending}>{sending ? "Sending…" : `Send pay link for ${ghs(totals.total)}`}</Btn>;
        }
        return <Btn kind="primary" block disabled>{isGiftCard ? `${ghs(totals.total)} still to pay` : "Enter the gift card's code"}</Btn>;
    })();

    return (
        <div className="till">
            {/* Products */}
            <div className="stack">
                <div className="hrow wrap till-tools" data-assist="pos.search">
                    <Search value={q} onChange={setQ} placeholder="Search by name or SKU" label="Search products" />
                </div>
                {categories.length > 0 && (
                    <div className="chips till-cats" role="group" aria-label="Categories">
                        <Chip pressed={cat === null} onClick={() => setCat(null)}>All</Chip>
                        {categories.map(c => <Chip key={c.id} pressed={cat === c.id} onClick={() => setCat(c.id)}>{c.name}</Chip>)}
                    </div>
                )}
                {gridState === "error" ? (
                    <Card><Banner tone="danger" title="We couldn't load the products" actionLabel="Try again" onAction={() => void loadProducts(q, cat)}>Nothing in the sale was changed.</Banner></Card>
                ) : gridState === "loading" && products.length === 0 ? (
                    <div className="tile-grid" aria-busy="true" aria-label="Loading products">
                        {Array.from({ length: 8 }).map((_, i) => <div key={i} className="tile-skel"><div className="skel" /><div className="skel" style={{ height: 12 }} /><div className="skel" style={{ height: 12, width: "50%" }} /></div>)}
                    </div>
                ) : products.length === 0 ? (
                    <Card pad><Empty icon="search" title="No products match" body={q ? "Check the spelling, or search by SKU. Only products on sale in the shop show here." : "Products that are on sale in the shop show here."}
                        action={(q || cat) ? <Btn onClick={() => { setQ(""); setCat(null); }}>Clear search</Btn> : undefined} /></Card>
                ) : (
                    <>
                        {matches > products.length && <p className="help till-more">Showing {products.length} of {matches} matches. Keep typing to narrow it down.</p>}
                        <div className="tile-grid" aria-busy={gridState === "loading"}>
                            {products.map(p => {
                                const s = tileStock(p);
                                return (
                                    <button type="button" key={p.id} className="tile" disabled={s.soldOut} onClick={() => tap(p)}
                                        aria-label={`${p.name}, ${ghs(p.price)}${s.text ? `, ${s.text}` : ""}`}>
                                        <Thumb src={p.image} ph={!p.image} alt="" />
                                        <span className="tile-name">{p.name}</span>
                                        <span className="hrow between sm wrap" style={{ gap: 4 }}>
                                            <span className="strong">{ghs0(p.price)}{p.wasPrice != null && <span className="tile-was">{ghs0(p.wasPrice)}</span>}</span>
                                            {s.text && <span className={`xs ${s.soldOut ? "err-text" : "muted"}`}>{s.text}</span>}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </>
                )}
                {(cart.length > 0 || phase) && (
                    <div className="till-jump">
                        <Btn kind="primary" block onClick={() => cartRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}>
                            {phase ? "View the sale" : `View sale · ${plural(units, "item")} · ${ghs(totals.total)}`}
                        </Btn>
                    </div>
                )}
            </div>

            {/* The sale */}
            <div className="till-cart" ref={cartRef} style={cartMax ? { maxHeight: cartMax } : undefined}>
                <Card title="Sale" action={cart.length > 0 && !phase ? <TwoTap sm label="Clear" armed="Tap again to clear" onConfirm={reset} /> : undefined}>
                    {phase?.kind === "waiting" ? (
                        <div className="card-body stack" style={{ borderTop: "1px solid var(--line)" }}>
                            {live?.state === "paid" ? (
                                <>
                                    <Banner tone="ok" title="Paid">{ghs(phase.total)} received{live.orderRef ? `. Order #${live.orderRef}` : ""}. A receipt has gone to {firstName(phase.name) || "the customer"}.</Banner>
                                    <div className="hrow wrap">
                                        <Btn icon="print" onClick={() => void printSale(phase.sessionId)} disabled={receipt.busy}>Print receipt</Btn>
                                        <Btn kind="primary" onClick={reset}>New sale</Btn>
                                    </div>
                                </>
                            ) : (
                                <>
                                    {(() => {
                                        const h = deliveryHeadline(phase.delivery);
                                        if (h.tone === "warn") return <Banner tone="warn" title="The link didn't go out">{deliveryToast(phase.delivery).message} Use Copy link or WhatsApp below.</Banner>;
                                        return null;
                                    })()}
                                    {holdOver || live?.state === "expired" ? (
                                        <Banner tone="neutral" title="The hold has ended">The link has expired and the items are back on sale. Send again to hold them for another {settings.holdMinutes} minutes, or start a new sale.</Banner>
                                    ) : (
                                        <Banner tone="info" title={`Waiting for ${firstName(phase.name) || "the customer"} to pay`}>
                                            {deliveryHeadline(phase.delivery).tone === "ok" && <>{deliveryHeadline(phase.delivery).text.replace(/^Sent/, "Pay link sent")}{phase.phone ? ` to ${phase.phone}` : ""}. </>}
                                            The items are held for <span className="strong" aria-live="off">{remaining != null ? mmss(remaining) : `${settings.holdMinutes}:00`}</span>.
                                            {settings.liveStatus ? " This updates by itself." : " Check Today's sales to see when it's paid."}
                                        </Banner>
                                    )}
                                    <div className="kpi-value">{ghs(phase.total)}</div>
                                    {settings.liveStatus && live && (
                                        <p role="status" className={live.state === "declined" ? "err-text" : "strong"}>{liveStatusText(live, liveStopped)}</p>
                                    )}
                                    <p className="help" style={{ overflowWrap: "anywhere" }}>{phase.paymentUrl}</p>
                                    <div className="hrow wrap">
                                        <Btn icon="copy" onClick={() => void copyLink()}>Copy link</Btn>
                                        {waHref && <a className="btn" href={waHref} target="_blank" rel="noopener noreferrer">Send on WhatsApp</a>}
                                        <Btn icon="link" onClick={() => void sendAgain()} disabled={resending || live?.state === "settling"}>{resending ? "Sending…" : "Send again"}</Btn>
                                    </div>
                                    <div className="hrow wrap between">
                                        <TwoTap label={cancelling ? "Cancelling…" : "Cancel sale"} armed="Tap again to cancel the sale" onConfirm={() => void cancelSale()} disabled={cancelling || live?.state === "settling"} />
                                        <Btn kind="ghost" onClick={reset}>Start another sale</Btn>
                                    </div>
                                    <p className="help">Start another sale leaves this link open. It shows in Today&apos;s sales, where you can cancel it later.</p>
                                </>
                            )}
                        </div>
                    ) : phase?.kind === "done" ? (
                        <div className="card-body stack" style={{ borderTop: "1px solid var(--line)" }}>
                            <Banner tone="ok" title={completionBanner(phase.via, phase.hadContact).title}>
                                Order #{phase.orderRef ?? "—"}. {completionBanner(phase.via, phase.hadContact).note}
                            </Banner>
                            {phase.via === "cash" && phase.change != null && phase.change > 0 && (
                                <div className="inset hrow between"><span className="strong">Change to give</span><span className="till-change">{ghs(phase.change)}</span></div>
                            )}
                            <div className="hrow wrap">
                                <Btn icon="print" onClick={() => void printSale(phase.sessionId)} disabled={receipt.busy}>{receipt.busy ? "Getting the receipt…" : "Print receipt"}</Btn>
                                <Btn kind="primary" onClick={reset}>New sale</Btn>
                            </div>
                        </div>
                    ) : cart.length === 0 ? (
                        <Empty icon="till" title="Nothing in this sale yet" body="Tap a product to add it. You can pick the size and colour next." />
                    ) : (
                        <>
                            <div className="rows till-line" style={{ borderTop: "1px solid var(--line)" }}>
                                {cart.map((l, i) => {
                                    const variant = [l.size, l.color, l.brand].filter(Boolean).join(" / ");
                                    return (
                                        <div className="row" key={`${l.productId}-${variant}`}>
                                            <div className="row-main">
                                                <div className="row-title">{l.name}</div>
                                                <div className="row-sub">{variant ? `${variant} · ` : ""}{ghs(l.price)}</div>
                                            </div>
                                            <Qty value={l.quantity} min={1} onChange={n => setQty(i, n)} label={l.name} />
                                            <IconBtn icon="trash" label={`Remove ${l.name}`} onClick={() => remove(i)} />
                                        </div>
                                    );
                                })}
                            </div>
                            <div className="card-body stack" style={{ borderTop: "1px solid var(--line)" }}>
                                {/* Customer */}
                                <Field label="Customer">
                                    {contact ? (
                                        <div className="inset till-who">
                                            <div className="grow">
                                                <div className="strong">{contact.name}</div>
                                                <div className="help">{[contact.email, contact.phone].filter(Boolean).join(" · ") || "No email or phone on file"}</div>
                                            </div>
                                            <IconBtn icon="x" label="Change customer" onClick={() => { setContact(null); setPhone(""); }} />
                                        </div>
                                    ) : (
                                        <div className="stack-sm">
                                            <div className="till-seg-wrap"><Seg label="Customer" value={customerMode} onChange={setCustomerMode} options={[{ v: "search", l: "Find a customer" }, { v: "new", l: "New customer" }]} /></div>
                                            {customerMode === "search" ? (
                                                <>
                                                    <Search value={contactSearch} onChange={setContactSearch} placeholder="Name, email or phone" label="Find a customer" />
                                                    {contacts && contacts.length > 0 && (
                                                        <div className="till-results rows" role="list">
                                                            {contacts.map(c => (
                                                                <button type="button" role="listitem" className="row" key={c.email ?? c.phone ?? c.name} onClick={() => chooseContact(c)}>
                                                                    <span className="row-main"><span className="row-title" style={{ display: "block" }}>{c.name}</span>
                                                                        <span className="row-sub" style={{ display: "block" }}>{c.email ?? c.phone ?? "No email on file"}</span></span>
                                                                </button>
                                                            ))}
                                                        </div>
                                                    )}
                                                    {contacts && contacts.length === 0 && <p className="help">No one found. Tap New customer to add them.</p>}
                                                </>
                                            ) : (
                                                <>
                                                    <Field label="Name" htmlFor="till-name">
                                                        <input id="till-name" className="input" autoComplete="off" value={newCustomer.name} onChange={e => setNewCustomer(p => ({ ...p, name: e.target.value }))} />
                                                    </Field>
                                                    <Field label="Email (optional)" htmlFor="till-email" help="Their receipt goes here too.">
                                                        <input id="till-email" className="input" type="email" autoComplete="off" value={newCustomer.email} onChange={e => setNewCustomer(p => ({ ...p, email: e.target.value }))} />
                                                    </Field>
                                                </>
                                            )}
                                        </div>
                                    )}
                                </Field>
                                <Field label="Phone" htmlFor="till-phone" help="Their order number goes to this number by text. A pay link needs it.">
                                    <input id="till-phone" type="tel" inputMode="tel" className="input" data-assist="pos.phone" autoComplete="off" value={phone} onChange={e => setPhone(e.target.value)} />
                                </Field>

                                {/* How they get it */}
                                <Field label="How they get it">
                                    <div className="till-seg-wrap">
                                        <Seg label="How they get it" value={how} onChange={setHow} options={[
                                            { v: "now", l: "Taking it now" },
                                            { v: "accra", l: settings.delivery.enabled ? `Deliver in Accra · ${ghs0(settings.delivery.accra)}` : "Deliver in Accra" },
                                            { v: "outside", l: settings.delivery.enabled ? `Outside Accra · ${ghs0(settings.delivery.outside)}` : "Outside Accra" },
                                        ]} />
                                    </div>
                                </Field>
                                {deliveryMethod === "delivery" && (
                                    <div className="stack-sm">
                                        <Field label="Delivery address" htmlFor="till-addr">
                                            <textarea id="till-addr" className="textarea" rows={2} style={{ minHeight: 64 }} value={address} onChange={e => setAddress(e.target.value)} />
                                        </Field>
                                        <div className="grid-2" style={{ gap: "var(--s2)" }}>
                                            <Field label="Country" htmlFor="till-country">
                                                <Select id="till-country" value={country} onChange={v => { setCountry(v); setRegion(v === "Ghana" ? DEFAULT_REGION : ""); }} options={[...COUNTRIES]} />
                                            </Field>
                                            <Field label="Region" htmlFor="till-region">
                                                {country === "Ghana"
                                                    ? <Select id="till-region" value={region} onChange={setRegion} options={[...GHANA_REGIONS]} />
                                                    : <input id="till-region" className="input" value={region} onChange={e => setRegion(e.target.value)} />}
                                            </Field>
                                        </div>
                                        {country !== "Ghana" && <p className="help">Outside Ghana no delivery fee is added. Agree the cost with the customer.</p>}
                                    </div>
                                )}

                                {/* Code */}
                                <Field label="Discount or gift card code">
                                    {applied ? (
                                        <div className="inset till-who">
                                            <div className="grow"><div className="strong">{applied.code}</div><div className="help">{applied.label}</div></div>
                                            <Btn sm kind="ghost" onClick={() => { setApplied(null); setCodeInput(""); }}>Remove</Btn>
                                        </div>
                                    ) : (
                                        <div className="till-code">
                                            <input className="input" aria-label="Discount or gift card code" data-assist="pos.code" value={codeInput}
                                                onChange={e => setCodeInput(e.target.value.toUpperCase())}
                                                onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); void applyCode(); } }} />
                                            <Btn onClick={() => void applyCode()} disabled={checkingCode || !codeInput.trim()}>{checkingCode ? "Checking…" : "Apply"}</Btn>
                                        </div>
                                    )}
                                </Field>

                                <Field label="Staff notes (optional)" htmlFor="till-notes" help="Saved on the order for the team.">
                                    <textarea id="till-notes" className="textarea" rows={2} style={{ minHeight: 64 }} value={notes} onChange={e => setNotes(e.target.value)} />
                                </Field>

                                {/* Totals: what send-link will record */}
                                <dl className="dl till-total">
                                    <dt>Subtotal · {plural(units, "item")}</dt><dd>{ghs(totals.goods)}</dd>
                                    {applied && totals.discount > 0 && <><dt>{applied.type === "gift_card" ? "Gift card" : "Discount"} · {applied.code}</dt><dd>−{ghs(totals.discount - totals.deliveryDiscount)}</dd></>}
                                    {totals.deliveryFee > 0 && (
                                        <><dt>Delivery · {zoneLabel(zone)}</dt>
                                            <dd>{totals.deliveryDiscount > 0
                                                ? <><span className="till-struck">{ghs(totals.deliveryFee)}</span><span className="till-covered">{totals.payableDelivery > 0 ? ghs(totals.payableDelivery) : "Covered"}</span></>
                                                : ghs(totals.deliveryFee)}</dd></>
                                    )}
                                    {totals.fee > 0 && <><dt>Processing fee {settings.feePct}%</dt><dd>{ghs(totals.fee)}</dd></>}
                                    <dt className="strong">Total</dt><dd className="till-big">{ghs(totals.total)}</dd>
                                </dl>

                                {unclear && (
                                    <Banner tone="warn" title="Check before trying again" action={<BtnLink sm href="/till/today">Today&apos;s sales</BtnLink>}>{unclear}</Banner>
                                )}

                                {nothingToPay ? (
                                    <Banner tone="ok" title="Nothing to collect">{applied?.code ?? "The code"} covers the whole sale. Complete it and the customer gets their receipt.</Banner>
                                ) : (
                                    <RadioCards label="Payment" value={pay} onChange={setPay} options={[
                                        { v: "cash", title: "Cash", desc: "Counted into the drawer at close.", assist: "pos.cash" },
                                        {
                                            v: "link", title: "Send a pay link", assist: "pos.send-link", disabled: !hasCustomer || !phone.trim(),
                                            desc: !hasCustomer ? "Choose a customer first so we know where to send it."
                                                : !phone.trim() ? "Add their phone first: the link goes by text."
                                                : `Card or Mobile money. Goes by text to ${phone.trim()}${email ? " and by email" : ""}; the items are held for ${settings.holdMinutes} minutes.`,
                                        },
                                        {
                                            v: "gift", title: "Gift card", disabled: !hasCustomer,
                                            desc: !hasCustomer ? "Choose a customer first, so the receipt reaches them."
                                                : isGiftCard ? `${applied!.code} covers ${ghs(totals.discount)}. ${ghs(totals.total)} is still to pay: choose Cash or Send a pay link for the rest.`
                                                : "Enter the card's code under Discount or gift card.",
                                        },
                                    ]} />
                                )}
                                {primary}
                                {cart.length > 0 && !hasCustomer && <p className="help">Every till sale needs a customer with a phone or email, so they get their order number.</p>}
                            </div>
                        </>
                    )}
                </Card>
            </div>

            {pickFor && <VariantModal product={pickFor} onClose={() => setPickFor(null)} onAdd={pick => add(pickFor, pick)} inSale={pick => inSale(pickFor.id, pick)} />}
            <CashPanel open={cashOpen} onClose={() => !sending && setCashOpen(false)} total={totals.total} units={units}
                customer={customerName} receiptBy={receiptBy ? `${firstName(customerName) || "the customer"} gets their order number by ${receiptBy}` : "no receipt is sent"}
                received={received} setReceived={setReceived} busy={sending} onConfirm={() => void takeCash()} />
            {receipt.node}
        </div>
    );
}

