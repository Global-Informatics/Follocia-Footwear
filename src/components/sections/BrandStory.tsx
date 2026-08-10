import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import { Reveal } from "../Reveal";
import { ParallaxLayer } from "../ParallaxLayer";

const words = ["Rare", "Limited", "Sculpted in Italy", "MMXXV", "Six Releases", "Worn by the Few", "Atelier", "Florentine"];

export function Marquee() {
  return (
    <div className="relative overflow-hidden border-y border-[var(--ink)]/8 bg-[var(--bone)] py-6">
      {/* Fade edges */}
      <div className="absolute inset-y-0 left-0 w-24 z-10 bg-gradient-to-r from-[var(--bone)] to-transparent" />
      <div className="absolute inset-y-0 right-0 w-24 z-10 bg-gradient-to-l from-[var(--bone)] to-transparent" />

      {/* Row 1 — forward */}
      <div className="flex w-max animate-marquee gap-16 whitespace-nowrap" style={{ perspective: 800 }}>
        {[...Array(2)].map((_, j) => (
          <div key={j} className="flex shrink-0 items-center gap-16 pr-16">
            {words.map((w, i) => (
              <span
                key={`${j}-${i}`}
                className="group flex cursor-default items-center gap-16 font-display text-5xl italic text-[var(--ink)]/80 transition-colors duration-500 hover:text-[var(--gold)] md:text-7xl"
              >
                <span className="transition-transform duration-500 group-hover:scale-110">{w}</span>
                <span className="h-2 w-2 rounded-full bg-[var(--gold)] transition-transform duration-500 group-hover:scale-150 group-hover:shadow-[0_0_12px_var(--gold)]" />
              </span>
            ))}
          </div>
        ))}
      </div>

      {/* Row 2 — reverse (subtle) */}
      <div className="mt-3 flex w-max animate-marquee-reverse gap-16 whitespace-nowrap opacity-20">
        {[...Array(2)].map((_, j) => (
          <div key={j} className="flex shrink-0 items-center gap-16 pr-16">
            {words.reverse().map((w, i) => (
              <span key={`r${j}-${i}`} className="flex items-center gap-16 font-display text-3xl italic text-[var(--ink)]">
                {w}
                <span className="h-1 w-1 rounded-full bg-[var(--ink)]/30" />
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function BrandStory() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const lineWidth = useTransform(scrollYProgress, [0.1, 0.5], ["0%", "100%"]);

  return (
    <section ref={ref} className="relative overflow-hidden bg-[var(--bone)] px-6 py-32 md:px-12 md:py-48">
      {/* Decorative floating elements */}
      <ParallaxLayer speed={-0.2} className="absolute right-[5%] top-[10%] pointer-events-none">
        <div className="h-40 w-40 rounded-full border border-[var(--gold)]/10 animate-float-slow" />
      </ParallaxLayer>
      <ParallaxLayer speed={0.15} className="absolute left-[8%] bottom-[15%] pointer-events-none">
        <div className="h-24 w-24 rounded-full border border-[var(--ink)]/5 animate-float" />
      </ParallaxLayer>

      {/* Large decorative quote mark */}
      <ParallaxLayer speed={-0.3} className="absolute left-6 top-20 pointer-events-none md:left-12">
        <span className="font-display text-[20rem] leading-none text-[var(--gold)]/[0.04] select-none">
          "
        </span>
      </ParallaxLayer>

      <div className="mx-auto grid max-w-[1400px] grid-cols-1 gap-16 md:grid-cols-12">
        <Reveal className="md:col-span-4" mode="clip-left">
          <div className="flex items-center gap-3">
            <div className="h-px w-6 bg-[var(--gold)]/50" />
            <p className="eyebrow text-[var(--ink)]/60">A House of Rarity</p>
          </div>
        </Reveal>
        <div className="md:col-span-8">
          <Reveal mode="rotate-in">
            <h2 className="font-display text-[clamp(2.5rem,6vw,6rem)] leading-[1.02] tracking-[-0.02em] text-[var(--ink)]">
              We do not chase seasons.
              <br />
              We chase <em className="italic text-[var(--gold)] gold-glow-text">moments</em>.
            </h2>
          </Reveal>

          {/* Animated separator line */}
          <motion.div
            style={{ width: lineWidth }}
            className="mt-10 h-px bg-gradient-to-r from-[var(--gold)] via-[var(--gold)]/60 to-transparent"
          />

          <Reveal delay={0.15} mode="fade-up">
            <div className="mt-10 grid grid-cols-1 gap-10 text-base leading-[1.9] text-[var(--ink)]/70 md:grid-cols-2">
              <p>
                Follocia exists for the woman who has stopped translating fashion and started writing it. Every silhouette
                is sculpted by hand in our Florentine atelier — drawn slowly, finished slower, signed only when perfect.
              </p>
              <p>
                We release six collections a year. No restocks. No repeats. When the last pair leaves the box, that
                edition becomes part of an archive, never a catalogue.
              </p>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
