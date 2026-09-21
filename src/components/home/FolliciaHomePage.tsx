import { useState, useEffect, useMemo, useRef, type FormEvent } from "react";
import type { AuthSession } from "@/components/auth/AuthGateway";
import {
  FOLLICIA_COLLECTIONS,
  FOLLICIA_PRODUCTS,
  formatINR,
  getProductVariantImage,
  type FolliciaProduct,
} from "@/data/folliciaCatalogue";
import { getProducts, parsePriceNumber, COMMERCE_EVENT, type CommerceProduct } from "@/lib/commerceStore";
import { ProductCard } from "@/components/pages/ShopPages";
import { Footer } from "@/components/sections/Footer";
import { useCart } from "@/components/cart/CartContext";
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
  const { count: globalCartCount, setOpen: setCartOpen, wishlist: globalWishlist } = useCart();
  const [navOpen, setNavOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const [collectionsOpen, setCollectionsOpen] = useState(false);
  const collectionsRef = useRef<HTMLDivElement>(null);
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
      const cleaned = parsed
        .filter(
          (b) => b?.product?.id && !b.product.id.toLowerCase().startsWith("Footwear-") && !b.product.id.toLowerCase().startsWith("prod-")
        )
        .map((b) => {
          const matched = FOLLICIA_PRODUCTS.find(
            (p) => p.id.toLowerCase() === b.product.id.toLowerCase() || p.name.toLowerCase() === b.product.name.toLowerCase()
          );
          return matched ? { ...b, product: { ...b.product, price: matched.price } } : b;
        });
      localStorage.setItem("follicia-bag", JSON.stringify(cleaned));
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
  const DEFAULT_ANNOUNCEMENT = "Complimentary shipping across India on orders above Rs. 9,999";
  const [announcementText, setAnnouncementText] = useState<string>(() => {
    try {
      const raw = localStorage.getItem("follocia_admin_banners");
      if (raw && (raw.includes("Homepage first viewport") || raw.includes("Rs. 2,999") || raw.includes("2,999"))) {
        const updated = JSON.parse(raw).map((b: any) =>
          (b.meta === "Homepage first viewport" || b.meta?.includes("2,999")) ? { ...b, meta: DEFAULT_ANNOUNCEMENT } : b
        );
        localStorage.setItem("follocia_admin_banners", JSON.stringify(updated));
      }
      const records = JSON.parse(localStorage.getItem("follocia_admin_banners") || "[]");
      const active = records.find((r: any) => r.status === "Live");
      const text = active?.meta || active?.title || "";
      if (text && !/viewport|placement|hero banner/i.test(text) && !text.includes("2,999")) {
        return text;
      }
      return DEFAULT_ANNOUNCEMENT;
    } catch {
      return DEFAULT_ANNOUNCEMENT;
    }
  });

  useEffect(() => {
    const sync = () => {
      setStoreProducts(getProducts());
      try {
        const records = JSON.parse(localStorage.getItem("follocia_admin_banners") || "[]");
        const active = records.find((r: any) => r.status === "Live");
        const text = active?.meta || active?.title || "";
        if (text && !/viewport|placement|hero banner/i.test(text) && !text.includes("2,999")) {
          setAnnouncementText(text);
        } else {
          setAnnouncementText(DEFAULT_ANNOUNCEMENT);
        }
      } catch {}
    };
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

  // Escape key for modals & dropdowns
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setBagOpen(false);
        setCheckoutOpen(false);
        setSearchOpen(false);
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

  // Prevent body scroll when search or mobile nav is open
  useEffect(() => {
    if (searchOpen || navOpen || bagOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [searchOpen, navOpen, bagOpen]);

  // Open search on global event
  useEffect(() => {
    const handleOpenSearch = () => setSearchOpen(true);
    window.addEventListener("follicia-open-search", handleOpenSearch);
    return () => window.removeEventListener("follicia-open-search", handleOpenSearch);
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

  // Auto-select collection & scroll if navigated with collection hash
  useEffect(() => {
    const handleHashCollection = () => {
      if (typeof window === "undefined") return;
      const hash = (window.location.hash || "").toLowerCase();
      const collections: Array<"Aura" | "Bloom" | "Muse" | "Noire"> = ["Aura", "Bloom", "Muse", "Noire"];
      for (const col of collections) {
        if (hash.includes(col.toLowerCase())) {
          setSelectedCollection(col);
          setSelectedStyle("All styles");
          const scrollToShop = () => {
            const el = document.getElementById("shop");
            if (el) {
              el.scrollIntoView({ behavior: "smooth" });
            }
          };
          setTimeout(scrollToShop, 60);
          setTimeout(scrollToShop, 260);
          break;
        }
      }
    };

    handleHashCollection();
    window.addEventListener("hashchange", handleHashCollection);
    return () => window.removeEventListener("hashchange", handleHashCollection);
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

  const [searchMaxPrice, setSearchMaxPrice] = useState<number>(40000);
  const [searchColorFilter, setSearchColorFilter] = useState<string>("All");

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

    let activeColor = searchColorFilter;
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

    for (const p of storeProducts) {
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
      if (searchMaxPrice < 40000 && priceNum > searchMaxPrice) continue;

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
  }, [storeProducts, searchQuery, searchMaxPrice, searchColorFilter]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    window.setTimeout(() => setToastMessage(""), 2500);
  };

  const handleSelectCollectionAndScroll = (collectionName: string) => {
    setSelectedCollection(collectionName);
    setSelectedStyle("All styles");
    try {
      window.history.replaceState(null, "", `#/collection/${collectionName.toLowerCase()}`);
    } catch {}
    const el = document.getElementById("shop");
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
    const emailVal = String(new FormData(form).get("email") || "").trim();
    if (!emailVal) return;
    try {
      localStorage.setItem("follicia-newsletter-email", emailVal);
      const key = "follocia_admin_newsletter";
      const raw = localStorage.getItem(key);
      const existing = raw ? JSON.parse(raw) : [];
      const newEntry = {
        id: `sub-${Date.now()}`,
        title: emailVal,
        meta: `Subscribed on ${new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })} via Home Newsletter`,
        status: "Subscribed",
      };
      const updated = [newEntry, ...existing.filter((item: any) => item.title?.toLowerCase() !== emailVal.toLowerCase())];
      localStorage.setItem(key, JSON.stringify(updated));

      void fetch("/api/commerce/admin-records/newsletter", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(updated.map((item) => ({ ...item, module: "newsletter" }))),
      }).catch(() => {});
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
      if (product.status === "Draft") return false;
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
        {announcementText}
      </div>

      {/* Site Header */}
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

        <a className="brand-wordmark" href="#top" aria-label="Follicia home">
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
            href="#top"
            onClick={(e) => {
              e.preventDefault();
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
            onClick={(e) => {
              e.preventDefault();
              setNavOpen(false);
              window.location.hash = "#/shop";
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
          >
            Shop
          </a>
          <a
            href="#/our-story"
            onClick={(e) => {
              e.preventDefault();
              setNavOpen(false);
              window.location.hash = "#/our-story";
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
          >
            Our Story
          </a>
          <a
            href="#/new-arrivals"
            onClick={(e) => {
              e.preventDefault();
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
            onClick={(e) => {
              e.preventDefault();
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
              <span>🛍️ Bag ({globalCartCount})</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setNavOpen(false);
                window.location.hash = "#/account/my-wishlist";
              }}
              className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-white border border-[#4b261a18] text-xs font-semibold text-[#24130d] shadow-2xs hover:border-[var(--gold)] cursor-pointer"
            >
              <span>❤️ Wishlist ({globalWishlist.length})</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setNavOpen(false);
                if (session?.user) {
                  window.location.hash = "#/account/my-orders";
                } else if (onLogin) {
                  onLogin();
                } else {
                  window.location.hash = "#/login";
                }
              }}
              className="col-span-2 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-[#24130d] text-white text-xs font-semibold uppercase tracking-wider shadow-sm hover:bg-[#351c13] cursor-pointer"
            >
              <span>👤 {session?.user ? `Account (${session.user.name})` : "Sign In / Join"}</span>
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
            {profileOpen && session?.user && (
              <div
                className="account-dropdown-menu absolute right-0 top-12 z-[70] w-56 rounded-xl border border-[#4b261a26] bg-[#fffdf8] p-4 text-xs shadow-2xl flex flex-col gap-1"
                style={{ color: "#351c13" }}
              >
                <p className="mb-2 text-[10px] uppercase tracking-wider text-[#a87648]">
                  Signed in as <strong className="block text-xs text-[#351c13]">{session.user.name}</strong>
                  <span className="text-[10px] text-[#4b261a80] truncate block">{session.user.role === "admin" ? "Administrator" : (session.user.email || "Follicia Member")}</span>
                </p>
                <div className="my-2 border-t border-[#4b261a15]" />
                {session.user.role === "admin" ? (
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

          <button
            type="button"
            aria-label="Wishlist"
            className="wishlist-btn relative inline-flex items-center justify-center cursor-pointer text-[#351c13] hover:text-[var(--gold)] transition-colors"
            title="Wishlist"
            onClick={() => {
              window.location.hash = "#/account/my-wishlist";
            }}
          >
            <svg
              width="21"
              height="21"
              viewBox="0 0 24 24"
              fill={globalWishlist.length > 0 ? "var(--gold)" : "none"}
              stroke={globalWishlist.length > 0 ? "var(--gold)" : "currentColor"}
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="transition-transform hover:scale-110"
            >
              <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
            </svg>
            {globalWishlist.length > 0 && (
              <small>{globalWishlist.length}</small>
            )}
          </button>

          <button
            type="button"
            aria-label="Shopping bag"
            className="bag-btn relative cursor-pointer"
            onClick={() => setCartOpen(true)}
          >
            Bag
            {globalCartCount > 0 && (
              <small>{globalCartCount}</small>
            )}
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
          <h1>FOLLICIA</h1>
          <p className="hero-tagline">Every Step, A Statement.</p>
          <p className="hero-description">
            Four distinct collections. Sculptural comfort, expressive detail and silhouettes made to move beautifully.
          </p>
          <div className="button-row">
            <a
              className="button dark"
              href="#/collections"
              onClick={(e) => {
                e.preventDefault();
                window.location.hash = "#/collections";
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
            >
              Explore collections
            </a>
            <a
              className="text-link"
              href="#/contact"
              onClick={(e) => {
                e.preventDefault();
                window.location.hash = "#/contact";
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
            >
              Contact Us <span>→</span>
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
            <h2>{activeMotionCollection.name}</h2>
            <p>{activeMotionCollection.line}</p>
            <div className="motion-styles">
              {activeMotionCollection.featured.map((style) => (
                <span key={style}>{style}</span>
              ))}
            </div>
            <a
              className="button light"
              href={`#/collection/${activeMotionCollection.name.toLowerCase()}`}
            >
              Explore {activeMotionCollection.name}
            </a>
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

      {/* Shop / Live Catalogue Section powered directly by Admin Panel */}
      <section className="shop" id="shop">
        <div className="section-head">
          <div>
            <p className="eyebrow">The Complete Catalogue</p>
            <h2>{selectedCollection === "All" ? "All Designs" : `${selectedCollection} Collection`}</h2>
          </div>
          <div className="hidden sm:block text-right">
            <p className="text-xs uppercase tracking-widest text-[#4b261a80]">{filteredProducts.length} pieces available</p>
            <p className="text-[11px] text-[#4b261a60]">EU 38–41</p>
          </div>
        </div>

        <div className="filter-group">
          <div className="filters" aria-label="Collection filters">
            {COLLECTION_FILTERS.map((filter) => (
              <button
                key={filter}
                type="button"
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
                type="button"
                className={selectedStyle === style ? "active" : ""}
                onClick={() => setSelectedStyle(style)}
              >
                {style}
              </button>
            ))}
          </div>
        </div>

        <div className="product-grid">
          {filteredProducts.map((product, idx) => (
            <ProductCard
              key={product.id}
              product={product}
              index={idx}
              onSelect={() => {
                window.location.hash = `#/shop/${product.id.toLowerCase()}`;
              }}
            />
          ))}
        </div>

        {filteredProducts.length === 0 && (
          <div className="py-16 text-center">
            <p className="font-display text-2xl text-[#24130d]">No pieces match the selected filters.</p>
            <button
              type="button"
              onClick={() => {
                setSelectedCollection("All");
                setSelectedStyle("All styles");
              }}
              className="mt-4 button dark cursor-pointer"
            >
              Reset Filters
            </button>
          </div>
        )}
      </section>

      {/* Find your Follicia - Home Links */}
      <section className="home-links">
        <p className="eyebrow">Find your Follicia</p>
        <h2>Four worlds, designed to move with you.</h2>
        <div>
          <a
            href="#/collections"
            onClick={(e) => {
              e.preventDefault();
              window.location.hash = "#/collections";
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
          >
            Shop the collections <span>→</span>
          </a>
          <a
            href="#/new-arrivals"
            onClick={(e) => {
              e.preventDefault();
              window.location.hash = "#/new-arrivals";
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
          >
            Discover Walk Light <span>→</span>
          </a>
          <a
            href="#/our-story"
            onClick={(e) => {
              e.preventDefault();
              window.location.hash = "#/our-story";
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
          >
            Read our story <span>→</span>
          </a>
        </div>
      </section>

      {/* Newsletter Section */}
      <section className="newsletter">
        <p className="eyebrow">The Follicia Edit</p>
        <h2>Step into our world.</h2>
        <p>New arrivals, private previews and stories from Follicia.</p>
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
      <Footer />

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
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 px-4 sm:px-6 py-2.5 sm:py-3 border-b border-[#4b261a15] bg-[#FAF8F5] text-xs">
              {/* Price Range Slider */}
              <div className="flex items-center justify-between sm:justify-start gap-2.5 sm:gap-3">
                <span className="text-[10px] uppercase font-bold tracking-widest text-[#4b261a80] shrink-0">MAX PRICE:</span>
                <span className="font-bold text-[#24130d] text-xs shrink-0">
                  {searchMaxPrice >= 40000 ? "All Prices" : `Under ${formatINR.format(searchMaxPrice)}`}
                </span>
                <input
                  type="range"
                  min="3000"
                  max="40000"
                  step="500"
                  value={searchMaxPrice}
                  onChange={(e) => setSearchMaxPrice(Number(e.target.value))}
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
                    onClick={() => setSearchColorFilter(s.name)}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold border transition-all cursor-pointer shrink-0 ${
                      searchColorFilter === s.name
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
                  {searchQuery || searchMaxPrice < 40000 || searchColorFilter !== "All"
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

      {/* Toast Notification */}
      {toastMessage && (
        <div className="follicia-toast" role="status">
          {toastMessage}
        </div>
      )}
    </div>
  );
}
