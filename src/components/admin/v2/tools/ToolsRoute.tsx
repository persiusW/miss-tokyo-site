// Server: loads one Admin Tools tab and renders it inside the shared shell.
// Only reached after requireV2Page("tools", …, ["admin"]) in the page file.
import type { ToolsTab } from "@/lib/admin/v2/tools";
import { loadAiActivity } from "../settings/load";
import { ToolsShell } from "./ToolsShell";
import { loadAgents, loadAiValues, loadDevices, loadFees, loadMessages, loadPayouts, loadRates, loadRefunds, loadSwitches, loadSystem, unpaidCount7d } from "./data";
import { PayoutsTab } from "./PayoutsTab";
import { FeesTab } from "./FeesTab";
import { RatesTab } from "./RatesTab";
import { AgentsTab } from "./AgentsTab";
import { WhatsAppTab } from "./WhatsAppTab";
import { PaymentsTab } from "./PaymentsTab";
import { MessagesTab } from "./MessagesTab";
import { SwitchesTab } from "./SwitchesTab";
import { SystemTab } from "./SystemTab";
import { DevicesTab } from "./DevicesTab";
import { MoneyTab } from "./MoneyTab";

async function safe<T>(fn: () => Promise<T>, where: string): Promise<T | null> {
    try { return await fn(); } catch (e) { console.error(`[tools] ${where}`, String((e as Error)?.message ?? e).slice(0, 200)); return null; }
}

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

export async function ToolsRoute({ tab, search }: { tab: ToolsTab; search: Record<string, string | string[] | undefined> }) {
    let body: React.ReactNode;
    switch (tab) {
        case "payouts": body = <PayoutsTab d={await loadPayouts()} />; break;
        case "fees": body = <FeesTab d={await safe(loadFees, "fees")} />; break;
        case "rates": body = <RatesTab d={await loadRates()} />; break;
        case "agents": {
            const d = await loadAgents();
            body = <AgentsTab d={d} ai={await safe(() => loadAiActivity("admin", d.settings.markupPct), "ai activity")} />;
            break;
        }
        case "whatsapp": body = <WhatsAppTab ai={await safe(loadAiValues, "ai")} />; break;
        case "payments": body = <PaymentsTab unpaid7d={await safe(unpaidCount7d, "unpaid count")} />; break;
        case "messages": {
            const channel = one(search.channel), status = one(search.status);
            body = <MessagesTab d={await safe(() => loadMessages({ channel, status }), "messages")} channel={channel} status={status} />;
            break;
        }
        case "switches": body = <SwitchesTab values={await safe(loadSwitches, "switches")} />; break;
        case "system": body = <SystemTab d={await loadSystem()} />; break;
        case "devices": body = <DevicesTab rows={await safe(loadDevices, "devices")} />; break;
        case "money": body = <MoneyTab rows={await safe(loadRefunds, "refunds")} />; break;
    }
    return <ToolsShell tab={tab}>{body}</ToolsShell>;
}
