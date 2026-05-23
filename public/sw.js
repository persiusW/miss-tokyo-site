// Miss Tokyo — Service Worker
// Handles: Web Push Notifications + PWA Caching

// ─── Cache Names (bump version suffix to force cache invalidation) ────────────
const SHELL_CACHE  = "mt-shell-v1";
const IMAGE_CACHE  = "mt-images-v1";
const DATA_CACHE   = "mt-data-v1";

// ─── App Shell URLs to precache on install ────────────────────────────────────
const SHELL_URLS = [
    "/",
    "/shop",
    "/gallery",
    "/gift-cards",
    "/account",
    "/offline.html",
];

// ─── Install: precache the app shell ──────────────────────────────────────────
self.addEventListener("install", (event) => {
    event.waitUntil(
        caches.open(SHELL_CACHE).then((cache) => {
            // addAll is all-or-nothing; individual failures won't break the SW
            return Promise.allSettled(
                SHELL_URLS.map((url) => cache.add(url).catch(() => { /* ignore */ }))
            );
        })
    );
    self.skipWaiting();
});

// ─── Activate: clean up stale cache versions ──────────────────────────────────
self.addEventListener("activate", (event) => {
    const KNOWN_CACHES = [SHELL_CACHE, IMAGE_CACHE, DATA_CACHE];
    event.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(
                keys
                    .filter((key) => !KNOWN_CACHES.includes(key))
                    .map((key) => caches.delete(key))
            )
        )
    );
    self.clients.claim();
});

// ─── Fetch: route requests to the right caching strategy ─────────────────────
self.addEventListener("fetch", (event) => {
    const { request } = event;

    // Only handle GET requests
    if (request.method !== "GET") return;

    let url;
    try {
        url = new URL(request.url);
    } catch {
        return;
    }

    // ── NEVER cache: financial & auth endpoints ──
    const isPaystack =
        url.hostname.includes("paystack.co") ||
        url.pathname.startsWith("/api/paystack");
    const isAuth =
        url.pathname.startsWith("/api/auth") ||
        url.pathname === "/login" ||
        url.pathname === "/register" ||
        url.pathname.startsWith("/auth/");
    const isCheckout = url.pathname.startsWith("/checkout");

    if (isPaystack || isAuth || isCheckout) {
        return; // pass through to network, no caching
    }

    // ── Images: Cache-First (7-day TTL) ──
    if (request.destination === "image") {
        event.respondWith(cacheFirst(IMAGE_CACHE, request, 7 * 24 * 60 * 60));
        return;
    }

    // ── Supabase API data: Network-First with stale fallback ──
    if (url.hostname.includes("supabase.co")) {
        event.respondWith(networkFirst(DATA_CACHE, request, 10000));
        return;
    }

    // ── Product/gallery/account pages: Stale-While-Revalidate ──
    const swrPaths = ["/shop", "/gallery", "/gift-cards", "/account", "/products", "/search"];
    if (swrPaths.some((p) => url.pathname.startsWith(p))) {
        event.respondWith(staleWhileRevalidate(DATA_CACHE, request));
        return;
    }

    // ── App shell (fonts, CSS, JS, HTML): Cache-First ──
    event.respondWith(cacheFirst(SHELL_CACHE, request, null));
});

// ─── Strategy: Cache-First ────────────────────────────────────────────────────
async function cacheFirst(cacheName, request, maxAgeSeconds) {
    const cache = await caches.open(cacheName);
    const cached = await cache.match(request);

    if (cached) {
        // Optionally check max-age
        if (maxAgeSeconds !== null) {
            const dateHeader = cached.headers.get("date");
            if (dateHeader) {
                const age = (Date.now() - new Date(dateHeader).getTime()) / 1000;
                if (age > maxAgeSeconds) {
                    // Stale — fetch fresh in background
                    fetchAndCache(cache, request);
                }
            }
        }
        return cached;
    }

    try {
        const response = await fetch(request);
        if (response.ok) cache.put(request, response.clone());
        return response;
    } catch {
        const fallback = await caches.match("/offline.html");
        return fallback || new Response("Offline", { status: 503 });
    }
}

// ─── Strategy: Network-First ──────────────────────────────────────────────────
async function networkFirst(cacheName, request, timeoutMs) {
    const cache = await caches.open(cacheName);

    const networkPromise = fetch(request).then((response) => {
        if (response.ok) cache.put(request, response.clone());
        return response;
    });

    const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("timeout")), timeoutMs)
    );

    try {
        return await Promise.race([networkPromise, timeoutPromise]);
    } catch {
        const cached = await cache.match(request);
        if (cached) return cached;
        const fallback = await caches.match("/offline.html");
        return fallback || new Response("Offline", { status: 503 });
    }
}

// ─── Strategy: Stale-While-Revalidate ────────────────────────────────────────
async function staleWhileRevalidate(cacheName, request) {
    const cache = await caches.open(cacheName);
    const cached = await cache.match(request);

    const networkFetch = fetch(request)
        .then((response) => {
            if (response.ok) cache.put(request, response.clone());
            return response;
        })
        .catch(() => null);

    if (cached) {
        // Return stale immediately, update in background
        networkFetch; // don't await
        return cached;
    }

    try {
        const response = await networkFetch;
        if (response) return response;
        throw new Error("no response");
    } catch {
        const fallback = await caches.match("/offline.html");
        return fallback || new Response("Offline", { status: 503 });
    }
}

// ─── Helper: fire-and-forget background fetch ────────────────────────────────
function fetchAndCache(cache, request) {
    fetch(request)
        .then((res) => { if (res.ok) cache.put(request, res); })
        .catch(() => {});
}

// ─── Web Push: show notification ──────────────────────────────────────────────
self.addEventListener("push", (event) => {
    const data = event.data?.json() ?? {};
    const title   = data.title   || "Miss Tokyo";
    const options = {
        body:    data.body    || "",
        tag:     data.tag     || "mt-notification",
        data:    { url: data.url || "/sales/orders" },
        requireInteraction: true,
    };
    event.waitUntil(self.registration.showNotification(title, options));
});

// ─── Web Push: handle notification click ──────────────────────────────────────
self.addEventListener("notificationclick", (event) => {
    event.notification.close();
    const url = event.notification.data?.url || "/sales/orders";
    event.waitUntil(
        clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
            const match = list.find((c) => c.url.includes(url));
            if (match) return match.focus();
            return clients.openWindow(url);
        })
    );
});
