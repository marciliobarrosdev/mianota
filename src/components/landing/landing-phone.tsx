import { useEffect, useRef, useState } from "react";
import { motion, useInView, useReducedMotion } from "motion/react";
import { BatteryFull, Camera, Check, CheckCheck, ChevronLeft, Mic, Phone, Play, Plus, Signal, Video, Wifi } from "lucide-react";

type Msg =
  | { from: "me"; kind: "audio"; time: string }
  | { from: "me"; kind: "photo"; time: string }
  | { from: "me" | "mia"; kind: "text"; text: string; time: string }
  | { from: "mia"; kind: "entry"; title: string; value: string; meta: string; time: string };

const SCRIPT: Msg[] = [
  { from: "me", kind: "audio", time: "09:41" },
  { from: "mia", kind: "entry", title: "Mercado", value: "− R$ 84,90", meta: "Alimentação · Pix · hoje", time: "09:41" },
  { from: "me", kind: "photo", time: "09:42" },
  { from: "mia", kind: "entry", title: "Conta de luz", value: "− R$ 182,37", meta: "Vence dia 12 · lembrete criado", time: "09:42" },
  { from: "me", kind: "text", text: "Quanto ainda posso gastar com lazer?", time: "09:43" },
  { from: "mia", kind: "text", text: "Você tem R$ 312,40 livres em lazer até o fim do mês 😉", time: "09:43" },
];
type Phase = "idle" | "recording" | "typing" | "reading";

/** Visual simulation only: never sends messages or creates financial records. */
export function LandingPhone({ assistantName, face }: { assistantName: string; face: string }) {
  const root = useRef<HTMLDivElement>(null);
  const viewport = useRef<HTMLDivElement>(null);
  const inView = useInView(root, { amount: 0.25 });
  const prefersReduced = useReducedMotion();
  const [hydrated, setHydrated] = useState(false);
  const reduced = hydrated && prefersReduced;
  useEffect(() => { setHydrated(true); }, []);
  const [shown, setShown] = useState(0);
  const [phase, setPhase] = useState<Phase>("idle");
  const [draft, setDraft] = useState("");
  const [delivery, setDelivery] = useState<"sent" | "delivered" | "read">("sent");

  useEffect(() => {
    if (reduced || !inView) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const wait = (ms: number) => new Promise<void>((resolve) => { timer = setTimeout(resolve, ms); });
    async function run() {
      while (!cancelled) {
        setShown(0); setDraft(""); setPhase("idle");
        await wait(900);
        for (let i = 0; i < SCRIPT.length && !cancelled; i++) {
          const message = SCRIPT[i];
          if (message.from === "me") {
            if (message.kind === "text") {
              for (let n = 1; n <= message.text.length && !cancelled; n++) {
                setDraft(message.text.slice(0, n));
                await wait(48);
              }
              await wait(400);
            } else {
              setPhase(message.kind === "audio" ? "recording" : "idle");
              await wait(message.kind === "audio" ? 2400 : 1200);
            }
            if (cancelled) return;
            setPhase("idle"); setDraft(""); setDelivery("sent"); setShown(i + 1);
            await wait(300);
            if (cancelled) return;
            setDelivery("delivered");
            await wait(600);
            if (cancelled) return;
            setDelivery("read");
            await wait(500);
          } else {
            setPhase("reading");
            await wait(650);
            if (cancelled) return;
            setPhase("typing");
            await wait(message.kind === "text" ? 2200 : 1700);
            if (cancelled) return;
            setPhase("idle"); setShown(i + 1);
            await wait(1400);
          }
        }
        await wait(6500);
      }
    }
    void run();
    return () => { cancelled = true; clearTimeout(timer); };
  }, [inView, reduced]);

  useEffect(() => {
    const el = viewport.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: reduced ? "instant" : "smooth" });
  }, [shown, phase, reduced]);

  const visible = reduced ? SCRIPT.slice(-4) : SCRIPT.slice(0, shown);
  const typing = !reduced && phase === "typing";
  return (
    <div ref={root} className="relative mx-auto w-[220px] min-[360px]:w-[250px] sm:w-[300px] lg:w-[320px]" aria-label={`Conversa ilustrativa com ${assistantName} no WhatsApp`}>
      <div className="relative rounded-[44px] bg-gradient-to-b from-ln-muted/40 to-ln-surface p-[3px] shadow-2xl ln-glow">
        <div className="rounded-[42px] bg-ln-bg p-2">
          <div className="relative overflow-hidden rounded-[34px] wa-wallpaper">
            <div className="relative flex h-11 items-center justify-between px-5 text-[11px] font-semibold text-ln-ink">
              <span>9:41</span><span className="absolute left-1/2 top-2 h-6 w-20 -translate-x-1/2 rounded-full bg-ln-bg" />
              <span className="flex items-center gap-1"><Signal className="size-3" /><Wifi className="size-3" /><BatteryFull className="size-4" /></span>
            </div>
            <div className="flex items-center gap-1.5 bg-wa-head px-2 py-2.5 text-ln-ink">
              <ChevronLeft className="size-5 shrink-0 text-wa-accent" />
              <img src={face} alt="" className="size-8 shrink-0 rounded-full object-cover" />
              <div className="min-w-0 flex-1 leading-tight">
                <div className="truncate text-[13px] font-semibold">{assistantName} · MIAnota</div>
                <div className={`mt-0.5 text-[10px] ${typing ? "text-wa-accent" : "text-ln-muted"}`}>{typing ? "digitando…" : "online"}</div>
              </div>
              <Video className="size-4 shrink-0 text-wa-accent" /><Phone className="ml-2 size-4 shrink-0 text-wa-accent" />
            </div>
            <div ref={viewport} className="wa-conversation h-[360px] overflow-y-auto px-2 pb-2 pt-3 sm:h-[400px]" aria-live="off">
              <div className="flex min-h-full flex-col justify-end gap-2">
                <span className="mx-auto mb-2 rounded-md bg-wa-head px-3 py-1 text-[10px] text-ln-muted">Hoje</span>
                {visible.map((m, index) => (
                  <motion.div key={`${m.time}-${m.kind}-${index}`} initial={reduced ? false : { opacity: 0, y: 12, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.25 }} className={`flex shrink-0 ${m.from === "me" ? "justify-end" : "justify-start"}`}>
                    <Bubble m={m} delivery={reduced || index < shown - 1 ? "read" : delivery} />
                  </motion.div>
                ))}
                {typing && <div className="flex w-fit gap-1 rounded-lg rounded-tl-sm bg-wa-in px-3.5 py-3">{[0, 1, 2].map((d) => <span key={d} className="ln-dot size-1.5 rounded-full bg-ln-muted" style={{ animationDelay: `${d * 160}ms` }} />)}</div>}
              </div>
            </div>
            <div className="flex h-[64px] items-start gap-2 bg-wa-bg px-2 pb-5 pt-1.5">
              <Plus className="mt-2 size-5 shrink-0 text-ln-muted" />
              <div className="flex h-9 min-w-0 flex-1 items-center gap-1 rounded-full bg-wa-in px-3 text-[12px] text-ln-muted">
                <span className={`min-w-0 flex-1 truncate ${draft ? "text-ln-ink" : ""}`}>{!reduced && phase === "recording" ? "Gravando áudio… 0:04" : draft || "Mensagem"}</span>
                {!draft && phase !== "recording" && <Camera className="size-4 shrink-0" />}
              </div>
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-wa-accent text-ln-bg"><Mic className="size-4" /></span>
            </div>
            <span className="absolute bottom-1.5 left-1/2 h-1 w-20 -translate-x-1/2 rounded-full bg-ln-ink/70" />
          </div>
        </div>
      </div>
    </div>
  );
}

