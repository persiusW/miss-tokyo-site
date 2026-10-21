"use client";

// Your account: only the signed-in person's own sign-in, never the business.
// Name, sign-in email (confirmation link), password link, appearance,
// two-step sign-in (Supabase TOTP, gap 24) and where you're signed in.
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge, Banner, Btn, Card, ErrorState, Field, Panel, Seg, SkeletonRows, SRow, TwoTap, ago, toast } from "@/components/admin/ui";
import { createClient } from "@/lib/supabaseBrowser";
import { listMySessions, updateMyName, type MySession } from "./actions";

type Theme = "light" | "dark" | "system";

function readTheme(): Theme {
    try {
        const t = localStorage.getItem("ac-theme");
        return t === "light" || t === "dark" || t === "system" ? t : "system";
    } catch { return "system"; }
}

/** Tell the shell (and other tabs) the theme changed. */
function applyTheme(t: Theme) {
    try {
        localStorage.setItem("ac-theme", t);
        window.dispatchEvent(new StorageEvent("storage", { key: "ac-theme", newValue: t }));
    } catch { /* storage blocked: the menu still switches it for this visit */ }
}

function device(ua: string | null): string {
    const u = ua ?? "";
    const os = /iPhone/.test(u) ? "iPhone" : /iPad/.test(u) ? "iPad" : /Android/.test(u) ? "Android" : /Mac OS X|Macintosh/.test(u) ? "Mac" : /Windows/.test(u) ? "Windows" : /Linux/.test(u) ? "Linux" : "Unknown device";
    const br = /Edg\//.test(u) ? "Edge" : /CriOS|Chrome\//.test(u) ? "Chrome" : /FxiOS|Firefox\//.test(u) ? "Firefox" : /Safari\//.test(u) ? "Safari" : "";
    return br ? `${br} on ${os}` : os;
}

export function AccountSection({ name: startName, email: startEmail }: { name: string; email: string }) {
    const router = useRouter();
    const [name, setName] = useState(startName);
    const [savingName, setSavingName] = useState(false);
    const [email, setEmail] = useState(startEmail);
    const [sendingEmail, setSendingEmail] = useState(false);
    const [sendingPw, setSendingPw] = useState(false);
    const [theme, setTheme] = useState<Theme>("system");
    useEffect(() => { setTheme(readTheme()); }, []);

    const saveName = async () => {
        setSavingName(true);
        const res = await updateMyName(name);
        setSavingName(false);
        if (!res.ok) { toast.error(res.error); return; }
        // Refresh the session so the top bar shows the new name.
        await createClient().auth.refreshSession().catch(() => null);
        toast.success("Your name is saved");
        router.refresh();
    };

    const changeEmail = async () => {
        const e = email.trim().toLowerCase();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) { toast.error("Enter an email address like name@example.com."); return; }
        if (e === startEmail.toLowerCase()) { toast.info("That's already your sign-in email."); return; }
        setSendingEmail(true);
        const { error } = await createClient().auth.updateUser({ email: e }, { emailRedirectTo: `${window.location.origin}/auth/confirm` });
        setSendingEmail(false);
        if (error) { console.error("[account] email change", error); toast.error("We couldn't start the change. That address may already have an account."); return; }
        toast.success(`We've sent a confirmation link to ${e}. Your sign-in email changes when you open it.`);
    };

    const sendPassword = async () => {
        setSendingPw(true);
        try {
            const res = await fetch("/api/auth/forgot-password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: startEmail }) });
            if (!res.ok) { toast.fromResponse(await res.json().catch(() => null), { audience: "staff", fallback: "EML-01" }); return; }
            toast.success(`Password link sent to ${startEmail}`);
        } catch { toast.code("NET-01", { audience: "staff" }); } finally { setSendingPw(false); }
    };

    return (
        <div className="stack">
            <Card>
                <div className="rows">
                    <SRow label={<label htmlFor="acc-name">Your name</label>} help="Shown in the activity log and on receipts you print.">
                        <span className="hrow-sm">
                            <input id="acc-name" className="input" value={name} maxLength={80} onChange={e => setName(e.target.value)} autoComplete="name" />
                            <Btn sm onClick={() => void saveName()} disabled={savingName || name.trim() === startName.trim() || !name.trim()}>{savingName ? "Saving…" : "Save"}</Btn>
                        </span>
                    </SRow>
                    <SRow label={<label htmlFor="acc-email">Sign-in email</label>} help="We'll send a link to confirm a new address. Until you open it, you sign in with the current one.">
                        <span className="hrow-sm">
                            <input id="acc-email" className="input" type="email" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" />
                            <Btn sm onClick={() => void changeEmail()} disabled={sendingEmail || email.trim().toLowerCase() === startEmail.toLowerCase()}>{sendingEmail ? "Sending…" : "Change"}</Btn>
                        </span>
                    </SRow>
                    <SRow label="Password" help={`Sends a link to ${startEmail || "your email"} to set a new one.`}>
                        <Btn sm onClick={() => void sendPassword()} disabled={sendingPw || !startEmail}>{sendingPw ? "Sending…" : "Send password link"}</Btn>
                    </SRow>
                    <SRow label={<span id="acc-theme">Appearance</span>} help="Only changes how the admin looks for you, on this device.">
                        <Seg label="Appearance" value={theme} onChange={t => { setTheme(t); applyTheme(t); }}
                            options={[{ v: "light", l: "Light" }, { v: "dark", l: "Dark" }, { v: "system", l: "System" }]} />
                    </SRow>
                    <TwoStep />
                </div>
            </Card>
            <Sessions />
        </div>
    );
}

