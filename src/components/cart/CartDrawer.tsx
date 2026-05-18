import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { useCart } from "./CartContext";
import type { AuthSession } from "@/components/auth/AuthGateway";
import { quoteCoupon, saveCheckoutCoupon } from "@/lib/coupons";

const ease = [0.2, 0.8, 0.2, 1] as const;

export function CartDrawer({ session, onLogin }: { session?: AuthSession | null; onLogin?: () => void }) {
  const { items, open, setOpen, remove, updateQty, count, wishlist, toggleWish } = useCart();
  const [coupon, setCoupon] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState("");
  const [couponError, setCouponError] = useState("");
  const [couponSuccess, setCouponSuccess] = useState(false);
  const subtotal = items.reduce((s, i) => s + (Number(i.price.replace(/[^\d.]/g, "")) || 0) * i.qty, 0);
  const couponQuote = appliedCoupon ? quoteCoupon(appliedCoupon, subtotal) : null;
  const discount = couponQuote?.discount ?? 0;
  const total = Math.max(subtotal - discount, 0);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.5 }} onClick={() => setOpen(false)}
            className="fixed inset-0 z-[90] bg-[var(--ink)]/70 backdrop-blur-md" />
          <motion.aside
            initial={{ x: "100%", opacity: 0.5 }} animate={{ x: 0, opacity: 1 }} exit={{ x: "100%" }}
            transition={{ duration: 0.7, ease }}
            className="fixed right-0 top-0 z-[91] flex h-full w-full max-w-md flex-col bg-[var(--ink)] text-[var(--bone)] shadow-[var(--shadow-luxe)] overflow-hidden"
          >
            {/* Grain + golden top accent */}
            <div className="absolute inset-0 luxe-grain pointer-events-none z-0" />
            <motion.div initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ delay: 0.5, duration: 1, ease }} className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[var(--gold)] to-transparent z-10" style={{ transformOrigin: "left" }} />

            {/* Header */}
            <div className="relative z-10 flex items-center justify-between border-b border-[var(--bone)]/10 px-8 py-7">
              <div>
                <p className="eyebrow text-[var(--gold)]">Your Atelier</p>
                <h3 className="mt-1 font-display text-2xl">Reservation ({count})</h3>
              </div>
              <button onClick={() => setOpen(false)} aria-label="Close cart" data-cursor="hover"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--bone)]/15 text-lg transition-all hover:border-[var(--gold)]/40 hover:shadow-[0_0_15px_oklch(0.78_0.12_80/0.15)]">
                ×
              </button>
            </div>

            {/* Items */}
            <div className="relative z-10 flex-1 overflow-y-auto px-8 py-6">
              {items.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center text-center">
                  <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.8, ease }}>
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="0.8" className="mx-auto opacity-40">
                      <path d="M6 7h12l-1 13H7L6 7z" /><path d="M9 7a3 3 0 1 1 6 0" />
                    </svg>
                  </motion.div>
                  <p className="mt-6 font-display text-3xl italic text-[var(--bone)]/70">Your selection awaits.</p>
                  <p className="mt-4 max-w-xs text-sm text-[var(--bone)]/40">Add a piece from the current Atelier to begin your reservation.</p>
                </div>
              ) : (
                <ul className="space-y-8">
                  <AnimatePresence initial={false}>
                    {items.map((item, idx) => (
                      <motion.li key={item.id}
                        initial={{ opacity: 0, x: 40, rotateY: 5 }} animate={{ opacity: 1, x: 0, rotateY: 0 }} exit={{ opacity: 0, x: 60 }}
                        transition={{ duration: 0.5, delay: idx * 0.05, ease }} layout className="flex gap-5" style={{ perspective: 800 }}>
                        <div className="aspect-[3/4] w-24 flex-shrink-0 overflow-hidden">
                          <img src={item.image} alt={item.title} className="h-full w-full object-cover transition-transform duration-700 hover:scale-110" />
                        </div>
                        <div className="flex flex-1 flex-col justify-between">
                          <div>
                            <p className="eyebrow text-[var(--gold)]/60">{item.tone}</p>
                            <h4 className="mt-1 font-display text-lg leading-tight">{item.title}</h4>
                            {item.size && <p className="mt-1 text-xs text-[var(--bone)]/40">Size {item.size}</p>}
                          </div>
                          <div className="flex items-end justify-between">
                            <div>
                              <p className="font-display text-base gradient-gold-text">{item.price}</p>
                              <div className="mt-3 inline-flex items-center border border-[var(--bone)]/15 overflow-hidden">
                                <button onClick={() => updateQty(item.id, item.qty - 1)} className="h-8 w-8 text-lg transition-colors hover:bg-[var(--gold)]/20 hover:text-[var(--gold)]">−</button>
                                <span className="grid h-8 w-10 place-items-center text-sm tabular-nums">{item.qty}</span>
                                <button onClick={() => updateQty(item.id, item.qty + 1)} className="h-8 w-8 text-lg transition-colors hover:bg-[var(--gold)]/20 hover:text-[var(--gold)]">+</button>
                              </div>
                            </div>
                            <div className="grid justify-items-end gap-2">
                              <button onClick={() => { const pid = item.id.replace(/-[^-]+$/, ""); if (!wishlist.includes(pid)) toggleWish(pid); remove(item.id); }}
                                className="eyebrow text-[var(--bone)]/40 hover-underline hover:text-[var(--gold)] transition-colors">Move to wishlist</button>
                              <button onClick={() => remove(item.id)} className="eyebrow text-[var(--bone)]/40 hover-underline hover:text-red-400 transition-colors">Remove</button>
                            </div>
                          </div>
                        </div>
                      </motion.li>
                    ))}
                  </AnimatePresence>
                </ul>
              )}
            </div>

            {/* Footer */}
            {items.length > 0 && (
              <div className="relative z-10 border-t border-[var(--bone)]/10 px-8 py-7">
                {/* Coupon */}
                <div className="mb-5 grid grid-cols-[1fr_auto] gap-2">
                  <input value={coupon} onChange={e => setCoupon(e.target.value.toUpperCase())} placeholder="Coupon code"
                    className="border border-[var(--bone)]/15 bg-transparent px-3 py-3 text-sm outline-none transition-all duration-500 focus:border-[var(--gold)] focus:shadow-[0_0_15px_oklch(0.78_0.12_80/0.1)]" />
                  <button onClick={() => {
                    const q = quoteCoupon(coupon, subtotal);
                    if (!q) { setAppliedCoupon(""); saveCheckoutCoupon(null); setCouponError("Invalid coupon code."); setCouponSuccess(false); return; }
                    setAppliedCoupon(q.code); saveCheckoutCoupon(q); setCouponError(""); setCouponSuccess(true); setTimeout(() => setCouponSuccess(false), 2000);
                  }} className="border border-[var(--gold)]/40 px-4 py-3 eyebrow text-[var(--gold)] transition-all hover:bg-[var(--gold)] hover:text-[var(--ink)]">Apply</button>
                </div>
                <AnimatePresence>
                  {couponError && <motion.p initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mb-4 text-sm text-red-400">{couponError}</motion.p>}
                  {couponSuccess && <motion.p initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mb-4 text-sm text-emerald-400">✓ Coupon applied!</motion.p>}
                </AnimatePresence>

                <div className="flex items-center justify-between text-sm text-[var(--bone)]/50"><span>Subtotal</span><span>EUR {subtotal.toLocaleString()}</span></div>
                {discount > 0 && <div className="mt-2 flex items-center justify-between text-sm text-emerald-400"><span>{couponQuote?.title}</span><span>− EUR {discount.toLocaleString()}</span></div>}

                {/* Animated golden separator */}
                <motion.div initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 0.8, ease }} className="mt-4 h-px bg-gradient-to-r from-[var(--gold)]/60 via-[var(--gold)] to-[var(--gold)]/60" style={{ transformOrigin: "left" }} />

                <div className="mt-4 flex items-center justify-between">
                  <span className="eyebrow text-[var(--bone)]/50">Total</span>
                  <span className="font-display text-2xl gradient-gold-text">EUR {total.toLocaleString()}</span>
                </div>

                <button onClick={() => {
                  if (!session) { setOpen(false); onLogin?.(); return; }
                  setOpen(false); saveCheckoutCoupon(couponQuote); window.location.hash = "/checkout";
                }} className="magnetic-btn mt-6 inline-flex w-full items-center justify-center gap-3 py-4 eyebrow transition-all duration-500 bg-gradient-to-r from-[var(--gold)] to-[oklch(0.72_0.14_75)] text-[var(--ink)] hover:shadow-[var(--shadow-gold-glow)]">
                  Secure Checkout →
                </button>

                <p className="mt-4 text-center text-[0.6rem] uppercase tracking-[0.25em] text-[var(--bone)]/30">White-glove delivery · Worldwide</p>
                <div className="mt-3 grid grid-cols-3 gap-2 text-center text-[0.6rem] font-semibold uppercase tracking-[0.18em] text-[var(--bone)]/40">
                  {["Card", "UPI", "COD"].map(m => <span key={m} className="border border-[var(--bone)]/10 py-2 transition-colors hover:border-[var(--gold)]/30 hover:text-[var(--gold)]">{m}</span>)}
                </div>
              </div>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
