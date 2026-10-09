import type { Metadata } from "next";
import { AgentPageChat } from "@/components/admin/missTokyoAi/AgentPageChat";

export const metadata: Metadata = { title: "Miss Tokyo AI" };

export default function AgentPage() {
    return (
        <>
            <div className="ac-page-head">
                <div>
                    <h1 className="ac-page-h1">Miss Tokyo AI</h1>
                    <p className="ac-page-sub">Stock, sales and orders, how to do anything in the dashboard, or take an order for a customer. The same chat opens from the button on every page.</p>
                </div>
            </div>
            <AgentPageChat />
        </>
    );
}
