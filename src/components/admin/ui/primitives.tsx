"use client";

// Admin v2 building blocks. Every page is made from these; styles live in
// admin-v2.css and read tokens only.
import { useEffect, useRef, useState, type ButtonHTMLAttributes, type ReactNode, type KeyboardEvent, type SelectHTMLAttributes } from "react";
import Link from "next/link";
import { Icon, type IconName } from "./Icon";

export type Tone = "warn" | "danger" | "ok" | "neutral" | "info";

type BtnKind = "primary" | "ghost" | "danger" | "danger-solid";
type BtnProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "type"> & {
    kind?: BtnKind; sm?: boolean; icon?: IconName; block?: boolean; type?: "button" | "submit";
};

export function Btn({ kind, sm, icon, block, className = "", children, type = "button", ...p }: BtnProps) {
    return (
        <button type={type} className={`btn${kind ? ` btn-${kind}` : ""}${sm ? " btn-sm" : ""}${block ? " btn-block" : ""} ${className}`.trim()} {...p}>
            {icon && <Icon n={icon} />}{children}
        </button>
    );
}

/** A link that looks like a button. */
export function BtnLink({ kind, sm, icon, href, children, external }: { kind?: BtnKind; sm?: boolean; icon?: IconName; href: string; children: ReactNode; external?: boolean }) {
    const cls = `btn${kind ? ` btn-${kind}` : ""}${sm ? " btn-sm" : ""}`;
    if (external) return <a className={cls} href={href} target="_blank" rel="noopener noreferrer">{icon && <Icon n={icon} />}{children}</a>;
    return <Link className={cls} href={href}>{icon && <Icon n={icon} />}{children}</Link>;
}

export function IconBtn({ label, icon, pip, ...p }: Omit<ButtonHTMLAttributes<HTMLButtonElement>, "type"> & { label: string; icon: IconName; pip?: boolean }) {
    return (
        <button type="button" className="icon-btn" aria-label={label} title={label} {...p}>
            <Icon n={icon} />{pip && <span className="pip" />}
        </button>
    );
}

export function Switch({ checked, onChange, label, disabled, id }: { checked: boolean; onChange?: (v: boolean) => void; label: string; disabled?: boolean; id?: string }) {
    return (
        <span className="switch-hit">
            <button type="button" id={id} role="switch" aria-checked={!!checked} aria-label={label} disabled={disabled}
                className="switch" onClick={() => onChange?.(!checked)} />
        </span>
    );
}

export type Opt<V extends string = string> = { v: V; l: ReactNode } | V;
const optV = <V extends string>(o: Opt<V>): V => (typeof o === "object" ? o.v : o);
const optL = <V extends string>(o: Opt<V>): ReactNode => (typeof o === "object" ? o.l : o);

function arrowNav(e: KeyboardEvent<HTMLElement>, count: number, index: number, pick: (i: number) => void) {
    const k = e.key;
    if (!["ArrowRight", "ArrowLeft", "ArrowDown", "ArrowUp"].includes(k)) return;
    e.preventDefault();
    const n = (index + (k === "ArrowRight" || k === "ArrowDown" ? 1 : -1) + count) % count;
    pick(n);
    const group = e.currentTarget;
    setTimeout(() => (group.querySelectorAll<HTMLElement>("[role=radio],[role=tab]")[n])?.focus(), 0);
}

export function Seg<V extends string>({ value, options, onChange, label }: { value: V; options: Opt<V>[]; onChange: (v: V) => void; label: string }) {
    const i = Math.max(0, options.findIndex(o => optV(o) === value));
    return (
        <div className="seg" role="radiogroup" aria-label={label} onKeyDown={e => arrowNav(e, options.length, i, n => onChange(optV(options[n])))}>
            {options.map(o => {
                const v = optV(o);
                return <button type="button" key={v} role="radio" aria-checked={value === v} tabIndex={value === v ? 0 : -1} onClick={() => onChange(v)}>{optL(o)}</button>;
            })}
        </div>
    );
}

