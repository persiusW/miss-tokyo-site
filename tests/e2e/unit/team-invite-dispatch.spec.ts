import { test, expect } from "@playwright/test";
import { dispatchInvite } from "../../../src/lib/teamInviteDispatch";

function sends({ emailOk = true, smsOk = true }: { emailOk?: boolean; smsOk?: boolean } = {}) {
    const calls: string[] = [];
    return {
        calls,
        deps: {
            email: async () => { calls.push("email"); return emailOk; },
            whatsapp: async () => { calls.push("whatsapp"); },
            sms: async () => { calls.push("sms"); if (!smsOk) throw new Error("rejected"); },
        },
    };
}

test("a failed email no longer stops the SMS", async () => {
    const { calls, deps } = sends({ emailOk: false });
    const r = await dispatchInvite(true, deps);
    expect(calls).toContain("sms");
    expect(r).toEqual({ success: true, warning: "SMS sent, but the email failed." });
});

test("email and SMS both failing is a failure", async () => {
    const { deps } = sends({ emailOk: false, smsOk: false });
    expect((await dispatchInvite(true, deps)).success).toBe(false);
});

test("no phone and a failed email is a failure, with no SMS tried", async () => {
    const { calls, deps } = sends({ emailOk: false });
    expect((await dispatchInvite(false, deps)).success).toBe(false);
    expect(calls).toEqual(["email"]);
});

test("email sent and SMS failed keeps the existing warning", async () => {
    const { deps } = sends({ smsOk: false });
    expect(await dispatchInvite(true, deps)).toEqual({ success: true, warning: "Email sent, but SMS failed." });
});

test("everything sent is a plain success", async () => {
    const { calls, deps } = sends();
    expect(await dispatchInvite(true, deps)).toEqual({ success: true });
    expect(calls).toEqual(["email", "whatsapp", "sms"]);
});

test("an email call that throws still reaches the SMS", async () => {
    const { calls, deps } = sends();
    const r = await dispatchInvite(true, { ...deps, email: async () => { throw new Error("boom"); } });
    expect(calls).toContain("sms");
    expect(r.success).toBe(true);
});
