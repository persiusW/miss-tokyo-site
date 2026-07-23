// Shared delivery-address options.
//
// Storefront checkout and the POS till must offer the same countries and
// regions, and write the same shipping_address shape, or an order placed at
// the till renders differently from one the customer placed themselves.

export const GHANA_REGIONS = [
    "Greater Accra", "Ashanti", "Western", "Central", "Eastern",
    "Volta", "Oti", "Bono", "Bono East", "Ahafo",
    "Northern", "Savannah", "North East", "Upper East", "Upper West", "Western North",
];

export const COUNTRIES = [
    "Ghana",
    "Nigeria", "Côte d'Ivoire", "Togo", "Benin", "Burkina Faso",
    "Senegal", "Gambia", "Guinea", "Sierra Leone", "Liberia", "Mali", "Niger",
    "Cameroon", "Kenya", "Uganda", "Tanzania", "South Africa", "Ethiopia",
    "Egypt", "Morocco", "Tunisia", "Algeria",
    "United Kingdom", "United States", "Canada", "France", "Germany",
    "Italy", "Spain", "Netherlands", "Belgium", "Switzerland", "Sweden", "Norway",
    "Australia", "New Zealand", "India", "China", "Japan", "South Korea",
    "Brazil", "Mexico", "Argentina",
    "United Arab Emirates", "Saudi Arabia", "Qatar", "Kuwait", "Bahrain", "Oman",
    "Other",
];

export const DEFAULT_COUNTRY = "Ghana";
export const DEFAULT_REGION = "Greater Accra";

/**
 * The canonical orders.shipping_address shape. Every reader in the app looks
 * for `text` — a differently-keyed object renders as a blank address.
 */
export function buildShippingAddress(
    text: string | null | undefined,
    country?: string | null,
    region?: string | null,
): { text: string; country: string | null; region: string | null } | null {
    const trimmed = text?.trim();
    if (!trimmed) return null;
    return { text: trimmed, country: country || null, region: region || null };
}
