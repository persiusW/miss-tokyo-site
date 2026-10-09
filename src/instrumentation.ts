// src/instrumentation.ts
// Runs once when a server instance boots.

export async function register() {
    if (process.env.NEXT_RUNTIME === "nodejs") {
        await import("./lib/silenceUrlParseWarning");
    }
}
