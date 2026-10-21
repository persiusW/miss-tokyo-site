"use client";

import { useState } from "react";
import { Badge, Card, ConfirmPanel, ErrorState, SRow, Switch } from "@/components/admin/ui";
import { SWITCHES, type SwitchKey } from "./switchList";
import { setSwitch } from "./actions";
import { useRun } from "./useRun";

const GROUPS = ["Admin", "Payments", "Shop", "Assistants"] as const;

export function SwitchesTab({ values }: { values: Record<string, boolean> | null }) {
    const { busy, run } = useRun();
    const [ask, setAsk] = useState<{ key: SwitchKey; on: boolean } | null>(null);
    if (!values) return <Card><ErrorState what="the switches" /></Card>;
    const def = ask ? SWITCHES.find(s => s.key === ask.key) : null;
    const flip = (key: SwitchKey, on: boolean) => {
        const d = SWITCHES.find(s => s.key === key);
        if (d && "danger" in d) setAsk({ key, on }); else void run(key, () => setSwitch(key, on), "Saved.");
    };
    return (
        <>
            {GROUPS.map(g => (
                <Card key={g} title={g}>
                    <div className="rows">
                        {SWITCHES.filter(s => s.group === g).map(s => (
                            <SRow key={s.key} label={<>{s.label}{"danger" in s && <> <Badge plain>asks first</Badge></>}</>} help={s.help}>
                                <Switch label={s.label} checked={values[s.key] === true} disabled={!!busy} onChange={v => flip(s.key, v)} />
                            </SRow>
                        ))}
                    </div>
                </Card>
            ))}
            {def && ask && "danger" in def && (
                <ConfirmPanel open onClose={() => setAsk(null)} title={`${ask.on ? "Turn on" : "Turn off"}: ${def.label}?`} tone={ask.on ? "danger" : "warn"}
                    confirmLabel={ask.on ? "Turn on" : "Turn off"} busy={busy === ask.key} consequenceTitle="What happens" consequence={ask.on ? def.danger.on : def.danger.off}
                    onConfirm={() => run(ask.key, () => setSwitch(ask.key, ask.on), "Saved.").then(() => setAsk(null))} />
            )}
        </>
    );
}
