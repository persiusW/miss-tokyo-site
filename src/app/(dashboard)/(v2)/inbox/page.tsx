import type { Metadata } from "next";
import { Suspense } from "react";
import { requireV2Page } from "@/lib/admin/v2/server";
import { teachOn } from "@/lib/whatsapp/flags";
import { InboxPage } from "@/components/admin/v2/inbox/InboxPage";

export const metadata: Metadata = { title: "Inbox" };
export const dynamic = "force-dynamic";

// /inbox (was /customers/whatsapp, /customers/forms, /customers/requests and
// /ai/inbox). Every staff role; the admin also sees Questions for admin. Each
// API the page calls checks the role again.
export default async function InboxRoute() {
    const auth = await requireV2Page("inbox", "/inbox");
    const teacher = auth.role === "admin" || auth.role === "owner";
    return (
        <Suspense>
            <InboxPage canTeachTab={(teacher && teachOn()) || auth.role === "admin"} />
        </Suspense>
    );
}
