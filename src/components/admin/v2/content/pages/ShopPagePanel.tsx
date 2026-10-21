"use client";

import { useState } from "react";
import { Btn, Panel, toast } from "@/components/admin/ui";
import type { SeoIn } from "@/lib/content/adminInput";
import { publishShopPage } from "../actions";
import { SeoCard, run } from "../shared";
import { pageById } from "../pagesList";

/** The shop page lists products, so only its search-engine text is edited here. */
export function ShopPagePanel({ seo: seo0, onClose, onSaved }: { seo: SeoIn; onClose: () => void; onSaved: () => void }) {
    const page = pageById("shop")!;
    const [seo, setSeo] = useState(seo0);
    const [saving, setSaving] = useState(false);

    const publish = async () => {
        setSaving(true);
        const r = await run(publishShopPage(seo));
        setSaving(false);
        if (!r?.ok) return;
        toast.success("Shop page published");
        onSaved();
    };

    return (
        <Panel open wide onClose={onClose} title="Shop page" sub={`misstokyo.shop${page.path}`}
            footer={<>
                <Btn kind="ghost" onClick={onClose} disabled={saving}>Cancel</Btn>
                <Btn kind="primary" onClick={publish} disabled={saving}>{saving ? "Publishing…" : "Publish"}</Btn>
            </>}>
            <p className="help">The shop page shows your products. Its banner is in Shop wording › Images. A category&rsquo;s page (for example /shop?category=dresses) keeps its own title, made from the category&rsquo;s name.</p>
            <SeoCard path={page.path} value={seo} onChange={setSeo} fallbackTitle={page.seoTitle} />
        </Panel>
    );
}
