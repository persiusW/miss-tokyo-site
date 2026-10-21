import { Card, PageHeader, SkeletonRows } from "@/components/admin/ui";

export default function StaffLoading() {
    return (
        <>
            <PageHeader title="Staff" sub="Who can sign in to the admin and what each person can do." />
            <Card><SkeletonRows n={5} cols={4} /></Card>
        </>
    );
}
