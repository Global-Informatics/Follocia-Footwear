import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import heroShoe from "@/assets/hero-shoe.jpg";

export function Hero() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], ["0%", "30%"]);
  const scale = useTransform(scrollYProgress, [0, 1], [1, 1.15]);
  const titleY = useTransform(scrollYProgress, [0, 1], ["0%", "80%"]);
  const opacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

  return (
    <section ref={ref} className="relative h-[110vh] w-full overflow-hidden bg-[var(--ink)] luxe-grain">
      {/* Background glow */}
      <motion.div
        style={{ scale }}
        className="absolute inset-0"
      >
        <div className="absolute left-1/2 top-1/2 h-[80vh] w-[80vh] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--gold)]/15 blur-[120px]" />
      </motion.div>

      {/* Floating shoe */}
      <motion.div
        style={{ y, scale }}
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.6, ease: [0.2, 0.8, 0.2, 1] }}
        className="absolute inset-0 flex items-center justify-center"
      >
        <div className="animate-float">
          <img
            src={heroShoe}
            alt="Follocia signature champagne pump"
            width={1080}
            height={1920}
            className="h-[80vh] w-auto select-none object-contain drop-shadow-[0_60px_80px_rgba(0,0,0,0.5)]"
          />
        </div>
      </motion.div>

      {/* Eyebrow top-left */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 1 }}
        className="absolute left-6 top-28 z-10 max-w-xs text-[var(--bone)]/70 md:left-12"
      >
        <p className="eyebrow">Maison Follocia · MMXXV</p>
        <p className="mt-3 text-sm leading-relaxed">
          Six rare collections per year. Crafted in limited numbers for women who refuse the ordinary.
        </p>
      </motion.div>

      {/* Headline */}
      <motion.div
        style={{ y: titleY, opacity }}
        className="relative z-10 mx-auto flex h-full max-w-[1600px] flex-col justify-end px-6 pb-32 md:px-12"
      >
        <motion.h1
          initial={{ opacity: 0, y: 60 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.4, ease: [0.2, 0.8, 0.2, 1], delay: 0.2 }}
          className="font-display text-[clamp(3.5rem,11vw,11rem)] leading-[0.9] tracking-[-0.03em] text-[var(--bone)]"
        >
          Limited <em className="font-light italic gradient-gold-text">Edition</em>
          <br />
          for the <em className="font-light italic">Few.</em>
        </motion.h1>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.9 }}
          className="mt-10 flex flex-col items-start gap-6 md:flex-row md:items-center md:justify-between"
        >
          <p className="max-w-md text-base leading-relaxed text-[var(--bone)]/70">
            Footwear sculpted in Italian ateliers. Released only six times a year. Once gone, never reissued.
          </p>
          <div className="flex flex-wrap gap-4">
            <a
              href="#collections"
              className="magnetic-btn group inline-flex items-center gap-3 border border-[var(--bone)]/40 px-8 py-4 eyebrow text-[var(--bone)] transition-colors hover:text-[var(--ink)]"
            >
              Explore Collection
              <span className="transition-transform group-hover:translate-x-1">→</span>
            </a>
            <a
              href="#vip"
              className="magnetic-btn inline-flex items-center gap-3 bg-[var(--bone)] px-8 py-4 eyebrow text-[var(--ink)]"
            >
              Join Early Access
            </a>
          </div>
        </motion.div>
      </motion.div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.6, duration: 1 }}
        className="absolute bottom-8 left-1/2 z-10 -translate-x-1/2 text-[var(--bone)]/60"
      >
        <div className="flex flex-col items-center gap-3">
          <span className="eyebrow text-[0.6rem]">Scroll</span>
          <motion.div
            animate={{ scaleY: [0.3, 1, 0.3] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            style={{ transformOrigin: "top" }}
            className="h-10 w-px bg-[var(--bone)]/60"
          />
        </div>
      </motion.div>
    </section>
  );
}
