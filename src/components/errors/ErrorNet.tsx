"use client";

// Catches errors nothing else handled and reports them for the logs. Shows
// nothing: browser extensions throw on our pages too, and a toast for those
// would alarm people over nothing.
import { useEffect } from "react";
import { buildReport, sharedReporter, type ClientReport } from "@/lib/errors/clientReport";

const post = (r: ClientReport) => fetch("/api/client-errors", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(r),
    keepalive: true,
}).then(() => undefined);

/** For error screens: React does not raise window errors for crashes a boundary catches. */
export function reportClientError(err: unknown, digest?: string): void {
    const r = buildReport(err, window.location.pathname);
    sharedReporter(post)(digest ? { ...r, message: `[${digest}] ${r.message}`.slice(0, 300) } : r);
}

export function ErrorNet() {
    useEffect(() => {
        const report = sharedReporter(post);
        const onRejection = (e: PromiseRejectionEvent) => report(buildReport(e.reason, window.location.pathname));
        const onError = (e: ErrorEvent) => report(buildReport(e.error ?? e.message, window.location.pathname));
        window.addEventListener("unhandledrejection", onRejection);
        window.addEventListener("error", onError);
        return () => {
            window.removeEventListener("unhandledrejection", onRejection);
            window.removeEventListener("error", onError);
        };
    }, []);
    return null;
}
