import { motion, useScroll, useTransform, useMotionValue, useSpring } from "framer-motion";
import { useRef, type MouseEvent } from "react";
import { Reveal } from "../Reveal";
import { CountUp } from "../CountUp";
import { GoldenParticles } from "../GoldenParticles";
import { ParallaxLayer } from "../ParallaxLayer";
import atelier from "@/assets/atelier.jpg";
import detail1 from "/images/shoe-detail-2.jpg";
import detail2 from "/images/shoe-detail-4.jpg";

export function Atelier() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y1 = useTransform(scrollYProgress, [0, 1], ["-12%", "12%"]);
  const y2 = useTransform(scrollYProgress, [0, 1], ["12%", "-12%"]);

  // Golden thread SVG draw
  const pathLength = useTransform(scrollYProgress, [0.1, 0.6], [0, 1]);

  // Mouse parallax for images
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const imgX = useSpring(useTransform(mx, [-0.5, 0.5], [-15, 15]), { stiffness: 50, damping: 20 });
  const imgY = useSpring(useTransform(my, [-0.5, 0.5], [-10, 10]), { stiffness: 50, damping: 20 });

  const handleMouse = (e: MouseEvent<HTMLElement>) => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    mx.set((e.clientX - rect.left) / rect.width - 0.5);
    my.set((e.clientY - rect.top) / rect.height - 0.5);
  };

  return (
    <section
      ref={ref}
      onMouseMove={handleMouse}
      onMouseLeave={() => { mx.set(0); my.set(0); }}
      className="relative overflow-hidden bg-[var(--ink)] px-6 py-32 text-[var(--bone)] md:px-12 md:py-48"
    >
      {/* Grain + particles */}
      <div className="absolute inset-0 luxe-grain z-[1]" />
      <GoldenParticles count={25} className="z-[1] opacity-30" />

      {/* Golden thread SVG */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none z-[2] opacity-20" viewBox="0 0 1200 800" preserveAspectRatio="none">
        <motion.path
          d="M0,400 C200,200 400,600 600,350 C800,100 1000,500 1200,300"
          fill="none"
          stroke="var(--gold)"
          strokeWidth="1"
          style={{ pathLength }}
        />
      </svg>

      <div className="relative z-10 mx-auto grid max-w-[1500px] grid-cols-1 items-center gap-16 md:grid-cols-12">
        <div className="md:col-span-5 md:col-start-1">
          <Reveal mode="clip-left">
            <div className="flex items-center gap-3">
              <div className="h-px w-6 bg-[var(--gold)]/60" />
              <p className="eyebrow text-[var(--gold)]">The Atelier</p>
            </div>
          </Reveal>
          <Reveal delay={0.1} mode="rotate-in">
            <h2 className="mt-6 font-display text-[clamp(2.5rem,5.5vw,5rem)] leading-[1.02] tracking-[-0.02em]">
              Hours of <em className="italic gradient-gold-text">silence</em> become a single pair.
            </h2>
          </Reveal>
          <Reveal delay={0.2}>
            <p className="mt-8 max-w-md text-base leading-[1.9] text-[var(--bone)]/65">
              Each Follocia is hand-lasted over thirty-two hours, stitched with golden silk thread, and finished by a
              single artisan whose initials live inside the heel.
            </p>
          </Reveal>

          {/* Stats with CountUp */}
          <Reveal delay={0.3}>
            <div className="mt-10 grid grid-cols-3 gap-6 border-y border-[var(--bone)]/10 py-8">
              {[
                { end: 32, suffix: "h", label: "Per pair" },
                { prefix: "", end: 1, suffix: " of 1", label: "Artisan" },
                { end: 6, suffix: " / yr", label: "Editions" },
              ].map((stat) => (
                <div key={stat.label} className="group">
                  <div className="font-display text-3xl text-[var(--gold)] md:text-4xl transition-all duration-500 group-hover:gold-glow-text">
                    <CountUp
                      end={stat.end}
                      prefix={stat.prefix}
                      suffix={stat.suffix}
                      className="font-display text-3xl md:text-4xl"
                    />
                  </div>
                  <div className="eyebrow mt-2 text-[var(--bone)]/40">{stat.label}</div>
                </div>
              ))}
            </div>
          </Reveal>
        </div>

        {/* Image composition with mouse parallax */}
        <div className="relative md:col-span-7 md:col-start-6">
          <motion.div style={{ y: y1, x: imgX }} className="relative aspect-[4/5] w-full overflow-hidden">
            <motion.img
              whileHover={{ scale: 1.04 }}
              transition={{ duration: 1.2, ease: [0.2, 0.8, 0.2, 1] }}
              src={atelier}
              alt="Artisan stitching golden thread"
              loading="lazy"
              width={1536}
              height={1024}
              className="h-full w-full object-cover"
              data-cursor="hover"
              data-cursor-label="Explore"
            />
            {/* Overlay gradient on hover */}
            <div className="absolute inset-0 bg-gradient-to-t from-[var(--ink)]/40 to-transparent opacity-0 transition-opacity duration-700 hover:opacity-100" />
          </motion.div>

          {/* Detail image 1 — bottom left with depth */}
          <ParallaxLayer speed={-0.3}>
            <motion.div
              style={{ y: y2 }}
              whileHover={{ scale: 1.05, zIndex: 20 }}
              transition={{ duration: 0.8, ease: [0.2, 0.8, 0.2, 1] }}
              className="absolute -bottom-10 -left-10 hidden aspect-square w-[38%] overflow-hidden border-4 border-[var(--ink)] shadow-[var(--shadow-3d)] md:block"
              data-cursor="hover"
            >
              <img src={detail1} alt="Leather stitching detail" loading="lazy" className="h-full w-full object-cover" />
              {/* Golden edge glow on hover */}
              <div className="absolute inset-0 border-2 border-[var(--gold)]/0 transition-all duration-700 hover:border-[var(--gold)]/30" />
            </motion.div>
          </ParallaxLayer>

          {/* Detail image 2 — top right */}
          <ParallaxLayer speed={0.25}>
            <motion.div
              style={{ y: y1 }}
              whileHover={{ scale: 1.05, zIndex: 20 }}
              transition={{ duration: 0.8, ease: [0.2, 0.8, 0.2, 1] }}
              className="absolute -right-6 -top-6 hidden aspect-[3/4] w-[28%] overflow-hidden border-4 border-[var(--ink)] shadow-[var(--shadow-3d)] md:block"
              data-cursor="hover"
            >
              <img src={detail2} alt="Calfskin texture" loading="lazy" className="h-full w-full object-cover" />
            </motion.div>
          </ParallaxLayer>
        </div>
      </div>
    </section>
  );
}
