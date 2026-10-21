import { Card, PageHeader, SkeletonRows } from "@/components/admin/ui";

export default function ToolsLoading() {
    return (
        <>
            <PageHeader title="Admin tools" sub="Payouts, fees, billing rates and the switches behind the shop. Only the admin sees this page." />
            <Card><SkeletonRows n={6} cols={4} /></Card>
        </>
    );
}