export function Chip({ pressed, onClick, children, count, href }: { pressed?: boolean; onClick?: () => void; children: ReactNode; count?: number | null; href?: string }) {
    const inner = <>{children}{count != null && <span className="cnt">{count}</span>}</>;
    if (href) return <Link className="chip" aria-pressed={!!pressed} href={href} scroll={false}>{inner}</Link>;
    return <button type="button" className="chip" aria-pressed={!!pressed} onClick={onClick}>{inner}</button>;
}

export type RadioOpt<V extends string> = { v: V; title: ReactNode; desc?: ReactNode; disabled?: boolean; right?: ReactNode };
export function RadioCards<V extends string>({ value, onChange, options, label, cols }: { value: V | null; onChange: (v: V) => void; options: RadioOpt<V>[]; label: string; cols?: number }) {
    const i = Math.max(0, options.findIndex(o => o.v === value));
    return (
        <div className="rcards" role="radiogroup" aria-label={label} style={cols ? { gridTemplateColumns: `repeat(${cols},minmax(0,1fr))` } : undefined}
            onKeyDown={e => arrowNav(e, options.length, i, n => { if (!options[n].disabled) onChange(options[n].v); })}>
            {options.map(o => (
                <button type="button" key={o.v} role="radio" aria-checked={value === o.v} aria-disabled={o.disabled || undefined}
                    tabIndex={value === o.v || (value == null && o === options[0]) ? 0 : -1}
                    className="rcard" onClick={() => !o.disabled && onChange(o.v)}>
                    <span className="dot" />
                    <span className="grow">
                        <span className="rcard-title" style={{ display: "block" }}>{o.title}</span>
                        {o.desc && <span className="rcard-desc" style={{ display: "block" }}>{o.desc}</span>}
                    </span>
                    {o.right}
                </button>
            ))}
        </div>
    );
}

/** Native select, controlled. Initialise it from the saved value on the first render. */
export function Select<V extends string>({ value, onChange, options, label, id, ...p }: Omit<SelectHTMLAttributes<HTMLSelectElement>, "onChange" | "value"> & { value: V; onChange: (v: V) => void; options: Opt<V>[]; label?: string }) {
    return (
        <select id={id} aria-label={label} className="select" value={value} onChange={e => onChange(e.target.value as V)} {...p}>
            {options.map(o => <option key={optV(o)} value={optV(o)}>{typeof o === "object" && typeof o.l === "string" ? o.l : optV(o)}</option>)}
        </select>
    );
}

export function Field({ label, help, children, htmlFor, error }: { label?: ReactNode; help?: ReactNode; children: ReactNode; htmlFor?: string; error?: string | null }) {
    return (
        <div className="field">
            {label && <label className="label" htmlFor={htmlFor}>{label}</label>}
            {children}
            {error ? <div className="err-text" role="alert">{error}</div> : help && <div className="help">{help}</div>}
        </div>
    );
}

export function Money({ value, onChange, id, placeholder, label, disabled }: { value: string; onChange: (v: string) => void; id?: string; placeholder?: string; label?: string; disabled?: boolean }) {
    return (
        <div className="input-affix">
            <span>GH₵</span>
            <input id={id} aria-label={label} inputMode="decimal" value={value} disabled={disabled} placeholder={placeholder ?? "0.00"}
                onChange={e => onChange(e.target.value.replace(/[^\d.]/g, ""))} />
        </div>
    );
}

export function Percent({ value, onChange, id, label, width = 120 }: { value: string; onChange: (v: string) => void; id?: string; label?: string; width?: number }) {
    return (
        <div className="input-affix" style={{ width }}>
            <input id={id} aria-label={label} inputMode="decimal" value={value} onChange={e => onChange(e.target.value.replace(/[^\d.]/g, ""))} />
            <span>%</span>
        </div>
    );
}

export function Search({ value, onChange, placeholder, label }: { value: string; onChange: (v: string) => void; placeholder: string; label?: string }) {
    return (
        <label className="search">
            <Icon n="search" />
            <span className="sr">{label || placeholder}</span>
            <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} />
            {value && (
                <button type="button" className="icon-btn" style={{ width: 28, height: 28 }} aria-label="Clear search" onClick={() => onChange("")}>
                    <Icon n="x" />
                </button>
            )}
        </label>
    );
}

