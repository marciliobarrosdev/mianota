import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { registerMiaWorker } from "./mia-worker";

function workerHarness(names: string[]) {
  const listeners = new Map<string, (event: any) => void>();
  const deleted: string[] = [];
  const unregister = vi.fn();
  const claim = vi.fn();
  runInNewContext(readFileSync("public/sw.js", "utf8"), {
    self: {
      addEventListener: (name: string, handler: (event: any) => void) => listeners.set(name, handler),
      skipWaiting: vi.fn(),
      registration: { unregister },
      clients: { claim },
    },
    caches: {
      keys: async () => names,
      delete: async (name: string) => { deleted.push(name); return true; },
    },
  });
  return { listeners, deleted, unregister, claim };
}

describe("installed MIA update", () => {
  it("removes only old MIA shell/asset caches, retaining other saved caches", async () => {
    const h = workerHarness([
      "marcia-pwa-shell-v1", "marcia-pwa-assets-v1", "mia-pwa-shell-v1", "mia-pwa-assets-v1",
      "mia-notification-brand-v1", "subscriber-records", "firebase-messaging", "mia-pwa-shell-v1-backup",
    ]);
    let completion = Promise.resolve();
    h.listeners.get("activate")?.({ waitUntil: (work: Promise<void>) => { completion = work; } });
    await completion;
    expect(h.deleted).toEqual([
      "marcia-pwa-shell-v1", "marcia-pwa-assets-v1", "mia-pwa-shell-v1", "mia-pwa-assets-v1",
    ]);
    expect(h.claim).toHaveBeenCalledOnce();
  });

  it("keeps the push registration and no longer intercepts app or icon requests", async () => {
    const h = workerHarness([]);
    let completion = Promise.resolve();
    h.listeners.get("activate")?.({ waitUntil: (work: Promise<void>) => { completion = work; } });
    await completion;
    expect(h.unregister).not.toHaveBeenCalled();
    expect(h.listeners.has("push")).toBe(true);
    expect(h.listeners.has("notificationclick")).toBe(true);
    expect(h.listeners.has("fetch")).toBe(false);
  });

  it("updates the existing worker path without HTTP worker-cache reuse", async () => {
    const register = vi.fn().mockResolvedValue({});
    vi.stubGlobal("navigator", { serviceWorker: { register } });
    try {
      await registerMiaWorker();
      expect(register).toHaveBeenCalledWith("/sw.js", { scope: "/", updateViaCache: "none" });
    } finally {
      vi.unstubAllGlobals();
    }
  });
});