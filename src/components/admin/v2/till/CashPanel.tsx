"use client";

// Taking cash moves money and stock, so it goes through a confirmation panel
// that says what will happen. The change calculator is optional: staff can
// record the sale without typing what they were handed, but a typed amount
// that doesn't cover the total holds the button back.
import { Chip, ConfirmPanel, Field, Money, ghs, ghs0, plural } from "@/components/admin/ui";
import { changeDue, quickCash } from "@/lib/admin/v2/till";

export function CashPanel({ open, onClose, total, units, customer, receiptBy, received, setReceived, busy, onConfirm }: {
    open: boolean; onClose: () => void; total: number; units: number; customer: string; receiptBy: string;
    received: string; setReceived: (v: string) => void; busy: boolean; onConfirm: () => void;
}) {
    const got = Number(received);
    const typed = received.trim() !== "" && Number.isFinite(got);
    const change = typed ? changeDue(got, total) : null;
    return (
        <ConfirmPanel open={open} onClose={onClose} title={`Take ${ghs(total)} cash`} sub={customer}
            tone="warn" confirmLabel={`Record ${ghs(total)} cash`} cancelLabel="Back" busy={busy}
            confirmDisabled={change != null && change < 0} onConfirm={onConfirm}
            consequenceTitle="This records the sale now"
            consequence={`${ghs(total)} in cash for ${plural(units, "item")}. The order is made, the stock comes off and ${receiptBy}. It can't be undone from the POS: a mistake is refunded from the order.`}>
            <Field label="Cash received" htmlFor="till-cash" help="Optional. Type what you were handed to see the change.">
                <Money id="till-cash" value={received} onChange={setReceived} />
            </Field>
            <div className="chips" role="group" aria-label="Quick amounts">
                {quickCash(total).map(v => <Chip key={v} pressed={typed && got === v} onClick={() => setReceived(String(v))}>{ghs0(v)}</Chip>)}
                <Chip pressed={typed && got === total} onClick={() => setReceived(String(total))}>Exact</Chip>
            </div>
            <div className="inset hrow between" aria-live="polite">
                <span className="strong">{change != null && change < 0 ? "Still to collect" : "Change to give"}</span>
                <span className={`till-change${change != null && change < 0 ? " short" : ""}`}>
                    {change == null ? "—" : change < 0 ? `${ghs(-change)} short` : ghs(change)}
                </span>
            </div>
        </ConfirmPanel>
    );
}
