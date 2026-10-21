"use client";

// The Orders header and its three route tabs, shared by the list, Abandoned
// checkouts and Invoices and pay links (owners and admins only).
import type { ReactNode } from "react";
import { BtnLink, PageHeader, Tabs } from "@/components/admin/ui";

export type OrdersTab = "orders" | "abandoned" | "invoices";

export function OrdersHeader({ tab, role, abandoned, actions }: { tab: OrdersTab; role: string; abandoned: number | null; actions?: ReactNode }) {
    const full = role === "owner" || role === "admin";
    return (
        <>
            <PageHeader title="Orders" sub="Every order from the shop, the till, WhatsApp and pay links, in one list."
                actions={<>{actions}<BtnLink kind="primary" icon="plus" href="/till">Create order</BtnLink></>} />
            <Tabs label="Orders sections" value={tab} tabs={[
                { v: "orders", l: "Orders", href: "/orders" },
                { v: "abandoned", l: "Abandoned checkouts", c: abandoned, href: "/orders/abandoned" },
                ...(full ? [{ v: "invoices" as const, l: "Invoices and pay links", href: "/orders/invoices" }] : []),
            ]} />
        </>
    );
}
