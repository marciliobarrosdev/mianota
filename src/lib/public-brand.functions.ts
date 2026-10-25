import { createServerFn } from "@tanstack/react-start";

import type { CloneBrand } from "@/config/brand";

/** Public, read-only identity used by SSR. It never returns credentials or private tenant data. */
export const getPublicCloneBrand = createServerFn({ method: "GET" }).handler(
  async (): Promise<CloneBrand> => {
    const { loadCloneBrandServer } = await import("@/lib/brand.server");
    return loadCloneBrandServer();
  },
);
