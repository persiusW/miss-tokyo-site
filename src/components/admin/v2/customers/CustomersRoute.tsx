// The new Customers page, for /customers and /customers/<email> (the panel
// open over the list). Server component: checks the role, loads one page of
// the list, the chip counts and, for a direct link, the customer.
import { Suspense } from "react";
import { requireV2Page } from "@/lib/admin/v2/server";
import { logCause } from "@/lib/errors/apiError";
import { customerHref, parseListQuery } from "@/lib/admin/v2/customers";
import { loadCustomerDetail, loadCustomerList, loadKnownTags, loadSegmentCounts, type CustomerDetail } from "@/lib/admin/v2/customersLoad";
import { CustomersPage, type ListData } from "./CustomersPage";

type SP = Record<string, string | string[] | undefined>;

export async function CustomersV2({ searchParams, openKey }: { searchParams: SP; openKey: string | null }) {
    const auth = await requireV2Page("customers", openKey ? customerHref(openKey) : "/customers");
    const query = parseListQuery(searchParams);

    let data: ListData | null = null;
    try {
        const [list, counts, tags] = await Promise.all([loadCustomerList(query), loadSegmentCounts(query), loadKnownTags()]);
        data = { ...list, counts, tags };
    } catch (e) {
        logCause("GEN-00", e, { where: "customers.list" });
    }

    let detail: CustomerDetail | null | "error" = null;
    if (openKey) {
        try {
            detail = await loadCustomerDetail(openKey);
        } catch (e) {
            logCause("GEN-00", e, { where: "customers.detail" });
            detail = "error";
        }
    }

    return (
        <Suspense>
            <CustomersPage role={auth.role} meId={auth.userId} query={query} data={data} initialKey={openKey} initialDetail={detail} />
        </Suspense>
    );
}
