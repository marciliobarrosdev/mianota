import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { BatteryFull, Camera, CheckCheck, ChevronLeft, Mic, Phone, Plus, Signal, Video, Wifi } from "lucide-react";

type Msg =
  | { from: "me"; kind: "audio"; time: string }
  | { from: "me"; kind: "photo"; time: string }
  | { from: "me"; kind: "text"; text: string; time: string }
  | { from: "mia"; kind: "text"; text: string; time: string }
  | { from: "mia"; kind: "entry"; title: string; value: string; meta: string; time: string };

const SCRIPT: Msg[] = [
  { from: "me", kind: "audio", time: "09:41" },
  { from: "mia", kind: "entry", title: "Mercado", value: "- R$ 84,90", meta: "Alimentação · Pix · hoje", time: "09:41" },
  { from: "me", kind: "photo", time: "09:42" },
  { from: "mia", kind: "entry", title: "Conta de luz", value: "- R$ 182,37", meta: "Vence dia 12 · lembrete criado", time: "09:42" },
  { from: "me", kind: "text", text: "Quanto ainda posso gastar com lazer?", time: "09:43" },
  { from: "mia", kind: "text", text: "Você tem R$ 312,40 livres em lazer até o fim do mês 😉", time: "09:43" },
];

/** Celular realista com conversa de exemplo no WhatsApp (ilustração, sem dados reais). */
export function LandingPhone({ assistantName, face }: { assistantName: string; face: string }) {
  const [shown, setShown] = useState(0);
  const [typing, setTyping] = useState(false);

  useEffect(() => {
    let step = 0;
    let t: ReturnType<typeof setTimeout>;
    const tick = () => {
      if (step >= SCRIPT.length) {
        t = setTimeout(() => { step = 0; setShown(0); t = setTimeout(tick, 500); }, 4000);
        return;
      }
      if (SCRIPT[step].from === "mia") {
        setTyping(true);
        t = setTimeout(() => { setTyping(false); step++; setShown(step); t = setTimeout(tick, 1100); }, 1300);
      } else {
        step++; setShown(step); t = setTimeout(tick, 1000);
      }
    };
    t = setTimeout(tick, 700);
    return () => clearTimeout(t);
  }, []);

  const visible = SCRIPT.slice(0, shown).slice(-4);

  return (
    <div className="relative mx-auto w-[300px] sm:w-[320px]">
      {/* moldura */}
      <div className="relative rounded-[52px] bg-gradient-to-b from-ln-muted/40 to-ln-surface p-[3px] shadow-2xl ln-glow">
        <div className="rounded-[50px] bg-ln-bg p-[10px]">
          <div className="relative overflow-hidden rounded-[40px] wa-wallpaper">
            {/* status bar + ilha */}
            <div className="relative flex h-11 items-center justify-between px-7 text-[12px] font-semibold text-ln-ink">
              <span>9:41</span>
              <span className="absolute left-1/2 top-2 h-7 w-24 -translate-x-1/2 rounded-full bg-ln-bg" />
              <span className="flex items-center gap-1"><Signal className="size-3.5" /><Wifi className="size-3.5" /><BatteryFull className="size-4" /></span>
            </div>
            {/* header WhatsApp */}
            <div className="flex items-center gap-2 bg-wa-head px-2.5 py-2 text-ln-ink">
              <ChevronLeft className="size-5 text-wa-accent" />
              <img src={face} alt={assistantName} className="size-9 rounded-full object-cover" />
              <div className="min-w-0 flex-1 leading-tight">
                <div className="text-[14px] font-semibold">{assistantName} · MIAnota</div>
                <div className="text-[11px] text-ln-muted">{typing ? "digitando…" : "online"}</div>
              </div>
              <Video className="size-5 text-wa-accent" />
              <Phone className="ml-3 size-4.5 text-wa-accent" />
            </div>
            {/* conversa */}
            <div className="flex h-[400px] flex-col justify-end gap-1.5 px-2.5 pb-2 pt-3">
              <AnimatePresence initial={false} mode="popLayout">
                {visible.map((m) => (
                  <motion.div
                    key={SCRIPT.indexOf(m)}
                    layout
                    initial={{ opacity: 0, y: 14, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    className={`flex ${m.from === "me" ? "justify-end" : "justify-start"}`}
                  >
                    <Bubble m={m} face={face} />
                  </motion.div>
                ))}
                {typing && (
                  <motion.div key="typing" layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex w-fit gap-1 rounded-xl rounded-tl-sm bg-wa-in px-3.5 py-3">
                    {[0, 1, 2].map((d) => (
                      <span key={d} className="ln-dot size-1.5 rounded-full bg-ln-muted" style={{ animationDelay: `${d * 160}ms` }} />
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            {/* input */}
            <div className="flex items-center gap-2 bg-wa-bg px-2.5 pb-5 pt-1.5">
              <Plus className="size-5 text-ln-muted" />
              <div className="flex h-9 flex-1 items-center justify-between rounded-full bg-wa-in px-3.5 text-[13px] text-ln-muted">
                Mensagem <Camera className="size-4" />
              </div>
              <span className="grid size-9 place-items-center rounded-full bg-wa-accent text-ln-bg"><Mic className="size-4" /></span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Meta({ time, read }: { time: string; read?: boolean }) {
  return (
    <span className="ml-2 inline-flex translate-y-1 items-center gap-0.5 text-[10px] text-ln-muted">
      {time} {read && <CheckCheck className="size-3.5 text-wa-accent" />}
    </span>
  );
}

function Bubble({ m, face }: { m: Msg; face: string }) {
  if (m.from === "me" && m.kind === "audio")
    return (
      <div className="flex items-center gap-2 rounded-xl rounded-tr-sm bg-wa-out px-2.5 py-2 text-ln-ink">
        <span className="grid size-8 place-items-center rounded-full bg-ln-ink/15"><Mic className="size-4" /></span>
        <span className="ln-wave flex h-6 items-center gap-[2px]">
          {[6, 12, 18, 10, 16, 8, 14, 20, 9, 13, 7, 15, 11, 17].map((h, j) => (
            <span key={j} className="w-[2px] rounded-full bg-ln-ink/80" style={{ height: h, animationDelay: `${j * 70}ms` }} />
          ))}
        </span>
        <span className="text-[11px]">0:04</span>
        <Meta time={m.time} read />
      </div>
    );
  if (m.from === "me" && m.kind === "photo")
    return (
      <div className="w-44 rounded-xl rounded-tr-sm bg-wa-out p-1 text-ln-ink">
        <div className="relative h-28 overflow-hidden rounded-lg bg-ln-ink/90 p-3 text-[9px] leading-tight text-ln-bg">
          <div className="font-bold">ENERGIA S.A.</div>
          <div className="mt-1 opacity-70">Conta de luz · Ref. 10/2026</div>
          <div className="mt-2 space-y-1">{[80, 60, 70, 45].map((w, i) => <div key={i} className="h-1 rounded bg-ln-bg/25" style={{ width: `${w}%` }} />)}</div>
          <div className="absolute bottom-2 right-3 text-[13px] font-bold">R$ 182,37</div>
          <motion.div className="absolute inset-x-0 h-6 bg-gradient-to-b from-transparent via-wa-accent/50 to-transparent" animate={{ y: [-24, 112] }} transition={{ duration: 1.4, repeat: Infinity }} />
        </div>
        <div className="px-1 pb-0.5 text-right"><Meta time={m.time} read /></div>
      </div>
    );
  if (m.kind === "entry")
    return (
      <div className="w-[230px] rounded-xl rounded-tl-sm bg-wa-in p-2 text-ln-ink">
        <div className="rounded-lg border-l-4 border-wa-accent bg-ln-bg/40 px-2.5 py-2">
          <div className="text-[10px] font-bold uppercase tracking-wide text-wa-accent">Lançamento registrado</div>
          <div className="mt-1 flex items-center justify-between text-[13px] font-semibold"><span>{m.title}</span><span>{m.value}</span></div>
          <div className="text-[11px] text-ln-muted">{m.meta}</div>
        </div>
        <div className="mt-1 text-right"><Meta time={m.time} /></div>
      </div>
    );
  return (
    <div className={`max-w-[82%] rounded-xl px-2.5 py-1.5 text-[13px] leading-snug text-ln-ink ${m.from === "me" ? "rounded-tr-sm bg-wa-out" : "rounded-tl-sm bg-wa-in"}`}>
      {m.text}
      <Meta time={m.time} read={m.from === "me"} />
    </div>
  );
}
