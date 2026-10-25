import { useState } from "react";

import { useBrand } from "@/contexts/brand-context";

export function BrandLogo({
  compact = false,
  className = "",
}: {
  compact?: boolean;
  className?: string;
}) {
  const branding = useBrand();
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const src = branding.logoUrl || branding.iconUrl;
  const canShowImage = !!src && failedUrl !== src;
  const initial = (branding.shortName || branding.name || "M").trim().charAt(0).toUpperCase();

  return (
    <div
      className={`${compact ? "size-9 rounded-xl text-sm" : "size-11 rounded-2xl text-lg"} relative grid shrink-0 place-items-center overflow-hidden font-display font-black text-primary-foreground shadow-[0_12px_25px_-12px_color-mix(in_srgb,var(--brand)_75%,transparent)] ${className}`}
      style={{
        background: `linear-gradient(135deg, ${branding.primary}, color-mix(in srgb, ${branding.primary} 58%, #ec4899))`,
      }}
      aria-hidden="true"
    >
      <span>{initial}</span>
      {canShowImage && (
        <img
          key={src}
          src={src}
          alt=""
          className="absolute inset-0 size-full bg-white object-contain"
          onError={() => setFailedUrl(src)}
        />
      )}
      {!canShowImage && (
        <span className="absolute right-1 top-1 size-1.5 rounded-full bg-white/90 shadow-[0_0_9px_#fff]" />
      )}
    </div>
  );
}
