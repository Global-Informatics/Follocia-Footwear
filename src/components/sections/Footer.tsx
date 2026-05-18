import { motion, useScroll, useTransform } from "framer-motion";
import { useRef, useState } from "react";
import { Reveal } from "../Reveal";
import { BrandLogo } from "@/components/BrandLogo";

export function Footer() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end end"] });
  const lineWidth = useTransform(scrollYProgress, [0, 0.5], ["0%", "100%"]);
  const [showTop, setShowTop] = useState(false);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Show back-to-top when in footer area
  const opacity = useTransform(scrollYProgress, [0.2, 0.5], [0, 1]);

  const cols = [
    { t: "Maison", l: ["The House", "Atelier", "Sustainability", "Press"] },
    { t: "Editions", l: ["Current Drop", "Archive", "Lookbook", "Lookafter"] },
    { t: "Service", l: ["Concierge", "Restoration", "Sizing", "Contact"] },
  ];

  const socials = [
    { name: "Instagram", icon: "M16 2H8a6 6 0 0 0-6 6v8a6 6 0 0 0 6 6h8a6 6 0 0 0 6-6V8a6 6 0 0 0-6-6zm4 14a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4V8a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4z M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10zm0 8a3 3 0 1 1 0-6 3 3 0 0 1 0 6z M17.5 6.5a1 1 0 1 0 0 2 1 1 0 0 0 0-2z" },
    { name: "Pinterest", icon: "M12 2C6.5 2 2 6.5 2 12c0 4.1 2.5 7.6 6 9.2 0-.7 0-1.6.2-2.4.2-.8 1.4-5.8 1.4-5.8s-.4-.7-.4-1.8c0-1.7 1-2.9 2.2-2.9 1 0 1.5.8 1.5 1.7 0 1-.7 2.6-1 4-.3 1.2.6 2.2 1.8 2.2 2.1 0 3.5-2.7 3.5-5.9 0-2.4-1.6-4.2-4.6-4.2-3.3 0-5.4 2.5-5.4 5.3 0 1 .3 1.7.7 2.2.1.1.1.2.1.3l-.3 1c0 .2-.2.3-.3.2-1.5-.6-2.2-2.3-2.2-4.2 0-3.1 2.6-6.8 7.8-6.8 4.2 0 6.9 3 6.9 6.3 0 4.3-2.4 7.5-5.9 7.5-1.2 0-2.3-.6-2.7-1.4l-.7 2.9c-.3 1-.8 2-1.3 2.8 1.1.3 2.2.5 3.3.5 5.5 0 10-4.5 10-10S17.5 2 12 2z" },
    { name: "TikTok", icon: "M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9a6.33 6.33 0 00-.79-.05A6.34 6.34 0 003.15 15.3a6.34 6.34 0 0010.86 4.46V12.3a8.26 8.26 0 005.58 2.17V11a4.83 4.83 0 01-3.77-1.85V6.69z" },
  ];

  return (
    <footer ref={ref} className="relative bg-[var(--ink)] px-6 pb-12 pt-24 text-[var(--bone)] md:px-12 overflow-hidden">
      {/* Animated gold separator line at top */}
      <motion.div
        style={{ width: lineWidth }}
        className="absolute top-0 left-0 h-px bg-gradient-to-r from-[var(--gold)] via-[var(--gold)]/60 to-transparent"
      />

      {/* Subtle grain */}
      <div className="absolute inset-0 luxe-grain z-0" />

      <div className="relative z-10 mx-auto max-w-[1500px]">
        <div className="grid grid-cols-2 gap-12 border-b border-[var(--bone)]/8 pb-16 md:grid-cols-12">
          {/* Logo section */}
          <Reveal className="col-span-2 md:col-span-5" mode="fade-up">
            <BrandLogo imageClassName="h-24 w-24 border border-white/10" />
            <p className="mt-6 max-w-xs text-sm leading-relaxed text-[var(--bone)]/50">
              Limited edition women's footwear. Sculpted in Florence. Worn by the few.
            </p>
            {/* Social icons with magnetic hover */}
            <div className="mt-6 flex gap-4">
              {socials.map((s) => (
                <a
                  key={s.name}
                  href="#"
                  aria-label={s.name}
                  data-cursor="hover"
                  className="group flex h-10 w-10 items-center justify-center rounded-full border border-[var(--bone)]/10 transition-all duration-500 hover:border-[var(--gold)]/40 hover:shadow-[0_0_15px_oklch(0.78_0.12_80/0.15)]"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="text-[var(--bone)]/50 transition-colors duration-500 group-hover:text-[var(--gold)]">
                    <path d={s.icon} />
                  </svg>
                </a>
              ))}
            </div>
          </Reveal>

          {/* Link columns */}
          {cols.map((c, colIdx) => (
            <Reveal key={c.t} className="md:col-span-2" delay={colIdx * 0.1} mode="fade-up">
              <div className="eyebrow text-[var(--bone)]/35">{c.t}</div>
              <ul className="mt-6 space-y-3">
                {c.l.map((x) => (
                  <li key={x}>
                    <a href="#" className="text-sm text-[var(--bone)]/75 hover-underline transition-colors hover:text-[var(--gold)]" data-cursor="hover">
                      {x}
                    </a>
                  </li>
                ))}
              </ul>
            </Reveal>
          ))}

          {/* Newsletter mini */}
          <Reveal className="col-span-2 md:col-span-1" delay={0.3}>
            <div className="eyebrow text-[var(--bone)]/35">Follow</div>
            <ul className="mt-6 space-y-3">
              {["Instagram", "Pinterest", "TikTok"].map((x) => (
                <li key={x}>
                  <a href="#" className="text-sm text-[var(--bone)]/75 hover-underline hover:text-[var(--gold)]" data-cursor="hover">
                    {x}
                  </a>
                </li>
              ))}
            </ul>
          </Reveal>
        </div>

        {/* Bottom bar */}
        <div className="mt-10 flex flex-col items-start justify-between gap-4 text-xs uppercase tracking-[0.25em] text-[var(--bone)]/30 md:flex-row md:items-center">
          <Reveal mode="clip-left">
            <div>© MMXXV Maison Follocia · Firenze</div>
          </Reveal>
          <div className="flex items-center gap-8">
            {["Privacy", "Terms", "Cookies"].map((x) => (
              <a key={x} href="#" className="hover-underline hover:text-[var(--gold)] transition-colors" data-cursor="hover">{x}</a>
            ))}

            {/* Back to top */}
            <motion.button
              style={{ opacity }}
              onClick={scrollToTop}
              data-cursor="hover"
              className="group ml-4 flex h-10 w-10 items-center justify-center rounded-full border border-[var(--bone)]/15 transition-all duration-500 hover:border-[var(--gold)]/40 hover:shadow-[0_0_15px_oklch(0.78_0.12_80/0.15)]"
              aria-label="Back to top"
            >
              <motion.svg
                width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                className="text-[var(--bone)]/50 transition-colors group-hover:text-[var(--gold)]"
                animate={{ y: [2, -2, 2] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              >
                <path d="M18 15l-6-6-6 6" />
              </motion.svg>
            </motion.button>
          </div>
        </div>
      </div>
    </footer>
  );
}
