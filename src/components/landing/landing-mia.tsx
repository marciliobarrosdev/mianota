import { motion } from "motion/react";
import { Camera, FileText, MessageCircle, Mic, Zap, type LucideIcon } from "lucide-react";
import miaFull from "@/assets/mia-full.png";

const ITEMS: Array<{ icon: LucideIcon; title: string; text: string }> = [
  { icon: MessageCircle, title: "Texto", text: "Escreva do seu jeito, sem formulário." },
  { icon: Mic, title: "Áudio", text: "Fale e a MIA transcreve e registra." },
  { icon: Camera, title: "Foto de nota", text: "Envie o comprovante e ela lê os dados." },
  { icon: FileText, title: "PDF", text: "Boletos e extratos viram lançamentos." },
];

export function LandingMia({ assistantName }: { assistantName: string }) {
  return (
    <div className="mt-12 grid items-center gap-10 lg:grid-cols-[.9fr_1.1fr]">
      <div className="relative mx-auto flex h-[440px] w-full max-w-[360px] items-end justify-center sm:h-[520px]">
        <div className="ln-aura absolute bottom-10 left-1/2 size-72 -translate-x-1/2 rounded-full ln-gradient opacity-50 blur-3xl" />
        <div className="absolute bottom-0 left-1/2 h-8 w-56 -translate-x-1/2 rounded-[50%] bg-ln-violet/40 blur-xl" />
        <motion.img
          src={miaFull}
          alt={assistantName}
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
          className="relative h-full w-auto object-contain drop-shadow-2xl"
        />
        <motion.div
          animate={{ y: [0, -8, 0] }}
          transition={{ duration: 4, repeat: Infinity }}
          className="ln-glass absolute left-0 top-16 flex items-center gap-2 rounded-2xl bg-ln-surface/70 px-3.5 py-2 text-sm font-semibold"
        >
          <Zap className="size-4 text-ln-lime" /> Responde em segundos
        </motion.div>
      </div>
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
            <span className="grid size-12 place-items-center rounded-2xl ln-gradient"><Icon className="size-5" /></span>
            <h3 className="mt-4 font-sora text-base font-bold">{title}</h3>
            <p className="mt-1 text-[13px] leading-5 text-ln-muted">{text.replace("MIA", assistantName)}</p>
          </motion.article>
        ))}
      </div>
    </div>
  );
}
