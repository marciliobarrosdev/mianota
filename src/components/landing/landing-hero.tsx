import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from "motion/react";
import { useEffect, useState } from "react";
import { ArrowRight, Bell, Check, TrendingUp, Zap } from "lucide-react";
import miaFull from "@/assets/mia-full.png";
import { LandingPhone } from "./landing-phone";

export function LandingHero({
  assistantName,
  brandName,
  slogan,
  face,
  trialHref,
}: {
  assistantName: string;
  brandName: string;
  slogan: string;
  face: string;
  trialHref: string;
}) {
  const mx = useMotionValue(0);
  const prefersReduced = useReducedMotion();
  const [hydrated, setHydrated] = useState(false);
  const reduced = hydrated && prefersReduced;
  useEffect(() => { setHydrated(true); }, []);
  const my = useMotionValue(0);
  const sx = useSpring(mx, { stiffness: 80, damping: 20 });
  const sy = useSpring(my, { stiffness: 80, damping: 20 });
  const near = (k: number) => ({ x: useTransform(sx, (v) => v * k), y: useTransform(sy, (v) => v * k) });
  const l1 = near(14);
  const l2 = near(-22);
  const l3 = near(30);

  const words = ["Fale.", "A", assistantName, "anota."];

  return (
    <section
      id="inicio"
      onPointerMove={(e) => {
        if (e.pointerType !== "mouse" || reduced) return;
        const r = e.currentTarget.getBoundingClientRect();
        mx.set((e.clientX - r.left) / r.width - 0.5);
        my.set((e.clientY - r.top) / r.height - 0.5);
      }}
      onPointerLeave={() => { mx.set(0); my.set(0); }}
      className="relative overflow-hidden px-5 pb-16 pt-28 sm:pt-32 lg:min-h-[100svh] lg:pb-20"
    >
      <div className="ln-aurora pointer-events-none absolute -inset-20" />
      <div className="ln-grid-bg pointer-events-none absolute inset-0" />

      <div className="relative mx-auto grid max-w-6xl items-center gap-14 lg:grid-cols-[1fr_1.05fr]">
        <div className="text-center lg:text-left">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="ln-glass mx-auto inline-flex items-center gap-2 rounded-full py-1 pl-1 pr-3 text-xs font-semibold lg:mx-0"
          >
            <img src={face} alt="" className="size-6 rounded-full object-cover" />
            {assistantName} · sua assistente financeira com IA
            <span className="ln-dot size-1.5 rounded-full bg-wa-accent" />
          </motion.div>

          <h1 className="mt-6 font-sora text-[clamp(2.7rem,10vw,5.4rem)] font-extrabold leading-[0.95] tracking-[-0.05em]">
            <span className="block">
              {words.map((w, i) => (
                <motion.span
                  key={i}
                  initial={{ opacity: 0, y: 40, filter: "blur(12px)" }}
                  animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  transition={{ delay: 0.15 + i * 0.12, type: "spring", stiffness: 120, damping: 16 }}
                  className={`mr-[0.22em] inline-block ${i >= 2 ? "ln-gradient-text" : ""}`}
                >
                  {w}
                </motion.span>
              ))}
            </span>
            <motion.span
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.75 }}
              className="block text-ln-muted"
            >
              Seu dinheiro faz sentido.
            </motion.span>
          </h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.95 }}
            className="mx-auto mt-6 max-w-lg text-base leading-7 text-ln-muted sm:text-lg lg:mx-0"
          >
            {slogan} Mande um áudio, uma foto de nota ou uma mensagem no WhatsApp — o {brandName} organiza
            gastos, contas e metas para você.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.1 }}
            className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center lg:justify-start"
          >
            <motion.a
              whileHover={{ y: -3 }}
              whileTap={{ scale: 0.97 }}
              href={trialHref}
              className="group relative inline-flex h-14 items-center justify-center gap-2 overflow-hidden rounded-2xl ln-gradient px-7 text-base font-bold ln-glow"
            >
              <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-ln-ink/30 to-transparent transition duration-700 group-hover:translate-x-full" />
              Começar grátis <ArrowRight className="size-4 transition group-hover:translate-x-1" />
            </motion.a>
            <a href="#como-funciona" className="inline-flex h-14 items-center justify-center rounded-2xl ln-glass px-7 text-base font-semibold transition hover:bg-ln-surface">
              Ver como funciona
            </a>
          </motion.div>

          <div className="mt-7 flex flex-wrap justify-center gap-x-5 gap-y-2 text-xs font-semibold text-ln-muted lg:justify-start">
            <span className="inline-flex items-center gap-1.5"><Check className="size-4 text-ln-lime" /> Sem cartão no plano grátis</span>
            <span className="inline-flex items-center gap-1.5"><Check className="size-4 text-ln-lime" /> Texto, áudio, foto e PDF</span>
          </div>
        </div>

        {/* Cena: MIA + celular + cartões */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
          className="relative mx-auto flex w-full max-w-[560px] items-end justify-center"
        >
          <motion.img
            style={reduced ? undefined : l2}
            src={miaFull}
            alt={assistantName}
            className="pointer-events-none absolute bottom-10 left-0 z-20 w-[80px] object-contain drop-shadow-2xl min-[360px]:w-[104px] sm:left-4 sm:w-[155px] lg:-bottom-3 lg:left-0 lg:z-10 lg:w-[216px]"
          />
          <motion.div style={reduced ? undefined : l1} className="relative z-10 ml-14 sm:ml-32 lg:ml-60">
            <LandingPhone assistantName={assistantName} face={face} />
          </motion.div>

          <motion.div style={reduced ? undefined : l3} className="ln-glass absolute -top-14 right-0 z-20 hidden items-center gap-2.5 rounded-2xl bg-ln-surface/70 px-3.5 py-2.5 sm:flex">
            <span className="grid size-8 place-items-center rounded-xl bg-wa-accent/20 text-wa-accent"><TrendingUp className="size-4" /></span>
            <span className="text-[12px] leading-tight"><b className="block text-ln-ink">+ R$ 5.200,00</b><span className="text-ln-muted">Salário recebido</span></span>
          </motion.div>
          <motion.div style={reduced ? undefined : l1} className="ln-glass absolute -bottom-16 right-0 z-20 hidden items-center gap-2.5 rounded-2xl bg-ln-surface/70 px-3.5 py-2.5 sm:flex">
            <span className="grid size-8 place-items-center rounded-xl bg-ln-magenta/20 text-ln-magenta"><Bell className="size-4" /></span>
            <span className="text-[12px] leading-tight"><b className="block text-ln-ink">Conta de luz</b><span className="text-ln-muted">vence amanhã · R$ 182,37</span></span>
          </motion.div>
          <motion.div style={reduced ? undefined : l3} className="ln-glass absolute -bottom-7 left-0 z-20 hidden items-center gap-2 rounded-2xl bg-ln-surface/70 px-3 py-2 sm:flex lg:left-0">
            <Zap className="size-4 text-ln-lime" /><span className="text-[12px] font-semibold">Registrado em 3s</span>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
