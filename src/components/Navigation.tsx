import { motion, useScroll, useTransform, AnimatePresence } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { Magnetic } from "./Magnetic";
import { useCart } from "./cart/CartContext";
import { BrandLogo } from "./BrandLogo";
import { SplitText } from "./SplitText";

const menuImages = [
  "/images/shoe-detail-1.jpg",
  "/images/shoe-detail-3.jpg",
  "/images/shoe-detail-5.jpg",
  "/images/shoe-detail-2.jpg",
];

export function Navigation({ userName, onLogout, onLogin, solid = false }: { userName?: string; onLogout?: () => void; onLogin?: () => void; solid?: boolean }) {
  const baseUrl = import.meta.env.BASE_URL === "/react/" ? "/" : import.meta.env.BASE_URL;
  const { scrollY } = useScroll();
  const bg = useTransform(scrollY, [0, 80], [solid ? "var(--bone)" : "oklch(1 0 0 / 0)", solid ? "var(--bone)" : "oklch(0.14 0.005 60 / 0.85)"]);
  const color = useTransform(scrollY, [0, 80], [solid ? "var(--ink)" : "var(--bone)", solid ? "var(--ink)" : "var(--bone)"]);
  const blur = useTransform(scrollY, [0, 80], ["blur(0px)", "blur(20px)"]);
  const [open, setOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const { count, setOpen: setCartOpen, wishlist } = useCart();
  const [activeNav, setActiveNav] = useState(0);

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
    ["Home", baseUrl],
    ["Collections", "#/collections"],
    ["Shop", "#/shop"],
    ["Contact", "#/contact"],
  ] as const;

  return (
    <>
      <motion.header
        style={{ background: bg, color, backdropFilter: blur, WebkitBackdropFilter: blur }}
        className="fixed inset-x-0 top-0 z-[60] transition-colors"
      >
        {/* Animated bottom border */}
        <motion.div
          style={{ opacity: useTransform(scrollY, [0, 80], [0, 1]) }}
          className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[var(--gold)]/20 to-transparent"
        />

        <div className="mx-auto flex h-20 max-w-[1600px] items-center justify-between px-6 md:px-12">
          <a href={baseUrl} aria-label="Follocia home" className="flex items-center" data-cursor="hover">
            <BrandLogo compact imageClassName={`border ${solid ? "border-[var(--ink)]/10" : "border-white/20"}`} />
          </a>

          {/* Desktop nav with animated underline */}
          <nav className="hidden items-center gap-10 md:flex">
            {nav.map(([label, href], i) => (
              <a
                key={label}
                href={href}
                onMouseEnter={() => setActiveNav(i)}
                className={`relative eyebrow transition-colors hover:text-[var(--gold)] ${solid ? "text-[var(--ink)]/80" : "text-[var(--bone)]/80"}`}
                data-cursor="hover"
              >
                {label}
                {/* Animated underline */}
                <motion.div
                  className="absolute -bottom-1.5 left-0 right-0 h-px bg-[var(--gold)]"
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: activeNav === i ? 1 : 0 }}
                  transition={{ duration: 0.4, ease: [0.2, 0.8, 0.2, 1] }}
                  style={{ transformOrigin: "left" }}
                />
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-5 md:gap-7">
            {/* Profile */}
            <div ref={profileRef} className="relative">
              <button
                onClick={() => (userName ? setProfileOpen((value) => !value) : onLogin?.())}
                className={`flex items-center gap-2 transition-colors hover:text-[var(--gold)] ${solid ? "text-[var(--ink)]/90" : "text-[var(--bone)]/90"}`}
                aria-label={userName ? "Open account menu" : "Login"}
                data-cursor="hover"
              >
                <span className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-[#5b3d32] to-[#3d2820] text-sm font-semibold text-white shadow-inner">{userName?.charAt(0).toUpperCase() || "M"}</span>
                <motion.svg
                  animate={{ rotate: profileOpen ? 180 : 0 }}
                  transition={{ duration: 0.3 }}
                  width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"
                >
                  <path d="m6 9 6 6 6-6" />
                </motion.svg>
              </button>
              <AnimatePresence>
                {profileOpen && userName && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.95 }}
                    transition={{ duration: 0.3, ease: [0.2, 0.8, 0.2, 1] }}
                    className="absolute right-0 top-14 w-52 glass-dark rounded-sm px-5 py-5 text-[var(--bone)] shadow-[var(--shadow-3d)]"
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
                      <a key={label} href={href} className="block py-2 text-sm font-light hover-underline hover:text-[var(--gold)] transition-colors" data-cursor="hover">{label}</a>
                    ))}
                    <div className="my-3 border-t border-[var(--bone)]/10" />
                    <button onClick={onLogout} className="py-2 text-sm font-light hover:text-[var(--gold)] transition-colors" data-cursor="hover">Log Out</button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* VIP Access */}
            <a href="#vip" className={`hidden eyebrow transition-colors hover:text-[var(--gold)] md:inline ${solid ? "text-[var(--ink)]/80" : "text-[var(--bone)]/80"}`} data-cursor="hover">
              VIP Access
            </a>

            {/* Wishlist */}
            <button
              aria-label="Wishlist"
              data-cursor="hover"
              onClick={() => {
                if (userName) window.location.hash = "/account/my-wishlist";
                else onLogin?.();
              }}
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

            {/* Cart */}
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

            {/* Mobile hamburger */}
            <Magnetic>
              <button
                aria-label="Menu"
                onClick={() => setOpen((v) => !v)}
                className="flex h-10 w-10 flex-col items-center justify-center gap-1.5 md:hidden"
                data-cursor="hover"
              >
                <motion.span
                  animate={{ rotate: open ? 45 : 0, y: open ? 4 : 0 }}
                  className={`h-px w-6 ${solid ? "bg-[var(--ink)]" : "bg-[var(--bone)]"}`}
                />
                <motion.span
                  animate={{ rotate: open ? -45 : 0, y: open ? -4 : 0, opacity: open ? 1 : 1 }}
                  className={`h-px w-6 ${solid ? "bg-[var(--ink)]" : "bg-[var(--bone)]"}`}
                />
              </button>
            </Magnetic>
          </div>
        </div>
      </motion.header>

      {/* Full-screen mobile menu */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="fixed inset-0 z-[55] md:hidden overflow-hidden"
          >
            {/* Background */}
            <motion.div
              initial={{ scale: 1.1 }}
              animate={{ scale: 1 }}
              exit={{ scale: 1.1 }}
              transition={{ duration: 0.8, ease: [0.2, 0.8, 0.2, 1] }}
              className="absolute inset-0 bg-[var(--ink)]"
            >
              <div className="absolute inset-0 luxe-grain" />
              {/* Background image with opacity */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.08 }}
                className="absolute inset-0"
                style={{
                  backgroundImage: `url(${menuImages[0]})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }}
              />
            </motion.div>

            {/* Menu links */}
            <div className="relative z-10 flex h-full flex-col items-center justify-center gap-6">
              {nav.map(([label, href], i) => (
                <motion.a
                  key={label}
                  href={href}
                  onClick={() => setOpen(false)}
                  initial={{ opacity: 0, y: 40, rotateX: -15 }}
                  animate={{ opacity: 1, y: 0, rotateX: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ delay: i * 0.1 + 0.2, duration: 0.8, ease: [0.2, 0.8, 0.2, 1] }}
                  className="font-display text-5xl text-[var(--bone)] hover:text-[var(--gold)] transition-colors"
                  style={{ perspective: 800 }}
                  data-cursor="hover"
                >
                  {label}
                </motion.a>
              ))}

              {/* Decorative line */}
              <motion.div
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ delay: 0.8, duration: 1 }}
                className="mt-4 h-px w-24 bg-gradient-to-r from-transparent via-[var(--gold)]/40 to-transparent"
              />

              {/* Sub-info */}
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.4 }}
                transition={{ delay: 1 }}
                className="mt-2 eyebrow text-[var(--bone)]/40 text-[0.6rem]"
              >
                Maison Follocia · MMXXV
              </motion.p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
