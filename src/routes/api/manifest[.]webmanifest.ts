import { createFileRoute } from "@tanstack/react-router";

import { brand } from "@/config/brand";
import { loadCloneBrandServer } from "@/lib/brand.server";

const MANAGED_ICON = /^icon\/([0-9a-f-]{36})-512\.png$/i;

function managedPwaIconId(value: string): string | null {
  if (!value.startsWith("/api/public/brand-asset?")) return null;
  const path = new URL(value, "https://clone.local").searchParams.get("path") || "";
  return MANAGED_ICON.exec(path)?.[1] || null;
}

function managedIconUrl(id: string, size: 192 | 512): string {
  return `/api/public/brand-asset?path=${encodeURIComponent(`icon/${id}-${size}.png`)}`;
}

export const Route = createFileRoute("/api/manifest.webmanifest")({
  server: {
    handlers: {
      GET: async () => {
        const saved = await loadCloneBrandServer();
        const name = saved.name || brand.name;
        const shortName = saved.shortName || name.slice(0, 20);
        const description = saved.description || brand.description;
        const color = saved.primary || brand.primary;
        const customIcon = saved.iconUrl || saved.logoUrl;
        const managedIconId = customIcon ? managedPwaIconId(customIcon) : null;
        const icons = managedIconId
          ? [
              {
                src: managedIconUrl(managedIconId, 192),
                sizes: "192x192",
                type: "image/png",
                purpose: "any",
              },
              {
                src: managedIconUrl(managedIconId, 512),
                sizes: "512x512",
                type: "image/png",
                purpose: "any",
              },
            ]
          : customIcon
            ? [
                {
                  src: customIcon,
                  purpose: "any",
                },
              ]
            : [
                {
                  src: "/icons/marcia-192.png",
                  sizes: "192x192",
                  type: "image/png",
                  purpose: "any",
                },
                {
                  src: "/icons/marcia-512.png",
                  sizes: "512x512",
                  type: "image/png",
                  purpose: "any",
                },
                {
                  src: "/icons/marcia-maskable.svg",
                  sizes: "any",
                  type: "image/svg+xml",
                  purpose: "maskable",
                },
              ];

        return Response.json(
          {
            id: "/",
            name,
            short_name: shortName,
            description,
            lang: "pt-BR",
            start_url: "/app/inicio",
            scope: "/",
            display: "standalone",
            orientation: "portrait-primary",
            background_color: "#F7F5FB",
            theme_color: color,
            icons,
          },
          {
            headers: {
              "Content-Type": "application/manifest+json; charset=utf-8",
              "Cache-Control": "public, max-age=60, stale-while-revalidate=300",
            },
          },
        );
      },
    },
  },
});
