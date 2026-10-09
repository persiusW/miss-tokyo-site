// src/lib/silenceUrlParseWarning.ts
// Node runtime only — imported from src/instrumentation.ts.
//
// web-push (3.6.7, the latest release) still calls url.parse() on every push
// it sends. Node answers with a DEP0169 warning on stderr, which Vercel files
// as an error, so every paid order looked like it had failed. Drop that one
// code and let every other warning through.

const emitWarning = process.emitWarning.bind(process);

process.emitWarning = ((warning: string | Error, ...rest: unknown[]) => {
    const opts = rest[0];
    const code =
        (typeof opts === "object" && opts !== null ? (opts as { code?: string }).code : undefined) ??
        (typeof rest[1] === "string" ? rest[1] : undefined) ??
        (warning instanceof Error ? (warning as Error & { code?: string }).code : undefined);
    if (code === "DEP0169") return;
    return (emitWarning as (...args: unknown[]) => void)(warning, ...rest);
}) as typeof process.emitWarning;

export {};
