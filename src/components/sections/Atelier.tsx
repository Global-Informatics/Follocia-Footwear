import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import { Reveal } from "../Reveal";
import atelier from "@/assets/atelier.jpg";
import detail1 from "/images/shoe-detail-2.jpg";
import detail2 from "/images/shoe-detail-4.jpg";

export function Atelier() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y1 = useTransform(scrollYProgress, [0, 1], ["-10%", "10%"]);
  const y2 = useTransform(scrollYProgress, [0, 1], ["10%", "-10%"]);

  return (
    <section ref={ref} className="relative overflow-hidden bg-[var(--ink)] luxe-grain px-6 py-32 text-[var(--bone)] md:px-12 md:py-48">
      <div className="mx-auto grid max-w-[1500px] grid-cols-1 items-center gap-16 md:grid-cols-12">
        <div className="md:col-span-5 md:col-start-1">
          <Reveal>
            <p className="eyebrow text-[var(--gold)]">— The Atelier</p>
            <h2 className="mt-6 font-display text-[clamp(2.5rem,5.5vw,5rem)] leading-[1.02] tracking-[-0.02em]">
              Hours of <em className="italic">silence</em> become a single pair.
            </h2>
            <p className="mt-8 max-w-md text-base leading-[1.9] text-[var(--bone)]/70">
              Each Follocia is hand-lasted over thirty-two hours, stitched with golden silk thread, and finished by a
              single artisan whose initials live inside the heel.
            </p>
            <div className="mt-10 grid grid-cols-3 gap-6 border-y border-[var(--bone)]/15 py-8">
              {[
                ["32h", "Per pair"],
                ["1 of 1", "Artisan"],
                ["6 / yr", "Editions"],
              ].map(([n, l]) => (
                <div key={l}>
                  <div className="font-display text-3xl text-[var(--gold)] md:text-4xl">{n}</div>
                  <div className="eyebrow mt-2 text-[var(--bone)]/50">{l}</div>
                </div>
              ))}
            </div>
          </Reveal>
        </div>

        <div className="relative md:col-span-7 md:col-start-6">
          <motion.div style={{ y: y1 }} className="relative aspect-[4/5] w-full overflow-hidden">
            <img src={atelier} alt="Artisan stitching golden thread" loading="lazy" width={1536} height={1024} className="h-full w-full object-cover" />
          </motion.div>
          <motion.div
            style={{ y: y2 }}
            className="absolute -bottom-12 -left-12 hidden aspect-square w-[40%] overflow-hidden border-8 border-[var(--ink)] shadow-[var(--shadow-luxe)] md:block"
          >
            <img src={detail1} alt="Leather stitching detail" loading="lazy" className="h-full w-full object-cover" />
          </motion.div>
          <motion.div
            style={{ y: y1 }}
            className="absolute -right-8 -top-8 hidden aspect-[3/4] w-[30%] overflow-hidden border-8 border-[var(--ink)] shadow-[var(--shadow-luxe)] md:block"
          >
            <img src={detail2} alt="Calfskin texture" loading="lazy" className="h-full w-full object-cover" />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
