import { useRef, type MouseEvent } from "react";
import { motion, useMotionValue, useSpring, useTransform, useScroll } from "framer-motion";
import { Reveal } from "../Reveal";

const benefits = [
  { n: "01", t: "Rare", d: "Released six times a year, never reissued. Each edition becomes a sealed chapter.", icon: "M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" },
  { n: "02", t: "Sculpted", d: "Hand-lasted over 32 hours in our Florentine atelier by a single artisan.", icon: "M12 19l7-7 3 3-7 7-3-3zm0 0l-7-7-3 3 7 7 3-3zM12 19V5M5 12h14" },
  { n: "03", t: "Numbered", d: "Each pair signed, registered, and traceable to its owner for eternity.", icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" },
  { n: "04", t: "Eternal", d: "Lifetime restoration by the original artisan. Your pair, forever perfect.", icon: "M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" },
];

function BenefitCard({ b, i }: { b: typeof benefits[0]; i: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const rx = useSpring(useTransform(my, [-1, 1], [6, -6]), { stiffness: 120, damping: 15 });
  const ry = useSpring(useTransform(mx, [-1, 1], [-8, 8]), { stiffness: 120, damping: 15 });

  const onMove = (e: MouseEvent<HTMLDivElement>) => {
    const r = ref.current!.getBoundingClientRect();
    mx.set(((e.clientX - r.left) / r.width - 0.5) * 2);
    my.set(((e.clientY - r.top) / r.height - 0.5) * 2);
  };
  const reset = () => { mx.set(0); my.set(0); };

  return (
    <Reveal delay={i * 0.1} mode="scale-in">
      <motion.div
        ref={ref}
        onMouseMove={onMove}
        onMouseLeave={reset}
        style={{ rotateX: rx, rotateY: ry, transformPerspective: 1000 }}
        className="group relative border-t border-[var(--ink)]/15 pt-8 card-3d cursor-default"
        data-cursor="hover"
      >
        {/* Animated gold top-line */}
        <motion.div
          initial={{ width: 0 }}
          whileInView={{ width: "100%" }}
          viewport={{ once: true }}
          transition={{ duration: 1.2, delay: i * 0.15, ease: [0.2, 0.8, 0.2, 1] }}
          className="absolute left-0 top-0 h-px bg-gradient-to-r from-[var(--gold)] to-[var(--gold)]/30"
        />

        {/* Animated SVG icon */}
        <motion.div
          initial={{ opacity: 0, scale: 0.5 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: i * 0.15 + 0.3 }}
          className="mb-4"
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="1" className="opacity-50 transition-opacity duration-500 group-hover:opacity-100">
            <motion.path
              d={b.icon}
              initial={{ pathLength: 0 }}
              whileInView={{ pathLength: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 1.5, delay: i * 0.15 + 0.2, ease: [0.2, 0.8, 0.2, 1] }}
            />
          </svg>
        </motion.div>

        <div className="font-display text-sm text-[var(--ink)]/30">{b.n}</div>
        <h3 className="mt-4 font-display text-3xl text-[var(--ink)] md:text-4xl transition-colors duration-500 group-hover:text-[var(--gold)]">
          {b.t}
        </h3>
        <p className="mt-4 text-sm leading-relaxed text-[var(--ink)]/65">{b.d}</p>

        {/* Hover glow */}
        <div className="absolute inset-0 -z-10 rounded-sm opacity-0 transition-opacity duration-700 group-hover:opacity-100"
          style={{ background: "radial-gradient(ellipse at center, oklch(0.78 0.12 80 / 0.06), transparent 70%)" }}
        />
      </motion.div>
    </Reveal>
  );
}

export function Benefits() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const bgY = useTransform(scrollYProgress, [0, 1], ["0%", "15%"]);

  return (
    <section ref={ref} className="relative overflow-hidden bg-[var(--champagne)]/30 px-6 py-32 md:px-12 md:py-44">
      {/* Parallax background accent */}
      <motion.div style={{ y: bgY }} className="absolute inset-0 pointer-events-none">
        <div className="absolute right-[10%] top-[10%] h-[40vh] w-[40vh] rounded-full bg-[var(--gold)]/[0.04] blur-[80px]" />
        <div className="absolute left-[5%] bottom-[10%] h-[30vh] w-[30vh] rounded-full bg-[var(--champagne)]/30 blur-[60px]" />
      </motion.div>

      <div className="relative mx-auto max-w-[1500px]">
        <Reveal mode="rotate-in">
          <div className="mb-20 max-w-3xl">
            <div className="flex items-center gap-3">
              <div className="h-px w-6 bg-[var(--gold)]/50" />
              <p className="eyebrow text-[var(--ink)]/55">The Promise</p>
            </div>
            <h2 className="mt-4 font-display text-[clamp(2.25rem,5vw,4.5rem)] leading-[1.05] tracking-[-0.02em] text-[var(--ink)]">
              A philosophy of <em className="italic text-[var(--gold)] gold-glow-text">restraint</em>.
            </h2>
          </div>
        </Reveal>
        <div className="grid grid-cols-1 gap-x-10 gap-y-16 md:grid-cols-4">
          {benefits.map((b, i) => (
            <BenefitCard key={b.t} b={b} i={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
