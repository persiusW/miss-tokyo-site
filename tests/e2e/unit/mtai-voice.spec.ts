import { test, expect } from "@playwright/test";
import { appendHeard, voiceMessage, voiceNext } from "../../../src/lib/ai/missTokyoAi/voice";

test("listening starts and ends", () => {
    expect(voiceNext("idle", { type: "start" })).toBe("listening");
    expect(voiceNext("listening", { type: "end" })).toBe("idle");
});

test("a blocked microphone is reported; silence is not an error", () => {
    expect(voiceNext("listening", { type: "error", code: "not-allowed" })).toBe("denied");
    expect(voiceMessage("denied")).toBe("Microphone access is off for this site.");
    expect(voiceNext("listening", { type: "error", code: "no-speech" })).toBe("idle");
    expect(voiceNext("listening", { type: "error", code: "network" })).toBe("error");
    expect(voiceNext("unsupported", { type: "start" })).toBe("unsupported");
    expect(voiceMessage("idle")).toBeNull();
});

test("speech is added to what is typed, never replacing it, and capped", () => {
    expect(appendHeard("", "  do we have  size 38 ")).toBe("do we have size 38");
    expect(appendHeard("Check stock:", "red bag")).toBe("Check stock: red bag");
    expect(appendHeard("typed", "   ")).toBe("typed");
    expect(appendHeard("x".repeat(995), "hello there")).toHaveLength(1000);
});
