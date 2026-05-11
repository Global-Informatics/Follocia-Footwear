import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import { Reveal } from "../Reveal";
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

  return (
    <section ref={ref} className="relative h-[400vh] bg-[var(--ink)]">
      <div className="sticky top-0 flex h-screen flex-col overflow-hidden luxe-grain">
        <div className="flex items-end justify-between px-6 pt-28 text-[var(--bone)] md:px-12">
          <Reveal>
            <p className="eyebrow text-[var(--gold)]">— Lookbook MMXXV</p>
            <h2 className="mt-4 font-display text-[clamp(2rem,5vw,4rem)] leading-[1] tracking-[-0.02em]">
              A season, <em className="italic">undressed</em>.
            </h2>
          </Reveal>
          <p className="hidden eyebrow text-[var(--bone)]/40 md:block">Drag · Scroll →</p>
        </div>

        <motion.div style={{ x }} className="mt-12 flex h-full gap-6 px-6 will-change-transform md:px-12">
          {slides.map((s, i) => (
            <div
              key={i}
              className="relative h-[62vh] w-[70vw] flex-shrink-0 overflow-hidden bg-[var(--ink)] md:w-[40vw]"
            >
              <motion.img
                whileHover={{ scale: 1.06 }}
                transition={{ duration: 1.2, ease: [0.2, 0.8, 0.2, 1] }}
                src={s.src}
                alt={s.label}
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-x-0 bottom-0 flex items-end justify-between bg-gradient-to-t from-[var(--ink)]/80 to-transparent p-6 text-[var(--bone)]">
                <span className="font-display text-2xl">{s.label}</span>
                <span className="eyebrow text-[var(--bone)]/70">{s.caption}</span>
              </div>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
