import { motion, useScroll, useTransform, AnimatePresence } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { Magnetic } from "./Magnetic";
import { useCart } from "./cart/CartContext";

export function Navigation({ userName, onLogout, onLogin, solid = false }: { userName?: string; onLogout?: () => void; onLogin?: () => void; solid?: boolean }) {
  const baseUrl = import.meta.env.BASE_URL === "/react/" ? "/" : import.meta.env.BASE_URL;
  const { scrollY } = useScroll();
  const bg = useTransform(scrollY, [0, 80], [solid ? "var(--bone)" : "oklch(1 0 0 / 0)", solid ? "var(--bone)" : "oklch(0.14 0.005 60 / 0.85)"]);
  const color = useTransform(scrollY, [0, 80], [solid ? "var(--ink)" : "var(--bone)", solid ? "var(--ink)" : "var(--bone)"]);
  const [open, setOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const { count, setOpen: setCartOpen, wishlist } = useCart();

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
  }, [open]);

  useEffect(() => {
    const closeProfile = (event: PointerEvent) => {
      if (!profileRef.current?.contains(event.target as Node)) setProfileOpen(false);
    };
    document.addEventListener("pointerdown", closeProfile);
    return () => document.removeEventListener("pointerdown", closeProfile);
  }, []);

  const nav = [
    ["Collections", "/"],
    ["Atelier", "/"],
    ["Journal", "/"],
    ["Contact", "/"],
  ] as const;

  return (
    <>
      <motion.header
        style={{ background: bg, color }}
        className="fixed inset-x-0 top-0 z-[60] backdrop-blur-md transition-colors"
      >
        <div className="mx-auto flex h-20 max-w-[1600px] items-center justify-between px-6 md:px-12">
          <a href={baseUrl} className={`font-display text-2xl tracking-[0.3em] ${solid ? "text-[var(--ink)]" : "text-[var(--bone)]"}`}>
            FOLLOCIA
          </a>
          <nav className="hidden items-center gap-10 md:flex">
            {nav.map(([label]) => (
              <a key={label} href="#" className={`eyebrow transition-colors hover:text-[var(--gold)] ${solid ? "text-[var(--ink)]/80" : "text-[var(--bone)]/80"}`}>
                {label}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-5 md:gap-7">
            <div ref={profileRef} className="relative">
              <button
                onClick={() => (userName ? setProfileOpen((value) => !value) : onLogin?.())}
                className={`flex items-center gap-2 transition-colors hover:text-[var(--gold)] ${solid ? "text-[var(--ink)]/90" : "text-[var(--bone)]/90"}`}
                aria-label={userName ? "Open account menu" : "Login"}
              >
                <span className="grid h-9 w-9 place-items-center rounded-full bg-[#5b3d32] text-sm font-semibold text-white">{userName?.charAt(0).toUpperCase() || "M"}</span>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </button>
              <AnimatePresence>
                {profileOpen && userName && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    className="absolute right-0 top-12 w-48 bg-white px-6 py-5 text-[#18303b] shadow-[0_18px_45px_rgba(0,0,0,0.12)]"
                  >
                    {[
                      ["My Orders", "#/account/my-orders"],
                      ["My Wishlist", "#/account/my-wishlist"],
                      ["My Addresses", "#/account/my-addresses"],
                      ["My Wallet", "#/account/my-wallet"],
                      ["My Coupons", "#/account/my-coupons"],
                      ["Gift Cards", "#/account/gift-cards"],
                      ["My Subscriptions", "#/account/my-subscriptions"],
                      ["My Account", "#/account/my-account"],
                    ].map(([label, href]) => (
                      <a key={label} href={href} className="block py-2 text-base font-light hover:text-[#5b3d32]">{label}</a>
                    ))}
                    <div className="my-3 border-t border-[#d8d8d8]" />
                    <button onClick={onLogout} className="py-2 text-base font-light hover:text-[#5b3d32]">Log Out</button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <a href="#vip" className={`hidden eyebrow transition-colors hover:text-[var(--gold)] md:inline ${solid ? "text-[var(--ink)]/80" : "text-[var(--bone)]/80"}`}>
              VIP Access
            </a>
            <button
              aria-label="Wishlist"
              data-cursor="hover"
              className={`relative hidden transition-colors hover:text-[var(--gold)] md:block ${solid ? "text-[var(--ink)]/80" : "text-[var(--bone)]/80"}`}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M12 21s-7-4.35-7-10a4 4 0 0 1 7-2.65A4 4 0 0 1 19 11c0 5.65-7 10-7 10z" />
              </svg>
              <AnimatePresence>
                {wishlist.length > 0 && (
                  <motion.span
                    initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
                    className="absolute -right-2 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--gold)] px-1 text-[0.55rem] font-medium text-[var(--ink)]"
                  >
                    {wishlist.length}
                  </motion.span>
                )}
              </AnimatePresence>
            </button>
            <Magnetic>
              <button
                onClick={() => (userName ? setCartOpen(true) : onLogin?.())}
                aria-label="Open bag"
                data-cursor="hover"
                className={`relative flex items-center gap-2 transition-colors hover:text-[var(--gold)] ${solid ? "text-[var(--ink)]/90" : "text-[var(--bone)]/90"}`}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M6 7h12l-1 13H7L6 7z" />
                  <path d="M9 7a3 3 0 1 1 6 0" />
                </svg>
                <span className="hidden eyebrow text-[0.65rem] md:inline">Bag</span>
                <AnimatePresence>
                  {count > 0 && (
                    <motion.span
                      key={count}
                      initial={{ scale: 0, y: -4 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0 }}
                      className="absolute -right-2 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--gold)] px-1 text-[0.55rem] font-medium text-[var(--ink)]"
                    >
                      {count}
                    </motion.span>
                  )}
                </AnimatePresence>
              </button>
            </Magnetic>
            <Magnetic>
              <button
                aria-label="Menu"
                onClick={() => setOpen((v) => !v)}
                className="flex h-10 w-10 flex-col items-center justify-center gap-1.5 md:hidden"
              >
                <span className={`h-px w-6 ${solid ? "bg-[var(--ink)]" : "bg-[var(--bone)]"}`} />
                <span className={`h-px w-6 ${solid ? "bg-[var(--ink)]" : "bg-[var(--bone)]"}`} />
              </button>
            </Magnetic>
          </div>
        </div>
      </motion.header>

      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[55] flex flex-col items-center justify-center gap-8 bg-[var(--ink)] md:hidden"
        >
          {nav.map(([label]) => (
            <a key={label} href="#" onClick={() => setOpen(false)} className="font-display text-4xl text-[var(--bone)]">
              {label}
            </a>
          ))}
        </motion.div>
      )}
    </>
  );
}
