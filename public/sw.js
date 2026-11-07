/* Messaging worker, kept at the deployed path to preserve push subscriptions.
 * Retires only legacy app-shell caches. No fetch interception, forced reload,
 * storage clearing or unregister: this registration also delivers web push.
 */
const BRAND_CACHE = "mia-notification-brand-v1";
const BRAND_CACHE_URL = "/__clone-brand-runtime.json";

function isLegacyAppCache(name) {
  return /^(?:mia|marcia)-pwa-(?:shell|assets)-v\d+$/.test(name);
}

self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      try {
        const keys = await caches.keys();
        await Promise.allSettled(keys.filter(isLegacyAppCache).map((key) => caches.delete(key)));
      } finally {
        await self.clients.claim();
      }
    })(),
  );
});

function safeBrandAsset(value) {
  if (typeof value !== "string" || !value.trim()) return null;
  try {
    const url = new URL(value, self.location.origin);
    if (url.origin === self.location.origin || url.protocol === "https:") return url.href;
  } catch {}
  return null;
}

function normalizeNotificationBrand(value) {
  const source = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  const shortName =
    typeof source.shortName === "string" && source.shortName.trim()
      ? source.shortName.trim().slice(0, 20)
      : "MIA";
  return {
    shortName,
    iconUrl: safeBrandAsset(source.iconUrl || source.logoUrl) || "/icons/mia-192.png",
  };
}

async function readNotificationBrand() {
  try {
    const response = await fetch("/api/manifest.webmanifest", { cache: "no-store" });
    if (response.ok) {
      const manifest = await response.json();
      return normalizeNotificationBrand({
        shortName: manifest.short_name || manifest.name,
        iconUrl: manifest.icons?.[0]?.src,
      });
    }
  } catch {}

  try {
    const cache = await caches.open(BRAND_CACHE);
    const cached = await cache.match(BRAND_CACHE_URL);
    if (cached) return normalizeNotificationBrand(await cached.json());
  } catch {}

  return normalizeNotificationBrand(null);
}

self.addEventListener("message", (event) => {
  if (event.data?.type !== "clone-brand:update") return;
  const normalized = normalizeNotificationBrand(event.data.brand);
  event.waitUntil(
    caches.open(BRAND_CACHE).then((cache) =>
      cache.put(
        BRAND_CACHE_URL,
        new Response(JSON.stringify(normalized), {
          headers: { "Content-Type": "application/json; charset=utf-8" },
        }),
      ),
    ),
  );
});

function safeNotificationPath(value) {
  const fallback = "/app/notificacoes";
  if (typeof value !== "string" || !value.trim()) return fallback;

  try {
    const url = new URL(value, self.location.origin);
    if (url.origin !== self.location.origin) return fallback;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}

function readPushPayload(event) {
  if (!event.data) return {};

  try {
    const parsed = event.data.json();
    return typeof parsed === "string" ? { body: parsed } : parsed;
  } catch {
    try {
      return { body: event.data.text() };
    } catch {
      return {};
    }
  }
}

self.addEventListener("push", (event) => {
  const rawPayload = readPushPayload(event);
  const payload =
    rawPayload && typeof rawPayload === "object" && !Array.isArray(rawPayload) ? rawPayload : {};
  const nestedData =
    payload.data && typeof payload.data === "object" && !Array.isArray(payload.data)
      ? payload.data
      : {};
  const targetPath = safeNotificationPath(payload.url || nestedData.url);

  event.waitUntil(
    readNotificationBrand().then((notificationBrand) =>
      self.registration.showNotification(
        typeof payload.title === "string" && payload.title.trim()
          ? payload.title
          : notificationBrand.shortName,
        {
          body: typeof payload.body === "string" ? payload.body : "Você tem uma nova atualização.",
          icon: notificationBrand.iconUrl,
          badge: notificationBrand.iconUrl,
          tag: typeof payload.tag === "string" ? payload.tag : undefined,
          data: {
            ...nestedData,
            url: targetPath,
            notificationId: payload.notificationId || nestedData.notificationId || null,
          },
        },
      ),
    ),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const targetPath = safeNotificationPath(event.notification.data?.url);
  const targetUrl = new URL(targetPath, self.location.origin);

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then(async (windowClients) => {
        const exactClient = windowClients.find((client) => {
          const clientUrl = new URL(client.url);
          return (
            clientUrl.origin === targetUrl.origin &&
            clientUrl.pathname === targetUrl.pathname &&
            clientUrl.search === targetUrl.search
          );
        });

        if (exactClient) return exactClient.focus();

        const appClient = windowClients.find(
          (client) => new URL(client.url).origin === targetUrl.origin,
        );
        if (appClient) {
          if ("navigate" in appClient) await appClient.navigate(targetUrl.href);
          return appClient.focus();
        }

        return self.clients.openWindow(targetUrl.href);
      }),
  );
});
