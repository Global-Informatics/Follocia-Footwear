import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { BrandLogo } from "./BrandLogo";

const panelTransition = { duration: 1.4, ease: [0.76, 0, 0.24, 1] as const };

export function Loader() {
  const [done, setDone] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let p = 0;
    const id = setInterval(() => {
      p += Math.random() * 15 + 5;
      if (p >= 100) {
        p = 100;
        clearInterval(id);
        setTimeout(() => setDone(true), 800);
      }
      setProgress(Math.floor(p));
    }, 140);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!done) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
  }, [done]);

  const digits = String(progress).padStart(3, "0").split("");

  return (
    <AnimatePresence>
      {!done && (
        <motion.div
          className="fixed inset-0 z-[200] flex items-center justify-center overflow-hidden"
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5, delay: 0.8 }}
        >
          {/* Split curtain panels */}
          <motion.div
            initial={{ y: 0 }}
            exit={{ y: "-100%" }}
            transition={panelTransition}
            className="absolute inset-x-0 top-0 h-1/2 bg-[var(--ink)]"
          />
          <motion.div
            initial={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={panelTransition}
            className="absolute inset-x-0 bottom-0 h-1/2 bg-[var(--ink)]"
          />

          {/* Aurora background */}
          <div className="absolute inset-0 animate-aurora opacity-40"
            style={{
              background: "linear-gradient(135deg, oklch(0.18 0.06 60), oklch(0.12 0.08 80), oklch(0.15 0.04 40), oklch(0.1 0.06 70))",
              backgroundSize: "300% 300%",
            }}
          />

          {/* Grain overlay */}
          <div className="absolute inset-0 luxe-grain" />

          {/* Golden orb glow */}
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: [0.5, 1.2, 1], opacity: [0, 0.4, 0.25] }}
            transition={{ duration: 2.5, ease: "easeOut" }}
            className="absolute h-[50vh] w-[50vh] rounded-full bg-[var(--gold)]/20 blur-[100px]"
          />

          {/* Content */}
          <div className="relative z-10 flex flex-col items-center">
            {/* Logo with 3D entrance */}
            <motion.div
              initial={{ opacity: 0, scale: 0.7, rotateY: -30 }}
              animate={{ opacity: 1, scale: 1, rotateY: 0 }}
              transition={{ duration: 1.8, ease: [0.2, 0.8, 0.2, 1] }}
              style={{ perspective: 1200 }}
            >
              <BrandLogo imageClassName="h-28 w-28 border border-white/10 md:h-36 md:w-36" />
            </motion.div>

            {/* Brand name */}
            <motion.div
              initial={{ opacity: 0, y: 20, filter: "blur(10px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              transition={{ delay: 0.5, duration: 1.2, ease: [0.2, 0.8, 0.2, 1] }}
              className="mt-5 eyebrow text-[var(--bone)]/50 tracking-[0.4em]"
            >
              Maison Follocia
            </motion.div>

            {/* Decorative line */}
            <motion.div
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ delay: 0.8, duration: 1.5, ease: [0.2, 0.8, 0.2, 1] }}
              className="mt-6 h-px w-32 bg-gradient-to-r from-transparent via-[var(--gold)]/60 to-transparent"
              style={{ transformOrigin: "center" }}
            />

            {/* Counter with flip digits */}
            <div className="mt-8 flex items-baseline gap-1">
              {digits.map((d, i) => (
                <motion.span
                  key={`${i}-${d}`}
                  initial={{ opacity: 0, y: 15, rotateX: -60 }}
                  animate={{ opacity: 1, y: 0, rotateX: 0 }}
                  transition={{ duration: 0.4, ease: [0.2, 0.8, 0.2, 1] }}
                  className="inline-block font-display text-5xl tabular-nums text-[var(--bone)]/30 md:text-6xl"
                  style={{ perspective: 600, minWidth: "1.2ch", textAlign: "center" }}
                >
                  {d}
                </motion.span>
              ))}
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="ml-1 text-sm text-[var(--gold)]/50"
              >
                %
              </motion.span>
            </div>
          </div>

          {/* Bottom progress bar */}
          <div className="absolute bottom-16 left-1/2 w-[50vw] max-w-sm -translate-x-1/2 z-10">
            <div className="relative h-[1px] w-full overflow-hidden bg-[var(--bone)]/10">
              <motion.div
                animate={{ width: `${progress}%` }}
                transition={{ ease: "easeOut", duration: 0.25 }}
                className="absolute left-0 top-0 h-full"
                style={{ background: "var(--gradient-gold)" }}
              />
              {/* Glow at tip */}
              <motion.div
                animate={{ left: `${progress}%` }}
                transition={{ ease: "easeOut", duration: 0.25 }}
                className="absolute top-1/2 -translate-y-1/2 h-4 w-4 -translate-x-1/2 rounded-full bg-[var(--gold)]/40 blur-md"
              />
            </div>
            <div className="mt-4 flex justify-between eyebrow text-[var(--bone)]/30 text-[0.55rem] tracking-[0.3em]">
              <span>Curating the Atelier</span>
              <span className="tabular-nums">{progress}%</span>
            </div>
          </div>

          {/* Corner decorations */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.2 }}
            transition={{ delay: 1, duration: 1 }}
            className="absolute left-8 top-8 z-10"
          >
            <div className="h-8 w-px bg-[var(--gold)]" />
            <div className="h-px w-8 bg-[var(--gold)] -mt-8" />
          </motion.div>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.2 }}
            transition={{ delay: 1, duration: 1 }}
            className="absolute right-8 bottom-8 z-10"
          >
            <div className="h-8 w-px bg-[var(--gold)] ml-7" />
            <div className="h-px w-8 bg-[var(--gold)]" />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
