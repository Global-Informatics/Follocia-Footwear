import { useCart } from "@/components/cart/CartContext";
import type { AuthSession } from "@/components/auth/AuthGateway";
import { useEffect, useState } from "react";
import { Home, Sparkles, Search, Heart, ShoppingBag, User } from "lucide-react";

export function MobileBottomNav({
  session,
  onLogin,
}: {
  session?: AuthSession | null;
  onLogin?: () => void;
}) {
  const { count, wishlist, setOpen: setCartOpen } = useCart();
  const [currentHash, setCurrentHash] = useState(() => (typeof window !== "undefined" ? window.location.hash : ""));

  useEffect(() => {
    const handleHashChange = () => setCurrentHash(window.location.hash || "");
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  const clean = currentHash.replace(/^#\/?/, "").toLowerCase().split("?")[0];
  const isHome = !clean || clean === "top";
  const isShop = clean === "shop" || clean.startsWith("shop/") || clean === "collections" || clean === "new-arrivals";
  const isWishlist = clean === "account/my-wishlist" || clean === "wishlist";
  const isAccount = clean.startsWith("account") && !isWishlist;

  const handleOpenSearch = () => {
    window.dispatchEvent(new CustomEvent("follicia-open-search"));
  };

  const handleOpenWishlist = () => {
    window.location.hash = "#/account/my-wishlist";
  };

  const handleOpenAccount = () => {
    if (session?.user) {
      window.location.hash = "#/account/my-orders";
    } else if (onLogin) {
      onLogin();
    } else {
      window.location.hash = "#/account/my-orders";
    }
  };

  return (
    <nav
      aria-label="Mobile Navigation Bar"
      className="md:hidden fixed bottom-0 left-0 right-0 z-[85] bg-[#fffdf8]/98 backdrop-blur-xl border-t border-[#4b261a18] shadow-[0_-6px_25px_rgba(36,19,13,0.08)] px-1 py-1 flex items-center justify-around"
      style={{ paddingBottom: "max(6px, env(safe-area-inset-bottom, 6px))" }}
    >
      {/* Home */}
      <button
        type="button"
        onClick={() => {
          if (isHome) {
            window.scrollTo({ top: 0, behavior: "smooth" });
          } else {
            window.location.hash = "#/";
            window.scrollTo({ top: 0, behavior: "smooth" });
          }
        }}
        className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all cursor-pointer ${
          isHome ? "text-[#24130d] font-bold" : "text-[#4b261a80] hover:text-[#24130d]"
        }`}
      >
        <Home size={19} strokeWidth={isHome ? 2.3 : 1.7} className={isHome ? "text-[#24130d]" : "text-[#4b261a80]"} />
        <span className="text-[9px] uppercase tracking-wider mt-0.5 font-medium">Home</span>
        {isHome && <span className="w-1 h-1 rounded-full bg-[var(--gold)] mt-0.5" />}
      </button>

      {/* Shop */}
      <button
        type="button"
        onClick={() => {
          window.location.hash = "#/shop";
          window.scrollTo({ top: 0, behavior: "smooth" });
        }}
        className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all cursor-pointer ${
          isShop ? "text-[#24130d] font-bold" : "text-[#4b261a80] hover:text-[#24130d]"
        }`}
      >
        <Sparkles size={19} strokeWidth={isShop ? 2.3 : 1.7} className={isShop ? "text-[var(--gold)]" : "text-[#4b261a80]"} />
        <span className="text-[9px] uppercase tracking-wider mt-0.5 font-medium">Shop</span>
        {isShop && <span className="w-1 h-1 rounded-full bg-[var(--gold)] mt-0.5" />}
      </button>

      {/* Search */}
      <button
        type="button"
        onClick={handleOpenSearch}
        className="flex flex-col items-center justify-center py-1 px-2 rounded-xl text-[#4b261a80] hover:text-[#24130d] transition-all cursor-pointer"
      >
        <Search size={19} strokeWidth={1.7} />
        <span className="text-[9px] uppercase tracking-wider mt-0.5 font-medium">Search</span>
      </button>

      {/* Wishlist */}
      <button
        type="button"
        onClick={handleOpenWishlist}
        className={`relative flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all cursor-pointer ${
          isWishlist ? "text-[#24130d] font-bold" : "text-[#4b261a80] hover:text-[#24130d]"
        }`}
      >
        <div className="relative">
          <Heart
            size={19}
            strokeWidth={isWishlist ? 2.3 : 1.7}
            fill={isWishlist ? "var(--gold)" : "none"}
            className={isWishlist ? "text-[var(--gold)]" : "text-[#4b261a80]"}
          />
          {wishlist.length > 0 && (
            <span className="absolute -top-1 -right-2.5 h-3.5 min-w-3.5 px-1 rounded-full bg-[#351c13] text-white text-[8px] font-bold flex items-center justify-center border border-white">
              {wishlist.length}
            </span>
          )}
        </div>
        <span className="text-[9px] uppercase tracking-wider mt-0.5 font-medium">Wishlist</span>
        {isWishlist && <span className="w-1 h-1 rounded-full bg-[var(--gold)] mt-0.5" />}
      </button>

      {/* Bag / Cart */}
      <button
        type="button"
        onClick={() => setCartOpen(true)}
        className="relative flex flex-col items-center justify-center py-1 px-2 rounded-xl text-[#4b261a80] hover:text-[#24130d] transition-all cursor-pointer"
      >
        <div className="relative">
          <ShoppingBag size={19} strokeWidth={1.7} />
          {count > 0 && (
            <span className="absolute -top-1 -right-2.5 h-3.5 min-w-3.5 px-1 rounded-full bg-[var(--gold)] text-[#24130d] text-[8px] font-bold flex items-center justify-center shadow-xs">
              {count}
            </span>
          )}
        </div>
        <span className="text-[9px] uppercase tracking-wider mt-0.5 font-medium">Bag</span>
      </button>

      {/* Account */}
      <button
        type="button"
        onClick={handleOpenAccount}
        className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all cursor-pointer ${
          isAccount ? "text-[#24130d] font-bold" : "text-[#4b261a80] hover:text-[#24130d]"
        }`}
      >
        <User size={19} strokeWidth={isAccount ? 2.3 : 1.7} className={isAccount ? "text-[#24130d]" : "text-[#4b261a80]"} />
        <span className="text-[9px] uppercase tracking-wider mt-0.5 font-medium">
          {session?.user ? "Account" : "Login"}
        </span>
        {isAccount && <span className="w-1 h-1 rounded-full bg-[var(--gold)] mt-0.5" />}
      </button>
    </nav>
  );
}
