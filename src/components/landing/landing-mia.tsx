import { motion, useScroll, useTransform } from "motion/react";
import { useRef } from "react";
import {
  BellRing,
  Camera,
  FileText,
  MessageCircle,
  Mic,
  Sparkles,
  TrendingUp,
  Zap,
  type LucideIcon,
} from "lucide-react";
import miaStage from "@/assets/mia-stage.png";

const ITEMS: Array<{ icon: LucideIcon; title: string; text: string }> = [
  { icon: MessageCircle, title: "Texto", text: "Escreva do seu jeito, sem formulário." },
  { icon: Mic, title: "Áudio", text: "Fale e a MIA transcreve e registra." },
  { icon: Camera, title: "Foto de nota", text: "Envie o comprovante e ela lê os dados." },
  { icon: FileText, title: "PDF", text: "Boletos e extratos viram lançamentos." },
];

const EXTRAS: Array<{ icon: LucideIcon; label: string }> = [
  { icon: BellRing, label: "Lembretes de contas" },
  { icon: TrendingUp, label: "Resumo do mês" },
  { icon: Sparkles, label: "Dicas para economizar" },
];

function Chip({
  className,
  children,
  delay = 0,
  float = 8,
}: {
  className: string;
  children: React.ReactNode;
  delay?: number;
  float?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true, margin: "-10%" }}
      transition={{ delay, type: "spring", stiffness: 200, damping: 16 }}
      className={`absolute z-10 ${className}`}
    >
      <motion.div
        animate={{ y: [0, -float, 0] }}
        transition={{ duration: 4 + delay, repeat: Infinity, ease: "easeInOut", delay }}
        className="ln-glass flex items-center gap-2 rounded-2xl bg-ln-surface/70 px-3.5 py-2 text-[13px] font-semibold shadow-lg"
      >
        {children}
      </motion.div>
    </motion.div>
  );
}

export function LandingMia({ assistantName }: { assistantName: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const imgY = useTransform(scrollYProgress, [0, 1], [40, -40]);
  const auraScale = useTransform(scrollYProgress, [0, 1], [0.9, 1.15]);

  return (
    <div ref={ref} className="mt-12 grid items-center gap-12 lg:grid-cols-[1fr_1.1fr] lg:gap-8">
      {/* MIA stage */}
      <div className="relative mx-auto flex h-[460px] w-full max-w-[400px] items-end justify-center sm:h-[560px]">
        {/* glow aura */}
        <motion.div
          style={{ scale: auraScale }}
          className="ln-aura absolute bottom-16 left-1/2 size-80 -translate-x-1/2 rounded-full ln-gradient opacity-50 blur-3xl"
        />
        {/* rings */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
          className="absolute bottom-24 left-1/2 size-[300px] -translate-x-1/2 rounded-full border border-dashed border-ln-violet/30 sm:size-[360px]"
        />
        <motion.div
          animate={{ rotate: -360 }}
          transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
          className="absolute bottom-16 left-1/2 size-[380px] -translate-x-1/2 rounded-full border border-ln-lime/15 sm:size-[460px]"
        />
        {/* ground shadow */}
        <div className="absolute bottom-0 left-1/2 h-8 w-56 -translate-x-1/2 rounded-[50%] bg-ln-violet/40 blur-xl" />
        {/* MIA */}
        <motion.img
          src={miaStage}
          alt={assistantName}
          style={{ y: imgY }}
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
          className="relative h-full w-auto object-contain drop-shadow-2xl"
        />
        {/* floating chips */}
        <Chip className="right-0 bottom-24 sm:bottom-28" delay={0.1}>
          <Zap className="size-4 text-ln-lime" /> Responde em segundos
        </Chip>
        <Chip className="right-0 top-32 sm:top-40" delay={0.25} float={10}>
          <Mic className="size-4 text-ln-violet" /> Entende áudio
        </Chip>
        <Chip className="bottom-40 left-2 sm:bottom-48" delay={0.4} float={6}>
          <Camera className="size-4 text-ln-lime" /> Lê notas e boletos
        </Chip>
      </div>

      {/* Capabilities */}
      <div>
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          {ITEMS.map(({ icon: Icon, title, text }, i) => (
            <motion.article
              key={title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-10%" }}
              transition={{ delay: i * 0.08, type: "spring", stiffness: 140, damping: 18 }}
              whileHover={{ y: -6, rotate: i % 2 ? 1 : -1 }}
              className="rounded-3xl ln-glass p-5"
            >
              <span className="grid size-12 place-items-center rounded-2xl ln-gradient">
                <Icon className="size-5" />
              </span>
              <h3 className="mt-4 font-sora text-base font-bold">{title}</h3>
              <p className="mt-1 text-[13px] leading-5 text-ln-muted">{text.replace("MIA", assistantName)}</p>
            </motion.article>
          ))}
        </div>
        {/* extras strip */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3, duration: 0.6 }}
          className="mt-4 flex flex-wrap gap-2.5"
        >
          {EXTRAS.map(({ icon: Icon, label }) => (
            <span
              key={label}
              className="ln-glass flex items-center gap-2 rounded-full bg-ln-surface/60 px-4 py-2 text-[13px] font-medium text-ln-muted"
            >
              <Icon className="size-4 text-ln-lime" /> {label}
            </span>
          ))}
        </motion.div>
      </div>
    </div>
  );
}
