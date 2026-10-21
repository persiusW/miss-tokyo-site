import type { Metadata } from "next";
import Link from "next/link";
import { requireStaff } from "@/lib/ai/requireStaff";
import { teachOn } from "@/lib/whatsapp/flags";
import TeachClient from "./TeachClient";

export const metadata: Metadata = { title: "Teach the assistant" };

export default async function TeachPage() {
    const auth = await requireStaff(["admin", "owner"]);
    const allowed = !("status" in auth) && teachOn();
    return (
        <>
            <div className="ac-page-head">
                <div>
                    <h1 className="ac-page-h1">Teach the assistant</h1>
                    <p className="ac-page-sub">What the shop assistant has learned from your team, on WhatsApp and the website. Add notes about the shop and your pieces, and teach it to recognise your pieces from photos.</p>
                </div>
                <Link className="ac-btn" href="/customers/whatsapp">Back to WhatsApp chats</Link>
            </div>
            {allowed ? <TeachClient /> : (
                <div className="ac-card">
                    <div className="ac-empty"><div className="ac-empty-title">{"status" in auth ? "Only the owner and admins can teach the assistant." : "Teaching the assistant is switched off."}</div></div>
                </div>
            )}
        </>
    );
}
