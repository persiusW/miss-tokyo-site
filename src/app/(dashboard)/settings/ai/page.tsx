import type { Metadata } from "next";
import { requireAiAdmin } from "@/lib/ai/requireAdmin";
import AiSettingsClient from "./AiSettingsClient";

export const metadata: Metadata = { title: "AI Settings" };

export default async function AiSettingsPage() {
    const auth = await requireAiAdmin();
    return (
        <>
            <div className="ac-page-head">
                <div>
                    <h1 className="ac-page-h1">AI Settings</h1>
                    <p className="ac-page-sub">Switch the assistants on or off, set the daily spend limit and see recent usage.</p>
                </div>
            </div>
            {"status" in auth ? (
                <div className="ac-card">
                    <div className="ac-empty">
                        <div className="ac-empty-title">Only admins and owners can manage AI settings.</div>
                    </div>
                </div>
            ) : (
                <AiSettingsClient showMarkup={auth.role === "admin"} />
            )}
        </>
    );
}
