import { AnimatePresence, motion } from "framer-motion";
import { useCart } from "./CartContext";

export function CartDrawer() {
  const { items, open, setOpen, remove, count } = useCart();
  const subtotal = items.reduce((s, i) => {
    const n = Number(i.price.replace(/[^\d.]/g, "")) || 0;
    return s + n * i.qty;
  }, 0);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-[90] bg-[var(--ink)]/60 backdrop-blur-sm"
          />
          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: 0.7, ease: [0.2, 0.8, 0.2, 1] }}
            className="fixed right-0 top-0 z-[91] flex h-full w-full max-w-md flex-col bg-[var(--bone)] text-[var(--ink)] shadow-[var(--shadow-luxe)]"
          >
            <div className="flex items-center justify-between border-b border-[var(--ink)]/10 px-8 py-7">
              <div>
                <p className="eyebrow text-[var(--ink)]/60">— Your Atelier</p>
                <h3 className="mt-1 font-display text-2xl">Reservation ({count})</h3>
              </div>
              <button onClick={() => setOpen(false)} aria-label="Close cart" className="text-2xl leading-none">
                ×
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-8 py-6">
              {items.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center text-center">
                  <p className="font-display text-3xl italic text-[var(--ink)]/70">Your selection awaits.</p>
                  <p className="mt-4 max-w-xs text-sm text-[var(--ink)]/50">
                    Add a piece from the current Atelier to begin your reservation.
                  </p>
                </div>
              ) : (
                <ul className="space-y-8">
                  <AnimatePresence initial={false}>
                    {items.map((i) => (
                      <motion.li
                        key={i.id}
                        initial={{ opacity: 0, x: 30 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 60 }}
                        layout
                        className="flex gap-5"
                      >
                        <div className="aspect-[3/4] w-24 flex-shrink-0 overflow-hidden bg-[var(--champagne)]/30">
                          <img src={i.image} alt={i.title} className="h-full w-full object-cover" />
                        </div>
                        <div className="flex flex-1 flex-col justify-between">
                          <div>
                            <p className="eyebrow text-[var(--ink)]/50">{i.tone}</p>
                            <h4 className="mt-1 font-display text-lg leading-tight">{i.title}</h4>
                            {i.size && <p className="mt-1 text-xs text-[var(--ink)]/50">Size {i.size}</p>}
                          </div>
                          <div className="flex items-end justify-between">
                            <p className="font-display text-base">{i.price}</p>
                            <button
                              onClick={() => remove(i.id)}
                              className="eyebrow text-[var(--ink)]/50 underline-offset-4 hover:text-[var(--ink)] hover:underline"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      </motion.li>
                    ))}
                  </AnimatePresence>
                </ul>
              )}
            </div>

            {items.length > 0 && (
              <div className="border-t border-[var(--ink)]/10 px-8 py-7">
                <div className="flex items-center justify-between">
                  <span className="eyebrow text-[var(--ink)]/60">Subtotal</span>
                  <span className="font-display text-2xl">€ {subtotal.toLocaleString()}</span>
                </div>
                <button className="magnetic-btn mt-6 inline-flex w-full items-center justify-center gap-3 bg-[var(--ink)] px-8 py-4 eyebrow text-[var(--bone)] transition-colors hover:text-[var(--ink)]">
                  Reserve · Concierge Checkout
                </button>
                <p className="mt-4 text-center text-[0.65rem] uppercase tracking-[0.25em] text-[var(--ink)]/40">
                  White-glove delivery · Worldwide
                </p>
              </div>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
