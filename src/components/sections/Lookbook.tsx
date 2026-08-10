import { motion, useScroll, useTransform, useMotionValueEvent } from "framer-motion";
import { useRef, useState } from "react";
import { Reveal } from "../Reveal";
import { GoldenParticles } from "../GoldenParticles";
import c1 from "@/assets/collection-1.jpg";
import c2 from "@/assets/collection-2.jpg";
import c3 from "@/assets/collection-3.jpg";
import atelier from "@/assets/atelier.jpg";
import d1 from "/images/shoe-detail-1.jpg";
import d2 from "/images/shoe-detail-3.jpg";
import d3 from "/images/shoe-detail-5.jpg";

const slides = [
  { src: c1, label: "01 — Lumière", caption: "Florence, dawn" },
  { src: d1, label: "02 — Texture", caption: "Calfskin study" },
  { src: c2, label: "03 — Noir", caption: "Velvet hours" },
  { src: atelier, label: "04 — Atelier", caption: "The hand" },
  { src: c3, label: "05 — Or", caption: "Liquid gold" },
  { src: d2, label: "06 — Detail", caption: "Stitched silk" },
  { src: d3, label: "07 — Heel", caption: "Signature" },
];

export function Lookbook() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  const x = useTransform(scrollYProgress, [0, 1], ["0%", "-78%"]);

  // Track active slide for spotlight effect
  const [activeIdx, setActiveIdx] = useState(0);
  useMotionValueEvent(scrollYProgress, "change", (v) => {
    const idx = Math.round(v * (slides.length - 1));
    setActiveIdx(Math.min(idx, slides.length - 1));
  });

  // Progress dots
  const progressWidth = useTransform(scrollYProgress, [0, 1], ["0%", "100%"]);

  return (
    <section ref={ref} className="relative h-[400vh] bg-[var(--ink)]" data-cursor-label="Drag">
      <div className="sticky top-0 flex h-screen flex-col overflow-hidden">
        {/* Grain + vignette */}
        <div className="absolute inset-0 luxe-grain z-[3]" />
        <div className="vignette absolute inset-0 z-[2]" />

        {/* Ambient particles */}
        <GoldenParticles count={20} className="z-[1] opacity-40" />

        {/* Header */}
        <div className="relative z-10 flex items-end justify-between px-6 pt-28 text-[var(--bone)] md:px-12">
          <Reveal>
            <div className="flex items-center gap-3">
              <div className="h-px w-6 bg-[var(--gold)]/60" />
              <p className="eyebrow text-[var(--gold)]">Lookbook MMXXV</p>
            </div>
            <h2 className="mt-4 font-display text-[clamp(2rem,5vw,4rem)] leading-[1] tracking-[-0.02em]">
              A season, <em className="italic gradient-gold-text">undressed</em>.
            </h2>
          </Reveal>
          <div className="hidden flex-col items-end gap-3 md:flex">
            <p className="eyebrow text-[var(--bone)]/30">Scroll →</p>
            {/* Film strip frame counter */}
            <div className="font-mono text-xs text-[var(--gold)]/50 tabular-nums">
              {String(activeIdx + 1).padStart(2, "0")} / {String(slides.length).padStart(2, "0")}
            </div>
          </div>
        </div>

        {/* Slides */}
        <motion.div style={{ x }} className="relative z-10 mt-10 flex h-full gap-6 px-6 will-change-transform md:gap-8 md:px-12">
          {slides.map((s, i) => {
            const isActive = i === activeIdx;
            return (
              <motion.div
                key={i}
                animate={{
                  scale: isActive ? 1 : 0.92,
                  opacity: isActive ? 1 : 0.5,
                  rotateY: isActive ? 0 : i < activeIdx ? -5 : 5,
                }}
                transition={{ duration: 0.8, ease: [0.2, 0.8, 0.2, 1] }}
                className="relative h-[62vh] w-[70vw] flex-shrink-0 overflow-hidden bg-[var(--ink)] md:w-[38vw]"
                style={{ perspective: 1200 }}
                data-cursor="hover"
              >
                {/* Image with parallax-within-slide */}
                <motion.img
                  animate={{ scale: isActive ? 1.05 : 1 }}
                  whileHover={{ scale: 1.1 }}
                  transition={{ duration: 1.4, ease: [0.2, 0.8, 0.2, 1] }}
                  src={s.src}
                  alt={s.label}
                  className="h-full w-full object-cover"
                />

                {/* Gradient overlay */}
                <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-[var(--ink)]/90 via-[var(--ink)]/30 to-transparent" />

                {/* Label */}
                <div className="absolute inset-x-0 bottom-0 flex items-end justify-between p-6 text-[var(--bone)]">
                  <span className="font-display text-2xl">{s.label}</span>
                  <span className="eyebrow text-[var(--bone)]/60">{s.caption}</span>
                </div>

                {/* Active glow border */}
                <motion.div
                  animate={{ opacity: isActive ? 1 : 0 }}
                  transition={{ duration: 0.6 }}
                  className="absolute inset-0 border border-[var(--gold)]/20 pointer-events-none"
                />

                {/* Film sprocket holes */}
                <div className="absolute left-2 top-0 bottom-0 flex flex-col justify-evenly pointer-events-none opacity-10">
                  {Array.from({ length: 8 }).map((_, j) => (
                    <div key={j} className="h-2 w-3 rounded-sm bg-[var(--bone)]" />
                  ))}
                </div>
              </motion.div>
            );
          })}
        </motion.div>

        {/* Progress bar */}
        <div className="absolute bottom-10 left-1/2 z-20 -translate-x-1/2 w-[200px]">
          <div className="relative h-[1px] w-full bg-[var(--bone)]/10">
            <motion.div
              style={{ width: progressWidth }}
              className="absolute left-0 top-0 h-full bg-[var(--gold)]"
            />
          </div>
          {/* Dot navigation */}
          <div className="mt-3 flex justify-center gap-2">
            {slides.map((_, i) => (
              <motion.div
                key={i}
                animate={{
                  scale: i === activeIdx ? 1.4 : 1,
                  backgroundColor: i === activeIdx ? "var(--gold)" : "oklch(1 0 0 / 0.2)",
                }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                className="h-1.5 w-1.5 rounded-full"
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
