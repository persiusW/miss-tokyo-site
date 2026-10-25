import { test, expect } from "@playwright/test";
import { PERMS, assignableRoles, canManageRole, inviteRolesFor, permsFor, seesAdmins } from "../../../src/components/admin/v2/staff/staffCopy";
import { hideAdminRows } from "../../../src/lib/admin/activityText";

// Admin is the developer's role: only an admin sees, makes, changes or removes
// an admin. Owners and sales staff never see the Admin column, admin-only rows,
// the Admin option, an admin's account or an admin's activity.

test("only an admin sees admins", () => {
    expect(seesAdmins("admin")).toBe(true);
    for (const r of ["owner", "sales_staff", "customer", "", null, undefined]) expect(seesAdmins(r)).toBe(false);
});

test("an owner can't act on an admin or hand out the admin role", () => {
    expect(canManageRole("owner", "admin")).toBe(false);
    expect(canManageRole("owner", "sales_staff")).toBe(true);
    expect(canManageRole("owner", "owner")).toBe(true);
    expect(canManageRole("owner", null)).toBe(true);
    expect(canManageRole("admin", "admin")).toBe(true);
    expect(assignableRoles("owner")).toEqual(["owner", "sales_staff"]);
    expect(assignableRoles("admin")).toEqual(["owner", "admin", "sales_staff"]);
    expect(inviteRolesFor("owner")).toEqual(["sales_staff"]);
    expect(inviteRolesFor("admin")).toEqual(["sales_staff", "admin"]);
});

test("owners get the role table without the Admin column or admin-only rows", () => {
    const owner = permsFor("owner");
    expect(owner.columns).toEqual(["owner", "sales_staff"]);
    expect(owner.rows.some(r => /markup|Admin tools/i.test(r.area))).toBe(false);
    expect(owner.rows.some(r => r.area === "Staff and billing")).toBe(true);
    // Every row an owner or sales staff can use is still there.
    expect(owner.rows).toEqual(PERMS.filter(r => r.owner !== "no" || r.sales !== "no"));

    const admin = permsFor("admin");
    expect(admin.columns).toEqual(["owner", "admin", "sales_staff"]);
    expect(admin.rows).toEqual(PERMS);
});

test("activity reads leave out admin rows unless the viewer is an admin", () => {
    const calls: [string, string][] = [];
    const q = { neq(c: string, v: string) { calls.push([c, v]); return q; } };
    expect(hideAdminRows(q, "admin")).toBe(q);
    expect(calls).toEqual([]);
    for (const viewer of ["owner", "sales_staff"]) expect(hideAdminRows(q, viewer)).toBe(q);
    expect(calls).toEqual([["user_role", "admin"], ["user_role", "admin"]]);
});
