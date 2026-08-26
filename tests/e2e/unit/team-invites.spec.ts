import { test, expect } from "@playwright/test";
import { findAccountByEmail, isEmailTakenError, isProtectedAccount } from "../../../src/lib/teamInvites";

// A re-invited team member always trips the "already registered" error, because
// removing them leaves their auth user alone. These lock in the recognition of
// that error, the lookup that follows it, and the accounts it must refuse.

test.describe("isEmailTakenError", () => {
    test("recognises the GoTrue error code", () => {
        expect(isEmailTakenError({ code: "email_exists", message: "" })).toBe(true);
    });

    test("recognises both wordings GoTrue uses", () => {
        expect(isEmailTakenError({ message: "A user with this email address has already been registered" })).toBe(true);
        expect(isEmailTakenError({ message: "User already exists" })).toBe(true);
    });

    test("leaves every other failure alone", () => {
        expect(isEmailTakenError({ message: "Password should be at least 6 characters" })).toBe(false);
        expect(isEmailTakenError(null)).toBe(false);
        expect(isEmailTakenError(undefined)).toBe(false);
    });
});

test.describe("isProtectedAccount", () => {
    test("refuses to adopt an owner or admin", () => {
        expect(isProtectedAccount({ id: "1", role: "owner" })).toBe(true);
        expect(isProtectedAccount({ id: "2", role: "admin" })).toBe(true);
    });

    test("allows the accounts an invite is actually for", () => {
        expect(isProtectedAccount({ id: "3", role: "customer" })).toBe(false);
        expect(isProtectedAccount({ id: "4", role: "sales_staff" })).toBe(false);
    });
});

/** Records the address the profiles lookup was given, and answers with `row`. */
function fakeAdmin(row: { id: string; role: string } | null) {
    const seen: string[] = [];
    const admin = {
        seen,
        listUsersCalls: 0,
        from() {
            return {
                select() { return this; },
                eq(_column: string, value: string) { seen.push(value); return this; },
                maybeSingle: async () => ({ data: row }),
            };
        },
        auth: {
            admin: {
                listUsers: async () => {
                    admin.listUsersCalls++;
                    return { data: { users: [] }, error: null };
                },
            },
        },
    };
    return admin;
}

test.describe("findAccountByEmail", () => {
    test("finds the account on the indexed profiles read", async () => {
        const admin = fakeAdmin({ id: "abc", role: "customer" });
        const found = await findAccountByEmail(admin as any, "Osman@Example.COM");

        expect(found).toEqual({ id: "abc", role: "customer" });
        // A capitalised invite address must still find the lower-cased account.
        expect(admin.seen).toEqual(["osman@example.com"]);
        // Paging every customer to answer this would be the slow way round.
        expect(admin.listUsersCalls).toBe(0);
    });

    test("returns null when nothing matches", async () => {
        const admin = fakeAdmin(null);
        expect(await findAccountByEmail(admin as any, "nobody@example.com")).toBeNull();
    });

    test("falls back to the auth list when the profile row is missing", async () => {
        const admin = fakeAdmin(null);
        await findAccountByEmail(admin as any, "nobody@example.com");
        expect(admin.listUsersCalls).toBe(1);
    });
});
