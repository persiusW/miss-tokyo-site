import { test, expect } from "@playwright/test";
import { clientIp, inboundSecretMatches, MAX_INBOUND_BYTES, MIN_SECRET_LENGTH, readCapped, redactHeaders } from "../../../src/lib/whatsapp/inbound";

const SECRET = "a".repeat(MIN_SECRET_LENGTH) + "Zq9";

test("the callback secret must match exactly, and an unset or short secret opens nothing", () => {
    expect(inboundSecretMatches(SECRET, SECRET)).toBe(true);
    expect(inboundSecretMatches(SECRET + "x", SECRET)).toBe(false);
    expect(inboundSecretMatches(SECRET.slice(0, -1), SECRET)).toBe(false);
    expect(inboundSecretMatches("", SECRET)).toBe(false);
    expect(inboundSecretMatches(undefined, SECRET)).toBe(false);
    expect(inboundSecretMatches(SECRET, undefined)).toBe(false);
    expect(inboundSecretMatches(SECRET, "")).toBe(false);
    const short = "s".repeat(MIN_SECRET_LENGTH - 1);
    expect(inboundSecretMatches(short, short)).toBe(false);
});

test("credentials are redacted from stored headers; signatures and routing headers are kept", () => {
    const h = new Headers({
        authorization: "Bearer abc", cookie: "sb=1", "x-api-key": "k", apikey: "k2", "x-auth-token": "t",
        "x-vercel-protection-bypass": "b", "x-webhook-secret": "s",
        "content-type": "application/json", "user-agent": "ChatbotsAfrica/1.0", "x-forwarded-for": "1.2.3.4",
        "x-signature": "sha256=deadbeef", "x-hub-signature-256": "sha256=feed",
    });
    const out = redactHeaders(h);
    for (const k of ["authorization", "cookie", "x-api-key", "apikey", "x-auth-token", "x-vercel-protection-bypass", "x-webhook-secret"]) {
        expect(out[k], k).toBe("[redacted]");
    }
    expect(out["content-type"]).toBe("application/json");
    expect(out["user-agent"]).toBe("ChatbotsAfrica/1.0");
    expect(out["x-forwarded-for"]).toBe("1.2.3.4");
    expect(out["x-signature"]).toBe("sha256=deadbeef");
    expect(out["x-hub-signature-256"]).toBe("sha256=feed");
});

test("the caller address is the first forwarded hop", () => {
    expect(clientIp(new Headers({ "x-forwarded-for": "41.66.1.2, 10.0.0.1" }))).toBe("41.66.1.2");
    expect(clientIp(new Headers({ "x-real-ip": "41.66.1.3" }))).toBe("41.66.1.3");
    expect(clientIp(new Headers())).toBe(null);
});

test("the body is read exactly, and anything over the cap is refused", async () => {
    const body = '{"from":"233241234567","text":"Akwaaba — ₵150?"}';
    expect(await readCapped(new Request("http://x/", { method: "POST", body }), MAX_INBOUND_BYTES)).toBe(body);
    expect(await readCapped(new Request("http://x/", { method: "POST", body: "" }), MAX_INBOUND_BYTES)).toBe("");
    expect(await readCapped(new Request("http://x/", { method: "POST", body: "x".repeat(11) }), 10)).toBe(null);
    // A lying content-length is refused up front.
    expect(await readCapped(new Request("http://x/", { method: "POST", body: "x", headers: { "content-length": String(MAX_INBOUND_BYTES + 1) } }), MAX_INBOUND_BYTES)).toBe(null);
    // Multi-byte characters count as bytes, not characters.
    expect(await readCapped(new Request("http://x/", { method: "POST", body: "₵₵₵₵" }), 10)).toBe(null);
});
