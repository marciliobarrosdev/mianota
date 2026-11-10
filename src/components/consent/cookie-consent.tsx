/**
 * Aviso e central de preferências de cookies.
 * Só aparece sem escolha válida; rolar, navegar ou fechar não equivale a aceite
 * (a janela não tem "fechar" que grave algo — fechar apenas volta ao aviso).
 */
import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Cookie } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { CONSENT_EVENT, OPEN_PREFERENCES_EVENT, readConsent, saveConsent } from "@/lib/common/consent";
import { DEFAULT_CATEGORIES, type OptionalCategory } from "@/lib/common/consent-rules";

const TEXT =
  "O MIAnota utiliza cookies essenciais para funcionar. Você também pode permitir cookies opcionais para personalizar sua experiência e nos ajudar a melhorar a plataforma. Escolha suas preferências.";

const CATEGORIES: { id: "essential" | OptionalCategory; title: string; desc: string; note?: string }[] = [
  { id: "essential", title: "Essenciais", desc: "Mantêm seu login (assinante e Master), a segurança da sessão, a identidade visual e as notificações do app que você ativar. Sempre ativos." },
  { id: "preferences", title: "Preferências", desc: "Lembram tema claro/escuro, menu lateral recolhido, filtro de conversas e o aviso de instalação do app." },
  { id: "analytics", title: "Análise", desc: "Medem o uso da plataforma para melhorá-la.", note: "Nenhuma ferramenta de análise em uso no momento." },
  { id: "marketing", title: "Marketing", desc: "Personalizam anúncios e medem campanhas.", note: "Nenhuma ferramenta de marketing em uso no momento." },
];

export function CookieConsent() {
  const [needsChoice, setNeedsChoice] = useState(false);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(DEFAULT_CATEGORIES);

  useEffect(() => {
    setNeedsChoice(readConsent() === null);
    const openPrefs = () => {
      setDraft(readConsent()?.categories ?? DEFAULT_CATEGORIES);
      setOpen(true);
    };
    const changed = () => setNeedsChoice(readConsent() === null);
    window.addEventListener(OPEN_PREFERENCES_EVENT, openPrefs);
    window.addEventListener(CONSENT_EVENT, changed);
    return () => {
      window.removeEventListener(OPEN_PREFERENCES_EVENT, openPrefs);
      window.removeEventListener(CONSENT_EVENT, changed);
    };
  }, []);

  function decide(c: Partial<Record<OptionalCategory, boolean>>) {
    saveConsent(c);
    setOpen(false);
  }

  return (
    <>
      {needsChoice && !open && (
        <section
          role="region"
          aria-label="Aviso de cookies"
          className="fixed inset-x-3 bottom-3 z-[60] mx-auto max-w-3xl rounded-2xl border border-border bg-card/95 p-4 text-card-foreground shadow-2xl backdrop-blur sm:p-5"
        >
          <div className="flex gap-3">
            <Cookie className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
            <p className="text-sm leading-relaxed">
              {TEXT}{" "}
              <Link to="/politica-de-cookies" className="font-medium text-primary underline underline-offset-2">
                Política de Cookies
              </Link>
            </p>
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            <Button onClick={() => decide({ preferences: true, analytics: true, marketing: true })}>Aceitar todos</Button>
            <Button onClick={() => decide({})}>Rejeitar opcionais</Button>
            <Button variant="outline" onClick={() => { setDraft(DEFAULT_CATEGORIES); setOpen(true); }}>Personalizar</Button>
          </div>
        </section>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Preferências de cookies</DialogTitle>
            <DialogDescription>
              Escolha o que o MIAnota pode guardar no seu navegador. Recusar os opcionais não limita nenhuma função.
            </DialogDescription>
          </DialogHeader>
          <ul className="space-y-3">
            {CATEGORIES.map((c) => {
              const essential = c.id === "essential";
              const checked = essential ? true : draft[c.id as OptionalCategory];
              return (
                <li key={c.id} className="rounded-xl border border-border p-3">
                  <div className="flex items-center justify-between gap-3">
                    <label htmlFor={`ck-${c.id}`} className="font-medium">{c.title}</label>
                    <Switch
                      id={`ck-${c.id}`}
                      checked={checked}
                      disabled={essential}
                      onCheckedChange={(v) => setDraft((d) => ({ ...d, [c.id]: v }))}
                    />
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{c.desc}</p>
                  {c.note && <p className="mt-1 text-xs text-muted-foreground">{c.note}</p>}
                </li>
              );
            })}
          </ul>
          <div className="grid gap-2 sm:grid-cols-2">
            <Button variant="outline" onClick={() => decide({})}>Rejeitar opcionais</Button>
            <Button onClick={() => decide(draft)}>Salvar preferências</Button>
          </div>
          <Link to="/politica-de-cookies" onClick={() => setOpen(false)} className="text-center text-sm text-primary underline">
            Ler a Política de Cookies
          </Link>
        </DialogContent>
      </Dialog>
    </>
  );
}

/** Botão/link "Preferências de cookies" para rodapés e configurações. */
export function CookiePreferencesLink({ className = "" }: { className?: string }) {
  return (
    <button
      type="button"
      className={className}
      onClick={() => window.dispatchEvent(new Event(OPEN_PREFERENCES_EVENT))}
    >
      Preferências de cookies
    </button>
  );
}