const TONE_ICON: Record<Tone, IconName> = { warn: "warn", danger: "danger", ok: "ok", neutral: "info", info: "info" };
export function Banner({ tone = "neutral", title, children, action, onAction, actionLabel }: { tone?: Tone; title: ReactNode; children?: ReactNode; action?: ReactNode; onAction?: () => void; actionLabel?: string }) {
    return (
        <div className={`banner tone-${tone}`} role={tone === "danger" ? "alert" : "status"}>
            <Icon n={TONE_ICON[tone]} className="b-ico" />
            <div className="grow">
                <div className="banner-title">{title}</div>
                {children && <div className="banner-body">{children}</div>}
            </div>
            {action || (actionLabel && <Btn sm onClick={onAction}>{actionLabel}</Btn>)}
        </div>
    );
}

export function Badge({ tone, children, plain }: { tone?: Tone; children: ReactNode; plain?: boolean }) {
    return <span className={`badge${tone ? " b-" + tone : ""}${plain ? " plain" : ""}`}>{children}</span>;
}

export function Card({ title, action, children, className = "", pad, inset, id }: { title?: ReactNode; action?: ReactNode; children?: ReactNode; className?: string; pad?: boolean; inset?: boolean; id?: string }) {
    return (
        <section className={`card ${className}`.trim()} id={id} style={inset ? { background: "var(--card-2)" } : undefined}>
            {title && <div className="card-h"><h2>{title}</h2>{action}</div>}
            {pad ? <div className="card-body">{children}</div> : children}
        </section>
    );
}

