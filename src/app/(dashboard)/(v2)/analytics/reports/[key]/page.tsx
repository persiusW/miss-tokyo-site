import { redirect } from "next/navigation";
import { requireV2Page } from "@/lib/admin/v2/server";
import { parseQuery, querySearch } from "@/lib/admin/v2/analytics";

export const dynamic = "force-dynamic";

// /analytics/reports/<key> (the handoff's URL map) opens the same page with
// that report's panel: /analytics?report=<key>, keeping any other query.
export default async function AnalyticsReportRoute({ params, searchParams }: {
    params: Promise<{ key: string }>;
    searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
    const { key } = await params;
    await requireV2Page("analytics", `/analytics/reports/${key}`);
    const query = parseQuery({ ...(await searchParams), report: key });
    redirect(`/analytics${querySearch(query)}`);
}
