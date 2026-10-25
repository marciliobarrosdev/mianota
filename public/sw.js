/* White-label PWA service worker.
 * Only public shell files and immutable build assets are cached. Authenticated
 * pages, API responses and third-party requests always stay on the network.
 */
const CACHE_PREFIX = "marcia-pwa";
const CACHE_VERSION = "v1";
const SHELL_CACHE = `${CACHE_PREFIX}-shell-${CACHE_VERSION}`;
const ASSET_CACHE = `${CACHE_PREFIX}-assets-${CACHE_VERSION}`;
const OFFLINE_URL = "/offline.html";
const BRAND_CACHE_URL = "/__clone-brand-runtime.json";

const SHELL_FILES = [
  OFFLINE_URL,
  "/icons/apple-touch-icon.png",
  "/icons/marcia-192.png",
  "/icons/marcia-512.png",
  "/icons/marcia-app.svg",
  "/icons/marcia-maskable.svg",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(SHELL_FILES))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter(
              (key) => key.startsWith(CACHE_PREFIX) && ![SHELL_CACHE, ASSET_CACHE].includes(key),
            )
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

function isPublicAsset(request, url) {
  if (url.pathname.startsWith("/assets/")) return true;

  return url.pathname.startsWith("/icons/") || url.pathname === OFFLINE_URL;
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  const cacheControl = response.headers.get("cache-control") || "";

  if (response.ok && response.type === "basic" && !cacheControl.includes("no-store")) {
    const cache = await caches.open(ASSET_CACHE);
    await cache.put(request, response.clone());
  }

  return response;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET" || request.headers.has("authorization")) return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Documents are never cached because they can contain authenticated or
  // tenant-specific content. The static offline page is the only fallback.
  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(() => caches.match(OFFLINE_URL)));
    return;
  }

  if (!isPublicAsset(request, url)) return;
  event.respondWith(cacheFirst(request));
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
      : "Assistente";
  return {
    shortName,
    iconUrl: safeBrandAsset(source.iconUrl || source.logoUrl) || "/icons/marcia-192.png",
  };
}

async function readNotificationBrand() {
  try {
    const cached = await caches.match(BRAND_CACHE_URL);
    if (cached) return normalizeNotificationBrand(await cached.json());
  } catch {}

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

  return normalizeNotificationBrand(null);
}

self.addEventListener("message", (event) => {
  if (event.data?.type !== "clone-brand:update") return;
  const normalized = normalizeNotificationBrand(event.data.brand);
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) =>
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