export type TabDef<V extends string> = { v: V; l: ReactNode; c?: number | null; dot?: boolean; href?: string };
/** Underline tabs. Give each tab an href to make them route tabs. */
export function Tabs<V extends string>({ tabs, value, onChange, label }: { tabs: TabDef<V>[]; value: V; onChange?: (v: V) => void; label: string }) {
    const ref = useRef<HTMLDivElement>(null);
    const i = Math.max(0, tabs.findIndex(t => t.v === value));
    const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
        if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
        e.preventDefault();
        const n = (i + (e.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length;
        const el = ref.current?.querySelectorAll<HTMLElement>("[role=tab]")[n];
        if (tabs[n].href) el?.click(); else onChange?.(tabs[n].v);
        setTimeout(() => ref.current?.querySelectorAll<HTMLElement>("[role=tab]")[n]?.focus(), 0);
    };
    return (
        <div className="tabs" role="tablist" aria-label={label} ref={ref} onKeyDown={onKey}>
            {tabs.map(t => {
                const inner = <>{t.l}{t.c != null && <span className="cnt">{t.c}</span>}{t.dot && <span className="nav-dot" style={{ marginLeft: 4 }} aria-label="Needs attention" />}</>;
                const common = { role: "tab", "aria-selected": value === t.v, tabIndex: value === t.v ? 0 : -1, className: "tab" } as const;
                return t.href
                    ? <Link key={t.v} href={t.href} {...common} scroll={false}>{inner}</Link>
                    : <button key={t.v} type="button" {...common} onClick={() => onChange?.(t.v)}>{inner}</button>;
            })}
        </div>
    );
}

export function PageHeader({ title, sub, actions, crumb, crumbHref }: { title: ReactNode; sub?: ReactNode; actions?: ReactNode; crumb?: string; crumbHref?: string }) {
    return (
        <header className="ph">
            <div className="ph-text">
                {crumb && crumbHref && (
                    <div className="crumb"><Link href={crumbHref}>{crumb}</Link><Icon n="chev" style={{ width: 12, height: 12 }} /></div>
                )}
                <h1>{title}</h1>
                {sub && <p className="ph-sub">{sub}</p>}
            </div>
            {actions && <div className="ph-actions">{actions}</div>}
        </header>
    );
}

export function Empty({ icon = "box", title, body, action }: { icon?: IconName; title: ReactNode; body?: ReactNode; action?: ReactNode }) {
    return (
        <div className="empty">
            <div className="empty-ico"><Icon n={icon} /></div>
            <h3>{title}</h3>
            {body && <p>{body}</p>}
            {action && <div style={{ marginTop: 8 }}>{action}</div>}
        </div>
    );
}

export function SkeletonRows({ n = 6, cols = 5 }: { n?: number; cols?: number }) {
    return (
        <div className="rows" aria-busy="true" aria-label="Loading">
            {Array.from({ length: n }).map((_, i) => (
                <div className="row" key={i}>
                    {Array.from({ length: cols }).map((_, j) => (
                        <div key={j} className="skel" style={{ flex: j === 1 ? 2 : 1, maxWidth: j === 0 ? 40 : "none", height: j === 0 ? 40 : 12 }} />
                    ))}
                </div>
            ))}
        </div>
    );
}

export function ErrorState({ onRetry, what = "this", body = "The connection to the database timed out. Nothing was changed." }: { onRetry?: () => void; what?: string; body?: string }) {
    return (
        <div className="card-body">
            <Banner tone="danger" title={`We couldn't load ${what}`} actionLabel={onRetry ? "Try again" : undefined} onAction={onRetry}>{body}</Banner>
        </div>
    );
}

export function SRow({ label, help, children, stacked, id, hl }: { label: ReactNode; help?: ReactNode; children?: ReactNode; stacked?: boolean; id?: string; hl?: boolean }) {
    return (
        <div className={`srow${stacked ? " stacked" : ""}${hl ? " hl" : ""}`} id={id}>
            <div>
                <div className="srow-label">{label}</div>
                {help && <div className="srow-help">{help}</div>}
            </div>
            <div className="srow-ctl">{children}</div>
        </div>
    );
}

/** A number is never shown without its context. */
export function Kpi({ label, value, ctx, delta }: { label: ReactNode; value: ReactNode; ctx: ReactNode; delta?: number | null }) {
    return (
        <div className="kpi">
            <div className="kpi-label">{label}</div>
            <div className="kpi-value">{value}</div>
            <div className="kpi-ctx">
                {delta != null && <span className={`delta ${delta >= 0 ? "up" : "down"}`}>{delta >= 0 ? "↑" : "↓"} {Math.abs(delta)}%</span>} {ctx}
            </div>
        </div>
    );
}

export function Thumb({ src, label, lg, ph, alt = "" }: { src?: string | null; label?: string; lg?: boolean; ph?: boolean; alt?: string }) {
    return (
        <div className={`thumb${lg ? " lg" : ""}${ph || !src ? " ph" : ""}`} aria-hidden={alt ? undefined : true}>
            {src
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={src} alt={alt} loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                : label}
        </div>
    );
}

export function Qty({ value, onChange, min = 0, max = Infinity, label }: { value: number; onChange: (n: number) => void; min?: number; max?: number; label: string }) {
    return (
        <div className="qty">
            <button type="button" aria-label={`One fewer ${label}`} disabled={value <= min} onClick={() => onChange(Math.max(min, value - 1))}>−</button>
            <span aria-live="polite">{value}</span>
            <button type="button" aria-label={`One more ${label}`} disabled={value >= max} onClick={() => onChange(Math.min(max, value + 1))}>+</button>
        </div>
    );
}

export function TagEditor({ label, values, onChange, placeholder }: { label: string; values: string[]; onChange: (v: string[]) => void; placeholder?: string }) {
    const [v, setV] = useState("");
    const add = () => {
        const t = v.trim();
        if (t && !values.includes(t)) onChange([...values, t]);
        setV("");
    };
    return (
        <div className="field">
            <span className="label">{label}</span>
            <div className="hrow-sm wrap">
                {values.map(x => (
                    <span key={x} className="chip-x">{x}
                        <button type="button" aria-label={`Remove ${x}`} onClick={() => onChange(values.filter(y => y !== x))}><Icon n="x" style={{ width: 12, height: 12 }} /></button>
                    </span>
                ))}
                <input className="input" style={{ width: 140, minHeight: 32 }} aria-label={`Add ${label.toLowerCase()}`} value={v} placeholder={placeholder}
                    onChange={e => setV(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); add(); } }}
                    onBlur={add} />
            </div>
        </div>
    );
}

