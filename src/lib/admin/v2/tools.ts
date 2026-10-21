// Admin Tools: the admin role only. Owners and sales staff get <Denied/> on
// every page and a refusal from every action; the menu item is hidden from
// them too, but that is not the gate. Pure parts here; the server checks call
// requireV2Page("tools", …, ["admin"]) on pages and toolsAdmin() in actions.

export const TOOLS_TABS = [
    { v: "payouts", l: "Payouts" },
    { v: "fees", l: "Fees" },
    { v: "rates", l: "Rates and markup" },
    { v: "agents", l: "Agents" },
    { v: "whatsapp", l: "WhatsApp" },
    { v: "payments", l: "Payments" },
    { v: "messages", l: "Messages" },
    { v: "switches", l: "Switches" },
    { v: "system", l: "System" },
    { v: "devices", l: "Devices" },
    { v: "money", l: "Refunds" },
] as const;

export type ToolsTab = (typeof TOOLS_TABS)[number]["v"];

export const toolsHref = (t: ToolsTab) => (t === "payouts" ? "/tools" : `/tools/${t}`);

export function isToolsTab(t: string): t is ToolsTab {
    return TOOLS_TABS.some(x => x.v === t);
}

/** The one rule every Admin Tools page and action applies on the server. */
export function toolsAllowed(role: string | null | undefined): boolean {
    return role === "admin";
}
