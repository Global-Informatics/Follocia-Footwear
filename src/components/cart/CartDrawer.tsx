import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { useCart } from "./CartContext";
import type { AuthSession } from "@/components/auth/AuthGateway";
import { quoteCoupon, saveCheckoutCoupon } from "@/lib/coupons";

export function CartDrawer({ session, onLogin }: { session?: AuthSession | null; onLogin?: () => void }) {
  const { items, open, setOpen, remove, updateQty, count, wishlist, toggleWish } = useCart();
  const [coupon, setCoupon] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState("");
  const [couponError, setCouponError] = useState("");
  const subtotal = items.reduce((s, i) => {
    const n = Number(i.price.replace(/[^\d.]/g, "")) || 0;
    return s + n * i.qty;
  }, 0);
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
                <p className="eyebrow text-[var(--ink)]/60">Your Atelier</p>
                <h3 className="mt-1 font-display text-2xl">Reservation ({count})</h3>
              </div>
              <button onClick={() => setOpen(false)} aria-label="Close cart" className="text-2xl leading-none">
                x
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
                            <div>
                              <p className="font-display text-base">{i.price}</p>
                              <div className="mt-3 inline-flex items-center border border-[var(--ink)]/15">
                                <button onClick={() => updateQty(i.id, i.qty - 1)} className="h-8 w-8 text-lg">-</button>
                                <span className="grid h-8 w-10 place-items-center text-sm">{i.qty}</span>
                                <button onClick={() => updateQty(i.id, i.qty + 1)} className="h-8 w-8 text-lg">+</button>
                              </div>
                            </div>
                            <div className="grid justify-items-end gap-2">
                              <button
                                onClick={() => {
                                  const productId = i.id.replace(/-[^-]+$/, "");
                                  if (!wishlist.includes(productId)) toggleWish(productId);
                                  remove(i.id);
                                }}
                                className="eyebrow text-[var(--ink)]/50 underline-offset-4 hover:text-[var(--ink)] hover:underline"
                              >
                                Move to wishlist
                              </button>
                              <button
                                onClick={() => remove(i.id)}
                                className="eyebrow text-[var(--ink)]/50 underline-offset-4 hover:text-[var(--ink)] hover:underline"
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

            {items.length > 0 && (
              <div className="border-t border-[var(--ink)]/10 px-8 py-7">
                <div className="mb-5 grid grid-cols-[1fr_auto] gap-2">
                  <input value={coupon} onChange={(event) => setCoupon(event.target.value.toUpperCase())} placeholder="Coupon code" className="border border-[var(--ink)]/15 bg-transparent px-3 py-3 text-sm outline-none focus:border-[var(--ink)]" />
                  <button
                    onClick={() => {
                      const quote = quoteCoupon(coupon, subtotal);
                      if (!quote) {
                        setAppliedCoupon("");
                        saveCheckoutCoupon(null);
                        setCouponError("Coupon active nahi hai.");
                        return;
                      }
                      setAppliedCoupon(quote.code);
                      saveCheckoutCoupon(quote);
                      setCouponError("");
                    }}
                    className="border border-[var(--ink)] px-4 py-3 eyebrow"
                  >
                    Apply
                  </button>
                </div>
                {couponError && <p className="mb-4 text-sm text-red-800">{couponError}</p>}
                <div className="flex items-center justify-between text-sm text-[var(--ink)]/60">
                  <span>Subtotal</span>
                  <span>EUR {subtotal.toLocaleString()}</span>
                </div>
                {discount > 0 && (
                  <div className="mt-2 flex items-center justify-between text-sm text-emerald-700">
                    <span>{couponQuote?.title} discount</span>
                    <span>- EUR {discount.toLocaleString()}</span>
                  </div>
                )}
                <div className="mt-3 flex items-center justify-between border-t border-[var(--ink)]/10 pt-4">
                  <span className="eyebrow text-[var(--ink)]/60">Subtotal</span>
                  <span className="font-display text-2xl">EUR {total.toLocaleString()}</span>
                </div>
                <button
                  onClick={() => {
                    if (!session) {
                      setOpen(false);
                      onLogin?.();
                      return;
                    }
                    setOpen(false);
                    saveCheckoutCoupon(couponQuote);
                    window.location.hash = "/checkout";
                  }}
                  className="magnetic-btn mt-6 inline-flex w-full items-center justify-center gap-3 bg-[var(--ink)] px-8 py-4 eyebrow text-[var(--bone)] transition-colors hover:text-[var(--ink)]"
                >
                  Secure Checkout
                </button>
                <p className="mt-4 text-center text-[0.65rem] uppercase tracking-[0.25em] text-[var(--ink)]/40">
                  White-glove delivery - Worldwide
                </p>
                <div className="mt-4 grid grid-cols-3 gap-2 text-center text-[0.62rem] font-semibold uppercase tracking-[0.18em] text-[var(--ink)]/55">
                  <span className="border border-[var(--ink)]/10 py-2">Card</span>
                  <span className="border border-[var(--ink)]/10 py-2">UPI</span>
                  <span className="border border-[var(--ink)]/10 py-2">COD</span>
                </div>
              </div>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
