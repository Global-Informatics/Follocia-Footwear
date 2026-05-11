import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";

export function Loader() {
  const [done, setDone] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let p = 0;
    const id = setInterval(() => {
      p += Math.random() * 18 + 6;
      if (p >= 100) {
        p = 100;
        clearInterval(id);
        setTimeout(() => setDone(true), 600);
      }
      setProgress(Math.floor(p));
    }, 160);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!done) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
  }, [done]);

  return (
    <AnimatePresence>
      {!done && (
        <motion.div
          exit={{ y: "-100%" }}
          transition={{ duration: 1.1, ease: [0.76, 0, 0.24, 1] }}
          className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-[var(--ink)] luxe-grain text-[var(--bone)]"
        >
          <motion.div
            initial={{ opacity: 0, letterSpacing: "0.6em" }}
            animate={{ opacity: 1, letterSpacing: "0.3em" }}
            transition={{ duration: 1.4, ease: [0.2, 0.8, 0.2, 1] }}
            className="font-display text-5xl md:text-7xl"
          >
            FOLLOCIA
          </motion.div>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.8 }}
            className="mt-6 eyebrow text-[var(--bone)]/50"
          >
            Maison · MMXXV
          </motion.div>

          <div className="absolute bottom-12 left-1/2 w-[60vw] max-w-md -translate-x-1/2">
            <div className="relative h-px w-full bg-[var(--bone)]/15 overflow-hidden">
              <motion.div
                animate={{ width: `${progress}%` }}
                transition={{ ease: "easeOut", duration: 0.3 }}
                className="absolute left-0 top-0 h-full bg-[var(--gold)]"
              />
            </div>
            <div className="mt-4 flex justify-between eyebrow text-[var(--bone)]/40 text-[0.6rem]">
              <span>Curating the Atelier</span>
              <span>{progress}%</span>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
