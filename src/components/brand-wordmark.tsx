/** Logo clara (letras brancas) para páginas de fundo escuro: página inicial e logins. */
export function BrandWordmark({ className = "h-9" }: { className?: string }) {
  return <img src="/mianota-logo-light.png" alt="MIAnota" width={944} height={250} className={`${className} w-auto object-contain`} />;
}
