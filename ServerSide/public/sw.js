/* global self, clients */

self.addEventListener("push", (event) => {
  let payload = {
    title: "Alert",
    body: "",
    url: "/",
    level: "info",
  };
  try {
    if (event.data) {
      const parsed = event.data.json();
      if (parsed.title != null) payload.title = String(parsed.title);
      if (parsed.body != null) payload.body = String(parsed.body);
      if (parsed.url != null) payload.url = String(parsed.url);
      if (parsed.level != null) payload.level = String(parsed.level);
    }
  } catch (_) {
    if (event.data) {
      payload.body = event.data.text();
    }
  }

  const options = {
    body: payload.body,
    data: { url: payload.url, level: payload.level },
    icon: "/favicon.ico",
    badge: "/favicon.ico",
    tag: "sdg-alert",
    renotify: true,
  };

  event.waitUntil(self.registration.showNotification(payload.title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url =
    event.notification.data && event.notification.data.url
      ? event.notification.data.url
      : "/";
  event.waitUntil(clients.openWindow(url));
});
