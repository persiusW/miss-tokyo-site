import type { Metadata } from "next";
import { requireStaff } from "@/lib/ai/requireStaff";
import InboxClient from "./InboxClient";

export const metadata: Metadata = { title: "AI Inbox" };

export default async function AiInboxPage() {
    const auth = await requireStaff(["admin"]);
    return (
        <>
            <div className="ac-page-head">
                <div>
                    <h1 className="ac-page-h1">AI Inbox</h1>
                    <p className="ac-page-sub">Questions Miss Tokyo AI couldn't answer, sent by staff. Reply here, and save good answers so the assistant can give them next time.</p>
                </div>
            </div>
            {"status" in auth ? (
                <div className="ac-card">
                    <div className="ac-empty">
                        <div className="ac-empty-title">Only the admin can open the AI inbox.</div>
                    </div>
                </div>
            ) : (
                <InboxClient />
            )}
        </>
    );
}
