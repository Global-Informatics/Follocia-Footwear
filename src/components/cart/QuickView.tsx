import { AnimatePresence, motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { useRef, useState, type MouseEvent } from "react";
import { useCart } from "./CartContext";

export type QuickItem = { id: string; title: string; edition: string; tone: string; price: string; image: string; description?: string };
const ease = [0.2, 0.8, 0.2, 1] as const;
const sizes = ["35", "36", "37", "38", "39", "40", "41"];

export function QuickView({ item, onClose }: { item: QuickItem | null; onClose: () => void }) {
  const { add } = useCart();
  const [size, setSize] = useState("38");
  const [added, setAdded] = useState(false);
  const imgRef = useRef<HTMLDivElement>(null);
  const mx = useMotionValue(0), my = useMotionValue(0);
  const rx = useSpring(useTransform(my, [-1, 1], [8, -8]), { stiffness: 120, damping: 15 });
  const ry = useSpring(useTransform(mx, [-1, 1], [-10, 10]), { stiffness: 120, damping: 15 });

  const onMove = (e: MouseEvent<HTMLDivElement>) => {
    const r = imgRef.current!.getBoundingClientRect();
    mx.set(((e.clientX - r.left) / r.width - 0.5) * 2);
    my.set(((e.clientY - r.top) / r.height - 0.5) * 2);
  };
  const reset = () => { mx.set(0); my.set(0); };

  return (
    <AnimatePresence>
      {item && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.5 }} onClick={onClose}
            className="fixed inset-0 z-[92] bg-[var(--ink)]/80 backdrop-blur-xl" />
          <motion.div
            initial={{ opacity: 0, y: 60, scale: 0.92, rotateY: -6 }} animate={{ opacity: 1, y: 0, scale: 1, rotateY: 0 }} exit={{ opacity: 0, y: 40, scale: 0.95 }}
            transition={{ duration: 0.7, ease }} style={{ perspective: 1400 }}
            className="fixed left-1/2 top-1/2 z-[93] w-[94vw] max-w-5xl -translate-x-1/2 -translate-y-1/2 overflow-hidden bg-[var(--bone)] shadow-[var(--shadow-luxe)]"
          >
            {/* Close button */}
            <button onClick={onClose} aria-label="Close" data-cursor="hover"
              className="absolute right-5 top-5 z-20 flex h-10 w-10 items-center justify-center rounded-full border border-[var(--ink)]/15 text-lg transition-all hover:border-[var(--gold)] hover:shadow-[0_0_12px_oklch(0.78_0.12_80/0.2)]">×</button>

            <div className="grid grid-cols-1 md:grid-cols-2">
              {/* Image with 3D tilt + holographic shine */}
              <motion.div ref={imgRef} onMouseMove={onMove} onMouseLeave={reset}
                style={{ rotateX: rx, rotateY: ry, transformPerspective: 1200 }}
                className="relative aspect-[3/4] overflow-hidden bg-[var(--champagne)]/30 holo-shine" data-cursor="hover">
                <motion.img initial={{ scale: 1.15 }} animate={{ scale: 1 }} transition={{ duration: 1.6, ease }}
                  src={item.image} alt={item.title} className="h-full w-full object-cover" />
                {/* Golden corner accent */}
                <div className="absolute left-0 top-0 h-12 w-px bg-gradient-to-b from-[var(--gold)]/40 to-transparent" />
                <div className="absolute left-0 top-0 h-px w-12 bg-gradient-to-r from-[var(--gold)]/40 to-transparent" />
              </motion.div>

              {/* Details */}
              <div className="flex flex-col justify-between p-8 md:p-12">
                <div>
                  <motion.p initial={{ opacity: 0, x: -15 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }} className="eyebrow text-[var(--gold)]">{item.edition}</motion.p>
                  <motion.h3 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4, duration: 0.8, ease }}
                    className="mt-4 font-display text-4xl leading-[1.05] text-[var(--ink)] md:text-5xl">{item.title}</motion.h3>
                  <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="eyebrow mt-3 text-[var(--ink)]/50">{item.tone}</motion.p>
                  <motion.div initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ delay: 0.6, duration: 0.8 }}
                    className="mt-5 h-px bg-gradient-to-r from-[var(--gold)] via-[var(--gold)]/40 to-transparent" style={{ transformOrigin: "left" }} />
                  <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}
                    className="mt-5 text-sm leading-[1.9] text-[var(--ink)]/65">{item.description ?? "Hand-lasted in Florence over thirty-two hours. Lined in nude nappa, finished with a 24-carat gold-plated heel signature. Numbered. Never reissued."}</motion.p>
                </div>

                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7, duration: 0.6 }} className="mt-8">
                  <p className="eyebrow text-[var(--ink)]/50">Select Size</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {sizes.map(s => (
                      <motion.button key={s} onClick={() => setSize(s)} whileTap={{ scale: 0.92 }}
                        className={`h-11 w-13 border text-sm transition-all duration-300 ${size === s
                          ? "border-[var(--gold)] bg-[var(--ink)] text-[var(--bone)] shadow-[0_0_12px_oklch(0.78_0.12_80/0.2)]"
                          : "border-[var(--ink)]/15 text-[var(--ink)] hover:border-[var(--gold)]/40"}`}>
                        {s}
                      </motion.button>
                    ))}
                  </div>

                  <div className="mt-8 flex items-center justify-between border-t border-[var(--ink)]/10 pt-6">
                    <span className="font-display text-3xl gradient-gold-text">{item.price}</span>
                    <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                      onClick={() => { add({ id: `${item.id}-${size}`, title: item.title, price: item.price, image: item.image, tone: item.tone, size }, 1); setAdded(true); setTimeout(() => { setAdded(false); onClose(); }, 1200); }}
                      className="magnetic-btn inline-flex items-center gap-3 px-8 py-4 eyebrow transition-all duration-500 bg-[var(--ink)] text-[var(--bone)] hover:shadow-[var(--shadow-gold-glow)]" data-cursor="hover">
                      {added ? <><motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring" }}>✓</motion.span> Reserved!</> : "Reserve Pair →"}
                    </motion.button>
                  </div>
                </motion.div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
