import { useEffect, useState } from "react";
import { Check, Mic, Sparkles } from "lucide-react";

type Msg = { from: "me" | "mia"; kind?: "audio"; text: string };

/** Ilustração animada: conversa de exemplo com a assistente (sem dados reais). */
export function LandingPhone({ assistantName, avatar }: { assistantName: string; avatar: string }) {
  const script: Msg[] = [
    { from: "me", kind: "audio", text: "0:04" },
    { from: "mia", text: "Anotei: Mercado · R$ 84,90 · Pix · Alimentação ✅" },
    { from: "me", text: "Quanto ainda posso gastar com lazer?" },
    { from: "mia", text: "Você tem R$ 312,40 livres em lazer até o fim do mês. Dá pra ir com calma 😉" },
  ];
  const [shown, setShown] = useState(0);
  const [typing, setTyping] = useState(false);

  useEffect(() => {
    let step = 0;
    let t: ReturnType<typeof setTimeout>;
    const tick = () => {
      if (step >= script.length) {
        t = setTimeout(() => { step = 0; setShown(0); tick(); }, 3200);
        return;
      }
      const next = script[step];
      if (next.from === "mia") {
        setTyping(true);
        t = setTimeout(() => { setTyping(false); step++; setShown(step); t = setTimeout(tick, 900); }, 1200);
      } else {
        step++; setShown(step); t = setTimeout(tick, 900);
      }
    };
    t = setTimeout(tick, 600);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="relative mx-auto w-full max-w-[320px]">
      <div className="ln-blob absolute -inset-10 -z-10 rounded-full ln-gradient opacity-40 blur-3xl" />
      <div className="ln-floaty rounded-[42px] border border-ln-line bg-ln-surface p-2.5 ln-glow">
        <div className="overflow-hidden rounded-[34px] bg-ln-bg">
          <div className="flex items-center gap-3 border-b border-ln-line px-4 pb-3 pt-5">
            <div className="relative">
              <span className="ln-aura absolute -inset-1 rounded-full ln-gradient opacity-70 blur-sm" />
              <img src={avatar} alt={assistantName} className="relative size-10 rounded-full object-cover" />
            </div>
            <div>
              <div className="font-sora text-sm font-bold text-ln-ink">{assistantName}</div>
              <div className="flex items-center gap-1 text-[11px] font-semibold text-ln-lime">
                <span className="ln-dot size-1.5 rounded-full bg-ln-lime" /> online agora
              </div>
            </div>
            <Sparkles className="ml-auto size-4 text-ln-magenta" />
          </div>
          <div className="flex h-[360px] flex-col justify-end gap-2.5 px-3.5 pb-4">
            {script.slice(0, shown).map((m, i) => (
              <div key={i} className={`ln-bubble flex ${m.from === "me" ? "justify-end" : "justify-start"}`}>
                {m.kind === "audio" ? (
                  <div className="flex items-center gap-2 rounded-2xl rounded-br-md ln-gradient px-3 py-2.5 text-ln-ink">
                    <Mic className="size-4" />
                    <span className="ln-wave flex h-5 items-center gap-0.5">
                      {[6, 12, 18, 10, 16, 8, 14, 20, 9, 13].map((h, j) => (
                        <span key={j} className="w-0.5 rounded-full bg-ln-ink" style={{ height: h, animationDelay: `${j * 80}ms` }} />
                      ))}
                    </span>
                    <span className="text-[11px] font-bold">{m.text}</span>
                  </div>
                ) : (
                  <div className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-[13px] font-medium leading-snug ${m.from === "me" ? "rounded-br-md ln-gradient text-ln-ink" : "rounded-bl-md ln-glass text-ln-ink"}`}>
                    {m.text}
                    {m.from === "mia" && <Check className="ml-1 inline size-3 text-ln-lime" />}
                  </div>
                )}
              </div>
            ))}
            {typing && (
              <div className="ln-bubble flex w-fit gap-1 rounded-2xl rounded-bl-md ln-glass px-4 py-3">
                {[0, 1, 2].map((d) => (
                  <span key={d} className="ln-dot size-1.5 rounded-full bg-ln-ink" style={{ animationDelay: `${d * 160}ms` }} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
