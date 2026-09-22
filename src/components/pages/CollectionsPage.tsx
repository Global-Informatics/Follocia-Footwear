import { useState, useEffect, useMemo } from "react";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/sections/Footer";
import { CartDrawer } from "@/components/cart/CartDrawer";
import { useCart } from "@/components/cart/CartContext";
import type { AuthSession } from "@/components/auth/AuthGateway";
import {
  FOLLICIA_COLLECTIONS,
} from "@/data/folliciaCatalogue";
import {
  getProducts,
  COMMERCE_EVENT,
  syncCommerceFromBackend,
  productPrimaryImage,
  getActiveVariant,
  type CommerceProduct,
} from "@/lib/commerceStore";
import { ProductCard } from "./ShopPages";
import "@/components/home/follicia.css";

const STYLE_FILTERS = ["All styles", "Flat", "Heel", "Mule", "Boot"] as const;
const SIZES = [38, 39, 40, 41] as const;

function getColorHex(colorName?: string): string {
  if (!colorName) return "#f2e9d9";
  const c = colorName.toLowerCase();
  if (c.includes("black") || c.includes("noir")) return "#171310";
  if (c.includes("brown") || c.includes("chocolate")) return "#6c3d2c";
  if (c.includes("burgundy")) return "#711f2c";
  if (c.includes("olive")) return "#77704c";
  if (c.includes("blush") || c.includes("rose")) return "#d8a9a2";
  if (c.includes("silver") || c.includes("chrome")) return "#b8b8b5";
  if (c.includes("gold") || c.includes("monarch") || c.includes("orange")) return "#d9a15c";
  if (c.includes("sand") || c.includes("fawn") || c.includes("tan")) return "#d8c4b2";
  if (c.includes("champagne")) return "#e7dac7";
  return "#f2e9d9";
}

function formatPriceString(price: string | number): string {
  if (typeof price === "string" && price.trim().startsWith("Rs.")) return price;
  const num = typeof price === "number" ? price : parseFloat(String(price || "").replace(/^[^0-9]*/, "").replace(/,/g, "")) || 0;
  return `Rs. ${num.toLocaleString("en-IN")}`;
}

