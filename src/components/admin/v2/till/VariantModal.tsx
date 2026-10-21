"use client";

// Pick size, colour and brand for a product, then add it to the sale. Every
// dimension the product has is asked for: a line that leaves one out matches no
// variant row and reads as sold out (memory: pos-variant-key-parity).
// One option is shown as text (already chosen), up to six as chips, more as a select.
import { useMemo, useState } from "react";
import { Btn, Chip, Field, Modal, Select, ghs } from "@/components/admin/ui";
import { variantAvailable, type TillProduct } from "@/lib/admin/v2/till";

export type Pick = { size: string | null; color: string | null; brand: string | null };
const CHIP_LIMIT = 6;

function OptionRow({ label, options, value, onChange }: { label: string; options: string[]; value: string | null; onChange: (v: string) => void }) {
    if (options.length === 0) return null;
    if (options.length === 1) return <Field label={label}><div className="till-opt-one">{options[0]}</div></Field>;
    if (options.length > CHIP_LIMIT) {
        return <Field label={label}><Select label={label} value={value ?? options[0]} onChange={onChange} options={options} /></Field>;
    }
    return (
        <Field label={label}>
            <div className="chips" role="group" aria-label={label}>
                {options.map(o => <Chip key={o} pressed={value === o} onClick={() => onChange(o)}>{o}</Chip>)}
            </div>
        </Field>
    );
}

/** The first pick that has stock, so the modal opens on something sellable. */
function firstPick(p: TillProduct): Pick {
    const sizes = p.sizes.length ? p.sizes : [null];
    const colors = p.colors.length ? p.colors : [null];
    const brands = p.brands.length ? p.brands : [null];
    if (p.variantTracked && !p.preorder) {
        for (const size of sizes) for (const color of colors) for (const brand of brands) {
            if ((variantAvailable(p, { size, color, brand }) ?? 0) > 0) return { size, color, brand };
        }
    }
    return { size: sizes[0], color: colors[0], brand: brands[0] };
}

/** Units of this product (and pick, when it's counted per variant) already in the sale. */
export type InSale = (pick: Pick | null) => number;

export function VariantModal({ product, onClose, onAdd, inSale }: { product: TillProduct; onClose: () => void; onAdd: (pick: Pick) => void; inSale: InSale }) {
    const [pick, setPick] = useState<Pick>(() => firstPick(product));
    const set = (k: keyof Pick) => (v: string) => setPick(p => ({ ...p, [k]: v }));
    const label = [pick.size, pick.color, pick.brand].filter(Boolean).join(" / ");

    const stock = useMemo((): { text: string; tone: "help" | "err-text"; blocked: boolean } => {
        if (product.preorder) return { text: "Pre-order: it ships when the stock arrives. No stock is held.", tone: "help", blocked: false };
        if (!product.tracked) return { text: "Stock isn't counted for this product.", tone: "help", blocked: false };
        const total = product.variantTracked ? variantAvailable(product, pick) : product.available;
        if (total == null) return { text: `${label || "This choice"} isn't stocked. Pick another option.`, tone: "err-text", blocked: true };
        const held = inSale(product.variantTracked ? pick : null);
        const left = total - held;
        if (left <= 0) {
            return { text: held > 0 ? `All ${total} ${label ? `in ${label} ` : ""}are already in this sale.` : `${label || product.name} is sold out.`, tone: "err-text", blocked: true };
        }
        return { text: `${left} in stock${held > 0 ? ` (${held} more already in this sale)` : ""}`, tone: "help", blocked: false };
    }, [product, pick, label, inSale]);

    return (
        <Modal open onClose={onClose} title={product.name}
            footer={<>
                <Btn kind="ghost" onClick={onClose}>Cancel</Btn>
                <Btn kind="primary" disabled={stock.blocked} onClick={() => onAdd(pick)} data-autofocus>Add to sale · {ghs(product.price)}</Btn>
            </>}>
            <div className="stack">
                <OptionRow label="Size" options={product.sizes} value={pick.size} onChange={set("size")} />
                <OptionRow label="Colour" options={product.colors} value={pick.color} onChange={set("color")} />
                <OptionRow label="Brand" options={product.brands} value={pick.brand} onChange={set("brand")} />
                <p className={stock.tone} role={stock.blocked ? "alert" : "status"}>{stock.text}</p>
            </div>
        </Modal>
    );
}
