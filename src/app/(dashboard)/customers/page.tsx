import type { Metadata } from "next";
import { v2AreaOn } from "@/lib/admin/v2/server";
import { CustomersV2 } from "@/components/admin/v2/customers/CustomersRoute";
import LegacyCustomersPage from "./LegacyCustomersPage";

export const metadata: Metadata = { title: "Customers" };
export const dynamic = "force-dynamic";

// Shared path: the old Contact List while the Customers area is off, the new
// Customers list once it's on.
export default async function CustomersRoute({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
    if (!(await v2AreaOn("customers"))) return <LegacyCustomersPage />;
    return <CustomersV2 searchParams={await searchParams} openKey={null} />;
}
