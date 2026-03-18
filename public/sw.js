// Miss Tokyo — Service Worker for Web Push Notifications

self.addEventListener("push", event => {
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

self.addEventListener("notificationclick", event => {
    event.notification.close();
    const url = event.notification.data?.url || "/sales/orders";
    event.waitUntil(
        clients.matchAll({ type: "window", includeUncontrolled: true }).then(list => {
            const match = list.find(c => c.url.includes(url));
            if (match) return match.focus();
            return clients.openWindow(url);
        }),
    );
});
