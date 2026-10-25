import { useEffect, useState } from "react";
import { Download, Share2, Smartphone, SquarePlus, X } from "lucide-react";

import { usePwaInstall } from "@/hooks/use-pwa-install";
import { useBrand } from "@/contexts/brand-context";
import { BrandLogo } from "@/components/brand-logo";

const DISMISS_KEY = "marcia:pwa-install-dismissed-at";
const SHOW_AGAIN_AFTER_MS = 7 * 24 * 60 * 60 * 1000;

function wasRecentlyDismissed() {
  try {
    const dismissedAt = Number(window.localStorage.getItem(DISMISS_KEY));
    return Number.isFinite(dismissedAt) && Date.now() - dismissedAt < SHOW_AGAIN_AFTER_MS;
  } catch {
    return false;
  }
}

export function PwaInstallGuide() {
  const branding = useBrand();
  const { canPrompt, install, isInstalled, isReady, needsIosInstructions } = usePwaInstall();
  const [dismissed, setDismissed] = useState(true);
  const [showManualSteps, setShowManualSteps] = useState(false);
  const [requested, setRequested] = useState(false);

  useEffect(() => {
    setDismissed(wasRecentlyDismissed());
    const openGuide = () => {
      setDismissed(false);
      setRequested(true);
    };
    window.addEventListener("marcia:request-install", openGuide);
    return () => window.removeEventListener("marcia:request-install", openGuide);
  }, []);

  const shouldShow = requested && isReady && !isInstalled && !dismissed;
  if (!shouldShow) return null;

  function dismiss() {
    try {
      window.localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      // Private browsing can disable localStorage; dismiss for this session.
    }
    setDismissed(true);
  }

  async function handleInstall() {
    if (needsIosInstructions || !canPrompt) {
      setShowManualSteps(true);
      return;
    }

    const outcome = await install();
    if (outcome !== "accepted") dismiss();
  }

  return (
    <aside
      aria-label="Instalar aplicativo"
      aria-live="polite"
      className="fixed inset-x-3 bottom-4 z-[80] mx-auto max-w-md overflow-hidden rounded-2xl border border-[color:var(--brand-soft-strong)] bg-white/95 shadow-[var(--shadow-glow)] backdrop-blur-xl dark:border-white/10 dark:bg-[#171024]/95 md:inset-x-auto md:right-5 md:mx-0"
    >
      <button
        type="button"
        onClick={dismiss}
        aria-label="Fechar aviso de instalação"
        className="absolute right-3 top-3 grid size-8 place-items-center rounded-full text-slate-500 transition hover:bg-[color:var(--brand-soft)] hover:text-[color:var(--brand-text)] dark:hover:bg-white/10 dark:hover:text-white"
      >
        <X className="size-4" />
      </button>

      <div className="flex gap-3.5 p-4 pr-12">
        {branding.logoUrl || branding.iconUrl ? (
          <BrandLogo />
        ) : (
          <div className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-[15px] bg-gradient-brand shadow-lg">
            <Smartphone className="size-6 text-white" strokeWidth={2.2} />
          </div>
        )}
        <div className="min-w-0">
          <p className="font-display text-[15px] font-extrabold leading-tight text-slate-950 dark:text-white">
            Leve {branding.name} com você
          </p>
          <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-violet-100/70">
            Instale na tela inicial e abra como um aplicativo, sem ocupar espaço desnecessário.
          </p>
        </div>
      </div>

      {showManualSteps ? (
        <div className="mx-4 mb-4 rounded-xl bg-[color:var(--brand-soft)] p-3 text-xs text-foreground dark:bg-white/[0.06]">
          {needsIosInstructions ? (
            <>
              <p className="font-bold">No iPhone ou iPad:</p>
              <ol className="mt-2 space-y-2">
                <li className="flex items-center gap-2">
                  <Share2 className="size-4 shrink-0 text-[color:var(--brand-text)]" />
                  <span>
                    Abra no Safari e toque em <strong>Compartilhar</strong>.
                  </span>
                </li>
                <li className="flex items-center gap-2">
                  <SquarePlus className="size-4 shrink-0 text-[color:var(--brand-text)]" />
                  <span>
                    Escolha <strong>Adicionar à Tela de Início</strong>.
                  </span>
                </li>
              </ol>
            </>
          ) : (
            <>
              <p className="font-bold">Instalação manual:</p>
              <p className="mt-2 leading-relaxed">
                Abra o menu do navegador e procure <strong>Instalar aplicativo</strong>,
                <strong> Adicionar à tela inicial</strong> ou <strong>Criar atalho</strong>. Se a
                opção não aparecer, tente abrir este endereço no Chrome, Edge ou Safari.
              </p>
            </>
          )}
        </div>
      ) : (
        <div className="px-4 pb-4">
          <button
            type="button"
            onClick={handleInstall}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[color:var(--brand)] px-4 py-3 text-sm font-bold text-primary-foreground shadow-[var(--shadow-glow)] transition hover:-translate-y-0.5 hover:brightness-95 hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--brand)] focus-visible:ring-offset-2"
          >
            {needsIosInstructions || !canPrompt ? (
              <Share2 className="size-4" />
            ) : (
              <Download className="size-4" />
            )}
            {needsIosInstructions || !canPrompt ? "Ver como instalar" : "Instalar aplicativo"}
          </button>
        </div>
      )}
    </aside>
  );
}
