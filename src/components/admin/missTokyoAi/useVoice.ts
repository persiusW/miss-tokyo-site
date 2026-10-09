"use client";

// Browser speech recognition for the chat box (Chrome/Edge/Safari). Tries
// Ghanaian English first and falls back to US English if the browser does
// not offer it. Final results only; nothing is sent automatically.
import { useCallback, useEffect, useRef, useState } from "react";
import { voiceNext, VOICE_LANGS, type VoiceState } from "@/lib/ai/missTokyoAi/voice";

type Recognition = {
    lang: string; continuous: boolean; interimResults: boolean; maxAlternatives: number;
    start: () => void; stop: () => void; abort: () => void;
    onresult: ((e: any) => void) | null; onerror: ((e: any) => void) | null;
    onend: (() => void) | null; onstart: (() => void) | null;
};

function recognitionCtor(): (new () => Recognition) | null {
    if (typeof window === "undefined") return null;
    const w = window as any;
    return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function useVoice(onHeard: (text: string) => void) {
    const [state, setState] = useState<VoiceState>("idle");
    const [supported, setSupported] = useState(false);
    const rec = useRef<Recognition | null>(null);
    const langIndex = useRef(0);
    const retry = useRef<() => void>(() => {});
    const heard = useRef(onHeard);
    useEffect(() => { heard.current = onHeard; }, [onHeard]);

    useEffect(() => { setSupported(!!recognitionCtor()); }, []);
    useEffect(() => () => rec.current?.abort(), []);

    const start = useCallback(() => {
        const Ctor = recognitionCtor();
        if (!Ctor) { setState("unsupported"); return; }
        rec.current?.abort();
        const r = new Ctor();
        r.lang = VOICE_LANGS[langIndex.current] ?? "en-US";
        r.continuous = false;
        r.interimResults = false;
        r.maxAlternatives = 1;
        r.onstart = () => setState(s => voiceNext(s, { type: "start" }));
        r.onresult = (e: any) => {
            const text = Array.from(e.results ?? []).map((res: any) => res?.[0]?.transcript ?? "").join(" ");
            if (text.trim()) heard.current(text);
        };
        r.onerror = (e: any) => {
            const code = String(e?.error ?? "error");
            if (code === "language-not-supported" && langIndex.current < VOICE_LANGS.length - 1) {
                langIndex.current += 1;
                setTimeout(() => retry.current(), 0);
                return;
            }
            setState(s => voiceNext(s, { type: "error", code }));
        };
        r.onend = () => setState(s => voiceNext(s, { type: "end" }));
        rec.current = r;
        try { r.start(); } catch { setState("error"); }
    }, []);

    useEffect(() => { retry.current = start; }, [start]);

    const stop = useCallback(() => { rec.current?.stop(); }, []);

    return { state, supported, start, stop, reset: () => setState("idle") };
}
