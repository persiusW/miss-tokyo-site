import { notFound } from "next/navigation";
import { Denied } from "@/components/admin/ui";
import { requireV2Page } from "@/lib/admin/v2/server";
import { isToolsTab } from "@/lib/admin/v2/tools";
import { ToolsRoute } from "@/components/admin/v2/tools/ToolsRoute";

export const metadata = { title: "Admin tools · Miss Tokyo admin" };
export const dynamic = "force-dynamic";

// The admin role only: owners and sales staff see <Denied adminOnly />.
export default async function ToolsTabPage({ params, searchParams }: { params: Promise<{ tab: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
    const { tab } = await params;
    if (!isToolsTab(tab)) notFound();
    const g = await requireV2Page("tools", `/tools/${tab}`, ["admin"]);
    if (!g.allowed) return <Denied title="Admin tools" adminOnly />;
    return <ToolsRoute tab={tab} search={await searchParams} />;
}
