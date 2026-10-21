// Which links the shop's menu and phone tab bar show: the Content › Menu
// switches (site_settings.nav_show_*) and the Settings › Shop pages switches
// (store_settings.enable_gallery / enable_gift_cards). A link shows only when
// both say so. Pure: the shop layout loads the rows (cached, tag NAV_TAG).
import { NAV_KEYS, type NavKey } from "./adminInput";

export const NAV_TAG = "shop-nav";

export type ShopNav = { links: Record<NavKey, boolean>; gallery: boolean; giftCards: boolean };

export const DEFAULT_NAV: ShopNav = {
    links: Object.fromEntries(NAV_KEYS.map(k => [k, true])) as Record<NavKey, boolean>,
    gallery: true,
    giftCards: true,
};

/**
 * The menu as the old NavBar read it: with the settings row, each switch as
 * saved (an empty one hides its link); without it, every link. A page switch
 * hides its link only when it is explicitly off.
 */
export function shopNavFrom(site: Partial<Record<NavKey, boolean | null>> | null | undefined, store: { enable_gallery?: boolean | null; enable_gift_cards?: boolean | null } | null | undefined): ShopNav {
    const links = site
        ? (Object.fromEntries(NAV_KEYS.map(k => [k, site[k] === true])) as Record<NavKey, boolean>)
        : { ...DEFAULT_NAV.links };
    return { links, gallery: store?.enable_gallery !== false, giftCards: store?.enable_gift_cards !== false };
}

/** Whether a menu link shows. Gallery and Gift cards also need their page on. */
export function navLinkShown(nav: ShopNav, key: NavKey): boolean {
    if (!nav.links[key]) return false;
    if (key === "nav_show_gallery") return nav.gallery;
    if (key === "nav_show_gift_card") return nav.giftCards;
    return true;
}

/** Whether the phone tab bar shows a tab. It has no menu switches, only pages. */
export function tabShown(nav: ShopNav, href: string): boolean {
    if (href === "/gallery") return nav.gallery;
    if (href === "/gift-cards") return nav.giftCards;
    return true;
}
