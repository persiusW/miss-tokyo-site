import { test, expect } from "@playwright/test";
import fs from "fs";
import path from "path";
import { staffPushRecipients } from "../../../src/lib/staffPushRecipients";

// Staff pushes carry customer names and totals. A former staff member's
// subscription row outlived their removal and kept receiving them.

const sub = (user_id: string | null, n: number) => ({ user_id, endpoint: `https://push.example/${n}`, p256dh: "k", auth: "a" });

test("only subscriptions whose owner is staff right now receive staff pushes", () => {
    const subs = [sub("admin1", 1), sub("owner1", 2), sub("sales1", 3), sub("former", 4), sub(null, 5), sub("ghost", 6), sub("sales1", 7)];
    const profiles = [
        { id: "admin1", role: "admin" },
        { id: "owner1", role: "owner" },
        { id: "sales1", role: "sales_staff" },
        { id: "former", role: "customer" },
    ];
    expect(staffPushRecipients(subs, profiles).map(s => s.endpoint)).toEqual([
        "https://push.example/1", "https://push.example/2", "https://push.example/3", "https://push.example/7",
    ]);
});

test("no profiles read means nobody is sent to", () => {
    expect(staffPushRecipients([sub("admin1", 1)], [])).toEqual([]);
});

test("the sender filters by current role and fails closed", () => {
    const src = fs.readFileSync(path.resolve(__dirname, "../../../src/lib/orderSettlement.ts"), "utf8");
    const fn = src.slice(src.indexOf("export async function sendAdminPushNotifications"));
    const body = fn.slice(0, fn.indexOf("\n}\n"));
    expect(body).toContain("staffPushRecipients(rows, owners)");
    expect(body).toContain("if (ownersError || !owners) return;");
    // Every send goes through the filtered list.
    expect(body).toMatch(/subs\.map\(sub =>\s*webpush\.sendNotification/);
});
