import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { v2AreaOn } from "@/lib/admin/v2/server";
import { CustomersV2 } from "@/components/admin/v2/customers/CustomersRoute";
import { keyFromPath } from "@/lib/admin/v2/customers";
import LegacyCustomerProfile from "./LegacyCustomerProfile";

export const metadata: Metadata = { title: "Customer" };
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

// Shared path, keyed by the customer's email as it always has been: the old
// profile page while the Customers area is off; once it's on, the list with
// this customer's panel open.
export default async function CustomerRoute({ params, searchParams }: Params) {
    if (!(await v2AreaOn("customers"))) return <LegacyCustomerProfile params={params} />;
    const { id } = await params;
    const key = keyFromPath(`/customers/${id}`);
    if (!key) redirect("/customers");
    return <CustomersV2 searchParams={await searchParams} openKey={key} />;
}
