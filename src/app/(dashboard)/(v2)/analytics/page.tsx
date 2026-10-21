import type { Metadata } from "next";
import { Suspense } from "react";
import { requireV2Page } from "@/lib/admin/v2/server";
import { AnalyticsPage } from "@/components/admin/v2/analytics/AnalyticsPage";

export const metadata: Metadata = { title: "Analytics" };
export const dynamic = "force-dynamic";

// /analytics (was /sales/analytics, /sales/payments and /sales/riders, which
// all staff could open, so all staff may open this). Range, comparison and the
// open report live in the URL; the figures load from /api/admin/v2/analytics,
// which checks the role again.
export default async function AnalyticsRoute() {
    await requireV2Page("analytics", "/analytics");
    return <Suspense><AnalyticsPage /></Suspense>;
}
