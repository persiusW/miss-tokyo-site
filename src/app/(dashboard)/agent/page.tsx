import type { Metadata } from "next";
import AgentChat from "@/components/admin/AgentChat";

export const metadata: Metadata = { title: "Store Assistant" };

export default function AgentPage() {
    return (
        <>
            <div className="ac-page-head">
                <div>
                    <h1 className="ac-page-h1">Store Assistant</h1>
                    <p className="ac-page-sub">Look up products, stock and orders, or take an order for a customer.</p>
                </div>
            </div>
            <AgentChat />
        </>
    );
}
