"use client";

// Catches errors nothing else handled and reports them for the logs. Shows
// nothing: browser extensions throw on our pages too, and a toast for those
// would alarm people over nothing.
import { useEffect } from "react";
import { buildReport, createReporter } from "@/lib/errors/clientReport";

export function ErrorNet() {
    useEffect(() => {
        const report = createReporter(r => fetch("/api/client-errors", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(r),
            keepalive: true,
        }).then(() => undefined));
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
