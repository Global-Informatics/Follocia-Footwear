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

  const [maxPrice, setMaxPrice] = useState<number>(5000);
  const [colorFilter, setColorFilter] = useState<string>("All");

  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return FOLLICIA_PRODUCTS.filter((p) => {
      // 1. Text Search Filter
      if (q) {
        const words = q.split(/\s+/).filter(Boolean);
        const pCat = (p.category || "").toLowerCase();
        const catKeywords = [
          pCat,
          pCat === "heel" ? "heels heeled" : "",
          pCat === "flat" ? "flats" : "",
          pCat === "mule" ? "mules" : "",
          pCat === "boot" ? "boots bootie booties" : "",
        ].filter(Boolean).join(" ");

        const pCol = (p.collection || "").toLowerCase();
        const colKeywords = `${pCol} ${pCol} collection`;

        const searchable = [
          p.name,
          p.collection,
          colKeywords,
          p.category,
          catKeywords,
          p.color,
          p.colors || "",
          p.silhouette || "",
          p.material || "",
          p.id,
          String(p.price),
        ].join(" ").toLowerCase();

        const matchesText = words.every((w) => {
          const rootS = w.replace(/s$/, "");
          const rootES = w.replace(/es$/, "");
          return (
            searchable.includes(w) ||
            searchable.includes(rootS) ||
            searchable.includes(rootES)
          );
        });
        if (!matchesText) return false;
      }

      // 2. Price Range Filter
      if (maxPrice < 5000 && p.price > maxPrice) return false;

      // 3. Color Filter
      if (colorFilter !== "All") {
        const col = `${p.color || ""} ${p.colors || ""}`.toLowerCase();
        const target = colorFilter.toLowerCase();
        if (target.includes("black") && !col.includes("black") && !col.includes("noir")) return false;
        if (target.includes("ivory") && !col.includes("ivory") && !col.includes("nude") && !col.includes("cream") && !col.includes("beige") && !col.includes("white")) return false;
        if (target.includes("brown") && !col.includes("brown") && !col.includes("tan") && !col.includes("chocolate") && !col.includes("fawn") && !col.includes("leopard") && !col.includes("caramel")) return false;
        if (target.includes("blush") && !col.includes("blush") && !col.includes("rose")) return false;
        if (target.includes("silver") && !col.includes("silver") && !col.includes("chrome") && !col.includes("gunmetal")) return false;
        if (target.includes("gold") && !col.includes("gold") && !col.includes("monarch") && !col.includes("orange")) return false;
      }

      return true;
    });
  }, [searchQuery, maxPrice, colorFilter]);

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
            href="#our-story"
            onClick={(e) => {
              setNavOpen(false);
              const el = document.getElementById("our-story");
              if (el) {
                e.preventDefault();
                el.scrollIntoView({ behavior: "smooth" });
              } else {
                window.location.hash = "#our-story";
              }
            }}
          >
            Our Story
          </a>
          <button
            type="button"
            onClick={() => {
              setNavOpen(false);
              if (userName) {
                setProfileOpen((prev) => !prev);
              } else if (onLogin) {
                onLogin();
              }
            }}
            className="md:hidden text-left py-2 font-medium tracking-wider uppercase text-[0.68rem] text-[var(--gold)]"
            style={{ background: "none", border: "none", cursor: "pointer" }}
          >
            {userName ? `Account (${userName})` : "Account / Sign in"}
          </button>
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
              <button
                type="button"
                onClick={() => {
                  if (onLogin) {
                    onLogin();
                  } else {
                    window.location.hash = "/admin";
                  }
                }}
                className="action-icon cursor-pointer"
                title="Account / Sign in"
                aria-label="Account / Sign in"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="9.5" />
                  <circle cx="12" cy="9.5" r="3.2" />
                  <path d="M6.3 18.2a6 6 0 0 1 11.4 0" />
                </svg>
              </button>
            )}

            {/* Profile Dropdown if logged in */}
            {profileOpen && userName && (
              <div
                className="absolute right-0 top-12 z-[70] w-56 rounded-xl border border-[#4b261a26] bg-[#fffdf8] p-4 text-xs shadow-2xl"
                style={{ color: "#351c13" }}
              >
                <p className="mb-2 text-[10px] uppercase tracking-wider text-[#a87648]">
                  Signed in as <strong className="block text-xs text-[#351c13]">{userName}</strong>
                </p>
                <div className="my-2 border-t border-[#4b261a15]" />
                {userName.toLowerCase().includes("admin") ? (
                  <>
                    <a href="#/admin" onClick={() => setProfileOpen(false)} className="block py-1.5 font-bold text-[#a87648] hover:underline">
                      ⚡ Admin Control Panel
                    </a>
                    <a href="#/" onClick={() => setProfileOpen(false)} className="block py-1.5 hover:text-[#a87648] transition-colors">
                      Storefront
                    </a>
                  </>
                ) : (
                  <>
                    <a href="#/account/my-orders" onClick={() => setProfileOpen(false)} className="block py-1.5 hover:text-[#a87648] transition-colors">My Orders</a>
                    <a href="#/account/my-wishlist" onClick={() => setProfileOpen(false)} className="block py-1.5 hover:text-[#a87648] transition-colors">My Wishlist</a>
                    <a href="#/account/my-addresses" onClick={() => setProfileOpen(false)} className="block py-1.5 hover:text-[#a87648] transition-colors">My Addresses</a>
                    <a href="#/account/my-wallet" onClick={() => setProfileOpen(false)} className="block py-1.5 hover:text-[#a87648] transition-colors">My Wallet</a>
                    <a href="#/account/my-account" onClick={() => setProfileOpen(false)} className="block py-1.5 hover:text-[#a87648] transition-colors">Account Settings</a>
                  </>
                )}
                <div className="my-2 border-t border-[#4b261a15]" />
                <button
                  type="button"
                  onClick={() => {
                    setProfileOpen(false);
                    onLogout?.();
                  }}
                  className="w-full text-left py-1.5 text-red-600 hover:text-red-800 transition-colors cursor-pointer"
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

            {/* Price Range & Color Filters Bar matching Pic 1 */}
            <div className="border-b border-[#4b261a15] bg-[#fffdf8] px-6 py-3.5 flex flex-wrap items-center justify-between gap-4">
              {/* Price Range Slider */}
              <div className="flex items-center gap-3">
                <span className="text-[10px] uppercase font-bold tracking-widest text-[#4b261a80]">PRICE:</span>
                <span className="text-xs font-bold text-[#24130d]">
                  {maxPrice >= 5000 ? "₹1,000 - ₹5,000+" : `Up to ₹${maxPrice.toLocaleString("en-IN")}`}
                </span>
                <input
                  type="range"
                  min="1400"
                  max="5000"
                  step="100"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(Number(e.target.value))}
                  className="w-28 sm:w-36 accent-[#4b261a] cursor-pointer h-1.5 bg-[#4b261a15] rounded-lg"
                />
              </div>

              {/* Color Swatches */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] uppercase font-bold tracking-widest text-[#4b261a80]">COLOR:</span>
                {[
                  { name: "All", hex: "linear-gradient(135deg, #171310 0%, #d8a9a2 50%, #d9a15c 100%)" },
                  { name: "Black", hex: "#171310" },
                  { name: "Ivory / Nude", hex: "#f2e9d9" },
                  { name: "Brown / Tan", hex: "#6c3d2c" },
                  { name: "Blush / Rose", hex: "#d8a9a2" },
                  { name: "Silver / Chrome", hex: "#b8b8b5" },
                  { name: "Gold", hex: "#d9a15c" },
                ].map((s) => (
                  <button
                    key={s.name}
                    type="button"
                    title={s.name}
                    onClick={() => setColorFilter(s.name)}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold border transition-all cursor-pointer ${
                      colorFilter === s.name
                        ? "border-[#24130d] bg-[#24130d] text-[#fffdf8] shadow-sm"
                        : "border-[#4b261a20] bg-white text-[#24130d] hover:border-[#24130d]"
                    }`}
                  >
                    <span className="h-3 w-3 rounded-full border border-black/20 shrink-0" style={{ background: s.hex }} />
                    <span>{s.name}</span>
                  </button>
                ))}
              </div>
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
