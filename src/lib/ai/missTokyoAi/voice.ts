// Voice input for the chat box: a small state machine kept free of browser
// APIs so it can be tested. Speech only fills the box; it never sends.

export type VoiceState = "idle" | "listening" | "denied" | "unsupported" | "error";
export type VoiceEvent =
    | { type: "start" }
    | { type: "end" }
    | { type: "error"; code: string };

export const VOICE_LANGS = ["en-GH", "en-US"] as const;

export function voiceNext(state: VoiceState, event: VoiceEvent): VoiceState {
    if (state === "unsupported") return state;
    switch (event.type) {
        case "start": return "listening";
        case "end": return state === "listening" ? "idle" : state;
        case "error":
            if (event.code === "not-allowed" || event.code === "service-not-allowed") return "denied";
            // Silence or a manual stop is not a failure.
            if (event.code === "no-speech" || event.code === "aborted") return "idle";
            return "error";
    }
}

export function voiceMessage(state: VoiceState): string | null {
    switch (state) {
        case "denied": return "Microphone access is off for this site.";
        case "unsupported": return "Voice input isn't available in this browser.";
        case "error": return "Couldn't hear that. Please try again.";
        default: return null;
    }
}

/** Adds what was heard to what is already typed, capped at the box's limit. */
export function appendHeard(existing: string, heard: string, max = 1000): string {
    const h = heard.replace(/\s+/g, " ").trim();
    if (!h) return existing;
    const base = existing.trimEnd();
    return (base ? `${base} ${h}` : h).slice(0, max);
}
