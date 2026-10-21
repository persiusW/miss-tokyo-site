// The admin v2 side navigation: one list, two groups.
import type { IconName } from "@/components/admin/ui/Icon";

export type NavKey = "home" | "inbox" | "orders" | "till" | "products" | "customers" | "discounts" | "content" | "analytics" | "staff" | "billing" | "settings";

export type NavDef = {
    k: NavKey;
    label: string;
    href: string;
    icon: IconName;
    /** Owners and admins only. Hiding it is not access control: each page checks again. */
    full?: boolean;
    /** Old URLs that belong to this item, so it lights up during the rollout too. */
    legacy?: string[];
};

export const NAV_MAIN: NavDef[] = [
    { k: "home", label: "Home", href: "/home", icon: "home", legacy: ["/overview"] },
    { k: "inbox", label: "Inbox", href: "/inbox", icon: "inbox", legacy: ["/customers/whatsapp", "/customers/forms", "/customers/requests", "/ai/inbox"] },
    { k: "orders", label: "Orders", href: "/orders", icon: "orders", legacy: ["/sales/orders", "/sales/pre-orders", "/customers/abandoned", "/finance"] },
    { k: "till", label: "POS", href: "/till", icon: "till", legacy: ["/pos"] },
    { k: "products", label: "Products", href: "/catalogue", icon: "products", legacy: ["/catalog/products", "/catalog/categories", "/catalog/gift-cards"] },
    { k: "customers", label: "Customers", href: "/customers", icon: "customers", legacy: ["/sales/wholesalers"] },
    { k: "discounts", label: "Discounts", href: "/discounts", icon: "discounts", legacy: ["/catalog/discounts", "/catalog/auto-discounts"] },
    { k: "content", label: "Content", href: "/content", icon: "content", full: true, legacy: ["/cms"] },
    { k: "analytics", label: "Analytics", href: "/analytics", icon: "analytics", legacy: ["/sales/analytics", "/sales/payments", "/sales/riders"] },
];

export const NAV_GENERAL: NavDef[] = [
    { k: "staff", label: "Staff", href: "/staff", icon: "staff", full: true, legacy: ["/team"] },
    { k: "billing", label: "Billing", href: "/billing", icon: "billing", full: true },
    { k: "settings", label: "Settings", href: "/settings", icon: "settings", full: true, legacy: ["/seo", "/communications"] },
];

function under(path: string, prefix: string) {
    return path === prefix || path.startsWith(prefix + "/");
}

export function navActive(item: NavDef, pathname: string): boolean {
    // /customers/whatsapp is Inbox, not Customers.
    if (item.k === "customers" && ["/customers/whatsapp", "/customers/forms", "/customers/requests", "/customers/abandoned"].some(p => under(pathname, p))) return false;
    return under(pathname, item.href) || (item.legacy ?? []).some(p => under(pathname, p));
}

export const ROLE_LABEL: Record<string, string> = { owner: "Owner", admin: "Admin", sales_staff: "Sales staff" };
