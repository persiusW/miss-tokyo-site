import { Denied } from "@/components/admin/ui";
import { requireV2Page } from "@/lib/admin/v2/server";
import { ContentFrame, LoadFailed } from "@/components/admin/v2/content/shared";
import { MenuTab } from "@/components/admin/v2/content/MenuTab";
import { loadMenu } from "@/components/admin/v2/content/data";

export const metadata = { title: "Menu · Content · Miss Tokyo admin" };
export const dynamic = "force-dynamic";

export default async function ContentMenuPage() {
    const { allowed } = await requireV2Page("content", "/content/menu", ["admin", "owner"]);
    if (!allowed) return <Denied title="Content" />;
    const data = await loadMenu();
    return (
        <ContentFrame tab="menu">
            {data ? <MenuTab data={data} /> : <LoadFailed what="the shop menu" />}
        </ContentFrame>
    );
}
