"use client";

// Content › Menu: which links the shop's top menu shows. Each switch saves at once.
import Link from "next/link";
import { useState } from "react";
import { Card, SRow, Switch } from "@/components/admin/ui";
import { NAV_KEYS, type NavKey } from "@/lib/content/adminInput";
import type { MenuData } from "./data";
import { setNavShown } from "./actions";
import { quickSwitch } from "./shared";

const LABELS: Record<NavKey, { l: string; path: string }> = {
    nav_show_home: { l: "Home", path: "/" },
    nav_show_shop: { l: "Shop", path: "/shop" },
    nav_show_gallery: { l: "Gallery", path: "/gallery" },
    nav_show_sale: { l: "Sale", path: "/shop?sale=true" },
    nav_show_dresses: { l: "Dresses", path: "/shop?category=dresses" },
    nav_show_new_arrivals: { l: "New arrivals", path: "/shop?sort=newest" },
    nav_show_gift_card: { l: "Gift cards", path: "/gift-cards" },
    nav_show_contact: { l: "Contact", path: "/contact" },
    nav_show_about: { l: "About", path: "/about" },
};

export function MenuTab({ data }: { data: MenuData }) {
    const [nav, setNav] = useState(data.nav);
    const pageOff: Partial<Record<NavKey, string>> = {
        ...(data.pages.gallery ? {} : { nav_show_gallery: "gallery" }),
        ...(data.pages.giftCards ? {} : { nav_show_gift_card: "gift cards" }),
    };
    const showing = NAV_KEYS.filter(k => nav[k]).length;

    return (
        <Card title="Shop menu" action={<span className="help">Switches take effect straight away.</span>}>
            <div className="rows">
                {NAV_KEYS.map(k => {
                    const off = pageOff[k];
                    const { l, path } = LABELS[k];
                    return (
                        <SRow key={k} label={l}
                            help={off
                                ? <>The {off} page is switched off in <Link href="/settings" className="link-btn">Settings › Shop pages</Link>, so change it there first.</>
                                : <>Goes to {path}</>}>
                            <Switch label={`Show ${l} in the menu`} checked={nav[k]} disabled={!!off}
                                onChange={v => quickSwitch({
                                    value: v, apply: x => setNav(n => ({ ...n, [k]: x })), save: x => setNavShown(k, x),
                                    onMsg: `${l} link is now in the menu`, offMsg: `${l} link is hidden`,
                                })} />
                        </SRow>
                    );
                })}
            </div>
            {showing === 0 && <div className="card-body"><p className="help">Every link is hidden. Keep at least one so customers can find their way around.</p></div>}
        </Card>
    );
}
