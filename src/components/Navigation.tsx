import { useState, useMemo, useEffect, useRef } from "react";
import { useCart } from "./cart/CartContext";
import { FOLLICIA_PRODUCTS, formatINR } from "@/data/folliciaCatalogue";
import "./home/follicia.css";

export function Navigation({
  userName,
  onLogout,
  onLogin,
  solid = false,
}: {
  userName?: string;
  onLogout?: () => void;
  onLogin?: () => void;
  solid?: boolean;
}) {
  const [navOpen, setNavOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const { count, setOpen: setCartOpen, wishlist } = useCart();
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSearchOpen(false);
        setNavOpen(false);
        setProfileOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    const closeProfile = (event: PointerEvent) => {
      if (!profileRef.current?.contains(event.target as Node)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener("pointerdown", closeProfile);
    return () => document.removeEventListener("pointerdown", closeProfile);
  }, []);

  // Prevent background body scroll when search is open
  useEffect(() => {
    if (searchOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [searchOpen]);

  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return FOLLICIA_PRODUCTS.slice(0, 10);
    const words = q.split(/\s+/).filter(Boolean);
    return FOLLICIA_PRODUCTS.filter((p) => {
      const pCat = p.category.toLowerCase();
      const catKeywords = [
        pCat,
        pCat === "heel" ? "heels heeled" : "",
        pCat === "flat" ? "flats" : "",
        pCat === "mule" ? "mules" : "",
      ].filter(Boolean).join(" ");

      const searchable = [
        p.name,
        p.collection,
        p.category,
        catKeywords,
        p.color,
        p.colors,
        p.silhouette,
        p.material,
        p.id,
        String(p.price),
      ].join(" ").toLowerCase();

      return words.every((w) => {
        const root = w.replace(/s$/, "");
        return searchable.includes(w) || searchable.includes(root);
      });
    });
  }, [searchQuery]);

  return (
    <>
      {/* Top Announcement Bar */}
      <div className="announcement">
        Complimentary shipping across India on orders above ₹2,999
      </div>

      {/* Main Site Header */}
      <header className="site-header">
        <button
          type="button"
          className="menu-button"
          aria-label="Toggle navigation"
          onClick={() => setNavOpen((prev) => !prev)}
        >
          Menu
        </button>

        <a className="brand-wordmark" href="#/" aria-label="Follicia home">
          FOLLICIA
        </a>

        <nav className={`nav ${navOpen ? "open" : ""}`} aria-label="Main navigation">
          <a
            href="#/"
            onClick={() => {
              setNavOpen(false);
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
          >
            Home
          </a>
          <a
            href="#/collections"
            onClick={() => {
              setNavOpen(false);
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
          >
            Collections
          </a>
          <a
            href="#/shop"
            onClick={() => {
              setNavOpen(false);
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
          >
            Shop
          </a>
          <a
            href="#/contact"
            onClick={() => {
              setNavOpen(false);
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
          >
            Our Story
          </a>
        </nav>

        <div className="actions">
          {/* Search trigger */}
          <button
            type="button"
            aria-label="Search collection"
            onClick={() => setSearchOpen(true)}
            title="Search designs"
            className="action-icon"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
          </button>

          {/* User Profile / Admin Icon */}
          <div ref={profileRef} className="relative inline-flex items-center">
            {userName ? (
              <button
                type="button"
                onClick={() => setProfileOpen((prev) => !prev)}
                className="action-icon flex items-center gap-1.5"
                title={`Logged in as ${userName}`}
                aria-label="User Account"
              >
                <span className="grid h-7 w-7 place-items-center rounded-full bg-[#4b261a] text-xs font-semibold text-[#fffaf0]">
                  {userName.charAt(0).toUpperCase()}
                </span>
              </button>
            ) : (
              <a
                href="#/admin"
                className="action-icon"
                title="Maison Admin"
                aria-label="Admin Account"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="9.5" />
                  <circle cx="12" cy="9.5" r="3.2" />
                  <path d="M6.3 18.2a6 6 0 0 1 11.4 0" />
                </svg>
              </a>
            )}

            {/* Profile Dropdown if logged in */}
            {profileOpen && userName && (
              <div
                className="absolute right-0 top-12 z-[70] w-52 rounded-xl border border-[#4b261a26] bg-[#fffdf8] p-4 text-xs shadow-2xl"
                style={{ color: "#351c13" }}
              >
                <p className="mb-2 text-[10px] uppercase tracking-wider text-[#a87648]">
                  Signed in as <strong className="block text-xs text-[#351c13]">{userName}</strong>
                </p>
                <div className="my-2 border-t border-[#4b261a15]" />
                <a href="#/account/my-orders" className="block py-1.5 hover:text-[#a87648] transition-colors">My Orders</a>
                <a href="#/account/my-wishlist" className="block py-1.5 hover:text-[#a87648] transition-colors">My Wishlist</a>
                <a href="#/account/my-addresses" className="block py-1.5 hover:text-[#a87648] transition-colors">My Addresses</a>
                <a href="#/account/my-wallet" className="block py-1.5 hover:text-[#a87648] transition-colors">My Wallet</a>
                <a href="#/account/my-account" className="block py-1.5 hover:text-[#a87648] transition-colors">Account Settings</a>
                <div className="my-2 border-t border-[#4b261a15]" />
                <button
                  type="button"
                  onClick={() => {
                    setProfileOpen(false);
                    onLogout?.();
                  }}
                  className="w-full text-left py-1.5 text-red-600 hover:text-red-800 transition-colors"
                >
                  Log Out
                </button>
              </div>
            )}
          </div>

          {/* Wishlist */}
          <a
            href="#/account/my-wishlist"
            className="wishlist-btn"
            aria-label="Wishlist"
          >
            ♡{wishlist.length > 0 && <small>{wishlist.length}</small>}
          </a>

          {/* Shopping Bag Drawer Button */}
          <button
            type="button"
            aria-label="Shopping bag"
            className="bag-btn"
            onClick={() => setCartOpen(true)}
          >
            Bag{count > 0 && <small>{count}</small>}
          </button>
        </div>
      </header>

      {/* Search Modal */}
      {searchOpen && (
        <div
          className="search-backdrop"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              setSearchOpen(false);
              setSearchQuery("");
            }
          }}
        >
          <div
            className="search-dialog"
            role="dialog"
            aria-modal="true"
            aria-label="Search catalogue"
          >
            <div className="search-header">
              <div className="search-input-wrap">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.3-4.3" />
                </svg>
                <input
                  type="text"
                  placeholder="Search products by name, collection, style, color or price..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  autoFocus
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    aria-label="Clear search"
                    className="search-clear"
                  >
                    ×
                  </button>
                )}
              </div>
              <button
                className="search-close"
                onClick={() => {
                  setSearchOpen(false);
                  setSearchQuery("");
                }}
                aria-label="Close search"
              >
                ✕ Close
              </button>
            </div>

            <div className="search-results">
              {searchResults.length === 0 ? (
                <div className="search-empty">
                  {searchQuery
                    ? `No products found matching "${searchQuery}".`
                    : "Type to search through all Follicia designs..."}
                </div>
              ) : (
                <div className="search-results-grid">
                  {searchResults.map((p) => (
                    <a
                      key={p.id}
                      href={`#/shop/${p.id.toLowerCase()}`}
                      className="search-result-item"
                      onClick={() => {
                        setSearchOpen(false);
                        setSearchQuery("");
                      }}
                    >
                      <img src={p.image} alt={p.name} />
                      <div className="search-result-info">
                        <h4>{p.name}</h4>
                        <p>
                          {p.collection} · {p.color} · {p.category}
                        </p>
                        <strong>{formatINR.format(p.price)}</strong>
                      </div>
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