export function BulkBar({ count, children, onClear }: { count: number; children: ReactNode; onClear: () => void }) {
    if (count <= 0) return null;
    return (
        <div className="bulkbar" role="region" aria-label="Bulk actions">
            <span className="strong">{count} selected</span>
            {children}
            <div className="grow" />
            <Btn sm kind="ghost" onClick={onClear}>Clear</Btn>
        </div>
    );
}

export function Pager({ left, right, prevHref, nextHref }: { left: ReactNode; right?: ReactNode; prevHref?: string | null; nextHref?: string | null }) {
    return (
        <div className="pager">
            <span>{left}</span>
            <span className="hrow-sm">
                {right}
                {prevHref !== undefined && (prevHref ? <Link className="btn btn-sm btn-ghost" href={prevHref} scroll={false}>Previous</Link> : <button type="button" className="btn btn-sm btn-ghost" disabled>Previous</button>)}
                {nextHref !== undefined && (nextHref ? <Link className="btn btn-sm btn-ghost" href={nextHref} scroll={false}>Next</Link> : <button type="button" className="btn btn-sm btn-ghost" disabled>Next</button>)}
            </span>
        </div>
    );
}

/** Sticky bar for the Settings save model: "N unsaved changes · Discard · Save changes". */
export function UnsavedBar({ count, onDiscard, onSave, saving }: { count: number; onDiscard: () => void; onSave: () => void; saving?: boolean }) {
    if (count <= 0) return null;
    return (
        <div className="unsaved" role="region" aria-label="Unsaved changes">
            <span className="strong grow">{count} unsaved {count === 1 ? "change" : "changes"}</span>
            <Btn kind="ghost" onClick={onDiscard} disabled={saving}>Discard</Btn>
            <Btn kind="primary" onClick={onSave} disabled={saving}>{saving ? "Saving…" : "Save changes"}</Btn>
        </div>
    );
}

/** Two-tap destructive button: the first tap arms it, the second confirms. Resets after 3.5 s or on blur. */
export function TwoTap({ label, armed, onConfirm, sm, kind = "danger", icon, disabled }: { label: string; armed?: string; onConfirm: () => void; sm?: boolean; kind?: "danger" | "ghost"; icon?: IconName; disabled?: boolean }) {
    const [a, setA] = useState(false);
    useEffect(() => {
        if (!a) return;
        const t = setTimeout(() => setA(false), 3500);
        return () => clearTimeout(t);
    }, [a]);
    return (
        <button type="button" disabled={disabled} className={`btn ${a ? "btn-armed" : "btn-" + kind}${sm ? " btn-sm" : ""}`}
            onClick={() => { if (a) { setA(false); onConfirm(); } else setA(true); }}
            onBlur={() => setA(false)} aria-live="polite">
            {icon && <Icon n={icon} />}{a ? armed || `Tap again to ${label.toLowerCase()}` : label}
        </button>
    );
}

/** Small wrapper so a Next <Link> row and a button row share one look. */
export function RowLink({ href, children, onClick }: { href?: string; children: ReactNode; onClick?: () => void }) {
    if (href) return <Link href={href} className="row click" scroll={false} style={{ color: "inherit", textDecoration: "none" }}>{children}</Link>;
    return <button type="button" className="row click" onClick={onClick}>{children}</button>;
}

/** What a role without access sees instead of the page. */
export function Denied({ title }: { title: string }) {
    return (
        <>
            <PageHeader title={title} />
            <Card pad>
                <Empty icon="lock" title="Only owners and admins can open this page" body="Ask the owner if you need something changed here."
                    action={<BtnLink href="/home">Go to Home</BtnLink>} />
            </Card>
        </>
    );
}
