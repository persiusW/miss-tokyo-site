import type { Metadata } from "next";
import { TillV2 } from "@/components/admin/v2/till/TillRoute";

export const metadata: Metadata = { title: "Till" };
export const dynamic = "force-dynamic";

// /till (was /pos). ?customer=<email or phone> starts the sale for that customer.
export default async function TillRoute({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
    return <TillV2 searchParams={await searchParams} />;
}
