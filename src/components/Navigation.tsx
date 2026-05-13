import { motion, useScroll, useTransform, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import { Magnetic } from "./Magnetic";
import { useCart } from "./cart/CartContext";

export function Navigation({ userName, onLogout }: { userName?: string; onLogout?: () => void }) {
  const baseUrl = import.meta.env.BASE_URL === "/react/" ? "/" : import.meta.env.BASE_URL;
  const { scrollY } = useScroll();
  const bg = useTransform(scrollY, [0, 80], ["oklch(1 0 0 / 0)", "oklch(0.14 0.005 60 / 0.85)"]);
  const color = useTransform(scrollY, [0, 80], ["var(--bone)", "var(--bone)"]);
  const [open, setOpen] = useState(false);
  const { count, setOpen: setCartOpen, wishlist } = useCart();

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
  }, [open]);

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
          <a href={baseUrl} className="font-display text-2xl tracking-[0.3em] text-[var(--bone)]">
            FOLLOCIA
          </a>
          <nav className="hidden items-center gap-10 md:flex">
            {nav.map(([label]) => (
              <a key={label} href="#" className="eyebrow text-[var(--bone)]/80 transition-colors hover:text-[var(--gold)]">
                {label}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-5 md:gap-7">
            {userName && (
              <span className="hidden max-w-28 truncate eyebrow text-[var(--gold)] lg:inline" title={userName}>
                {userName.split(" ")[0]}
              </span>
            )}
            <a href="#vip" className="hidden eyebrow text-[var(--bone)]/80 transition-colors hover:text-[var(--gold)] md:inline">
              VIP Access
            </a>
            <button
              aria-label="Wishlist"
              data-cursor="hover"
              className="relative hidden text-[var(--bone)]/80 transition-colors hover:text-[var(--gold)] md:block"
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
                onClick={() => setCartOpen(true)}
                aria-label="Open bag"
                data-cursor="hover"
                className="relative flex items-center gap-2 text-[var(--bone)]/90 transition-colors hover:text-[var(--gold)]"
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
            {onLogout && (
              <button onClick={onLogout} className="hidden eyebrow text-[var(--bone)]/60 transition-colors hover:text-[var(--gold)] lg:block">
                Logout
              </button>
            )}
            <Magnetic>
              <button
                aria-label="Menu"
                onClick={() => setOpen((v) => !v)}
                className="flex h-10 w-10 flex-col items-center justify-center gap-1.5 md:hidden"
              >
                <span className="h-px w-6 bg-[var(--bone)]" />
                <span className="h-px w-6 bg-[var(--bone)]" />
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
