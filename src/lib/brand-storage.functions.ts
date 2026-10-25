import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const BRAND_BUCKET = "clone-brand-assets";
const BRAND_BUCKET_OPTIONS = {
  public: false,
  fileSizeLimit: 5 * 1024 * 1024,
  allowedMimeTypes: ["image/png", "image/jpeg", "image/webp"],
};

/**
 * Storage bucket rows are not guaranteed to be copied with a Lovable Remix.
 * Reconcile the private bucket immediately before the owner uploads an asset.
 */
export const ensureBrandAssetBucket = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isSuper, error: accessError } = await context.supabase.rpc("is_super_admin");
    if (accessError) throw new Error(`Não foi possível validar o acesso: ${accessError.message}`);
    if (isSuper !== true) throw new Error("Apenas o dono deste clone pode preparar os arquivos.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: current } = await supabaseAdmin.storage.getBucket(BRAND_BUCKET);
    if (!current) {
      const { error: createError } = await supabaseAdmin.storage.createBucket(
        BRAND_BUCKET,
        BRAND_BUCKET_OPTIONS,
      );
      if (createError && !/already exists|duplicate/i.test(createError.message)) {
        throw new Error(`Não foi possível preparar o armazenamento: ${createError.message}`);
      }
    }

    const { error: updateError } = await supabaseAdmin.storage.updateBucket(
      BRAND_BUCKET,
      BRAND_BUCKET_OPTIONS,
    );
    if (updateError) {
      throw new Error(`Não foi possível proteger o armazenamento: ${updateError.message}`);
    }

    return { ready: true };
  });
