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
  const num = typeof price === "number" ? price : Number(String(price).replace(/[^\d]/g, "")) || 0;
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

  // Quick View modal state
  const [quickProduct, setQuickProduct] = useState<CommerceProduct | null>(null);
  const [quickSize, setQuickSize] = useState<number | null>(38);
  const [quickColor, setQuickColor] = useState<string>("");

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

  // Quick view escape key & body scroll lock
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setQuickProduct(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    if (quickProduct) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [quickProduct]);

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
    setQuickProduct(product);
    setQuickSize(38);
    setQuickColor(product.color || product.tone || "");
  };

  const handleAddToBag = (product: CommerceProduct) => {
    if (!quickSize) {
      showToast("Please select a size");
      return;
    }
    const color = quickColor || product.color || product.tone || "Classic";
    const activeVar = getActiveVariant(product, color);
    const image = activeVar?.image || productPrimaryImage(product);

    add(
      {
        id: `${product.id}-${quickSize}-${color}`,
        title: product.title,
        price: formatPriceString(product.price),
        image,
        tone: color,
        size: `EU ${quickSize}`,
      },
      1
    );

    showToast(`${product.title} · EU ${quickSize} added to bag`);
    setQuickProduct(null);
    setCartOpen(true);
  };

  const handleToggleWishlist = (productId: string, productName: string) => {
    toggleWish(productId);
    const isNowSaved = !wishlist.includes(productId);
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
    if (!newsletterEmail) return;
    try {
      localStorage.setItem("follicia-newsletter-email", newsletterEmail);
    } catch {}
    setNewsletterEmail("");
    showToast("You’re on the Follicia VIP list");
  };

  return (
    <div className="follicia-home flex flex-col min-h-screen bg-[#fffaf0]">
      {/* Site Header */}
      <Navigation
        userName={session?.user.name}
        onLogout={session ? onLogout : undefined}
        onLogin={onLogin}
        solid
      />

      <main className="flex-1 bg-[#fffaf0] text-[var(--ink)]">
        {selectedCollection ? (
          /* ============================================================ */
          /* DYNAMIC COLLECTION VIEW (Aura / Bloom / Muse / Noire)        */
          /* Matches exact reference layout: eyebrow, Title, EU 38–41,    */
          /* All styles | Flat | Heel | Mule | Boot tabs & product grid   */
          /* ============================================================ */
          <section className="shop collection-page" id="shop" style={{ paddingTop: "110px" }}>
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
                {filteredProducts.map((product) => {
                  const isSaved = wishlist.includes(product.id);
                  const pImage = productPrimaryImage(product);
                  const pTone = product.color || product.tone || "";
                  const pPrice = formatPriceString(product.price);

                  return (
                    <article key={product.id} className="product-card">
                      <button
                        type="button"
                        className="product-image"
                        aria-label={`View ${product.title}`}
                        onClick={() => handleOpenQuickView(product)}
                      >
                        <img
                          loading="lazy"
                          src={pImage}
                          alt={`${product.title} in ${pTone}`}
                        />
                        <span className="quick">Choose size &amp; colour</span>
                      </button>

                      <div className="product-meta">
                        <div>
                          <p>
                            {product.collection || selectedCollection} · {pTone}
                          </p>
                          <a
                            href={`#/shop/${product.id.toLowerCase()}`}
                            className="product-title-link"
                          >
                            <h3>{product.title}</h3>
                          </a>
                        </div>
                        <strong>{pPrice}</strong>
                      </div>

                      <div
                        className="colour-preview"
                        aria-label={`Available colours for ${product.title}`}
                      >
                        <span
                          title={pTone}
                          style={{ background: getColorHex(pTone) }}
                        />
                        <small>{pTone}</small>
                      </div>

                      <div className="product-actions">
                        <span>EU 38–41</span>
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            className="hover:text-[var(--gold)] flex items-center gap-1 transition-colors cursor-pointer"
                            aria-label={`Share ${product.title}`}
                            title="Share design"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleShareProduct(product);
                            }}
                          >
                            <svg
                              width="11"
                              height="11"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                              <polyline points="16 6 12 2 8 6" />
                              <line x1="12" y1="2" x2="12" y2="15" />
                            </svg>
                            <span>Share</span>
                          </button>
                          <button
                            type="button"
                            className={isSaved ? "saved active" : ""}
                            aria-label={`Save ${product.title}`}
                            onClick={() => handleToggleWishlist(product.id, product.title)}
                          >
                            {isSaved ? "Saved" : "♡ Save"}
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        ) : (
          /* ============================================================ */
          /* MAIN COLLECTIONS OVERVIEW PAGE (Four Moods. One signature.) */
          /* ============================================================ */
          <>
            <section className="intro page-intro" id="collections">
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
          <p>New arrivals, private previews and stories from our atelier.</p>
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

      {/* Quick View Modal */}
      {quickProduct && (
        <div
          className="quick-view-backdrop"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setQuickProduct(null);
          }}
        >
          <section
            className="quick-view"
            role="dialog"
            aria-modal="true"
            aria-label={`${quickProduct.title} details`}
          >
            <button
              className="close"
              aria-label="Close product details"
              onClick={() => setQuickProduct(null)}
            >
              ×
            </button>

            <div className="quick-view-image">
              <img
                src={
                  getActiveVariant(quickProduct, quickColor)?.image ||
                  productPrimaryImage(quickProduct)
                }
                alt={`${quickProduct.title} in ${quickColor || quickProduct.tone}`}
              />
            </div>

            <div className="quick-view-copy">
              <p className="eyebrow">
                {quickProduct.collection} · {quickProduct.category}
              </p>
              <h2>{quickProduct.title}</h2>
              <strong>{formatPriceString(quickProduct.price)}</strong>

              <p className="size-label" style={{ marginTop: 24 }}>Select colour</p>
              <div className="colour-options">
                {(quickProduct.availableColors || (quickProduct.color ? [quickProduct.color] : [quickProduct.tone])).map((color) => (
                  <button
                    key={color}
                    type="button"
                    className={(quickColor || quickProduct.color || quickProduct.tone) === color ? "active" : ""}
                    onClick={() => setQuickColor(color)}
                  >
                    {color}
                  </button>
                ))}
              </div>

              <div className="size-label">
                <span>SELECT SIZE</span>
                <span>EU SIZING</span>
              </div>
              <div className="size-grid">
                {SIZES.map((size) => (
                  <button
                    key={size}
                    type="button"
                    className={quickSize === size ? "active" : ""}
                    onClick={() => setQuickSize(size)}
                  >
                    {size}
                  </button>
                ))}
              </div>

              <div className="flex flex-col gap-3 mt-6">
                <button
                  type="button"
                  className="button dark add-button"
                  onClick={() => handleAddToBag(quickProduct)}
                >
                  Add to bag
                </button>
                <div className="flex items-center justify-center gap-4 pt-1">
                  <button
                    type="button"
                    onClick={() => handleShareProduct(quickProduct)}
                    className="text-center text-xs uppercase tracking-wider text-[#4b261a90] hover:text-[var(--gold)] flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                      <polyline points="16 6 12 2 8 6" />
                      <line x1="12" y1="2" x2="12" y2="15" />
                    </svg>
                    <span>Share piece</span>
                  </button>
                  <span className="text-[#4b261a30]">·</span>
                  <a
                    href={`#/shop/${quickProduct.id.toLowerCase()}`}
                    onClick={() => setQuickProduct(null)}
                    className="text-center text-xs uppercase tracking-wider text-[var(--gold)] hover:underline"
                  >
                    View full details →
                  </a>
                </div>
              </div>
            </div>
          </section>
        </div>
      )}

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
