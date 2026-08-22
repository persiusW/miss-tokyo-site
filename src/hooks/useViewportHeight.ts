"use client";

import { useEffect, useState } from "react";

/**
 * The height actually visible to the user, in pixels.
 *
 * iOS and iPadOS do not shrink the layout viewport when the on-screen keyboard
 * opens, so `100vh` — and `100dvh` with it — keep reporting the full screen
 * height while half the screen is covered. A full-height, `overflow: hidden`
 * container therefore pushes its lower half behind the keyboard with no way to
 * scroll to it. On the till that hides the Send Link and Cash Received buttons
 * the moment a staff member taps a search or customer field.
 *
 * `window.visualViewport.height` is the one measurement that does track the
 * keyboard. Everything else about the layout stays as it was.
 *
 * Returns null until mounted, so callers should fall back to `100dvh` for the
 * server render and the first paint. Desktop browsers report the same number
 * either way, so nothing changes there.
 */
export function useViewportHeight(): number | null {
    const [height, setHeight] = useState<number | null>(null);

    useEffect(() => {
        const vv = window.visualViewport;

        const read = () => {
            setHeight(vv ? vv.height : window.innerHeight);
        };

        read();

        if (vv) {
            // `scroll` matters as well as `resize`: iOS shifts the visual
            // viewport to reveal a focused input without resizing it, and the
            // container has to follow or it drifts off-screen.
            vv.addEventListener("resize", read);
            vv.addEventListener("scroll", read);
            return () => {
                vv.removeEventListener("resize", read);
                vv.removeEventListener("scroll", read);
            };
        }

        window.addEventListener("resize", read);
        window.addEventListener("orientationchange", read);
        return () => {
            window.removeEventListener("resize", read);
            window.removeEventListener("orientationchange", read);
        };
    }, []);

    return height;
}
