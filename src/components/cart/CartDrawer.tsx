import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { useCart, cleanPrice, getLatestProductPrice, parsePriceNumber } from "./CartContext";
import type { AuthSession } from "@/components/auth/AuthGateway";
import { quoteCoupon, validateCoupon, saveCheckoutCoupon } from "@/lib/coupons";
import { getUserDiscountEligibility } from "@/lib/launchDiscounts";

const ease = [0.2, 0.8, 0.2, 1] as const;

function parseAmount(price: string | number | undefined | null): number {
  return parsePriceNumber(price);
}

export function CartDrawer({ session, onLogin }: { session?: AuthSession | null; onLogin?: () => void }) {
  const { items, open, setOpen, remove, updateQty, count, wishlist, toggleWish } = useCart();
  const [coupon, setCoupon] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState("");
  const [couponError, setCouponError] = useState("");
  const [couponSuccess, setCouponSuccess] = useState(false);
  const userEmail = session?.user?.email;
  const privilege = getUserDiscountEligibility(userEmail);
  const subtotal = Math.round(items.reduce((s, i) => s + parseAmount(getLatestProductPrice(i)) * i.qty, 0));
  const couponQuote = appliedCoupon ? quoteCoupon(appliedCoupon, subtotal, userEmail) : null;
  const discount = Math.round(couponQuote?.discount ?? 0);
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
          <div className="fixed inset-0 z-[91] flex items-end sm:items-center justify-center p-0 sm:p-5 pointer-events-none">
            <motion.aside
              initial={{ opacity: 0, scale: 0.96, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 30 }}
              transition={{ duration: 0.3, ease }}
              className="pointer-events-auto relative flex flex-col w-full max-w-lg h-[92dvh] sm:h-auto sm:max-h-[90vh] bg-white text-[#24130d] rounded-t-3xl sm:rounded-2xl shadow-[0_-12px_40px_rgba(0,0,0,0.25)] sm:shadow-[0_25px_60px_-15px_rgba(0,0,0,0.3)] border border-[#4b261a15] overflow-hidden min-h-0"
            >
              {/* Golden top decorative accent */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[var(--gold)] via-emerald-600 to-[var(--gold)] z-10" />

              {/* Mobile pull handle indicator */}
              <div className="mx-auto mt-2.5 h-1 w-12 rounded-full bg-[#4b261a25] sm:hidden shrink-0" />

              {/* Header */}
              <div className="relative z-10 flex items-center justify-between border-b border-[#4b261a12] bg-white px-4 sm:px-8 py-3.5 sm:py-5 shrink-0">
                <div>
                  <p className="eyebrow text-[var(--gold)] text-[10px] sm:text-[11px] font-semibold">Your Selection</p>
                  <h3 className="mt-0.5 font-display text-xl sm:text-2xl font-bold text-[#24130d]">Reservation ({count})</h3>
                </div>
                <button
                  onClick={() => setOpen(false)}
                  aria-label="Close cart"
                  className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-full border border-[#4b261a20] text-lg sm:text-xl font-light text-[#24130d] transition-all hover:bg-[#4b261a10] hover:border-[var(--gold)] cursor-pointer"
                >
                  ×
                </button>
              </div>

              {/* Items */}
              <div className="relative z-10 flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-4 sm:px-8 py-3.5 sm:py-5 overscroll-contain">
                {items.length === 0 ? (
                  <div className="flex h-full flex-col items-center justify-center py-12 text-center">
                    <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.5, ease }}>
                      <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="1" className="mx-auto opacity-70">
                        <path d="M6 7h12l-1 13H7L6 7z" /><path d="M9 7a3 3 0 1 1 6 0" />
                      </svg>
                    </motion.div>
                    <p className="mt-5 font-display text-2xl italic text-[#24130d]">Your selection awaits.</p>
                    <p className="mt-2 max-w-xs text-xs text-[#4b261a80]">Add a piece from the collection to begin your reservation.</p>
                  </div>
                ) : (
                  <ul className="space-y-3 sm:space-y-4">
                    <AnimatePresence initial={false}>
                      {items.map((item, idx) => (
                        <motion.li
                          key={item.id}
                          initial={{ opacity: 0, y: 12 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, x: -30 }}
                          transition={{ duration: 0.35, delay: idx * 0.04, ease }}
                          layout
                          className="relative flex flex-col rounded-2xl border border-[#4b261a12] bg-[#faf8f5]/90 hover:border-[#4b261a25] transition-all p-3 sm:p-3.5 shadow-xs overflow-hidden w-full"
                        >
                          {/* Top Row: Image + Details + Quick Remove */}
                          <div className="flex gap-3 sm:gap-3.5 items-start">
                            <div className="aspect-square w-16 sm:w-20 flex-shrink-0 overflow-hidden rounded-xl bg-white shadow-xs border border-[#4b261a12] p-1.5 flex items-center justify-center">
                              <img
                                src={item.image}
                                alt={item.title}
                                className="h-full w-full object-contain mix-blend-multiply transition-transform duration-500 hover:scale-105"
                              />
                            </div>

                            <div className="flex-1 min-w-0 pr-6">
                              <p className="text-[10px] font-semibold text-[var(--gold)] uppercase tracking-wider">{item.tone}</p>
                              <h4 className="mt-0.5 font-display text-sm sm:text-base font-bold text-[#24130d] leading-tight truncate" title={item.title}>
                                {item.title}
                              </h4>
                              <div className="flex items-center gap-2 mt-1">
                                {item.size && (
                                  <span className="inline-block text-[11px] font-medium text-[#4b261a80] bg-[#4b261a0a] px-1.5 py-0.5 rounded">
                                    Size {item.size}
                                  </span>
                                )}
                                <span className="font-semibold text-sm text-[#24130d]">{getLatestProductPrice(item)}</span>
                              </div>
                            </div>

                            {/* Quick Remove Button in top corner */}
                            <button
                              type="button"
                              onClick={() => remove(item.id)}
                              aria-label={`Remove ${item.title}`}
                              className="absolute top-2.5 right-2.5 flex h-7 w-7 items-center justify-center rounded-full text-[#4b261a50] hover:text-red-600 hover:bg-red-50 transition-colors text-base font-light cursor-pointer"
                              title="Remove item"
                            >
                              ×
                            </button>
                          </div>

                          {/* Bottom Row: Quantity Stepper on Left, Move to Wishlist & Remove on Right */}
                          <div className="flex items-center justify-between mt-2.5 pt-2.5 border-t border-[#4b261a0e] gap-2">
                            {/* Quantity Stepper */}
                            <div className="inline-flex items-center rounded-lg border border-[#4b261a20] bg-white shadow-2xs overflow-hidden">
                              <button
                                type="button"
                                onClick={() => updateQty(item.id, item.qty - 1)}
                                className="flex h-7 w-7 items-center justify-center text-xs font-semibold text-[#24130d] transition-colors hover:bg-[#4b261a10] cursor-pointer"
                                aria-label="Decrease quantity"
                              >
                                −
                              </button>
                              <span className="flex h-7 w-7 items-center justify-center text-xs font-semibold tabular-nums text-[#24130d] border-x border-[#4b261a15] bg-[#faf8f5]/40">
                                {item.qty}
                              </span>
                              <button
                                type="button"
                                onClick={() => updateQty(item.id, item.qty + 1)}
                                className="flex h-7 w-7 items-center justify-center text-xs font-semibold text-[#24130d] transition-colors hover:bg-[#4b261a10] cursor-pointer"
                                aria-label="Increase quantity"
                              >
                                +
                              </button>
                            </div>

                            {/* Move to wishlist & Remove actions */}
                            <div className="flex items-center gap-1.5 text-[11px] sm:text-xs">
                              <button
                                type="button"
                                onClick={() => {
                                  const pid = item.id.replace(/-[^-]+$/, "");
                                  if (!wishlist.includes(pid)) toggleWish(pid);
                                  remove(item.id);
                                }}
                                className="inline-flex items-center gap-1 px-1.5 py-1 rounded text-[#4b261a90] hover:text-[#915a28] hover:bg-[#4b261a08] transition-colors cursor-pointer font-medium whitespace-nowrap"
                              >
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--gold)]">
                                  <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
                                </svg>
                                <span>Move to wishlist</span>
                              </button>
                              <span className="text-[#4b261a25]">·</span>
                              <button
                                type="button"
                                onClick={() => remove(item.id)}
                                className="inline-flex items-center gap-1 px-1.5 py-1 rounded text-red-600/80 hover:text-red-700 hover:bg-red-50/70 transition-colors cursor-pointer font-medium whitespace-nowrap"
                              >
                                <span>Remove</span>
                              </button>
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
                <div className="relative z-10 border-t border-[#4b261a12] bg-[#FAF8F5] px-4 sm:px-8 py-3 sm:py-5 shrink-0">
                  {/* Privilege Promo Banner - Only visible after login / account creation */}
                  {Boolean(session?.user?.email) && (
                    <div className={`mb-2.5 p-2.5 rounded-xl border flex items-center justify-between gap-2 transition-all ${
                      privilege.code === "LAUNCH35"
                        ? "bg-gradient-to-r from-amber-50 to-[#FAF8F5] border-amber-400/40 text-[#24130d]"
                        : "bg-[#f5fbf7] border-emerald-300/60 text-emerald-950"
                    }`}>
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-base shrink-0">✨</span>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-mono text-xs font-bold uppercase tracking-wider text-[#24130d]">
                              {privilege.code}
                            </span>
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider ${
                              privilege.code === "LAUNCH35"
                                ? "bg-amber-200 text-amber-900"
                                : "bg-emerald-100 text-emerald-800"
                            }`}>
                              {privilege.percent}% OFF
                            </span>
                            {privilege.code === "LAUNCH35" && (
                              <span className="text-[10px] text-amber-800 font-medium">
                                ({privilege.spotsRemaining} spots left)
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-[#4b261a80] truncate mt-0.5">
                            {privilege.badge}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setCoupon(privilege.code);
                          const res = validateCoupon(privilege.code, subtotal, userEmail);
                          if (res.quote) {
                            setAppliedCoupon(res.quote.code);
                            saveCheckoutCoupon(res.quote);
                            setCouponError("");
                            setCouponSuccess(true);
                            setTimeout(() => setCouponSuccess(false), 2000);
                          } else {
                            setCouponError(res.error || "Unable to apply coupon.");
                          }
                        }}
                        className={`shrink-0 px-2.5 py-1.5 rounded-lg text-xs font-semibold tracking-wider transition-all cursor-pointer ${
                          appliedCoupon === privilege.code
                            ? "bg-emerald-700 text-white shadow-xs"
                            : "bg-[#24130d] text-white hover:bg-[var(--gold)] hover:text-[#24130d]"
                        }`}
                      >
                        {appliedCoupon === privilege.code ? "Applied ✓" : "Apply"}
                      </button>
                    </div>
                  )}

                  {/* Coupon Input */}
                  <div className="mb-2.5 sm:mb-4 grid grid-cols-[1fr_auto] gap-2">
                    <input
                      value={coupon}
                      onChange={e => setCoupon(e.target.value.toUpperCase())}
                      placeholder="Coupon code"
                      className="rounded-lg border border-[#4b261a20] bg-white px-3 py-1.5 sm:py-2 text-xs text-[#24130d] placeholder:text-[#4b261a50] outline-none transition-all focus:border-[var(--gold)]"
                    />
                    <button
                      onClick={() => {
                        const res = validateCoupon(coupon, subtotal, userEmail);
                        if (!res.quote) {
                          setAppliedCoupon("");
                          saveCheckoutCoupon(null);
                          setCouponError(res.error || "Invalid coupon code.");
                          setCouponSuccess(false);
                          return;
                        }
                        setAppliedCoupon(res.quote.code);
                        saveCheckoutCoupon(res.quote);
                        setCouponError("");
                        setCouponSuccess(true);
                        setTimeout(() => setCouponSuccess(false), 2000);
                      }}
                      className="rounded-lg border border-[#a87648] bg-white px-3.5 py-1.5 sm:py-2 eyebrow text-[11px] sm:text-xs text-[#a87648] transition-all hover:bg-[#a87648] hover:text-white cursor-pointer font-semibold"
                    >
                      Apply
                    </button>
                  </div>
                  <AnimatePresence>
                    {couponError && <motion.p initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mb-2 text-[11px] text-red-600 font-medium">{couponError}</motion.p>}
                    {couponSuccess && <motion.p initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mb-2 text-[11px] text-emerald-700 font-medium">✓ Coupon applied!</motion.p>}
                  </AnimatePresence>

                  <div className="flex items-center justify-between text-xs text-[#4b261a90]">
                    <span>Subtotal</span>
                    <span className="font-semibold text-[#24130d]">Rs. {subtotal.toLocaleString("en-IN")}</span>
                  </div>
                  {discount > 0 && (
                    <div className="mt-1 flex items-center justify-between text-xs text-emerald-700 font-semibold">
                      <div className="flex items-center gap-1.5">
                        <span>{couponQuote?.title}</span>
                        <button
                          type="button"
                          onClick={() => {
                            setAppliedCoupon("");
                            saveCheckoutCoupon(null);
                            setCoupon("");
                          }}
                          className="text-[10px] text-red-600 hover:underline font-normal cursor-pointer ml-1"
                        >
                          (Remove)
                        </button>
                      </div>
                      <span>− Rs. {discount.toLocaleString("en-IN")}</span>
                    </div>
                  )}

                  <div className="my-2 sm:my-3 h-px bg-[#4b261a15]" />

                  <div className="flex items-center justify-between">
                    <span className="eyebrow text-xs text-[#4b261a80] font-semibold">Total</span>
                    <span className="font-display text-xl sm:text-2xl font-bold text-[#24130d]">Rs. {total.toLocaleString("en-IN")}</span>
                  </div>

                  <button
                    onClick={() => {
                      if (!session) { setOpen(false); onLogin?.(); return; }
                      setOpen(false); saveCheckoutCoupon(couponQuote); window.location.hash = "/checkout";
                    }}
                    style={{
                      backgroundColor: "#15803d",
                      color: "#ffffff",
                      border: "none",
                      boxShadow: "0 6px 20px rgba(21, 128, 61, 0.35)",
                    }}
                    className="mt-2.5 sm:mt-4 inline-flex w-full items-center justify-center gap-2 py-3.5 eyebrow text-xs font-semibold tracking-widest text-white transition-all bg-[#15803d] hover:bg-[#166534] hover:scale-[1.01] cursor-pointer rounded-full shadow-lg"
                  >
                    Secure Checkout →
                  </button>

                  <p className="mt-2 text-center text-[0.6rem] uppercase tracking-[0.18em] text-[#4b261a70]">White-glove delivery · Worldwide</p>
                  <div className="mt-1.5 grid grid-cols-3 gap-1.5 sm:gap-2 text-center text-[0.6rem] font-semibold uppercase tracking-[0.15em] text-[#4b261a80]">
                    {["Card", "UPI", "COD"].map(m => (
                      <span key={m} className="rounded-md border border-[#4b261a15] bg-white py-1 transition-colors">
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
