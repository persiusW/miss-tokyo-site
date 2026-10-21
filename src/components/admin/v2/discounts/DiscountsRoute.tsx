// The new Discounts page, for /discounts and /discounts/<id> (the panel open
// over the list). Server component: checks the role and loads every code,
// automatic discount and their results; the list filters in the browser.
import { Suspense } from "react";
import { requireV2Page } from "@/lib/admin/v2/server";
import { logCause } from "@/lib/errors/apiError";
import { parseListQuery } from "@/lib/admin/v2/discounts";
import { kindOf, loadDiscountData, type DiscountData } from "@/lib/admin/v2/discountsLoad";
import { DiscountsPage } from "./DiscountsPage";

type SP = Record<string, string | string[] | undefined>;

export async function DiscountsV2({ searchParams, openId }: { searchParams: SP; openId: string | null }) {
    // Signs out and redirects anyone who isn't staff; every staff role can change discounts
    await requireV2Page("discounts", openId ? `/discounts/${encodeURIComponent(openId)}` : "/discounts");
    let data: DiscountData | null = null;
    try {
        data = await loadDiscountData();
    } catch (e) {
        logCause("GEN-00", e, { where: "discounts.list" });
    }
    // A link to a discount that has since been deleted opens the list with a note
    let missing = false;
    if (openId && data) missing = !(await kindOf(openId).catch(() => null));
    return (
        <Suspense>
            <DiscountsPage query={parseListQuery(searchParams)} data={data} missing={missing} />
        </Suspense>
    );
}
