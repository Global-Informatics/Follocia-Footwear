import { useState, useEffect, useMemo, useRef, type FormEvent } from "react";
import type { AuthSession } from "@/components/auth/AuthGateway";
import {
  FOLLICIA_COLLECTIONS,
  FOLLICIA_PRODUCTS,
  formatINR,
  getProductVariantImage,
  type FolliciaProduct,
} from "@/data/folliciaCatalogue";
import { getProducts, COMMERCE_EVENT, type CommerceProduct } from "@/lib/commerceStore";
import { ProductCard } from "@/components/pages/ShopPages";
import logo from "@/assets/follocia-logo-new.png";
import "./follicia.css";

interface BagItem {
  product: FolliciaProduct;
  size: number;
  color: string;
  quantity: number;
}

const COLLECTION_FILTERS = ["All", "Aura", "Bloom", "Muse", "Noire"] as const;
const STYLE_FILTERS = ["All styles", "Flat", "Heel", "Mule", "Boot"] as const;
const SIZES = [38, 39, 40, 41] as const;

function getColorHex(colorName: string): string {
  const c = colorName.toLowerCase();
  if (c.includes("black")) return "#171310";
  if (c.includes("brown") || c.includes("chocolate")) return "#6c3d2c";
  if (c.includes("burgundy")) return "#711f2c";
  if (c.includes("olive")) return "#77704c";
  if (c.includes("blush") || c.includes("rose")) return "#d8a9a2";
  if (c.includes("silver") || c.includes("chrome")) return "#b8b8b5";
  if (c.includes("gold") || c.includes("monarch") || c.includes("orange")) return "#d9a15c";
  return "#f2e9d9"; // default ivory/nude/champagne
}

