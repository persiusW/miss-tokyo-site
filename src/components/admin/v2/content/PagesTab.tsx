"use client";

// Content › Pages: the shop's info pages, each in a wide panel with its text
// and its "Search engines" card, plus the product page switches.
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, Icon, SRow, Switch, when } from "@/components/admin/ui";
import { PDP_KEYS, type PdpKey } from "@/lib/content/adminInput";
import type { PolicyKey } from "@/lib/content/pageDocs";
import type { PagesData } from "./data";
import { setProductPagePart } from "./actions";
import { quickSwitch } from "./shared";
import { CONTENT_PAGES, type PageId } from "./pagesList";
import { AboutPanel } from "./pages/AboutPanel";
import { PolicyPanel } from "./pages/PolicyPanel";
import { FaqPanel } from "./pages/FaqPanel";
import { SizeGuidePanel } from "./pages/SizeGuidePanel";
import { GiftCardsPanel } from "./pages/GiftCardsPanel";
import { ShopPagePanel } from "./pages/ShopPagePanel";

const PDP: Record<PdpKey, { l: string; help: string }> = {
    pdp_show_trust_strip: { l: "Promise icons", help: "Free delivery, easy returns and secure payment icons under the buttons." },
    pdp_show_product_details: { l: "Product details", help: "The section with the description and features." },
    pdp_show_care_instructions: { l: "Care instructions", help: "The section with washing and care guidance." },
    pdp_show_delivery_returns: { l: "Delivery and returns", help: "The section with delivery times and the return policy." },
    pdp_show_reviews: { l: "Customer reviews", help: "Rating bars and review cards at the bottom of the page." },
};

const POLICY_IDS: PolicyKey[] = ["shipping", "refund", "privacy", "terms"];

export function PagesTab({ data }: { data: PagesData }) {
    const router = useRouter();
    const [open, setOpen] = useState<PageId | null>(null);
    const [pdp, setPdp] = useState(data.pdp);
    const close = () => setOpen(null);
    const saved = () => { setOpen(null); router.refresh(); };

    const status = (id: PageId): { sub: string } => {
        if ((POLICY_IDS as string[]).includes(id)) {
            const p = data.policies[id as PolicyKey];
            return p.saved ? { sub: `Edited ${when(p.updatedAt)}` } : { sub: "Original wording" };
        }
        if (id === "faq") return data.faq.saved ? { sub: `Edited ${when(data.faq.updatedAt)}` } : { sub: "Original questions" };
        if (id === "size-guide") return data.sizeGuide.updatedAt ? { sub: `Edited ${when(data.sizeGuide.updatedAt)}` } : { sub: "Original sizes" };
        if (id === "gift-cards") return { sub: data.giftCards.gc_enabled ? "Selling gift cards online" : "Shows “Coming soon”" };
        if (id === "shop") return { sub: "Search engine text" };
        return { sub: "Story, numbers, values, team" };
    };

    return (
        <>
            <Card title="Shop pages">
                <div className="rows">
                    {CONTENT_PAGES.map(p => {
                        const st = status(p.id);
                        return (
                            <button type="button" key={p.id} className="row click" onClick={() => setOpen(p.id)}>
                                <Icon n="content" style={{ width: 18, height: 18, color: "var(--ink-3)", flexShrink: 0 }} />
                                <div className="row-main">
                                    <div className="row-title">{p.name}</div>
                                    <div className="row-sub">{p.path} · {st.sub}</div>
                                </div>
                                <Icon n="chev" style={{ width: 16, height: 16, color: "var(--ink-3)" }} />
                            </button>
                        );
                    })}
                </div>
            </Card>

            <Card title="Product page" action={<span className="help">Switches take effect straight away.</span>}>
                <div className="rows">
                    {PDP_KEYS.map(k => (
                        <SRow key={k} label={PDP[k].l} help={PDP[k].help}>
                            <Switch label={`Show ${PDP[k].l.toLowerCase()} on product pages`} checked={pdp[k]}
                                onChange={v => quickSwitch({
                                    value: v, apply: x => setPdp(s => ({ ...s, [k]: x })), save: x => setProductPagePart(k, x),
                                    onMsg: `${PDP[k].l} now show on product pages`, offMsg: `${PDP[k].l} are hidden on product pages`,
                                })} />
                        </SRow>
                    ))}
                </div>
            </Card>

            {open === "shop" && <ShopPagePanel seo={data.seo["/shop"]} onClose={close} onSaved={saved} />}
            {open === "about" && <AboutPanel value={data.about} seo={data.seo["/about"]} onClose={close} onSaved={saved} />}
            {open && (POLICY_IDS as string[]).includes(open) && (
                <PolicyPanel k={open as PolicyKey} doc={data.policies[open as PolicyKey].doc} seo={data.seo[CONTENT_PAGES.find(p => p.id === open)!.path]} onClose={close} onSaved={saved} />
            )}
            {open === "faq" && <FaqPanel items={data.faq.items} seo={data.seo["/faq"]} onClose={close} onSaved={saved} />}
            {open === "size-guide" && <SizeGuidePanel page={data.sizeGuide.page} modalRows={data.sizeGuide.modalRows} seo={data.seo["/size-guide"]} onClose={close} onSaved={saved} />}
            {open === "gift-cards" && <GiftCardsPanel value={data.giftCards} seo={data.seo["/gift-cards"]} onClose={close} onSaved={saved} />}
        </>
    );
}
