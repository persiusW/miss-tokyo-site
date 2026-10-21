"use client";

import { useState } from "react";
import { Badge, Btn, Card, ErrorState, Kpi, Money, SRow, Switch, ghs, plural } from "@/components/admin/ui";
import { AI_MODEL, PRICE_USD_PER_MTOK, USD_TO_GHS } from "@/lib/ai/pricing";
import { RecentTurns } from "../settings/AssistantCards";
import { AiInsightCards } from "../settings/InsightCards";
import type { AiActivity } from "../settings/load";
import type { AgentsData } from "./data";
import { saveAgentLimits } from "./actions";
import { useRun } from "./useRun";
import { BtnLink } from "@/components/admin/ui";

const NUM: [string, string, string][] = [
    ["dashboard_cap_share_pct", "Miss Tokyo AI's share of the daily limit (%)", "The rest stays free for the shop chat and WhatsApp."],
    ["shop_assistant_cap_share_pct", "Shop and WhatsApp assistants' share (%)", "The most the customer chats can use of the daily limit."],
    ["dashboard_daily_messages_per_user", "Miss Tokyo AI questions per staff member per day", "The admin gets three times this."],
    ["shop_assistant_daily_messages_per_visitor", "Messages per shop visitor per day", "1 to 200."],
];

export function AgentsTab({ d, ai }: { d: AgentsData; ai: AiActivity | null }) {
    const { busy, run } = useRun();
    const v = d.ai.ok ? d.ai.data : {};
    const [f, setF] = useState<Record<string, string | boolean>>({
        daily_spend_cap_ghs: String(v.daily_spend_cap_ghs ?? ""),
        ...Object.fromEntries(NUM.map(([k]) => [k, String(v[k] ?? "")])),
        mtai_send_to_admin_enabled: v.mtai_send_to_admin_enabled === true,
    });
    const s = d.settings;
    const monthAtRate = ai?.month ? Math.round(ai.month.ghs / USD_TO_GHS * s.usdToGhs * 100) / 100 : null;

    return (
        <>
            <div className="grid-4">
                <Kpi label="AI today" value={ai?.todayGhs == null ? "—" : ghs(ai.todayGhs)} ctx={ai ? `of the ${ghs(ai.capGhs)} daily limit` : "couldn't read"} />
                <Kpi label={ai?.month?.label ?? "This month"} value={monthAtRate == null ? "—" : ghs(monthAtRate)} ctx={ai?.month ? `model cost at GH₵ ${s.usdToGhs} per $, ${plural(ai.month.turns, "reply", "replies")}` : "couldn't read"} />
                <Kpi label="Markup on the bill" value={`${s.markupPct}%`} ctx="one markup for every line (Rates)" />
                <Kpi label="Model" value={AI_MODEL.replace(/^claude-/, "")} ctx={`$${PRICE_USD_PER_MTOK.input} in / $${PRICE_USD_PER_MTOK.output} out per million tokens`} />
            </div>

            <Card title="Limits" action={<Badge plain>The owner keeps the on and off switches in Settings</Badge>}>
                {!d.ai.ok ? <ErrorState what="the AI settings" /> : <>
                    <div className="rows">
                        <SRow label="Daily AI spending limit" help="Shared by every assistant; they stop for the day when it's reached. Ghana midnight. Uses the fixed rate of GH₵ 15.50 per $, whatever the billing dollar rate is.">
                            <Money label="Daily AI spending limit" value={String(f.daily_spend_cap_ghs)} onChange={x => setF({ ...f, daily_spend_cap_ghs: x })} />
                        </SRow>
                        {NUM.map(([k, l, h]) => (
                            <SRow key={k} label={l} help={h}>
                                <input className="input" inputMode="numeric" aria-label={l} style={{ width: 100 }} value={String(f[k])} onChange={e => setF({ ...f, [k]: e.target.value.replace(/\D/g, "") })} />
                            </SRow>
                        ))}
                        <SRow label="Questions for the admin" help="When Miss Tokyo AI can't answer, staff can send the question to the admin (Inbox › Questions for admin).">
                            <Switch label="Questions for the admin" checked={f.mtai_send_to_admin_enabled === true} onChange={x => setF({ ...f, mtai_send_to_admin_enabled: x })} />
                        </SRow>
                        <SRow label="Cost markup" help="Now the one markup on the features bill."><BtnLink sm href="/tools/rates">Rates and markup</BtnLink></SRow>
                    </div>
                    <div className="card-body"><Btn kind="primary" disabled={!!busy} onClick={() => run("limits", () => saveAgentLimits(f), "Limits saved.")}>{busy === "limits" ? "Saving…" : "Save limits"}</Btn></div>
                </>}
            </Card>

            <RecentTurns ai={ai} />
            <AiInsightCards />
        </>
    );
}
