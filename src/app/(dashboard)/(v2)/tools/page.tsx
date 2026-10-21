import { Denied } from "@/components/admin/ui";
import { requireV2Page } from "@/lib/admin/v2/server";
import { ToolsRoute } from "@/components/admin/v2/tools/ToolsRoute";

export const metadata = { title: "Admin tools · Miss Tokyo admin" };
export const dynamic = "force-dynamic";

// The admin role only: owners and sales staff see <Denied adminOnly />.
export default async function ToolsPage() {
    const g = await requireV2Page("tools", "/tools", ["admin"]);
    if (!g.allowed) return <Denied title="Admin tools" adminOnly />;
    return <ToolsRoute tab="payouts" search={{}} />;
}
