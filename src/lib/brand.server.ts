import { brand, normalizeCloneBrand, type CloneBrand } from "@/config/brand";

type BrandReader = {
  from: (table: "clone_brand_config") => {
    select: (columns: string) => {
      eq: (
        column: "id",
        value: true,
      ) => {
        maybeSingle: () => Promise<{ data: Record<string, unknown> | null; error?: unknown }>;
      };
    };
  };
};

/**
 * Reads the installation-wide identity on the server. Old Remixes remain usable
 * while the white-label migration is pending because every failure is reduced
 * to the checked-in fallback identity.
 */
export async function loadCloneBrandServer(reader?: BrandReader): Promise<CloneBrand> {
  try {
    const source =
      reader ??
      ((await import("@/integrations/supabase/client.server"))
        .supabaseAdmin as unknown as BrandReader);
    const { data, error } = await source
      .from("clone_brand_config")
      .select(
        "product_name,short_name,assistant_name,tagline,description,primary_color,logo_url,icon_url,avatar_url,legal_name,legal_document,contact_email,contact_address",
      )
      .eq("id", true)
      .maybeSingle();
    if (error || !data) return brand;

    return normalizeCloneBrand({
      name: typeof data.product_name === "string" ? data.product_name : undefined,
      shortName: typeof data.short_name === "string" ? data.short_name : undefined,
      assistantName: typeof data.assistant_name === "string" ? data.assistant_name : undefined,
      tagline: typeof data.tagline === "string" ? data.tagline : undefined,
      description: typeof data.description === "string" ? data.description : undefined,
      primary: typeof data.primary_color === "string" ? data.primary_color : undefined,
      logoUrl: typeof data.logo_url === "string" ? data.logo_url : undefined,
      iconUrl: typeof data.icon_url === "string" ? data.icon_url : undefined,
      avatarUrl: typeof data.avatar_url === "string" ? data.avatar_url : undefined,
      legalName: typeof data.legal_name === "string" ? data.legal_name : undefined,
      legalDocument: typeof data.legal_document === "string" ? data.legal_document : undefined,
      contactEmail: typeof data.contact_email === "string" ? data.contact_email : undefined,
      contactAddress: typeof data.contact_address === "string" ? data.contact_address : undefined,
    });
  } catch {
    return brand;
  }
}