export function FolliciaHomePage({
  session,
  onLogout,
  onLogin,
}: {
  session?: AuthSession | null;
  onLogout?: () => void;
  onLogin?: () => void;
} = {}) {
  const [navOpen, setNavOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const [selectedCollection, setSelectedCollection] = useState<string>("All");
  const [selectedStyle, setSelectedStyle] = useState<string>("All styles");
  const [motionIndex, setMotionIndex] = useState(0);
  const [motionPaused, setMotionPaused] = useState(false);
  const [motionHovered, setMotionHovered] = useState(false);
  const [wishlist, setWishlist] = useState<string[]>(() => {
    try {
      if (typeof window === "undefined") return [];
      const saved = localStorage.getItem("follicia-wishlist");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [bag, setBag] = useState<BagItem[]>(() => {
    try {
      if (typeof window === "undefined") return [];
      const saved = localStorage.getItem("follicia-bag");
      const parsed = saved ? (JSON.parse(saved) as BagItem[]) : [];
      const cleaned = parsed.filter(
        (b) => b?.product?.id && !b.product.id.toLowerCase().startsWith("atelier-") && !b.product.id.toLowerCase().startsWith("prod-")
      );
      if (cleaned.length !== parsed.length) {
        localStorage.setItem("follicia-bag", JSON.stringify(cleaned));
      }
      return cleaned;
    } catch {
      return [];
    }
  });
  const [bagOpen, setBagOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [isPaying, setIsPaying] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [cursorOffset, setCursorOffset] = useState({ x: 0, y: 0 });

  // Search state & dynamic backend store integration
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [storeProducts, setStoreProducts] = useState<CommerceProduct[]>(() => getProducts());

  useEffect(() => {
    const sync = () => setStoreProducts(getProducts());
    window.addEventListener(COMMERCE_EVENT, sync);
    return () => window.removeEventListener(COMMERCE_EVENT, sync);
  }, []);

  // Save bag & wishlist to localStorage
  useEffect(() => {
    try {
      localStorage.setItem("follicia-bag", JSON.stringify(bag));
    } catch {}
  }, [bag]);

  useEffect(() => {
    try {
      localStorage.setItem("follicia-wishlist", JSON.stringify(wishlist));
    } catch {}
  }, [wishlist]);

  // Motion auto-rotation (every 5.6s)
  useEffect(() => {
    if (motionPaused || motionHovered) return;
    const interval = window.setInterval(() => {
      setMotionIndex((prev) => (prev + 1) % FOLLICIA_COLLECTIONS.length);
    }, 5600);
    return () => window.clearInterval(interval);
  }, [motionPaused, motionHovered]);

  // Escape key for modals
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setBagOpen(false);
        setCheckoutOpen(false);
        setSearchOpen(false);
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

  // Auto-scroll to #our-story section if navigated with hash
  useEffect(() => {
    if (typeof window !== "undefined" && window.location.hash.includes("our-story")) {
      const timer = setTimeout(() => {
        document.getElementById("our-story")?.scrollIntoView({ behavior: "smooth" });
      }, 150);
      return () => clearTimeout(timer);
    }
  }, []);

  // Prevent background body scroll when any modal or drawer is open
  useEffect(() => {
    if (bagOpen || checkoutOpen || searchOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [bagOpen, checkoutOpen, searchOpen]);

  const [searchMaxPrice, setSearchMaxPrice] = useState<number>(5000);
  const [searchColorFilter, setSearchColorFilter] = useState<string>("All");

  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return FOLLICIA_PRODUCTS.filter((p) => {
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

      if (searchMaxPrice < 5000 && p.price > searchMaxPrice) return false;

      if (searchColorFilter !== "All") {
        const col = `${p.color || ""} ${p.colors || ""}`.toLowerCase();
        const target = searchColorFilter.toLowerCase();
        if (target.includes("black") && !col.includes("black") && !col.includes("noir")) return false;
        if (target.includes("ivory") && !col.includes("ivory") && !col.includes("nude") && !col.includes("cream") && !col.includes("beige") && !col.includes("white")) return false;
        if (target.includes("brown") && !col.includes("brown") && !col.includes("tan") && !col.includes("chocolate") && !col.includes("fawn") && !col.includes("leopard") && !col.includes("caramel")) return false;
        if (target.includes("blush") && !col.includes("blush") && !col.includes("rose")) return false;
        if (target.includes("silver") && !col.includes("silver") && !col.includes("chrome") && !col.includes("gunmetal")) return false;
        if (target.includes("gold") && !col.includes("gold") && !col.includes("monarch") && !col.includes("orange")) return false;
      }

      return true;
    });
  }, [searchQuery, searchMaxPrice, searchColorFilter]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    window.setTimeout(() => setToastMessage(""), 2500);
  };

  const handleSelectCollectionAndScroll = (collectionName: string) => {
    setSelectedCollection(collectionName);
    setSelectedStyle("All styles");
    const el = document.querySelector("#shop");
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  const handleToggleWishlist = (productId: string, productName: string) => {
    setWishlist((prev) => {
      const exists = prev.includes(productId);
      const next = exists ? prev.filter((id) => id !== productId) : [...prev, productId];
      showToast(exists ? `Removed ${productName} from wishlist` : `Saved ${productName} to wishlist`);
      return next;
    });
  };

  const handleUpdateBagQty = (target: BagItem, change: number) => {
    setBag((prev) =>
      prev.flatMap((item) => {
        if (
          item.product.id === target.product.id &&
          item.size === target.size &&
          item.color === target.color
        ) {
          const newQty = item.quantity + change;
          return newQty > 0 ? [{ ...item, quantity: newQty }] : [];
        }
        return [item];
      })
    );
  };

  const handleNewsletterSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const email = new FormData(form).get("email");
    try {
      localStorage.setItem("follicia-newsletter-email", String(email));
    } catch {}
    form.reset();
    showToast("You’re on the Follicia list");
  };

  const handleCheckoutSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsPaying(true);
    setTimeout(() => {
      setIsPaying(false);
      setBag([]);
      setCheckoutOpen(false);
      setBagOpen(false);
      showToast("Order confirmed · Thank you for choosing Follicia");
    }, 1200);
  };

  const filteredProducts = useMemo(() => {
    return storeProducts.filter((product) => {
      const matchCollection =
        selectedCollection === "All" ||
        (product.collection && product.collection.toLowerCase() === selectedCollection.toLowerCase()) ||
        (product.edition && product.edition.toLowerCase().includes(selectedCollection.toLowerCase()));
      const matchStyle =
        selectedStyle === "All styles" ||
        (product.category && product.category.toLowerCase() === selectedStyle.toLowerCase()) ||
        (product.silhouette && product.silhouette.toLowerCase().includes(selectedStyle.toLowerCase()));
      return matchCollection && matchStyle;
    });
  }, [storeProducts, selectedCollection, selectedStyle]);

  const totalBagCount = bag.reduce((sum, item) => sum + item.quantity, 0);
  const totalBagAmount = bag.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const activeMotionCollection = FOLLICIA_COLLECTIONS[motionIndex];

  return (
    <div className="follicia-home">
      {/* Announcement Bar */}
      <div className="announcement">
        Complimentary shipping across India on orders above ₹2,999
      </div>

      {/* Site Header */}
      <header className="site-header">
        <button
          className="menu-button"
          aria-label="Toggle navigation"
          onClick={() => setNavOpen((prev) => !prev)}
        >
          Menu
        </button>

        <a className="brand-wordmark" href="#top" aria-label="Follicia home">
          FOLLICIA
        </a>

        <nav className={`nav ${navOpen ? "open" : ""}`} aria-label="Main navigation">
          <a
            href="#top"
            onClick={(e) => {
              e.preventDefault();
              setNavOpen(false);
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
          >
            Home
          </a>
          <a
            href="#collections"
            onClick={(e) => {
              e.preventDefault();
              setNavOpen(false);
              document.getElementById("collections")?.scrollIntoView({ behavior: "smooth" });
            }}
          >
            Collections
          </a>
          <a
            href="#shop"
            onClick={(e) => {
              e.preventDefault();
              setNavOpen(false);
              document.getElementById("shop")?.scrollIntoView({ behavior: "smooth" });
            }}
          >
            Shop
          </a>
          <a
            href="#our-story"
            onClick={(e) => {
              e.preventDefault();
              setNavOpen(false);
              document.getElementById("our-story")?.scrollIntoView({ behavior: "smooth" });
            }}
          >
            Our Story
          </a>
          <button
            type="button"
            onClick={() => {
              setNavOpen(false);
              if (session?.user) {
                setProfileOpen((prev) => !prev);
              } else if (onLogin) {
                onLogin();
              }
            }}
            className="md:hidden text-left py-2 font-medium tracking-wider uppercase text-[0.68rem] text-[var(--gold)]"
            style={{ background: "none", border: "none", cursor: "pointer" }}
          >
            {session?.user ? `Account (${session.user.name})` : "Account / Sign in"}
          </button>
        </nav>

        <div className="actions">
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

          {/* User Account / Profile */}
          <div ref={profileRef} className="relative inline-flex items-center">
            {session?.user ? (
              <button
                type="button"
                onClick={() => setProfileOpen((prev) => !prev)}
                className="action-icon flex items-center gap-1.5 cursor-pointer"
                title={`Signed in as ${session.user.name}`}
                aria-label="User Account"
              >
                <span className="grid h-7 w-7 place-items-center rounded-full bg-[#4b261a] text-xs font-semibold text-[#fffaf0]">
                  {session.user.name.charAt(0).toUpperCase()}
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
            {profileOpen && session?.user && (
              <div
                className="absolute right-0 top-12 z-[70] w-56 rounded-xl border border-[#4b261a26] bg-[#fffdf8] p-4 text-xs shadow-2xl"
                style={{ color: "#351c13" }}
              >
                <p className="mb-2 text-[10px] uppercase tracking-wider text-[#a87648]">
                  Signed in as <strong className="block text-xs text-[#351c13]">{session.user.name}</strong>
                  <span className="text-[10px] text-[#4b261a80]">{session.user.tier || session.user.role}</span>
                </p>
                <div className="my-2 border-t border-[#4b261a15]" />
                {session.user.role === "admin" ? (
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

          <button
            type="button"
            aria-label="Wishlist"
            className="wishlist-btn"
            onClick={() => {
              const el = document.querySelector("#shop");
              if (el) el.scrollIntoView({ behavior: "smooth" });
            }}
          >
            ♡{wishlist.length > 0 && <small>{wishlist.length}</small>}
          </button>

          <button
            type="button"
            aria-label="Shopping bag"
            className="bag-btn"
            onClick={() => setBagOpen(true)}
          >
            Bag{totalBagCount > 0 && <small>{totalBagCount}</small>}
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="hero" id="top">
        <img
          className="hero-background"
          src="/campaigns/aura-rise-hero.webp"
          alt="Model shown from the waist down walking in black Aura Rise heels"
        />
        <div className="hero-shade"></div>
        <div className="hero-copy">
          <p className="eyebrow">The Follicia Edit</p>
          <h1>FOLLICIA</h1>
          <p className="hero-tagline">Every Step, A Statement.</p>
          <p className="hero-description">
            Four distinct collections. Sculptural comfort, expressive detail and silhouettes made to move beautifully.
          </p>
          <div className="button-row">
            <a
              className="button dark"
              href="#shop"
              onClick={(e) => {
                e.preventDefault();
                document.getElementById("shop")?.scrollIntoView({ behavior: "smooth" });
              }}
            >
              Shop all designs
            </a>
            <a className="text-link" href="#motion">
              See Follicia in motion <span>→</span>
            </a>
          </div>
        </div>
      </section>

      {/* Motion Section */}
      <section
        className="motion-section"
        id="motion"
        onMouseMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          setCursorOffset({
            x: ((e.clientX - rect.left) / rect.width - 0.5) * 2,
            y: ((e.clientY - rect.top) / rect.height - 0.5) * 2,
          });
        }}
        onMouseEnter={() => setMotionHovered(true)}
        onMouseLeave={() => {
          setMotionHovered(false);
          setCursorOffset({ x: 0, y: 0 });
        }}
      >
        <div className="melt melt-one"></div>
        <div className="melt melt-two"></div>
        <div className="motion-kicker">
          <span>Move your cursor</span>
          <strong>Designed in motion</strong>
        </div>

        <div
          className="motion-frame"
          style={
            {
              "--cursor-x": cursorOffset.x,
              "--cursor-y": cursorOffset.y,
            } as React.CSSProperties
          }
        >
          <img
            src={activeMotionCollection.image}
            alt={`${activeMotionCollection.name} collection: a model-worn flat, heel and mule`}
          />
          <div className="motion-shade"></div>
          <div className="motion-copy">
            <p className="eyebrow">The Pinterest edit · Flat / Heel / Mule</p>
            <h2>{activeMotionCollection.name}</h2>
            <p>{activeMotionCollection.line}</p>
            <div className="motion-styles">
              {activeMotionCollection.featured.map((style) => (
                <span key={style}>{style}</span>
              ))}
            </div>
            <button
              className="button light"
              onClick={() => handleSelectCollectionAndScroll(activeMotionCollection.name)}
            >
              Explore {activeMotionCollection.name}
            </button>
          </div>
          <span className="cursor-note">Slide with cursor ↗</span>
        </div>

        <div className="motion-controls">
          {FOLLICIA_COLLECTIONS.map((col, idx) => (
            <button
              key={col.name}
              className={motionIndex === idx ? "active" : ""}
              onClick={() => setMotionIndex(idx)}
            >
              {col.name}
            </button>
          ))}
          <button
            className="pause"
            aria-label={motionPaused ? "Resume campaign" : "Pause campaign"}
            onClick={() => setMotionPaused((p) => !p)}
          >
            {motionPaused ? "Play" : "Pause"}
          </button>
        </div>
      </section>

      {/* Collections Intro & Grid */}
      <section className="intro" id="collections">
        <p className="eyebrow">The collections</p>
        <h2>
          Four moods.<br />
          <em>One signature.</em>
        </h2>
        <p>
          Every collection has its own visual language, material story and pace—united by Follicia's expressive femininity.
        </p>
      </section>

      <section className="collection-grid">
        {FOLLICIA_COLLECTIONS.map((col) => (
          <article key={col.name} className={`collection-card collection-${col.name.toLowerCase()}`}>
            <img src={col.image} alt={`${col.name} campaign`} />
            <div className="collection-overlay"></div>
            <div className="collection-content">
              <h3>{col.name}</h3>
              <p>{col.line}</p>
              <button onClick={() => handleSelectCollectionAndScroll(col.name)}>
                View collection <span>→</span>
              </button>
            </div>
          </article>
        ))}
      </section>

      {/* Shop Section */}
      <section className="shop" id="shop">
        <div className="section-head">
          <div>
            <p className="eyebrow">The complete catalogue</p>
            <h2>{selectedCollection === "All" ? "All designs" : selectedCollection}</h2>
          </div>
          <p>EU 38–41</p>
        </div>

        <div className="filter-group">
          <div className="filters" aria-label="Collection filters">
            {COLLECTION_FILTERS.map((filter) => (
              <button
                key={filter}
                className={selectedCollection === filter ? "active" : ""}
                onClick={() => setSelectedCollection(filter)}
              >
                {filter}
              </button>
            ))}
          </div>

          <div className="filters category-filters" aria-label="Style filters">
            {STYLE_FILTERS.map((style) => (
              <button
                key={style}
                className={selectedStyle === style ? "active" : ""}
                onClick={() => setSelectedStyle(style)}
              >
                {style}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {filteredProducts.map((product, idx) => (
            <ProductCard
              key={product.id}
              product={product}
              index={idx}
              onSelect={() => {
                window.location.hash = `#/shop/${product.id}`;
              }}
            />
          ))}
        </div>
      </section>

      {/* Story Section */}
      <section className="story" id="our-story">
        <div className="story-image">
          <img
            src="/campaigns/aura-motion.webp"
            alt="Follicia Aura footwear worn in motion"
          />
        </div>
        <div className="story-copy">
          <p className="eyebrow">Designed around movement</p>
          <h2>Beauty begins with how it feels.</h2>
          <p>
            From soft flats to sculptural heels and confident mules, each Follicia design balances a distinct point of view with thoughtful proportions for real movement.
          </p>
          <a
            className="button outline"
            href="#/shop"
          >
            Discover the collection
          </a>
        </div>
      </section>

      {/* Promise Section */}
      <section className="promise">
        <div>
          <h3>Distinct worlds</h3>
          <p>Aura, Bloom, Muse and Noire—each with a clear design identity.</p>
        </div>
        <div>
          <h3>Comfort in every curve</h3>
          <p>Thoughtful silhouettes and wearable proportions across EU sizes 38–41.</p>
        </div>
        <div>
          <h3>Made to be remembered</h3>
          <p>Original details, expressive materials and a quiet Follicia signature.</p>
        </div>
      </section>

      {/* Newsletter Section */}
      <section className="newsletter">
        <p className="eyebrow">The Follicia Edit</p>
        <h2>Step into our world.</h2>
        <p>New arrivals, private previews and stories from our atelier.</p>
        <form onSubmit={handleNewsletterSubmit}>
          <input
            aria-label="Email address"
            name="email"
            type="email"
            placeholder="Your email address"
            required
          />
          <button type="submit">Join us →</button>
        </form>
      </section>

      {/* Footer */}
      <footer>
        <div className="footer-brand">
          <a className="footer-logo-link inline-flex flex-col items-start transition-opacity hover:opacity-90" href="#top" aria-label="Follicia Home">
            <img
              src={logo}
              alt="FOLLICIA - Every Step, A Statement."
              className="h-28 w-auto max-w-[240px] object-contain -ml-2"
            />
          </a>
        </div>

        <div>
          <h4>Collections</h4>
          {FOLLICIA_COLLECTIONS.map((c) => (
            <button
              key={c.name}
              onClick={() => handleSelectCollectionAndScroll(c.name)}
            >
              {c.name}
            </button>
          ))}
        </div>

        <div>
          <h4>Shop</h4>
          <a href="#shop" onClick={() => { setSelectedCollection("All"); setSelectedStyle("All styles"); }}>All designs</a>
          <a href="#shop" onClick={() => { setSelectedCollection("All"); setSelectedStyle("Flat"); }}>Flats</a>
          <a href="#shop" onClick={() => { setSelectedCollection("All"); setSelectedStyle("Heel"); }}>Heels</a>
          <a href="#shop" onClick={() => { setSelectedCollection("All"); setSelectedStyle("Mule"); }}>Mules</a>
          <a href="#shop" onClick={() => { setSelectedCollection("All"); setSelectedStyle("Boot"); }}>Boots</a>
        </div>

        <div>
          <h4>Help</h4>
          <a href="#our-story">Contact</a>
          <a href="#our-story">Shipping &amp; Returns</a>
          <a href="#shop">Size guide</a>
          <a href="#our-story">FAQs</a>
        </div>

        <small>© 2026 Follicia. All rights reserved.</small>
      </footer>

      {/* Shopping Bag Drawer */}
      {bagOpen && (
        <div
          className="bag-backdrop"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setBagOpen(false);
          }}
        >
          <aside
            className="bag-drawer"
            role="dialog"
            aria-modal="true"
            aria-label="Shopping bag"
          >
            <div className="bag-head">
              <div>
                <p className="eyebrow">Your selection</p>
                <h2>Shopping bag</h2>
              </div>
              <button aria-label="Close bag" onClick={() => setBagOpen(false)}>
                ×
              </button>
            </div>

            {bag.length === 0 ? (
              <div className="empty-bag">
                <p>Your bag is waiting for a statement pair.</p>
                <button
                  className="button dark"
                  onClick={() => {
                    setBagOpen(false);
                    const el = document.querySelector("#shop");
                    if (el) el.scrollIntoView({ behavior: "smooth" });
                  }}
                >
                  Explore designs
                </button>
              </div>
            ) : (
              <>
                <div className="bag-items">
                  {bag.map((item) => (
                    <article key={`${item.product.id}-${item.size}-${item.color}`}>
                      <img
                        src={getProductVariantImage(item.product, item.color)}
                        alt={`${item.product.name} in ${item.color}`}
                      />
                      <div>
                        <h3>{item.product.name}</h3>
                        <p>
                          {item.color} · EU {item.size}
                        </p>
                        <div className="quantity">
                          <button onClick={() => handleUpdateBagQty(item, -1)}>
                            −
                          </button>
                          <span>{item.quantity}</span>
                          <button onClick={() => handleUpdateBagQty(item, 1)}>
                            +
                          </button>
                        </div>
                      </div>
                      <strong>
                        {formatINR.format(item.product.price * item.quantity)}
                      </strong>
                    </article>
                  ))}
                </div>

                <div className="bag-total">
                  <span>Subtotal</span>
                  <strong>{formatINR.format(totalBagAmount)}</strong>
                </div>

                <p className="checkout-note">
                  Secure test checkout · No real money will be charged.
                </p>

                <button
                  className="button dark checkout-button"
                  onClick={() => setCheckoutOpen(true)}
                >
                  Proceed to checkout
                </button>
              </>
            )}
          </aside>
        </div>
      )}

      {/* Checkout Modal */}
      {checkoutOpen && (
        <div
          className="checkout-backdrop"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !isPaying) setCheckoutOpen(false);
          }}
        >
          <section
            className="checkout-panel"
            role="dialog"
            aria-modal="true"
            aria-label="Checkout details"
          >
            <button
              className="checkout-close"
              disabled={isPaying}
              onClick={() => setCheckoutOpen(false)}
            >
              ×
            </button>
            <p className="eyebrow">Secure checkout</p>
            <h2>Delivery details</h2>
            <p>
              {totalBagCount} pair{totalBagCount === 1 ? "" : "s"} ·{" "}
              {formatINR.format(totalBagAmount)}
            </p>

            <form onSubmit={handleCheckoutSubmit}>
              <label>
                Full name
                <input name="name" autoComplete="name" required />
              </label>

              <label>
                Email address
                <input name="email" type="email" autoComplete="email" required />
              </label>

              <label>
                Phone number
                <input
                  name="phone"
                  type="tel"
                  autoComplete="tel"
                  pattern="[0-9+ ]{10,15}"
                  required
                />
              </label>

              <label>
                Delivery address
                <textarea
                  name="address"
                  autoComplete="street-address"
                  rows={3}
                  required
                />
              </label>

              <button className="button dark" disabled={isPaying}>
                {isPaying ? "Opening secure payment…" : `Pay ${formatINR.format(totalBagAmount)}`}
              </button>
              <small>Test mode: no real payment will be charged.</small>
            </form>
          </section>
        </div>
      )}

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

            {/* Price & Color Filter Bar in Search */}
            <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-3 border-b border-[#4b261a15] bg-[#FAF8F5] text-xs">
              {/* Price Range Slider */}
              <div className="flex items-center gap-3">
                <span className="text-[10px] uppercase font-bold tracking-widest text-[#4b261a80]">MAX PRICE:</span>
                <span className="font-bold text-[#24130d] min-w-[70px]">
                  {searchMaxPrice >= 5000 ? "₹5,000+" : `Under ${formatINR.format(searchMaxPrice)}`}
                </span>
                <input
                  type="range"
                  min="1000"
                  max="5000"
                  step="250"
                  value={searchMaxPrice}
                  onChange={(e) => setSearchMaxPrice(Number(e.target.value))}
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
                    onClick={() => setSearchColorFilter(s.name)}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold border transition-all cursor-pointer ${
                      searchColorFilter === s.name
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

      {/* Toast Notification */}
      {toastMessage && (
        <div className="follicia-toast" role="status">
          {toastMessage}
        </div>
      )}
    </div>
  );
}
