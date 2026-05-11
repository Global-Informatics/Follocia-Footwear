import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { useCart } from "./CartContext";

export type QuickItem = {
  id: string;
  title: string;
  edition: string;
  tone: string;
  price: string;
  image: string;
  description?: string;
};

export function QuickView({ item, onClose }: { item: QuickItem | null; onClose: () => void }) {
  const { add } = useCart();
  const [size, setSize] = useState<string>("38");
  const sizes = ["35", "36", "37", "38", "39", "40", "41"];

  return (
    <AnimatePresence>
      {item && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            onClick={onClose}
            className="fixed inset-0 z-[92] bg-[var(--ink)]/70 backdrop-blur-md"
          />
          <motion.div
            initial={{ opacity: 0, y: 60, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.97 }}
            transition={{ duration: 0.6, ease: [0.2, 0.8, 0.2, 1] }}
            className="fixed left-1/2 top-1/2 z-[93] w-[92vw] max-w-5xl -translate-x-1/2 -translate-y-1/2 overflow-hidden bg-[var(--bone)] shadow-[var(--shadow-luxe)]"
          >
            <button
              onClick={onClose}
              aria-label="Close"
              className="absolute right-5 top-5 z-10 flex h-10 w-10 items-center justify-center text-2xl text-[var(--ink)]/70 hover:text-[var(--ink)]"
            >
              ×
            </button>
            <div className="grid grid-cols-1 md:grid-cols-2">
              <div className="relative aspect-[3/4] overflow-hidden bg-[var(--champagne)]/30">
                <motion.img
                  initial={{ scale: 1.1 }}
                  animate={{ scale: 1 }}
                  transition={{ duration: 1.4, ease: [0.2, 0.8, 0.2, 1] }}
                  src={item.image}
                  alt={item.title}
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="flex flex-col justify-between p-8 md:p-12">
                <div>
                  <p className="eyebrow text-[var(--ink)]/60">{item.edition}</p>
                  <h3 className="mt-4 font-display text-4xl leading-[1.05] text-[var(--ink)] md:text-5xl">
                    {item.title}
                  </h3>
                  <p className="eyebrow mt-3 text-[var(--ink)]/50">{item.tone}</p>
                  <p className="mt-6 text-sm leading-[1.9] text-[var(--ink)]/70">
                    {item.description ??
                      "Hand-lasted in Florence over thirty-two hours. Lined in nude nappa, finished with a 24-carat gold-plated heel signature. Numbered. Never reissued."}
                  </p>
                </div>

                <div className="mt-8">
                  <p className="eyebrow text-[var(--ink)]/60">Select Size</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {sizes.map((s) => (
                      <button
                        key={s}
                        onClick={() => setSize(s)}
                        className={`h-10 w-12 border text-sm transition-all ${
                          size === s
                            ? "border-[var(--ink)] bg-[var(--ink)] text-[var(--bone)]"
                            : "border-[var(--ink)]/20 text-[var(--ink)] hover:border-[var(--ink)]"
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>

                  <div className="mt-8 flex items-center justify-between border-t border-[var(--ink)]/10 pt-6">
                    <span className="font-display text-3xl text-[var(--ink)]">{item.price}</span>
                    <button
                      onClick={() => {
                        add({ id: `${item.id}-${size}`, title: item.title, price: item.price, image: item.image, tone: item.tone, size }, 1);
                        onClose();
                      }}
                      className="magnetic-btn inline-flex items-center gap-3 bg-[var(--ink)] px-8 py-4 eyebrow text-[var(--bone)] transition-colors hover:text-[var(--ink)]"
                    >
                      Reserve Pair →
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
