"use client";

import { useEffect } from "react";
import { useMissTokyoAi } from "@/lib/ai/missTokyoAi/client/store";
import { ChatSurface } from "./ChatSurface";
import { useMissTokyoAiUser } from "./MissTokyoAi";

/** /agent: the same chat as the floating panel, full height. */
export function AgentPageChat() {
    const user = useMissTokyoAiUser();
    const hydrate = useMissTokyoAi(s => s.hydrate);
    useEffect(() => { hydrate(); }, [hydrate]);
    return (
        <div className="mtai-page">
            <ChatSurface user={user} variant="page" focusKey={1} />
        </div>
    );
}