type Factor = { id: string; status: string; friendly_name?: string | null; created_at?: string };

function TwoStep() {
    const [factors, setFactors] = useState<Factor[] | null>(null);
    const [failed, setFailed] = useState(false);
    const [enrol, setEnrol] = useState<{ id: string; qr: string; secret: string } | null>(null);
    const [code, setCode] = useState("");
    const [busy, setBusy] = useState(false);

    const load = useCallback(async () => {
        const { data, error } = await createClient().auth.mfa.listFactors();
        if (error) { setFailed(true); return; }
        setFailed(false);
        setFactors(((data?.all ?? []) as Factor[]).filter(f => (f as { factor_type?: string }).factor_type === "totp"));
    }, []);
    useEffect(() => { void load(); }, [load]);

    const verified = (factors ?? []).filter(f => f.status === "verified");
    const on = verified.length > 0;

    const start = async () => {
        setBusy(true);
        const sb = createClient();
        // A set-up started earlier and never finished blocks a new one with the same name.
        for (const f of (factors ?? []).filter(x => x.status !== "verified")) await sb.auth.mfa.unenroll({ factorId: f.id }).catch(() => null);
        const { data, error } = await sb.auth.mfa.enroll({ factorType: "totp", friendlyName: `Authenticator ${new Date().toISOString().slice(0, 16)}` });
        setBusy(false);
        if (error || !data) { console.error("[account] mfa enroll", error); toast.error("We couldn't start two-step sign-in. Please try again."); return; }
        setCode("");
        setEnrol({ id: data.id, qr: data.totp.qr_code, secret: data.totp.secret });
    };

    const cancel = async () => {
        if (enrol) await createClient().auth.mfa.unenroll({ factorId: enrol.id }).catch(() => null);
        setEnrol(null);
        void load();
    };

    const verify = async () => {
        if (!enrol) return;
        const c = code.replace(/\D/g, "");
        if (c.length !== 6) { toast.error("Enter the 6-digit code from your authenticator app."); return; }
        setBusy(true);
        const { error } = await createClient().auth.mfa.challengeAndVerify({ factorId: enrol.id, code: c });
        setBusy(false);
        if (error) { toast.error("That code didn't match. Check the time on your phone is right and try the newest code."); return; }
        setEnrol(null);
        toast.success("Two-step sign-in is on");
        void load();
    };

    const turnOff = async () => {
        setBusy(true);
        const sb = createClient();
        let failedOne = false;
        for (const f of verified) { const { error } = await sb.auth.mfa.unenroll({ factorId: f.id }); if (error) failedOne = true; }
        setBusy(false);
        if (failedOne) { toast.error("We couldn't turn it off. Sign out, sign in again with your code, then try again."); void load(); return; }
        await sb.auth.refreshSession().catch(() => null);
        toast.success("Two-step sign-in is off");
        void load();
    };

    return (
        <>
            <SRow label="Two-step sign-in" help="Asks for a 6-digit code from an authenticator app (Google Authenticator, 1Password, Authy) each time you sign in to the admin.">
                {failed ? <Btn sm onClick={() => void load()}>Try again</Btn>
                    : factors === null ? <span className="sm muted">Checking…</span>
                        : on ? <span className="hrow-sm"><Badge tone="ok">On</Badge><TwoTap sm label="Turn off" onConfirm={() => void turnOff()} disabled={busy} /></span>
                            : <span className="hrow-sm"><Badge tone="neutral">Off</Badge><Btn sm onClick={() => void start()} disabled={busy}>{busy ? "Starting…" : "Set up"}</Btn></span>}
            </SRow>
            <Panel open={!!enrol} onClose={() => void cancel()} title="Set up two-step sign-in" sub="Takes about a minute. You need your phone."
                footer={<><Btn kind="ghost" onClick={() => void cancel()} disabled={busy}>Cancel</Btn><Btn kind="primary" onClick={() => void verify()} disabled={busy}>{busy ? "Checking…" : "Turn on"}</Btn></>}>
                {enrol && <>
                    <ol className="steps-list stack-sm sm">
                        <li>Open an authenticator app on your phone and add an account.</li>
                        <li>Scan this code, or type the key below.</li>
                        <li>Enter the 6-digit code the app shows.</li>
                    </ol>
                    <div className="set-qr">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={enrol.qr} alt="QR code to add Miss Tokyo admin to your authenticator app" width={184} height={184} />
                    </div>
                    <Field label="Key, if you can't scan" htmlFor="mfa-secret"><input id="mfa-secret" className="input" readOnly value={enrol.secret} onFocus={e => e.currentTarget.select()} /></Field>
                    <Field label="6-digit code" htmlFor="mfa-code"><input id="mfa-code" className="input" inputMode="numeric" autoComplete="one-time-code" maxLength={7} value={code}
                        onChange={e => setCode(e.target.value)} onKeyDown={e => { if (e.key === "Enter") void verify(); }} data-autofocus /></Field>
                    <Banner tone="neutral" title="Keep your phone">If you lose it, ask the owner or admin to help you get back in.</Banner>
                </>}
            </Panel>
        </>
    );
}

