// Passthrough fetch — helps Chrome treat the origin as installable when a manifest is present.
self.addEventListener("fetch", (event) => {
  event.respondWith(fetch(event.request));
});

self.addEventListener("push", (event) => {
  if (!event.data) {
    return;
  }

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: "New lead", body: event.data.text() };
  }

  const title = payload.title || "New lead";
  const body = payload.body || "You have a new client request.";
  const url = payload.url || "/admin/client-requests";

  const options = {
    body,
    data: { url },
    requireInteraction: true,
    vibrate: [200, 100, 200, 100, 400],
    tag: payload.tag || "webinteli-new-lead",
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const url = (event.notification.data && event.notification.data.url) || "/admin/client-requests";

  event.waitUntil(
    (async () => {
      const allClients = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });

      for (const client of allClients) {
        if ("focus" in client) {
          const clientUrl = new URL(client.url);
          if (clientUrl.pathname === new URL(url, clientUrl.origin).pathname) {
            client.focus();
            return;
          }
        }
      }

      if (self.clients.openWindow) {
        await self.clients.openWindow(url);
      }
    })()
  );
});

