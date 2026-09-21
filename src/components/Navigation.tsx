import { useState, useMemo, useEffect, useRef } from "react";
import { useCart } from "./cart/CartContext";
import { FOLLICIA_COLLECTIONS, formatINR } from "@/data/folliciaCatalogue";
import { getProducts, parsePriceNumber, COMMERCE_EVENT, type CommerceProduct } from "@/lib/commerceStore";
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
  const [collectionsOpen, setCollectionsOpen] = useState(false);
  const collectionsRef = useRef<HTMLDivElement>(null);
  const { count, setOpen: setCartOpen, wishlist } = useCart();
  const profileRef = useRef<HTMLDivElement>(null);
  const [products, setProducts] = useState<CommerceProduct[]>(() => getProducts());

  useEffect(() => {
    const sync = () => setProducts(getProducts());
    window.addEventListener(COMMERCE_EVENT, sync);
    return () => window.removeEventListener(COMMERCE_EVENT, sync);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSearchOpen(false);
        setNavOpen(false);
        setProfileOpen(false);
        setCollectionsOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    const closeDropdowns = (event: PointerEvent) => {
      if (!profileRef.current?.contains(event.target as Node)) {
        setProfileOpen(false);
      }
      if (!collectionsRef.current?.contains(event.target as Node)) {
        setCollectionsOpen(false);
      }
    };
    document.addEventListener("pointerdown", closeDropdowns);
    return () => document.removeEventListener("pointerdown", closeDropdowns);
  }, []);

  // Prevent background body scroll when search or mobile nav is open
  useEffect(() => {
    if (searchOpen || navOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [searchOpen, navOpen]);

  useEffect(() => {
    const handleOpenSearch = () => setSearchOpen(true);
    window.addEventListener("follicia-open-search", handleOpenSearch);
    return () => window.removeEventListener("follicia-open-search", handleOpenSearch);
  }, []);

  const [maxPrice, setMaxPrice] = useState<number>(40000);
  const [colorFilter, setColorFilter] = useState<string>("All");

  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const words = q.split(/\s+/).filter(Boolean);

    // Explicit category filters from query
    const hasHeel = words.some((w) => /^(heel|heels|heeled)$/i.test(w));
    const hasFlat = words.some((w) => /^(flat|flats)$/i.test(w));
    const hasBoot = words.some((w) => /^(boot|boots|bootie|booties)$/i.test(w));
    const hasMule = words.some((w) => /^(mule|mules)$/i.test(w));

    // Explicit collection filters from query
    const hasMuse = words.some((w) => /^muse$/i.test(w));
    const hasAura = words.some((w) => /^aura$/i.test(w));
    const hasBloom = words.some((w) => /^bloom$/i.test(w));
    const hasNoire = words.some((w) => /^(noire|noir)$/i.test(w));

    // Explicit color filters from query
    const isBlackQuery = words.some((w) => /^(black|noir|onyx|charcoal)$/i.test(w));
    const isIvoryQuery = words.some((w) => /^(ivory|nude|cream|white)$/i.test(w));
    const isBrownQuery = words.some((w) => /^(brown|tan|chocolate|caramel)$/i.test(w));
    const isBlushQuery = words.some((w) => /^(blush|rose|pink)$/i.test(w));
    const isSilverQuery = words.some((w) => /^(silver|chrome|gunmetal)$/i.test(w));
    const isGoldQuery = words.some((w) => /^gold$/i.test(w));

    // Remaining words that are not category/collection/color keywords
    const nonFilterWords = words.filter(
      (w) =>
        !/^(heel|heels|heeled|flat|flats|boot|boots|bootie|booties|mule|mules|aura|bloom|muse|noire|noir|black|noir|onyx|charcoal|ivory|nude|cream|white|brown|tan|chocolate|caramel|blush|rose|pink|silver|chrome|gunmetal|gold)$/i.test(
          w
        )
    );

    let activeColor = colorFilter;
    if (activeColor === "All") {
      if (isBlackQuery) activeColor = "Black";
      else if (isIvoryQuery) activeColor = "Ivory / Nude";
      else if (isBrownQuery) activeColor = "Brown / Tan";
      else if (isBlushQuery) activeColor = "Blush / Rose";
      else if (isSilverQuery) activeColor = "Silver / Chrome";
      else if (isGoldQuery) activeColor = "Gold";
    }

    const matchesColorSwatch = (colorName: string, swatch: string): boolean => {
      if (!colorName) return false;
      const c = colorName.toLowerCase();
      const s = swatch.toLowerCase();
      if (s === "all") return true;
      if (s.includes("black")) {
        return c.includes("black") || c.includes("noir") || c.includes("onyx") || c.includes("charcoal");
      }
      if (s.includes("ivory") || s.includes("nude")) {
        return (
          c.includes("ivory") ||
          c.includes("nude") ||
          c.includes("cream") ||
          c.includes("white") ||
          c.includes("champagne") ||
          c.includes("pearl") ||
          c.includes("sand") ||
          c.includes("beige")
        );
      }
      if (s.includes("brown") || s.includes("tan")) {
        return (
          c.includes("brown") ||
          c.includes("tan") ||
          c.includes("chocolate") ||
          c.includes("caramel") ||
          c.includes("fawn") ||
          c.includes("leopard") ||
          c.includes("cognac") ||
          c.includes("camel")
        );
      }
      if (s.includes("blush") || s.includes("rose")) {
        return c.includes("blush") || c.includes("rose") || c.includes("pink");
      }
      if (s.includes("silver") || s.includes("chrome")) {
        return c.includes("silver") || c.includes("chrome") || c.includes("gunmetal") || c.includes("crystal");
      }
      if (s.includes("gold")) {
        return c.includes("gold") || c.includes("monarch") || c.includes("amber");
      }
      return false;
    };

    const results: Array<{
      product: CommerceProduct;
      displayImage: string;
      displayColor: string;
    }> = [];

    for (const p of products) {
      if (p.status === "Draft") continue;

      const pCat = (p.category || "Heel").toLowerCase();
      const pCol = (p.collection || p.edition || "").toLowerCase();
      const priceNum = parsePriceNumber(p.price);

      // 1. Strict Category Filter across all collections
      if (hasHeel && pCat !== "heel") continue;
      if (hasFlat && pCat !== "flat") continue;
      if (hasBoot && pCat !== "boot") continue;
      if (hasMule && pCat !== "mule") continue;

      // 2. Strict Collection Filter
      if (hasMuse && !pCol.includes("muse")) continue;
      if (hasAura && !pCol.includes("aura")) continue;
      if (hasBloom && !pCol.includes("bloom")) continue;
      if (hasNoire && !pCol.includes("noire") && !pCol.includes("noir")) continue;

      // 3. Price Range Filter across all collections
      if (maxPrice < 40000 && priceNum > maxPrice) continue;

      // 4. Color Matching & Variant Display Resolution
      const heroColor = (p.heroColour || p.color || p.tone || "").trim();
      let displayImage = p.image;
      let displayColor = heroColor || "Standard";

      if (activeColor !== "All") {
        if (matchesColorSwatch(heroColor, activeColor)) {
          displayImage = p.image;
          displayColor = heroColor;
        } else {
          const matchingVariant = p.variants?.find((v) =>
            matchesColorSwatch(v.heroColour || v.colourName || "", activeColor)
          );
          if (matchingVariant && matchingVariant.image) {
            displayImage = matchingVariant.image;
            displayColor = matchingVariant.heroColour || matchingVariant.colourName || activeColor;
          } else {
            // Strictly exclude non-matching colors
            continue;
          }
        }
      }

      // 5. Remaining Search Keywords Matching
      if (nonFilterWords.length > 0) {
        const title = (p.title || (p as any).name || "").toLowerCase();
        const pId = (p.id || "").toLowerCase();
        const pDesignId = (p.designId || "").toLowerCase();
        const pMat = (p.material || "").toLowerCase();
        const pSil = (p.silhouette || "").toLowerCase();
        const searchable = `${title} ${pId} ${pDesignId} ${pMat} ${pSil}`;

        const matchesAll = nonFilterWords.every((w) => {
          const rootS = w.replace(/s$/, "");
          const rootES = w.replace(/es$/, "");
          return (
            searchable.includes(w) ||
            searchable.includes(rootS) ||
            searchable.includes(rootES)
          );
        });
        if (!matchesAll) continue;
      }

      results.push({
        product: p,
        displayImage,
        displayColor,
      });
    }

    return results;
  }, [products, searchQuery, maxPrice, colorFilter]);

  return (
    <>
      {/* Top Announcement Bar */}
      <div className="announcement">
        Complimentary shipping across India on orders above Rs. 9,999
      </div>

      {/* Main Site Header */}
      <header className="site-header">
        {/* Mobile Hamburger Menu Toggle Button */}
        <button
          type="button"
          className="mobile-nav-toggle"
          onClick={() => setNavOpen((prev) => !prev)}
          aria-label={navOpen ? "Close menu" : "Open navigation menu"}
          aria-expanded={navOpen}
        >
          {navOpen ? (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          ) : (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="4" y1="6" x2="20" y2="6" />
              <line x1="4" y1="12" x2="20" y2="12" />
              <line x1="4" y1="18" x2="20" y2="18" />
            </svg>
          )}
        </button>

        <a className="brand-wordmark" href="#/" aria-label="Follicia home">
          FOLLICIA
        </a>

        <nav className={`nav ${navOpen ? "open" : ""}`} aria-label="Main navigation">
          {/* Mobile Drawer Top Bar */}
          <div className="md:hidden flex items-center justify-between pb-3 mb-1 border-b border-[#4b261a15]">
            <div className="flex items-center gap-2">
              <span className="text-xs font-serif font-bold tracking-widest text-[#24130d] uppercase">FOLLICIA Shop</span>
              <span className="text-[9px] uppercase px-2 py-0.5 rounded-full bg-[var(--gold)]/15 text-[#a87648] font-bold">Menu</span>
            </div>
            <button
              type="button"
              onClick={() => setNavOpen(false)}
              className="p-1 rounded-full text-[#4b261a60] hover:text-[#24130d] hover:bg-[#4b261a10] cursor-pointer"
              aria-label="Close navigation menu"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          <a
            href="#/"
            onClick={() => {
              setNavOpen(false);
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
          >
            Home
          </a>
          <div className="nav-dropdown-wrap w-full md:w-auto" ref={collectionsRef}>
            <div className="flex items-center justify-between w-full md:w-auto">
              <a
                href="#/collections"
                onClick={() => {
                  setCollectionsOpen(false);
                  setNavOpen(false);
                }}
                className="nav-collections-link"
              >
                Collections
              </a>
              <button
                type="button"
                className={`nav-dropdown-chevron-btn ${collectionsOpen ? "active" : ""}`}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setCollectionsOpen((prev) => !prev);
                }}
                aria-expanded={collectionsOpen}
                aria-haspopup="true"
                aria-label="Toggle collections menu"
              >
                <svg
                  className={`nav-dropdown-chevron ${collectionsOpen ? "open" : ""}`}
                  width="10"
                  height="10"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </button>
            </div>

            {collectionsOpen && (
              <div className="nav-dropdown-menu" role="menu">
                {FOLLICIA_COLLECTIONS.map((col) => (
                  <button
                    key={col.name}
                    type="button"
                    className="nav-dropdown-simple-item"
                    role="menuitem"
                    onClick={() => {
                      setCollectionsOpen(false);
                      setNavOpen(false);
                      window.location.hash = `#/collection/${col.name.toLowerCase()}`;
                    }}
                  >
                    {col.name}
                  </button>
                ))}
              </div>
            )}
          </div>
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
            href="#/our-story"
            onClick={() => {
              setNavOpen(false);
              window.location.hash = "#/our-story";
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
          >
            Our Story
          </a>
          <a
            href="#/new-arrivals"
            onClick={() => {
              setNavOpen(false);
              window.location.hash = "#/new-arrivals";
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            className="md:hidden"
          >
            New Arrivals
          </a>
          <a
            href="#/contact"
            onClick={() => {
              setNavOpen(false);
              window.location.hash = "#/contact";
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            className="md:hidden"
          >
            Contact Us
          </a>

          {/* Quick Categories for Mobile */}
          <div className="md:hidden pt-2 border-t border-[#4b261a10]">
            <p className="text-[9.5px] uppercase font-bold tracking-widest text-[#4b261a65] mb-2 px-1">Footwear Categories</p>
            <div className="grid grid-cols-4 gap-1 text-center">
              {[
                { label: "Flats", hash: "#/shop/flats" },
                { label: "Heels", hash: "#/shop/heels" },
                { label: "Boots", hash: "#/shop/boots" },
                { label: "Mules", hash: "#/shop/mules" },
              ].map((cat) => (
                <a
                  key={cat.label}
                  href={cat.hash}
                  onClick={() => setNavOpen(false)}
                  className="py-1.5 px-1 rounded-lg bg-[#FAF8F5] hover:bg-[#24130d] hover:text-white text-[10.5px] font-semibold text-[#24130d] transition-colors border border-[#4b261a10]"
                  style={{ borderBottom: "none", textAlign: "center", display: "block" }}
                >
                  {cat.label}
                </a>
              ))}
            </div>
          </div>

          {/* Mobile Quick Action Buttons Grid */}
          <div className="md:hidden mt-3 pt-3 border-t border-[#4b261a12] grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                setNavOpen(false);
                setCartOpen(true);
              }}
              className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-white border border-[#4b261a18] text-xs font-semibold text-[#24130d] shadow-2xs hover:border-[var(--gold)] cursor-pointer"
            >
              <span>🛍️ Bag ({count})</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setNavOpen(false);
                window.location.hash = "#/account/my-wishlist";
              }}
              className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-white border border-[#4b261a18] text-xs font-semibold text-[#24130d] shadow-2xs hover:border-[var(--gold)] cursor-pointer"
            >
              <span>❤️ Wishlist ({wishlist.length})</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setNavOpen(false);
                if (userName) {
                  window.location.hash = "#/account/my-orders";
                } else if (onLogin) {
                  onLogin();
                } else {
                  window.location.hash = "#/login";
                }
              }}
              className="col-span-2 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-[#24130d] text-white text-xs font-semibold uppercase tracking-wider shadow-sm hover:bg-[#351c13] cursor-pointer"
            >
              <span>👤 {userName ? `Account (${userName})` : "Sign In / Join"}</span>
            </button>
          </div>
        </nav>

        {navOpen && (
          <div
            className="mobile-nav-backdrop"
            onClick={() => setNavOpen(false)}
            aria-hidden="true"
          />
        )}

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
                className="nav-login-btn inline-flex items-center gap-1.5 font-medium tracking-[0.10em] uppercase text-[#351c13] hover:text-[var(--gold)] cursor-pointer transition-colors px-2.5 sm:px-3 py-1 rounded-full border border-[#351c13]/25 hover:border-[var(--gold)]"
                title="Log In"
                aria-label="Log In"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                  <circle cx="12" cy="12" r="9.5" />
                  <circle cx="12" cy="9.5" r="3.2" />
                  <path d="M6.3 18.2a6 6 0 0 1 11.4 0" />
                </svg>
                <span className="hidden sm:inline text-[0.72rem] tracking-[0.10em] font-medium">Login</span>
              </button>
            )}

            {/* Profile Dropdown if logged in */}
            {profileOpen && userName && (
              <div
                className="account-dropdown-menu absolute right-0 top-12 z-[70] w-56 rounded-xl border border-[#4b261a26] bg-[#fffdf8] p-4 text-xs shadow-2xl flex flex-col gap-1"
                style={{ color: "#351c13" }}
              >
                <p className="mb-2 text-[10px] uppercase tracking-wider text-[#a87648]">
                  Signed in as <strong className="block text-xs text-[#351c13]">{userName}</strong>
                </p>
                <div className="my-2 border-t border-[#4b261a15]" />
                {userName.toLowerCase().includes("admin") ? (
                  <>
                    <a
                      href="#/admin"
                      onClick={() => setProfileOpen(false)}
                      className="account-dropdown-item font-bold text-[#a87648] hover:underline"
                      style={{ display: "block", width: "100%", textAlign: "left", padding: "6px 4px" }}
                    >
                      ⚡ ADMIN CONTROL PANEL
                    </a>
                    <a
                      href="#/"
                      onClick={() => setProfileOpen(false)}
                      className="account-dropdown-item hover:text-[#a87648] transition-colors"
                      style={{ display: "block", width: "100%", textAlign: "left", padding: "6px 4px" }}
                    >
                      STOREFRONT
                    </a>
                  </>
                ) : (
                  <>
                    <a
                      href="#/account/my-orders"
                      onClick={() => setProfileOpen(false)}
                      className="account-dropdown-item hover:text-[#a87648] transition-colors"
                      style={{ display: "block", width: "100%", textAlign: "left", padding: "6px 4px" }}
                    >
                      MY ORDER
                    </a>
                    <a
                      href="#/account/my-wishlist"
                      onClick={() => setProfileOpen(false)}
                      className="account-dropdown-item hover:text-[#a87648] transition-colors"
                      style={{ display: "block", width: "100%", textAlign: "left", padding: "6px 4px" }}
                    >
                      MY WISHLIST
                    </a>
                    <a
                      href="#/account/my-addresses"
                      onClick={() => setProfileOpen(false)}
                      className="account-dropdown-item hover:text-[#a87648] transition-colors"
                      style={{ display: "block", width: "100%", textAlign: "left", padding: "6px 4px" }}
                    >
                      MY ADDRESS
                    </a>
                    <a
                      href="#/account/my-wallet"
                      onClick={() => setProfileOpen(false)}
                      className="account-dropdown-item hover:text-[#a87648] transition-colors"
                      style={{ display: "block", width: "100%", textAlign: "left", padding: "6px 4px" }}
                    >
                      MY WALLET
                    </a>
                    <a
                      href="#/account/my-account"
                      onClick={() => setProfileOpen(false)}
                      className="account-dropdown-item hover:text-[#a87648] transition-colors"
                      style={{ display: "block", width: "100%", textAlign: "left", padding: "6px 4px" }}
                    >
                      ACCOUNT SETTINGS
                    </a>
                  </>
                )}
                <div className="my-2 border-t border-[#4b261a15]" />
                <button
                  type="button"
                  onClick={() => {
                    setProfileOpen(false);
                    onLogout?.();
                  }}
                  className="account-dropdown-logout w-full text-center py-2 text-red-600 hover:text-red-800 transition-colors cursor-pointer"
                  style={{ display: "block", width: "100%", textAlign: "center" }}
                >
                  LOG OUT
                </button>
              </div>
            )}
          </div>

          {/* Wishlist */}
          <a
            href="#/account/my-wishlist"
            className="wishlist-btn relative inline-flex items-center justify-center cursor-pointer text-[#351c13] hover:text-[var(--gold)] transition-colors"
            aria-label="Wishlist"
            title="My Wishlist"
          >
            <svg
              width="21"
              height="21"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="transition-transform hover:scale-110"
            >
              <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
            </svg>
            {wishlist.length > 0 && (
              <small>{wishlist.length}</small>
            )}
          </a>

          {/* Shopping Bag Drawer Button */}
          <button
            type="button"
            aria-label="Shopping bag"
            className="bag-btn relative cursor-pointer"
            onClick={() => setCartOpen(true)}
          >
            Bag
            {count > 0 && (
              <small>{count}</small>
            )}
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

            {/* Price Range & Color Filters Bar */}
            <div className="border-b border-[#4b261a15] bg-[#fffdf8] px-4 sm:px-6 py-2.5 sm:py-3.5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4">
              {/* Price Range Slider */}
              <div className="flex items-center justify-between sm:justify-start gap-2.5 sm:gap-3">
                <span className="text-[10px] uppercase font-bold tracking-widest text-[#4b261a80] shrink-0">PRICE:</span>
                <span className="text-xs font-bold text-[#24130d] shrink-0">
                  {maxPrice >= 40000 ? "All Prices" : `Up to Rs. ${maxPrice.toLocaleString("en-IN")}`}
                </span>
                <input
                  type="range"
                  min="3000"
                  max="40000"
                  step="500"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(Number(e.target.value))}
                  className="w-28 sm:w-36 accent-[#4b261a] cursor-pointer h-1.5 bg-[#4b261a15] rounded-lg ml-auto sm:ml-0"
                />
              </div>

              {/* Color Swatches */}
              <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-1 sm:pb-0 sm:flex-wrap no-scrollbar">
                <span className="text-[10px] uppercase font-bold tracking-widest text-[#4b261a80] shrink-0">COLOR:</span>
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
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold border transition-all cursor-pointer shrink-0 ${
                      colorFilter === s.name
                        ? "border-[#24130d] bg-[#24130d] text-[#fffdf8] shadow-sm"
                        : "border-[#4b261a20] bg-white text-[#24130d] hover:border-[#24130d]"
                    }`}
                  >
                    <span className="h-2.5 w-2.5 rounded-full border border-black/20 shrink-0" style={{ background: s.hex }} />
                    <span className="whitespace-nowrap">{s.name}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="search-results">
              {searchResults.length === 0 ? (
                <div className="search-empty">
                  {searchQuery || maxPrice < 40000 || colorFilter !== "All"
                    ? "No products found matching your current filters."
                    : "Type to search through all Follicia designs..."}
                </div>
              ) : (
                <div className="search-results-grid">
                  {searchResults.map(({ product: p, displayImage, displayColor }) => (
                    <a
                      key={`${p.id}-${displayColor}`}
                      href={`#/shop/${p.id.toLowerCase()}`}
                      className="search-result-item"
                      onClick={() => {
                        setSearchOpen(false);
                        setSearchQuery("");
                      }}
                    >
                      <img src={displayImage} alt={p.title || (p as any).name} />
                      <div className="search-result-info">
                        <h4>{p.title || (p as any).name}</h4>
                        <p>
                          {p.collection || p.edition} · {displayColor} · {p.category}
                        </p>
                        <strong className="whitespace-nowrap">{typeof p.price === "number" ? formatINR.format(p.price) : String(p.price).replace(/^Rs\.\s*/, "Rs.\u00A0")}</strong>
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