function Sessions() {
    const [rows, setRows] = useState<MySession[] | null>(null);
    const [current, setCurrent] = useState<string | null>(null);
    const [failed, setFailed] = useState(false);
    const [busy, setBusy] = useState(false);
    const load = useCallback(async () => {
        setFailed(false);
        const res = await listMySessions();
        if (!res.ok) { setFailed(true); return; }
        setRows(res.sessions);
        setCurrent(res.currentId);
    }, []);
    useEffect(() => { void load(); }, [load]);

    const others = async () => {
        setBusy(true);
        const { error } = await createClient().auth.signOut({ scope: "others" });
        setBusy(false);
        if (error) { toast.error("We couldn't sign out your other devices. Please try again."); return; }
        toast.success("Signed out on your other devices");
        void load();
    };

    const otherCount = (rows ?? []).filter(r => r.id !== current).length;

    return (
        <Card title="Where you're signed in" action={otherCount > 0 && <TwoTap sm kind="ghost" label="Sign out other devices" onConfirm={() => void others()} disabled={busy} />}>
            {failed && <ErrorState what="where you're signed in" onRetry={() => void load()} body="Nothing was changed. Try again in a moment." />}
            {!failed && rows === null && <SkeletonRows n={2} cols={3} />}
            {rows && <div className="rows">
                {rows.length === 0 && <div className="card-body sm muted">Only this device.</div>}
                {rows.map(r => (
                    <div className="row" key={r.id}>
                        <div className="row-main">
                            <div className="row-title">{device(r.user_agent)}{r.id === current ? " · this device" : ""}</div>
                            <div className="row-sub">Last active {ago(r.last_active_at)} · signed in {ago(r.created_at)}{r.aal === "aal2" ? " · with a code" : ""}</div>
                        </div>
                        {r.id === current && <Badge tone="ok">Now</Badge>}
                    </div>
                ))}
            </div>}
        </Card>
    );
}
