import type { Metadata } from "next";
import { Suspense } from "react";
import { requireStaff } from "@/lib/ai/requireStaff";
import WhatsAppInboxClient from "./WhatsAppInboxClient";

export const metadata: Metadata = { title: "WhatsApp Chats" };

export default async function WhatsAppInboxPage() {
    const auth = await requireStaff(["admin", "owner", "sales_staff"]);
    return (
        <>
            <div className="ac-page-head">
                <div>
                    <h1 className="ac-page-h1">WhatsApp Chats</h1>
                    <p className="ac-page-sub">Every WhatsApp chat with Ask Miss Tokyo, messages in and out. When a chat needs a person, reply from the main WhatsApp phone, then hand it back to the assistant.</p>
                </div>
            </div>
            {"status" in auth ? (
                <div className="ac-card">
                    <div className="ac-empty"><div className="ac-empty-title">Only order staff can see WhatsApp chats.</div></div>
                </div>
            ) : (
                <Suspense fallback={<div className="ac-card"><div style={{ fontSize: 13, color: "var(--ac-ink-3)" }}>Loading…</div></div>}>
                    <WhatsAppInboxClient />
                </Suspense>
            )}
        </>
    );
}
