
const CACHE_NAME = "quractive-v3";
const BASE = self.registration.scope;

const FILES_TO_CACHE = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png"
].map(path => new URL(path, BASE).href);

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(FILES_TO_CACHE))
  );

  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key =>
            key.startsWith("quractive-") &&
            key !== CACHE_NAME
          )
          .map(key => caches.delete(key))
      )
    )
  );

  self.clients.claim();
});

// Cache website agar bisa dibuka saat offline
self.addEventListener("fetch", event => {
  const request = event.request;
  const url = new URL(request.url);

  if (
    request.method !== "GET" ||
    url.origin !== self.location.origin
  ) {
    return;
  }

  event.respondWith(
    fetch(request)
      .then(response => {
        if (response.ok) {
          const copy = response.clone();

          caches.open(CACHE_NAME)
            .then(cache => cache.put(request, copy));
        }

        return response;
      })
      .catch(async () => {
        const cached = await caches.match(request);

        if (cached) return cached;

        if (request.mode === "navigate") {
          const home = await caches.match(
            new URL("./index.html", BASE).href
          );

          if (home) return home;
        }

        return new Response(
          "Halaman tidak tersedia saat offline.",
          {
            status: 503,
            headers: {
              "Content-Type": "text/plain; charset=utf-8"
            }
          }
        );
      })
  );
});

// Menerima push notification saat halaman tidak dibuka
self.addEventListener("push", event => {
  let payload = {};

  try {
    payload = event.data ? event.data.json() : {};
  } catch (error) {
    payload = {
      body: event.data ? event.data.text() : ""
    };
  }

  const data = payload.data || payload;
  const title = data.title || "Pengingat Quractive";
  const options = {
    body: data.body || "Waktunya melanjutkan kegiatan Quractive.",
    icon: new URL("./icon-192.png", BASE).href,
    badge: new URL("./icon-192.png", BASE).href,
    data: {
      url: data.url || BASE
    }
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Membuka Quractive saat notifikasi ditekan
self.addEventListener("notificationclick", event => {
  event.notification.close();

  const targetUrl = new URL(
    event.notification.data?.url || BASE,
    BASE
  ).href;

  event.waitUntil(
    clients.matchAll({
      type: "window",
      includeUncontrolled: true
    }).then(windowClients => {
      for (const client of windowClients) {
        if (client.url === targetUrl && "focus" in client) {
          return client.focus();
        }
      }

      return clients.openWindow(targetUrl);
    })
  );
});
