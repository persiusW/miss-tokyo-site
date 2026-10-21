// What a guide entry calls a place in ANOTHER area. Products, Orders and the
// Till switch on separately from the rest of the new admin, so an entry for one
// area can't assume which admin its neighbours are in.
import { isOn, type AdminView } from "@/lib/ai/missTokyoAi/view";

export function placeNames(v: AdminView) {
    const settings = isOn(v, "settings");
    const till = isOn(v, "till");
    return {
        /** Global sizes, colours and brands. */
        options: settings ? "Settings › Product options" : "Site Settings → Store (global sizes, colours and brands)",
        /** How long a pay link holds the items. */
        payHold: settings ? "Settings › Payments › \"Pay links hold the stock for\"" : "Site Settings → Store → \"Payment Link Hold\"",
        /** Delivery fees. */
        deliveryFees: settings ? "Settings › Shipping and delivery" : "Site Settings → Store → Delivery Fees",
        /** Adding and editing riders. */
        riders: settings ? "Settings › Shipping and delivery › Manage riders" : "Site Settings → Riders (\"Add Rider\")",
        /** The processing fee. */
        fee: settings ? "Settings › Checkout › Processing fee" : "Site Settings → Store (platform fee %)",
        /** The custom requests switch. */
        requestsSwitch: settings ? "Settings › Shop pages › Custom requests" : "Site Settings → Store (feature toggles)",
        /** Online gift card page and limits. */
        giftCardPage: isOn(v, "content") ? "Content › Pages › Gift cards page" : "Site Settings → CMS → Gift Cards",
        /** Where manual stock write-offs are reported. */
        writeOffs: isOn(v, "analytics") ? "Analytics › Reports › Stock written off" : "the stock history",
        /** The till, by name. */
        till: till ? "the POS" : "Point of Sale",
        /** The till's list of today's sales. */
        tillHistory: till ? "POS › Today's sales" : "POS History",
        /** The customer list. */
        customers: isOn(v, "customers") ? "Customers" : "the Contact List",
        /** WhatsApp chats. */
        inbox: isOn(v, "inbox") ? "the Inbox" : "WhatsApp Chats",
    };
}
