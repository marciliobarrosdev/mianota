/** Logo clara (letras brancas) para páginas de fundo escuro: página inicial e logins. */
import logo from "@/assets/mianota-logo-light.webp.asset.json";

export function BrandWordmark({ className = "h-9" }: { className?: string }) {
  return <img src={logo.url} alt="MIAnota" width={600} height={187} className={`${className} w-auto object-contain`} />;
}
