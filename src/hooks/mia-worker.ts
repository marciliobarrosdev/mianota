/** Shared registrar for the messaging worker, not an offline app-shell cache. */
export function registerMiaWorker() {
  return navigator.serviceWorker.register("/sw.js", {
    scope: "/",
    updateViaCache: "none",
  });
}