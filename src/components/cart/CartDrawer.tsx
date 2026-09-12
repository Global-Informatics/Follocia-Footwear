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
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-[90] bg-black/60 backdrop-blur-sm"
          />
          <div className="fixed inset-0 z-[91] flex items-center justify-center p-3 sm:p-5 pointer-events-none">
            <motion.aside
              initial={{ opacity: 0, scale: 0.94, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 20 }}
              transition={{ duration: 0.35, ease }}
              className="pointer-events-auto relative flex flex-col w-full max-w-lg max-h-[90vh] bg-white text-[#24130d] rounded-2xl shadow-[0_25px_60px_-15px_rgba(0,0,0,0.3)] border border-[#4b261a15] overflow-hidden"
            >
              {/* Golden top decorative accent */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[var(--gold)] via-emerald-600 to-[var(--gold)] z-10" />

              {/* Header */}
              <div className="relative z-10 flex items-center justify-between border-b border-[#4b261a12] bg-white px-6 sm:px-8 py-5">
                <div>
                  <p className="eyebrow text-[var(--gold)] text-[11px] font-semibold">Your Atelier</p>
                  <h3 className="mt-0.5 font-display text-2xl font-bold text-[#24130d]">Reservation ({count})</h3>
                </div>
                <button
                  onClick={() => setOpen(false)}
                  aria-label="Close cart"
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-[#4b261a20] text-xl font-light text-[#24130d] transition-all hover:bg-[#4b261a10] hover:border-[var(--gold)] cursor-pointer"
                >
                  ×
                </button>
              </div>

              {/* Items */}
              <div className="relative z-10 flex-1 overflow-y-auto px-6 sm:px-8 py-5">
                {items.length === 0 ? (
                  <div className="flex h-full flex-col items-center justify-center py-12 text-center">
                    <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.5, ease }}>
                      <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="1" className="mx-auto opacity-70">
                        <path d="M6 7h12l-1 13H7L6 7z" /><path d="M9 7a3 3 0 1 1 6 0" />
                      </svg>
                    </motion.div>
                    <p className="mt-5 font-display text-2xl italic text-[#24130d]">Your selection awaits.</p>
                    <p className="mt-2 max-w-xs text-xs text-[#4b261a80]">Add a piece from the current Atelier to begin your reservation.</p>
                  </div>
                ) : (
                  <ul className="space-y-4">
                    <AnimatePresence initial={false}>
                      {items.map((item, idx) => (
                        <motion.li
                          key={item.id}
                          initial={{ opacity: 0, y: 12 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, x: -30 }}
                          transition={{ duration: 0.35, delay: idx * 0.04, ease }}
                          layout
                          className="flex gap-4 p-3 rounded-xl border border-[#4b261a10] bg-[#faf8f5]/70 hover:border-[#4b261a25] transition-all"
                        >
                          <div className="aspect-[3/4] w-20 flex-shrink-0 overflow-hidden rounded-lg bg-white shadow-sm border border-[#4b261a10]">
                            <img src={item.image} alt={item.title} className="h-full w-full object-cover transition-transform duration-500 hover:scale-105" />
                          </div>
                          <div className="flex flex-1 flex-col justify-between py-0.5">
                            <div>
                              <p className="eyebrow text-[var(--gold)] text-[10px] font-semibold">{item.tone}</p>
                              <h4 className="mt-0.5 font-display text-base font-bold text-[#24130d] leading-tight">{item.title}</h4>
                              {item.size && <p className="mt-0.5 text-xs text-[#4b261a80]">Size {item.size}</p>}
                            </div>
                            <div className="flex items-end justify-between mt-3">
                              <div>
                                <p className="font-semibold text-sm text-[#24130d]">{item.price}</p>
                                <div className="mt-2 inline-flex items-center rounded-lg border border-[#4b261a20] bg-white overflow-hidden shadow-xs">
                                  <button onClick={() => updateQty(item.id, item.qty - 1)} className="h-7 w-7 text-sm font-semibold text-[#24130d] transition-colors hover:bg-[#4b261a10] cursor-pointer">−</button>
                                  <span className="grid h-7 w-8 place-items-center text-xs font-semibold tabular-nums text-[#24130d]">{item.qty}</span>
                                  <button onClick={() => updateQty(item.id, item.qty + 1)} className="h-7 w-7 text-sm font-semibold text-[#24130d] transition-colors hover:bg-[#4b261a10] cursor-pointer">+</button>
                                </div>
                              </div>
                              <div className="grid justify-items-end gap-1.5">
                                <button
                                  onClick={() => { const pid = item.id.replace(/-[^-]+$/, ""); if (!wishlist.includes(pid)) toggleWish(pid); remove(item.id); }}
                                  className="eyebrow text-[10px] text-[#4b261a80] hover:text-[var(--gold)] hover:underline transition-colors cursor-pointer"
                                >
                                  Move to wishlist
                                </button>
                                <button
                                  onClick={() => remove(item.id)}
                                  className="eyebrow text-[10px] text-red-600 hover:text-red-700 hover:underline transition-colors cursor-pointer"
                                >
                                  Remove
                                </button>
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
                <div className="relative z-10 border-t border-[#4b261a12] bg-[#FAF8F5] px-6 sm:px-8 py-5">
                  {/* Coupon */}
                  <div className="mb-4 grid grid-cols-[1fr_auto] gap-2">
                    <input
                      value={coupon}
                      onChange={e => setCoupon(e.target.value.toUpperCase())}
                      placeholder="Coupon code"
                      className="rounded-lg border border-[#4b261a20] bg-white px-3.5 py-2 text-xs text-[#24130d] placeholder:text-[#4b261a50] outline-none transition-all focus:border-[var(--gold)]"
                    />
                    <button
                      onClick={() => {
                        const q = quoteCoupon(coupon, subtotal);
                        if (!q) { setAppliedCoupon(""); saveCheckoutCoupon(null); setCouponError("Invalid coupon code."); setCouponSuccess(false); return; }
                        setAppliedCoupon(q.code); saveCheckoutCoupon(q); setCouponError(""); setCouponSuccess(true); setTimeout(() => setCouponSuccess(false), 2000);
                      }}
                      className="rounded-lg border border-[#a87648] bg-white px-4 py-2 eyebrow text-xs text-[#a87648] transition-all hover:bg-[#a87648] hover:text-white cursor-pointer font-semibold"
                    >
                      Apply
                    </button>
                  </div>
                  <AnimatePresence>
                    {couponError && <motion.p initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mb-3 text-xs text-red-600 font-medium">{couponError}</motion.p>}
                    {couponSuccess && <motion.p initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mb-3 text-xs text-emerald-700 font-medium">✓ Coupon applied!</motion.p>}
                  </AnimatePresence>

                  <div className="flex items-center justify-between text-xs text-[#4b261a90]">
                    <span>Subtotal</span>
                    <span className="font-semibold text-[#24130d]">₹ {subtotal.toLocaleString("en-IN")}</span>
                  </div>
                  {discount > 0 && (
                    <div className="mt-1.5 flex items-center justify-between text-xs text-emerald-700 font-semibold">
                      <span>{couponQuote?.title}</span>
                      <span>− ₹ {discount.toLocaleString("en-IN")}</span>
                    </div>
                  )}

                  <div className="my-3 h-px bg-[#4b261a15]" />

                  <div className="flex items-center justify-between">
                    <span className="eyebrow text-xs text-[#4b261a80] font-semibold">Total</span>
                    <span className="font-display text-2xl font-bold text-[#24130d]">₹ {total.toLocaleString("en-IN")}</span>
                  </div>

                  <button
                    onClick={() => {
                      if (!session) { setOpen(false); onLogin?.(); return; }
                      setOpen(false); saveCheckoutCoupon(couponQuote); window.location.hash = "/checkout";
                    }}
                    style={{
                      backgroundColor: "#15803d",
                      backgroundImage: "linear-gradient(135deg, #16a34a, #15803d)",
                      color: "#ffffff",
                      border: "none",
                      boxShadow: "0 4px 16px rgba(22, 163, 74, 0.4)",
                    }}
                    className="btn-green-action mt-4 inline-flex w-full items-center justify-center gap-2 py-3.5 eyebrow text-xs font-semibold tracking-widest text-white transition-all hover:brightness-110 cursor-pointer rounded-xl shadow-lg"
                  >
                    Secure Checkout →
                  </button>

                  <p className="mt-3 text-center text-[0.62rem] uppercase tracking-[0.2em] text-[#4b261a70]">White-glove delivery · Worldwide</p>
                  <div className="mt-2.5 grid grid-cols-3 gap-2 text-center text-[0.62rem] font-semibold uppercase tracking-[0.15em] text-[#4b261a80]">
                    {["Card", "UPI", "COD"].map(m => (
                      <span key={m} className="rounded-md border border-[#4b261a15] bg-white py-1.5 transition-colors">
                        {m}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </motion.aside>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
