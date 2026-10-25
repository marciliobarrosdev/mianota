import { createFileRoute } from "@tanstack/react-router";

const BRAND_BUCKET = "clone-brand-assets";
const SAFE_PATH =
  /^(?:(?:logo|avatar)\/[0-9a-f-]{36}\.(png|jpg|webp)|icon\/[0-9a-f-]{36}(?:-(?:192|512))?\.(png|jpg|webp))$/i;
const CONTENT_TYPE: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  webp: "image/webp",
};

export const Route = createFileRoute("/api/public/brand-asset")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const path = new URL(request.url).searchParams.get("path")?.trim() || "";
        const match = SAFE_PATH.exec(path);
        if (!match) return new Response("Arquivo inválido", { status: 400 });

        const extension = (match[1] || match[2]).toLowerCase();
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data, error } = await supabaseAdmin.storage.from(BRAND_BUCKET).download(path);
        if (error || !data) return new Response("Imagem não encontrada", { status: 404 });

        return new Response(await data.arrayBuffer(), {
          headers: {
            "Cache-Control": "public, max-age=31536000, immutable",
            "Content-Type": CONTENT_TYPE[extension],
            "Content-Length": String(data.size),
            "X-Content-Type-Options": "nosniff",
          },
        });
      },
    },
  },
});