function Meta({ time, delivery }: { time: string; delivery?: "sent" | "delivered" | "read" }) {
  return <span className="mt-1 flex items-center justify-end gap-1 text-[9px] leading-none text-ln-muted">{time}{delivery && (delivery === "sent" ? <Check className="size-3" /> : <CheckCheck className={`size-3 ${delivery === "read" ? "text-wa-read" : ""}`} />)}</span>;
}
function Bubble({ m, delivery }: { m: Msg; delivery: "sent" | "delivered" | "read" }) {
  if (m.kind === "audio") return (
    <div className="w-[202px] max-w-full rounded-lg rounded-tr-sm bg-wa-out px-2.5 py-2 text-ln-ink">
      <div className="flex items-center gap-2"><Play className="size-5 shrink-0 fill-current text-ln-muted" /><span className="flex h-6 flex-1 items-center justify-between gap-[2px]">{[6, 12, 18, 10, 16, 8, 14, 20, 9, 13, 7, 15, 11, 17, 6, 12, 9, 16].map((h, j) => <span key={j} className="w-[2px] rounded-full bg-ln-muted" style={{ height: h }} />)}</span><Mic className="size-4 shrink-0 text-wa-read" /></div>
      <div className="flex items-center justify-between"><span className="text-[10px] text-ln-muted">0:04</span><Meta time={m.time} delivery={delivery} /></div>
    </div>
  );
  if (m.kind === "photo") return (
    <div className="w-40 rounded-lg rounded-tr-sm bg-wa-out p-1 text-ln-ink"><div className="relative h-24 overflow-hidden rounded-md bg-ln-ink/90 p-3 text-[9px] leading-tight text-ln-bg"><div className="font-bold">ENERGIA S.A.</div><div className="mt-1 opacity-70">Conta de luz · Ref. 10/2026</div><div className="mt-2 space-y-1">{[80, 60, 70].map((w, i) => <div key={i} className="h-1 rounded bg-ln-bg/25" style={{ width: `${w}%` }} />)}</div><div className="absolute bottom-2 right-3 text-[12px] font-bold">R$ 182,37</div></div><div className="px-1 pb-1"><Meta time={m.time} delivery={delivery} /></div></div>
  );
  if (m.kind === "entry") return (
    <div className="w-[216px] max-w-[94%] rounded-lg rounded-tl-sm bg-wa-in px-3 py-2 text-ln-ink"><div className="text-[12px] leading-relaxed">Anotado! ✅<br /><strong>{m.title}: {m.value}</strong><br /><span className="text-[11px] text-ln-muted">{m.meta}</span></div><Meta time={m.time} /></div>
  );
  return <div className={`max-w-[86%] rounded-lg px-2.5 py-2 text-[12px] leading-relaxed text-ln-ink ${m.from === "me" ? "rounded-tr-sm bg-wa-out" : "rounded-tl-sm bg-wa-in"}`}>{m.text}<Meta time={m.time} delivery={m.from === "me" ? delivery : undefined} /></div>;
}
