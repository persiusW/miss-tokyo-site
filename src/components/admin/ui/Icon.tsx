// 24px stroke icons at 1.7 width, from the design handoff's IP map.
import type { CSSProperties } from "react";

const IP = {
    home: "M3 11 12 4l9 7M5 10v10h14V10",
    inbox: "M4 13h4l2 3h4l2-3h4M4 13l2-8h12l2 8v6H4z",
    orders: "M5 7h14l-1.2 11.2A2 2 0 0 1 15.8 20H8.2a2 2 0 0 1-2-1.8zM9 7a3 3 0 0 1 6 0",
    till: "M4 5h16v10H4zM8 19h8M12 15v4M7 9h4",
    products: "M20 8 12 3 4 8v8l8 5 8-5zM4 8l8 5 8-5M12 13v8",
    customers: "M9 8a3.5 3.5 0 1 0 0 .1M2.5 20a6.5 6.5 0 0 1 13 0M17 9.5a2.5 2.5 0 1 0 0 .1M16 20a5 5 0 0 1 5.5-5",
    discounts: "M20 12 12.5 4.5A2 2 0 0 0 11 4H5a1 1 0 0 0-1 1v6a2 2 0 0 0 .5 1.3L12 20zM8 8h.01",
    content: "M4 4h16v16H4zM4 9h16M9 9v11",
    analytics: "M4 20V10M10 20V4M16 20v-7M22 20H2",
    staff: "M12 8a4 4 0 1 0 0 .1M4 20c0-4 3.6-7 8-7s8 3 8 7",
    billing: "M3 6h18v12H3zM3 10h18M7 15h3",
    settings: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z",
    search: "M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-3.5-3.5",
    x: "M6 6l12 12M18 6 6 18",
    plus: "M12 5v14M5 12h14",
    check: "M5 12.5l4.5 4.5L19 7",
    chev: "m9 6 6 6-6 6",
    chevd: "m6 9 6 6 6-6",
    back: "m15 6-6 6 6 6",
    menu: "M3 7h18M3 12h18M3 17h18",
    more: "M5 12h.01M12 12h.01M19 12h.01",
    bell: "M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15zM10 20a2 2 0 0 0 4 0",
    warn: "M12 3.5 22 20H2zM12 10v4M12 17v.01",
    info: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 11v5M12 8v.01",
    ok: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM8 12l3 3 5-6",
    danger: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM15 9l-6 6M9 9l6 6",
    truck: "M2 7h12v10H2zM14 10h4l3 3v4h-7M7 19.5a1.5 1.5 0 1 0 0-.1M17 19.5a1.5 1.5 0 1 0 0-.1",
    print: "M7 9V4h10v5M6 18H4v-7h16v7h-2M7 14h10v6H7z",
    copy: "M8 8h11v11H8zM5 16H4V4h12v1",
    mail: "M3 5h18v14H3zM3 7l9 6 9-6",
    wa: "M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z",
    refund: "M9 14 4 9l5-5M4 9h10a6 6 0 0 1 0 12h-3",
    box: "M21 8 12 3 3 8v8l9 5 9-5zM3 8l9 5 9-5",
    image: "M4 5h16v14H4zM4 16l5-5 4 4 3-3 4 4M15 9h.01",
    upload: "M12 16V4M7 9l5-5 5 5M4 20h16",
    download: "M12 4v12M7 11l5 5 5-5M4 20h16",
    cash: "M3 7h18v10H3zM12 14.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zM6 10v.01M18 14v.01",
    link: "M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1",
    spark: "M12 4l1.6 4.4L18 10l-4.4 1.6L12 16l-1.6-4.4L6 10l4.4-1.6z",
    user: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21c0-4 3.6-7 8-7s8 3 8 7",
    moon: "M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8z",
    sun: "M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4",
    monitor: "M3 4h18v12H3zM8 20h8M12 16v4",
    logout: "M14 3h5a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-5M10 16l-4-4 4-4M6 12h11",
    store: "M4 9l1-5h14l1 5M4 9h16v11H4zM9 20v-6h6v6",
    edit: "M4 20h4L19 9l-4-4L4 16zM14 6l4 4",
    trash: "M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13",
    lock: "M6 11h12v9H6zM8 11V8a4 4 0 0 1 8 0v3",
    grip: "M9 6h.01M15 6h.01M9 12h.01M15 12h.01M9 18h.01M15 18h.01",
    star: "M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z",
    tag: "M3 12 12 3h8v8l-9 9zM16 8h.01",
    globe: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18",
    clock: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2",
    rail: "M4 4h16v16H4zM9 4v16",
    chat: "M4 5h16v11H8l-4 4z",
    gift: "M4 10h16v10H4zM3 7h18v3H3zM12 7v13M12 7c-2-3-5-3-5-1s5 1 5 1zM12 7c2-3 5-3 5-1s-5 1-5 1z",
} as const;

export type IconName = keyof typeof IP;

export function Icon({ n, className, style, size }: { n: IconName; className?: string; style?: CSSProperties; size?: number }) {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"
            strokeLinejoin="round" className={className} style={size ? { width: size, height: size, ...style } : style} aria-hidden="true">
            <path d={IP[n]} />
        </svg>
    );
}