function parseCollectionFromUrl(): "Aura" | "Bloom" | "Muse" | "Noire" | null {
  if (typeof window === "undefined") return null;
  const hash = window.location.hash || "";
  const search = window.location.search || "";
  const cleanHash = hash.replace(/^#\/?/, "").toLowerCase().split("?")[0];
  const queryStr = hash.includes("?") ? hash.split("?")[1] : search.replace(/^\?/, "");

  const valid: Array<"Aura" | "Bloom" | "Muse" | "Noire"> = ["Aura", "Bloom", "Muse", "Noire"];

  // 1. #/collection/aura or #/collections/aura
  if (cleanHash.startsWith("collection/")) {
    const param = cleanHash.replace("collection/", "");
    const found = valid.find((c) => c.toLowerCase() === param);
    if (found) return found;
  }
  if (cleanHash.startsWith("collections/") && cleanHash !== "collections") {
    const param = cleanHash.replace("collections/", "");
    const found = valid.find((c) => c.toLowerCase() === param);
    if (found) return found;
  }

  // 2. Query parameter: ?collection=aura or ?mood=aura
  if (queryStr) {
    try {
      const params = new URLSearchParams(queryStr);
      const col = params.get("collection") || params.get("mood") || params.get("col");
      if (col) {
        const found = valid.find((c) => c.toLowerCase() === col.toLowerCase());
        if (found) return found;
      }
    } catch {}
  }

  return null;
}

export function CollectionsPage({
  session,
  onLogout,
  onLogin,
}: {
  session: AuthSession | null;
  onLogout: () => void;
  onLogin: () => void;
}) {
  const { add, wishlist, toggleWish, setOpen: setCartOpen } = useCart();
  const [selectedCollection, setSelectedCollection] = useState<"Aura" | "Bloom" | "Muse" | "Noire" | null>(
    () => parseCollectionFromUrl()
  );
  const [selectedStyle, setSelectedStyle] = useState<string>("All styles");

  // Dynamic products from live commerce store (synced with admin panel & backend DB)
  const [storeProducts, setStoreProducts] = useState<CommerceProduct[]>(() => getProducts());

  useEffect(() => {
    const sync = () => setStoreProducts(getProducts());
    window.addEventListener(COMMERCE_EVENT, sync);
    void syncCommerceFromBackend();
    return () => window.removeEventListener(COMMERCE_EVENT, sync);
  }, []);

  const [newsletterEmail, setNewsletterEmail] = useState("");
  const [toastMessage, setToastMessage] = useState("");

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 2800);
  };

  // Sync with URL hash
  useEffect(() => {
    const syncFromUrl = () => {
      const col = parseCollectionFromUrl();
      setSelectedCollection(col);
      setSelectedStyle("All styles");
      window.scrollTo({ top: 0, behavior: "smooth" });
    };

    window.addEventListener("hashchange", syncFromUrl);
    return () => window.removeEventListener("hashchange", syncFromUrl);
  }, []);

  const filteredProducts = useMemo(() => {
    if (!selectedCollection) return [];
    return storeProducts.filter((product) => {
      // 1. Status check: hide drafts
      if (product.status === "Draft") return false;

      // 2. Collection check
      const pCol = (product.collection || product.edition || "").toLowerCase();
      const matchCol = pCol.includes(selectedCollection.toLowerCase());
      if (!matchCol) return false;

      // 3. Style filter
      if (selectedStyle === "All styles") return true;
      const target = selectedStyle.toLowerCase();
      const cat = (product.category || "").toLowerCase();
      const sil = (product.silhouette || "").toLowerCase();
      const name = (product.title || "").toLowerCase();

      if (target === "flat") {
        return cat === "flat" || sil.includes("flat") || name.includes("flat");
      }
      if (target === "heel") {
        return cat === "heel" || sil.includes("heel") || name.includes("heel") || name.includes("pump");
      }
      if (target === "mule") {
        return cat === "mule" || sil.includes("mule") || name.includes("mule") || sil.includes("slide");
      }
      if (target === "boot") {
        return cat === "boot" || sil.includes("boot") || name.includes("boot");
      }
      return cat.includes(target) || sil.includes(target);
    });
  }, [storeProducts, selectedCollection, selectedStyle]);

  const handleOpenQuickView = (product: CommerceProduct) => {
    window.location.hash = `#/shop/${product.id.toLowerCase()}`;
  };

  const handleToggleWishlist = (productId: string, productName: string) => {
    toggleWish(productId);
    const isNowSaved = !wishlist.some((x) => x.toLowerCase() === productId.toLowerCase());
    showToast(isNowSaved ? `${productName} saved to wishlist` : `${productName} removed from wishlist`);
  };

  const handleShareProduct = async (product: { id: string; title: string; price?: string | number }) => {
    const pId = product.id.toLowerCase();
    const shareUrl = `${window.location.origin}${window.location.pathname}#/shop/${pId}`;
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: `Follicia | ${product.title}`,
          text: `Discover ${product.title} on Follicia Footwear`,
          url: shareUrl,
        });
        return;
      } catch {}
    }
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(shareUrl);
        showToast("Link copied to clipboard!");
        return;
      } catch {}
    }
    showToast("Link copied!");
  };

  const handleSelectCollection = (colName: "Aura" | "Bloom" | "Muse" | "Noire") => {
    setSelectedCollection(colName);
    setSelectedStyle("All styles");
    window.location.hash = `#/collection/${colName.toLowerCase()}`;
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleNewsletterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const emailVal = newsletterEmail.trim();
    if (!emailVal) return;
    try {
      localStorage.setItem("follicia-newsletter-email", emailVal);
      const key = "follocia_admin_newsletter";
      const raw = localStorage.getItem(key);
      const existing = raw ? JSON.parse(raw) : [];
      const newEntry = {
        id: `sub-${Date.now()}`,
        title: emailVal,
        meta: `Subscribed on ${new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })} via Collections Page`,
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
    setNewsletterEmail("");
    showToast("You’re on the Follicia VIP list");
  };

  return (
    <div className="follicia-home flex flex-col min-h-screen bg-white">
      {/* Site Header */}
      <Navigation
        userName={session?.user.name}
        onLogout={session ? onLogout : undefined}
        onLogin={onLogin}
        solid
      />

      <main className="flex-1 bg-white text-[var(--ink)]">
        {selectedCollection ? (
          /* ============================================================ */
          /* DYNAMIC COLLECTION VIEW (Aura / Bloom / Muse / Noire)        */
          /* Matches exact reference layout: eyebrow, Title, EU 38–41,    */
          /* All styles | Flat | Heel | Mule | Boot tabs & product grid   */
          /* ============================================================ */
          <section className="shop collection-page" id="shop" style={{ paddingTop: "24px" }}>
            {/* Top switcher bar with back to all collections */}
            <div className="collection-nav-bar flex flex-wrap items-center justify-between gap-4 mb-6 pb-4 border-b border-[var(--line,#e8ded2)]">
              <button
                type="button"
                onClick={() => {
                  window.location.hash = "#/collections";
                  setSelectedCollection(null);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                className="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-[#4b261a80] hover:text-[var(--gold)] transition-colors cursor-pointer"
              >
                <span>←</span>
                <span>All collections</span>
              </button>

              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase tracking-wider text-[#4b261a80] mr-1 hidden sm:inline">
                  Switch mood:
                </span>
                {(["Aura", "Bloom", "Muse", "Noire"] as const).map((col) => (
                  <button
                    key={col}
                    type="button"
                    onClick={() => handleSelectCollection(col)}
                    className={`px-3 py-1 rounded-full text-xs uppercase tracking-wider transition-all cursor-pointer ${
                      selectedCollection === col
                        ? "bg-[#4b261a] text-[#fffaf0] font-semibold shadow-sm"
                        : "border border-[#4b261a26] text-[#4b261a] hover:border-[#4b261a] bg-transparent"
                    }`}
                  >
                    {col}
                  </button>
                ))}
              </div>
            </div>

            {/* Section Head: The complete catalogue / [Collection] / EU 38–41 */}
            <div className="section-head">
              <div>
                <p className="eyebrow">The complete catalogue</p>
                <h2>{selectedCollection}</h2>
              </div>
              <p>EU 38–41</p>
            </div>

            {/* Style Filters: All styles | Flat | Heel | Mule | Boot */}
            <div className="filter-group">
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

            {/* Product Grid */}
            {filteredProducts.length === 0 ? (
              <div className="py-20 text-center">
                <p className="text-base font-serif text-[#4b261a80] mb-5">
                  No {selectedStyle.toLowerCase()} silhouettes currently available in the {selectedCollection} collection.
                </p>
                <button
                  type="button"
                  onClick={() => setSelectedStyle("All styles")}
                  className="button dark"
                >
                  View all {selectedCollection} styles
                </button>
              </div>
            ) : (
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
            )}
          </section>
        ) : (
          /* ============================================================ */
          /* MAIN COLLECTIONS OVERVIEW PAGE (Four Moods. One signature.) */
          /* ============================================================ */
          <>
            <section className="intro page-intro" id="collections" style={{ paddingTop: "28px", paddingBottom: "36px" }}>
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
                <article
                  key={col.name}
                  className={`collection-card collection-${col.name.toLowerCase()}`}
                >
                  <img src={col.image} alt={`${col.name} campaign`} />
                  <div className="collection-overlay"></div>
                  <div className="collection-content">
                    <h3>{col.name}</h3>
                    <p>{col.line}</p>
                    <a
                      href={`#/collection/${col.name.toLowerCase()}`}
                      onClick={(e) => {
                        e.preventDefault();
                        handleSelectCollection(col.name);
                      }}
                    >
                      View collection <span>→</span>
                    </a>
                  </div>
                </article>
              ))}
            </section>
          </>
        )}

        {/* Newsletter Section */}
        <section className="newsletter">
          <p className="eyebrow">The Follicia Edit</p>
          <h2>Step into our world.</h2>
          <p>New arrivals, private previews and stories from Follicia.</p>
          <form onSubmit={handleNewsletterSubmit}>
            <input
              aria-label="Email address"
              type="email"
              placeholder="Your email address"
              required
              value={newsletterEmail}
              onChange={(e) => setNewsletterEmail(e.target.value)}
              name="email"
            />
            <button type="submit">Join us →</button>
          </form>
        </section>
      </main>



      {/* Footer */}
      <Footer />

      {/* Cart Drawer */}
      <CartDrawer session={session} onLogin={onLogin} />

      {/* Toast Notification */}
      {toastMessage && (
        <div className="follicia-toast" role="status">
          {toastMessage}
        </div>
      )}
    </div>
  );
}
