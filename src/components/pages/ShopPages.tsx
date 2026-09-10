import { useEffect, useMemo, useState, useRef, type ReactNode } from "react";
import { motion, useMotionValue, useSpring, useTransform, AnimatePresence } from "framer-motion";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/sections/Footer";
import { CartDrawer } from "@/components/cart/CartDrawer";
import { QuickView } from "@/components/cart/QuickView";
import { useCart } from "@/components/cart/CartContext";
import { GoldenParticles } from "@/components/GoldenParticles";
import {
  COMMERCE_EVENT,
  createOrdersFromCartRemote,
  ensureCustomer,
  getProducts,
  productImages,
  productPrimaryImage,
  saveCustomerRemote,
  syncCommerceFromBackend,
  upsertCustomer,
  type CommerceAddress,
  type CommerceProduct,
  type CustomerProfile,
} from "@/lib/commerceStore";
import type { AuthSession } from "@/components/auth/AuthGateway";
import { readCheckoutCoupon } from "@/lib/coupons";
import "@/components/home/follicia.css";

const ease = [0.2, 0.8, 0.2, 1] as const;

type PageShellProps = {
  session: AuthSession | null;
  onLogout: () => void;
  onLogin: () => void;
  children: ReactNode;
  darkNav?: boolean;
};

const sizes = ["38", "39", "40", "41"];

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

function priceNumber(price: string) {
  return Number(price.replace(/[^\d.]/g, "")) || 0;
}

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function productPath(product: CommerceProduct) {
  return `#/shop/${product.id}`;
}

function liveProducts() {
  return getProducts().filter((product) => product.status !== "Draft");
}

type StorefrontRecord = { id: string; title: string; meta: string; status: string };

function readStorefrontRecords(module: string, seed: StorefrontRecord[] = []) {
  if (typeof window === "undefined") return seed;
  try {
    const existing = JSON.parse(localStorage.getItem(`follocia_admin_${module}`) || "[]") as StorefrontRecord[];
    return existing.length ? existing : seed;
  } catch {
    return seed;
  }
}

function activeRecords(module: string, seed: StorefrontRecord[] = []) {
  return readStorefrontRecords(module, seed).filter((record) => !["Draft", "Paused", "Closed"].includes(record.status));
}

function stockMood(product: CommerceProduct) {
  if (product.status === "Coming Soon") return "Coming soon";
  if (product.status === "Sold Out" || product.available <= 0) return "Sold out";
  if (product.available <= 6) return "Final pairs";
  if (product.available <= 12) return "Low stock";
  return "Available";
}

function sizeConfidence(product: CommerceProduct, selectedSize: string) {
  if (!selectedSize) return "Select a size for atelier guidance.";
  const sizeNumber = Number(selectedSize);
  if (product.tone.toLowerCase().includes("patent") && sizeNumber <= 37) return "Patent finish can feel structured. Concierge suggests reviewing half-size comfort.";
  if (product.tone.toLowerCase().includes("satin")) return "Satin edition fits true to size with a softer instep feel.";
  return "Fits true to size. Concierge can confirm against your usual European size.";
}

function addressLine(address: CommerceAddress) {
  return `${address.firstName} ${address.lastName}, ${address.address}${address.address2 ? `, ${address.address2}` : ""}, ${address.city}, ${address.region} ${address.zip}, ${address.country}, ${address.phone}`.replace(/\s+/g, " ").trim();
}

async function saveContactQuery(name: string, email: string, requestType: string, message: string) {
  const key = "follocia_admin_contact";
  const existing = JSON.parse(localStorage.getItem(key) || "[]") as Array<{ id: string; title: string; meta: string; status: string }>;
  const next = [
    {
      id: `contact-${Date.now()}`,
      title: `${requestType} from ${name}`,
      meta: `${email} - ${message}`,
      status: "Open",
    },
    ...existing,
  ];
  localStorage.setItem(key, JSON.stringify(next));
  try {
    await fetch("/api/commerce/admin-records/contact", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(next.map((record) => ({ ...record, module: "contact" }))),
    });
  } catch {
    // Local admin records keep the demo flow working when the API is offline.
  }
}

function PageShell({ session, onLogout, onLogin, children, darkNav }: PageShellProps) {
  return (
    <div className="follicia-home flex flex-col min-h-screen bg-[#fffaf0]">
      <Navigation userName={session?.user.name} onLogout={session ? onLogout : undefined} onLogin={onLogin} solid={!darkNav} />
      <main className="flex-1 bg-[#fffaf0] text-[var(--ink)]">{children}</main>
      <Footer />
      <CartDrawer session={session} onLogin={onLogin} />
    </div>
  );
}

function FilterDropdown({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (val: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 cursor-pointer text-[10px] uppercase tracking-widest text-[var(--ink)]/70 hover:text-[var(--ink)] transition-colors select-none py-1"
      >
        <span className="text-[var(--ink)]/40 font-medium">{label}</span>
        <span className="font-semibold text-[var(--ink)]">{value}</span>
        <svg
          width="8"
          height="8"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          className={`transition-transform duration-200 text-[var(--ink)]/50 ${open ? "rotate-180" : ""}`}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-2 min-w-[150px] overflow-hidden rounded-md border border-[#4b261a22] bg-white shadow-[0_12px_32px_rgba(0,0,0,0.18)] z-50 animate-in fade-in zoom-in-95 duration-150">
          <div className="bg-[#5c5c5c] px-3.5 py-2 text-left text-xs font-semibold text-white">
            {value}
          </div>
          <div className="py-1">
            {options.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => {
                  onChange(opt);
                  setOpen(false);
                }}
                className={`flex w-full items-center justify-between px-3.5 py-2 text-left text-xs transition-colors ${
                  value === opt
                    ? "bg-[#f5efe6] font-semibold text-[#24130d]"
                    : "text-[#24130d]/80 hover:bg-[#fffaf0] hover:text-[#24130d]"
                }`}
              >
                <span>{opt}</span>
                {value === opt && <span className="text-[var(--gold)] ml-2">✓</span>}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ProductCard({
  product,
  index,
  isSelected,
  onSelect,
}: {
  product: CommerceProduct;
  index: number;
  isSelected?: boolean;
  onSelect?: () => void;
}) {
  const { wishlist, toggleWish } = useCart();
  const wished = wishlist.includes(product.id);
  const primaryImage = productPrimaryImage(product);
  const colors = useMemo(() => {
    const raw = product.tone.split(/[\/,·+]/).map((c) => c.trim()).filter(Boolean);
    return raw.length ? raw : [product.tone];
  }, [product.tone]);

  return (
    <article
      onClick={() => onSelect?.()}
      className={`group cursor-pointer rounded-[22px] border bg-[#fffdf8] p-2 pb-3.5 shadow-[0_16px_45px_rgba(75,38,26,0.06)] transition-all duration-500 hover:-translate-y-1 hover:shadow-[0_24px_50px_rgba(75,38,26,0.12)] flex flex-col justify-between ${
        isSelected
          ? "border-[var(--gold)] ring-2 ring-[var(--gold)]/40 shadow-[0_20px_50px_rgba(196,141,63,0.15)]"
          : "border-[#4b261a1a] hover:border-[#4b261a33]"
      }`}
    >
      <div className="relative aspect-[0.9] overflow-hidden rounded-[16px] bg-[#fffaf0] flex items-center justify-center">
        {/* Available badge matching Pic 1 */}
        <div className="absolute left-2.5 top-2.5 z-10 rounded bg-white/95 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-[#24130d] shadow-sm border border-black/5">
          {product.status === "Live" ? "AVAILABLE" : product.status.toUpperCase()}
        </div>

        <div className="flex h-full w-full items-center justify-center p-3">
          <img
            loading="lazy"
            src={primaryImage}
            alt={product.title}
            className="h-[86%] w-[86%] object-contain mix-blend-multiply transition-transform duration-700 ease-out group-hover:scale-105"
          />
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onSelect?.();
          }}
          className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-white/95 px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-[#24130d] shadow-md opacity-0 transition-all duration-300 group-hover:opacity-100 hover:bg-[#c48d3f] hover:text-white"
        >
          {isSelected ? "Currently Viewing" : "View & Order Pair"}
        </button>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            toggleWish(product.id);
          }}
          aria-label="Toggle wishlist"
          className="absolute right-2.5 top-2.5 z-10 grid h-8 w-8 place-items-center rounded-full bg-white/90 shadow-sm text-xs transition-transform hover:scale-110"
        >
          <motion.svg
            animate={{ scale: wished ? [1, 1.25, 1] : 1 }}
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill={wished ? "var(--gold)" : "none"}
            stroke={wished ? "var(--gold)" : "currentColor"}
            strokeWidth="1.6"
          >
            <path d="M12 21s-7-4.35-7-10a4 4 0 0 1 7-2.65A4 4 0 0 1 19 11c0 5.65-7 10-7 10z" />
          </motion.svg>
        </button>
      </div>

      <div className="mt-2.5 px-1">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-[11px] uppercase tracking-wider text-[#4b261a80]">{product.edition || product.tone}</p>
            <div
              className="mt-0.5 block font-display text-base font-semibold leading-tight text-[#24130d] transition-colors group-hover:text-[var(--gold)] line-clamp-1"
            >
              {product.title}
            </div>
          </div>
          <strong className="whitespace-nowrap font-display text-sm font-semibold text-[#24130d]">{product.price}</strong>
        </div>

        <div className="mt-2 flex items-center gap-1.5">
          {colors.map((c) => (
            <span
              key={c}
              title={c}
              className="h-2.5 w-2.5 rounded-full border border-black/10 inline-block"
              style={{ backgroundColor: getColorHex(c) }}
            />
          ))}
          <small className="text-[10px] text-[#4b261a80] ml-1">{colors.join(" · ")}</small>
        </div>

        <div className="mt-2.5 flex items-center justify-between border-t border-[#4b261a0d] pt-2 text-[11px] text-[#4b261a99]">
          <span>EU 38–41</span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              toggleWish(product.id);
            }}
            className={`transition-colors ${wished ? "font-semibold text-[var(--gold)]" : "hover:text-[#24130d]"}`}
          >
            {wished ? "Saved" : "♡ Save"}
          </button>
        </div>
      </div>
    </article>
  );
}

export function ShopPage({
  session,
  onLogout,
  onLogin,
  initialProductId,
}: {
  session: AuthSession | null;
  onLogout: () => void;
  onLogin: () => void;
  initialProductId?: string;
}) {
  const { add, wishlist, toggleWish, setOpen: setCartOpen } = useCart();
  const [selectedCollection, setSelectedCollection] = useState("All");
  const [products, setProducts] = useState<CommerceProduct[]>(() => liveProducts());
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("All");
  const [tone, setTone] = useState("All");
  const [stock, setStock] = useState("All");
  const [sort, setSort] = useState("Featured");

  // Selected product state for the Order View
  const [selectedProduct, setSelectedProduct] = useState<CommerceProduct | null>(() => {
    const list = liveProducts();
    if (initialProductId) {
      const match = list.find((p) => p.id.toLowerCase() === initialProductId.toLowerCase() || slugify(p.title) === initialProductId.toLowerCase());
      return match || list[0] || null;
    }
    return null;
  });

  const [selectedSize, setSelectedSize] = useState("");
  const [activeImage, setActiveImage] = useState("");
  const [addedToBag, setAddedToBag] = useState(false);
  const [openAccordion, setOpenAccordion] = useState("Product Details");

  useEffect(() => {
    const sync = () => setProducts(liveProducts());
    window.addEventListener(COMMERCE_EVENT, sync);
    void syncCommerceFromBackend();
    return () => window.removeEventListener(COMMERCE_EVENT, sync);
  }, []);

  useEffect(() => {
    if (initialProductId && products.length > 0) {
      const match = products.find(
        (p) => p.id.toLowerCase() === initialProductId.toLowerCase() || slugify(p.title) === initialProductId.toLowerCase()
      );
      if (match) {
        setSelectedProduct(match);
        setActiveImage(productPrimaryImage(match));
        setSelectedSize("");
      }
    }
  }, [initialProductId, products]);

  useEffect(() => {
    if (selectedProduct) {
      setActiveImage(productPrimaryImage(selectedProduct));
      setSelectedSize("");
    }
  }, [selectedProduct?.id]);

  const tones = useMemo(() => ["All", ...Array.from(new Set(products.map((product) => product.tone)))], [products]);

  const visible = useMemo(() => {
    return products
      .filter((product) => {
        const haystack = `${product.title} ${product.edition} ${product.tone} ${product.status}`.toLowerCase();
        const matchesQuery = haystack.includes(query.trim().toLowerCase());
        const matchesCollection = selectedCollection === "All" || product.edition.toLowerCase().includes(selectedCollection.toLowerCase()) || product.title.toLowerCase().includes(selectedCollection.toLowerCase());
        const matchesStatus = status === "All" || product.status === status;
        const matchesTone = tone === "All" || product.tone === tone;
        const matchesStock = stock === "All" || (stock === "Available now" ? product.available > 0 : product.available <= 12);
        return matchesQuery && matchesCollection && matchesStatus && matchesTone && matchesStock;
      })
      .sort((a, b) => {
        if (sort === "Price low to high") return priceNumber(a.price) - priceNumber(b.price);
        if (sort === "Price high to low") return priceNumber(b.price) - priceNumber(a.price);
        if (sort === "Most limited") return a.produced - b.produced;
        if (sort === "Availability") return b.available - a.available;
        return a.title.localeCompare(b.title);
      });
  }, [products, query, selectedCollection, status, tone, stock, sort]);

  // Keep selected product FIRST in the catalogue
  const sortedProducts = useMemo(() => {
    if (!selectedProduct) return visible;
    const current = visible.find((p) => p.id === selectedProduct.id);
    const rest = visible.filter((p) => p.id !== selectedProduct.id);
    return current ? [current, ...rest] : visible;
  }, [visible, selectedProduct]);

  const handleSelectProduct = (product: CommerceProduct) => {
    setSelectedProduct(product);
    setActiveImage(productPrimaryImage(product));
    setSelectedSize("");
    window.location.hash = `#/shop/${product.id.toLowerCase()}`;
    const el = document.getElementById("selected-product-order");
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const handleAddToBag = () => {
    if (!selectedProduct || !selectedSize) return;
    add(
      {
        id: `${selectedProduct.id}-${selectedSize}`,
        title: selectedProduct.title,
        price: selectedProduct.price,
        image: activeImage || productPrimaryImage(selectedProduct),
        tone: selectedProduct.tone,
        size: selectedSize,
      },
      1
    );
    setAddedToBag(true);
    setCartOpen(true);
    setTimeout(() => setAddedToBag(false), 2500);
  };

  const handleBuyNow = () => {
    if (!selectedProduct || !selectedSize) return;
    add(
      {
        id: `${selectedProduct.id}-${selectedSize}`,
        title: selectedProduct.title,
        price: selectedProduct.price,
        image: activeImage || productPrimaryImage(selectedProduct),
        tone: selectedProduct.tone,
        size: selectedSize,
      },
      1
    );
    setCartOpen(true);
  };

  const selectedProductGallery = useMemo(() => {
    if (!selectedProduct) return [];
    return productImages(selectedProduct);
  }, [selectedProduct]);

  const isWished = selectedProduct ? wishlist.includes(selectedProduct.id) : false;

  return (
    <PageShell session={session} onLogout={onLogout} onLogin={onLogin} darkNav>
      {/* Aurora Hero from Pic 1 */}
      <section className="relative overflow-hidden bg-[var(--ink)] text-[var(--bone)] pt-20 pb-36 md:pt-24 md:pb-44 flex flex-col items-center justify-center min-h-[52svh]">
        <div className="absolute inset-0 animate-aurora opacity-30" style={{ background: "linear-gradient(135deg, oklch(0.2 0.08 60), oklch(0.12 0.1 80), oklch(0.18 0.06 40))", backgroundSize: "300% 300%" }} />
        <GoldenParticles count={30} className="z-[1] opacity-50" />
        <div className="absolute inset-0 luxe-grain z-[2]" />
        <div className="vignette absolute inset-0 z-[2]" />
        
        <div className="relative z-10 mx-auto flex flex-col items-center text-center max-w-4xl px-6 md:px-12 mt-4">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }} className="flex items-center gap-3 mb-6">
            <div className="h-px w-6 bg-[var(--gold)]/60" />
            <p className="eyebrow text-[var(--gold)]">The Follocia Atelier</p>
            <div className="h-px w-6 bg-[var(--gold)]/60" />
          </motion.div>
          
          <motion.h1 initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1, delay: 0.2, ease }} className="font-display text-[clamp(3rem,6vw,5.5rem)] leading-[0.95] tracking-[-0.01em]">
            Limited Pairs, <br className="hidden md:block" />
            <em className="font-light italic gradient-gold-text">Live Inventory.</em>
          </motion.h1>
          
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1, delay: 0.4 }} className="mt-8 max-w-2xl text-[13px] leading-relaxed text-[var(--bone)]/60">
            A highly curated commerce experience. Browse exclusive editions with live stock synchronization, white-glove dispatch status, and sophisticated filtering.
          </motion.p>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1, delay: 0.6 }} className="mt-10 flex flex-wrap justify-center gap-3">
            {["FOLLOCIA10 active at checkout", "White-glove dispatch", "Dynamic inventory mapping"].map((item) => (
              <div key={item} className="flex items-center gap-2 rounded-full border border-[var(--bone)]/10 bg-[var(--ink)]/40 backdrop-blur-md px-4 py-1.5 text-[10px] uppercase tracking-widest text-[var(--bone)]/80">
                <span className="h-1 w-1 rounded-full bg-[var(--gold)] animate-pulse" />
                {item}
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      <section className="mx-auto max-w-[1500px] px-6 py-10 md:px-12">
        {/* Floating Filter Bar matching Pic 1, 2, 3, 4 */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ duration: 0.8, delay: 0.4 }} 
          className="mb-10 flex flex-wrap items-center justify-between gap-4 rounded-full border border-[var(--ink)]/10 bg-white/95 backdrop-blur-xl px-6 py-2.5 shadow-[var(--shadow-soft)] relative z-20 -mt-8 md:-mt-10 w-fit mx-auto max-w-full"
        >
          <div className="flex flex-wrap items-center gap-4 md:gap-6">
            <div className="relative flex items-center">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="absolute left-3 text-[var(--ink)]/40"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
              <input 
                value={query} 
                onChange={(e) => setQuery(e.target.value)} 
                placeholder="Search..." 
                className="h-9 w-32 md:w-40 bg-transparent pl-9 pr-3 text-xs outline-none transition-all focus:w-48 placeholder:text-[var(--ink)]/40 text-[var(--ink)]" 
              />
            </div>
            
            <div className="h-4 w-px bg-[var(--ink)]/15 hidden sm:block" />

            <div className="flex flex-wrap items-center gap-4 md:gap-5">
              <FilterDropdown
                label="STATUS"
                value={status}
                options={["All", "Live"]}
                onChange={setStatus}
              />

              <FilterDropdown
                label="MATERIAL"
                value={tone}
                options={tones}
                onChange={setTone}
              />

              <FilterDropdown
                label="STOCK"
                value={stock}
                options={["All", "Available now", "Last pairs"]}
                onChange={setStock}
              />

              <FilterDropdown
                label="SORT"
                value={sort}
                options={["Featured", "Price low to high", "Price high to low", "Most limited", "Availability"]}
                onChange={setSort}
              />
            </div>
          </div>
          
          <div className="h-4 w-px bg-[var(--ink)]/15 hidden md:block" />

          <button 
            type="button"
            onClick={() => { setQuery(""); setStatus("All"); setTone("All"); setStock("All"); setSort("Featured"); setSelectedCollection("All"); }} 
            className="text-[10px] uppercase tracking-widest text-[var(--ink)]/50 hover:text-[var(--gold)] transition-colors cursor-pointer"
          >
            CLEAR
          </button>
        </motion.div>

        {/* VIP Preview and Active access banners matching Pic 1 */}
        <div className="mb-10 grid grid-cols-1 md:grid-cols-12 gap-6 items-center border-b border-[var(--ink)]/10 pb-8">
          <div className="md:col-span-4">
            <h2 className="font-display text-3xl md:text-4xl text-[var(--ink)]">Catalogue.</h2>
            <p className="mt-1 text-xs uppercase tracking-widest text-[var(--ink)]/50">
              {visible.length} pieces found
            </p>
          </div>
          
          <div className="md:col-span-4 border-l border-[var(--ink)]/10 pl-6">
            <p className="eyebrow text-[var(--gold)] text-[10px] tracking-widest">VIP PREVIEW</p>
            <h4 className="mt-1 font-semibold text-sm text-[var(--ink)]">Noire Autumn/Winter Drop</h4>
            <p className="mt-0.5 text-xs text-[var(--ink)]/60">VIP preview active, public release Monday</p>
          </div>

          <div className="md:col-span-4 border-l border-[var(--ink)]/10 pl-6">
            <p className="eyebrow text-emerald-600 text-[10px] tracking-widest">ACTIVE</p>
            <h4 className="mt-1 font-semibold text-sm text-[var(--ink)]">Private Preview Access</h4>
            <p className="mt-0.5 text-xs text-[var(--ink)]/60">Private Atelier and VIP customers see preview pairs</p>
          </div>
        </div>

        {/* Collection Filter Tabs */}
        <div className="mb-10 flex flex-wrap items-center justify-center gap-2">
          {["All", "Aura", "Bloom", "Muse", "Noire"].map((col) => (
            <button
              key={col}
              type="button"
              onClick={() => setSelectedCollection(col)}
              className={`rounded-full px-5 py-2 text-xs font-semibold uppercase tracking-wider transition-all duration-300 cursor-pointer ${
                selectedCollection === col
                  ? "bg-[#24130d] text-[#fffdf8] shadow-md"
                  : "bg-white/80 text-[#4b261a99] border border-[#4b261a1a] hover:border-[#4b261a40] hover:text-[#24130d]"
              }`}
            >
              {col}
            </button>
          ))}
        </div>

        {/* Selected Product Order Section */}
        {selectedProduct && (
          <section id="selected-product-order" className="mb-16 rounded-3xl border border-[#4b261a1a] bg-[#fffdf8] p-6 md:p-10 shadow-[0_20px_60px_rgba(75,38,26,0.08)]">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-[#4b261a12] pb-4">
              <div className="flex items-center gap-3">
                <span className="h-2 w-2 rounded-full bg-[var(--gold)] animate-pulse" />
                <span className="eyebrow text-[var(--gold)]">Order Selected Piece</span>
                <span className="rounded-full bg-[#fffaf0] border border-[#4b261a20] px-3 py-1 text-xs font-semibold text-[#24130d]">
                  {selectedProduct.title}
                </span>
              </div>
              <div className="flex items-center gap-4 text-xs">
                <span className="text-[var(--ink)]/50">Click any piece below to switch</span>
                <button
                  type="button"
                  onClick={() => {
                    const el = document.getElementById("catalogue-grid");
                    if (el) el.scrollIntoView({ behavior: "smooth" });
                  }}
                  className="eyebrow text-[var(--gold)] hover:underline cursor-pointer"
                >
                  Browse all designs ↓
                </button>
              </div>
            </div>

            {/* The 2-column order view */}
            <div className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr] xl:grid-cols-[1.1fr_0.9fr]">
              {/* Product Gallery */}
              <div className="grid gap-4">
                <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-[#fffaf0] border border-[#4b261a12] shadow-sm flex items-center justify-center p-6">
                  <img
                    src={activeImage || productPrimaryImage(selectedProduct)}
                    alt={selectedProduct.title}
                    className="max-h-[90%] max-w-[90%] object-contain mix-blend-multiply transition-transform duration-500 hover:scale-105"
                  />
                  <div className="absolute left-3.5 top-3.5 rounded bg-white/90 px-2.5 py-1 text-[9px] font-semibold uppercase tracking-wider text-[#24130d] shadow-sm">
                    {selectedProduct.status || "AVAILABLE"}
                  </div>
                </div>

                {/* Thumbnails */}
                {selectedProductGallery.length > 1 && (
                  <div className="flex flex-wrap gap-3">
                    {selectedProductGallery.map((img, idx) => (
                      <button
                        key={`${img}-${idx}`}
                        type="button"
                        onClick={() => setActiveImage(img)}
                        className={`h-16 w-16 overflow-hidden rounded-xl border p-1 bg-[#fffaf0] transition-all cursor-pointer ${
                          (activeImage || productPrimaryImage(selectedProduct)) === img
                            ? "border-[var(--gold)] ring-2 ring-[var(--gold)]/30 scale-105"
                            : "border-[#4b261a1a] opacity-70 hover:opacity-100"
                        }`}
                      >
                        <img src={img} alt="" className="h-full w-full object-contain mix-blend-multiply" />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Order Form & Details */}
              <div className="flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="eyebrow text-[var(--gold)]">{selectedProduct.edition || "FOLLICIA ATELIER"}</p>
                      <h2 className="mt-2 font-display text-4xl md:text-5xl text-[#24130d] leading-tight">
                        {selectedProduct.title}
                      </h2>
                      <p className="mt-2 text-xs uppercase tracking-widest text-[#4b261a99]">
                        Colour: <strong className="text-[#24130d] font-semibold">{selectedProduct.tone}</strong>
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => toggleWish(selectedProduct.id)}
                      aria-label="Wishlist"
                      className="grid h-12 w-12 shrink-0 place-items-center rounded-full border border-[#4b261a1a] bg-white shadow-sm transition-transform hover:scale-110 cursor-pointer"
                    >
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill={isWished ? "var(--gold)" : "none"}
                        stroke={isWished ? "var(--gold)" : "currentColor"}
                        strokeWidth="1.6"
                      >
                        <path d="M12 21s-7-4.35-7-10a4 4 0 0 1 7-2.65A4 4 0 0 1 19 11c0 5.65-7 10-7 10z" />
                      </svg>
                    </button>
                  </div>

                  <div className="mt-4 flex items-baseline gap-4">
                    <span className="font-display text-3xl font-semibold text-[#24130d]">{selectedProduct.price}</span>
                    <span className="text-xs text-emerald-700 font-medium bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                      Inclusive of all taxes · Free Shipping
                    </span>
                  </div>

                  {/* Size Selector */}
                  <div className="mt-8 border-t border-[#4b261a12] pt-6">
                    <div className="flex items-center justify-between">
                      <span className="eyebrow text-[#4b261a80]">Select EU Size</span>
                      <span className="text-[10px] uppercase tracking-widest text-[#4b261a60]">Italian Sizing</span>
                    </div>

                    <div className="mt-3.5 flex flex-wrap gap-3">
                      {sizes.map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setSelectedSize(s)}
                          className={`h-12 w-14 rounded-xl border text-sm font-semibold transition-all cursor-pointer ${
                            selectedSize === s
                              ? "border-[#24130d] bg-[#24130d] text-[#fffdf8] shadow-md scale-105"
                              : "border-[#4b261a20] bg-white text-[#24130d] hover:border-[var(--gold)]"
                          }`}
                        >
                          {s}
                        </button>
                      ))}
                    </div>

                    {!selectedSize && (
                      <p className="mt-2.5 text-xs text-[var(--gold)] font-medium">
                        Please choose a size to reserve pair
                      </p>
                    )}

                    <div className="mt-3 rounded-lg border border-[#4b261a12] bg-[#fffaf0] p-3 text-xs text-[#4b261a99]">
                      <strong className="font-semibold text-[#24130d]">Size confidence: </strong>
                      <span>{sizeConfidence(selectedProduct, selectedSize)}</span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="mt-6 flex flex-col sm:flex-row gap-3">
                    <button
                      type="button"
                      onClick={handleAddToBag}
                      disabled={!selectedSize}
                      className={`flex-1 rounded-full py-4 px-6 text-xs font-semibold uppercase tracking-widest transition-all ${
                        selectedSize
                          ? "bg-[#24130d] text-[#fffdf8] hover:bg-[#3d1f14] shadow-lg hover:shadow-xl cursor-pointer"
                          : "bg-gray-200 text-gray-400 cursor-not-allowed"
                      }`}
                    >
                      {addedToBag ? "✓ Added to Bag!" : selectedSize ? "Add to Bag / Reserve Pair →" : "Select Size First"}
                    </button>

                    <button
                      type="button"
                      onClick={handleBuyNow}
                      disabled={!selectedSize}
                      className={`rounded-full py-4 px-8 text-xs font-semibold uppercase tracking-widest border transition-all ${
                        selectedSize
                          ? "border-[#24130d] bg-white text-[#24130d] hover:bg-[#24130d] hover:text-white cursor-pointer"
                          : "border-gray-200 text-gray-300 cursor-not-allowed"
                      }`}
                    >
                      Buy Now (Card / UPI / COD)
                    </button>
                  </div>

                  <div className="mt-4 flex items-center justify-center gap-4 text-xs text-[#4b261a80]">
                    <span className="flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Dispatches in 24-48 hrs
                    </span>
                    <span>·</span>
                    <span>100% Original &amp; Handcrafted</span>
                    <span>·</span>
                    <span>Complimentary Returns</span>
                  </div>
                </div>

                {/* Collapsible details */}
                <div className="mt-8 border-t border-[#4b261a12] pt-4">
                  {["Product Details", "Delivery & Returns", "Care Instructions"].map((panel) => (
                    <div key={panel} className="border-b border-[#4b261a12]">
                      <button
                        type="button"
                        onClick={() => setOpenAccordion(openAccordion === panel ? "" : panel)}
                        className="flex w-full items-center justify-between py-3 text-xs font-semibold uppercase tracking-widest text-[#24130d] cursor-pointer"
                      >
                        <span>{panel}</span>
                        <span className="text-sm">{openAccordion === panel ? "−" : "+"}</span>
                      </button>
                      {openAccordion === panel && (
                        <div className="pb-4 text-xs leading-relaxed text-[#4b261a99]">
                          {panel === "Product Details" && (
                            <p>
                              Numbered limited edition construction with memory foam cushioning, sculpted heel balance, and genuine leather lining. Constructed using traditional Florentine atelier techniques.
                            </p>
                          )}
                          {panel === "Delivery & Returns" && (
                            <p>
                              Complimentary white-glove shipping across India. Standard dispatch within 24-48 hours. 7-day doorstep return and size exchange service included.
                            </p>
                          )}
                          {panel === "Care Instructions" && (
                            <p>
                              Store in the provided breathable cotton dust bag. Wipe clean with a soft dry cloth. Avoid prolonged exposure to moisture or direct sunlight.
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* All Products Catalogue Grid */}
        <div id="catalogue-grid" className="mt-12">
          <div className="mb-6 flex items-center justify-between">
            <h3 className="font-display text-2xl md:text-3xl text-[#24130d]">
              {selectedProduct ? "All Collection Designs" : "Explore All Designs"}
            </h3>
            <span className="text-xs uppercase tracking-widest text-[#4b261a80]">
              {sortedProducts.length} pieces available
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            <AnimatePresence mode="popLayout">
              {sortedProducts.map((product, index) => {
                const isSelected = selectedProduct?.id === product.id;
                return (
                  <motion.div
                    key={product.id}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.35 }}
                  >
                    <ProductCard
                      product={product}
                      index={index}
                      isSelected={isSelected}
                      onSelect={() => handleSelectProduct(product)}
                    />
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>

          {sortedProducts.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="my-24 flex flex-col items-center justify-center border border-[var(--ink)]/10 bg-white py-32 text-center shadow-[var(--shadow-soft)]"
            >
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="1" className="mb-6 opacity-60">
                <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <h2 className="font-display text-4xl">No pieces match your search.</h2>
              <p className="mt-4 text-[var(--ink)]/60">Try adjusting your filters or search terms.</p>
              <button
                onClick={() => {
                  setQuery("");
                  setStatus("All");
                  setTone("All");
                  setStock("All");
                }}
                className="magnetic-btn mt-8 bg-[var(--ink)] px-8 py-4 eyebrow text-[var(--bone)] transition-colors hover:bg-[var(--gold)] hover:text-[var(--ink)] cursor-pointer"
              >
                Reset all filters
              </button>
            </motion.div>
          )}
        </div>
      </section>
    </PageShell>
  );
}

export function ProductDetailPage({
  productId,
  session,
  onLogout,
  onLogin,
}: {
  productId: string;
  session: AuthSession | null;
  onLogout: () => void;
  onLogin: () => void;
}) {
  return (
    <ShopPage
      initialProductId={productId}
      session={session}
      onLogout={onLogout}
      onLogin={onLogin}
    />
  );
}

export function CollectionsPage({ session, onLogout, onLogin }: { session: AuthSession | null; onLogout: () => void; onLogin: () => void }) {
  const [products, setProducts] = useState<CommerceProduct[]>(() => liveProducts());
  useEffect(() => {
    const sync = () => setProducts(liveProducts());
    window.addEventListener(COMMERCE_EVENT, sync);
    void syncCommerceFromBackend();
    return () => window.removeEventListener(COMMERCE_EVENT, sync);
  }, []);

  return (
    <PageShell session={session} onLogout={onLogout} onLogin={onLogin} darkNav>
      <section className="bg-[var(--ink)] text-[var(--bone)] -mt-20 pt-40 pb-20">
        <div className="mx-auto max-w-[1500px] px-6 md:px-12">
          <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="eyebrow text-[var(--gold)]">The Archives</motion.p>
          <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mt-5 max-w-5xl font-display text-[clamp(4rem,9vw,8.5rem)] leading-[0.86]">
            Numbered editions,<br/>never repeated.
          </motion.h1>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="mt-8 max-w-xl text-[var(--bone)]/60 text-lg">
            Explore the complete history of Follocia drops. Once a collection sells out, its molds are destroyed.
          </motion.p>
        </div>
      </section>

      <section className="mx-auto max-w-[1500px] px-6 py-20 md:px-12 bg-[var(--bone)]">
        <div className="grid gap-y-32">
          {products.map((product, index) => (
            <motion.a 
              key={product.id} 
              href={productPath(product)} 
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-10%" }}
              transition={{ duration: 0.8, ease }}
              className="group grid gap-8 md:grid-cols-[1fr_1fr] lg:grid-cols-[1.2fr_0.8fr] items-center"
            >
              <div className={`overflow-hidden relative bg-[var(--champagne)]/30 ${index % 2 !== 0 ? 'md:order-2' : ''}`}>
                <motion.div whileHover={{ scale: 1.05 }} transition={{ duration: 1.5, ease: "easeOut" }} className="aspect-[4/3] w-full">
                  <img src={productPrimaryImage(product)} alt={product.title} className="h-full w-full object-cover" />
                </motion.div>
                <div className="absolute inset-0 bg-black/20 opacity-0 transition-opacity duration-500 group-hover:opacity-100 flex items-center justify-center backdrop-blur-sm">
                  <span className="bg-white/90 px-6 py-3 eyebrow text-[var(--ink)]">View Collection</span>
                </div>
              </div>
              
              <div className={`flex flex-col justify-center ${index % 2 !== 0 ? 'md:order-1 md:pr-16 lg:pr-24' : 'md:pl-16 lg:pl-24'}`}>
                <div className="flex items-center gap-4">
                  <span className="font-display text-5xl text-[var(--gold)]/30">No. {String(index + 1).padStart(2, "0")}</span>
                  <div className="h-px w-16 bg-[var(--gold)]/30" />
                </div>
                <h2 className="mt-6 font-display text-[clamp(2.5rem,4vw,4rem)] leading-tight group-hover:text-[var(--gold)] transition-colors duration-500">{product.title}</h2>
                <div className="mt-6 grid grid-cols-2 gap-4 border-y border-[var(--ink)]/10 py-6">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-[var(--ink)]/40">Edition</p>
                    <p className="mt-1 font-semibold text-[var(--ink)]">{product.edition}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-[var(--ink)]/40">Material</p>
                    <p className="mt-1 font-semibold text-[var(--ink)]">{product.tone}</p>
                  </div>
                </div>
                <p className="mt-6 text-[var(--ink)]/60 leading-relaxed">
                  Produced in a strictly limited run of {product.produced} pairs. {product.available === 0 ? "Fully archived and no longer available." : `Only ${product.available} remaining in the atelier.`}
                </p>
              </div>
            </motion.a>
          ))}
        </div>
      </section>
    </PageShell>
  );
}

function CheckoutInput({ label, value, onChange, wide }: { label: string; value: string; onChange: (value: string) => void; wide?: boolean }) {
  return (
    <label className={`grid gap-2 text-xs uppercase tracking-[0.16em] text-[var(--ink)]/50 ${wide ? "md:col-span-3" : ""}`}>
      {label}
      <input value={value} onChange={(event) => onChange(event.target.value)} className="h-12 border border-[var(--ink)]/20 bg-transparent px-4 normal-case tracking-normal outline-none transition-all focus:border-[var(--gold)] focus:shadow-[0_0_10px_oklch(0.78_0.12_80/0.1)]" />
    </label>
  );
}

export function SecureCheckoutPage({ session, onLogout, onLogin }: { session: AuthSession | null; onLogout: () => void; onLogin: () => void }) {
  const { items, clear } = useCart();
  const profile = useMemo(() => (session ? ensureCustomer(session.user) : null), [session]);
  const [step, setStep] = useState<"delivery" | "payment" | "done">("delivery");
  const [deliveryType, setDeliveryType] = useState("Home Delivery");
  const [paymentMethod, setPaymentMethod] = useState("Card Authorization");
  const [billingSame, setBillingSame] = useState(true);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<CommerceAddress>(() => ({
    id: `addr-${Date.now()}`,
    firstName: profile?.firstName || "",
    lastName: profile?.lastName || "",
    company: "",
    address: "",
    address2: "",
    city: "",
    country: "India",
    region: "",
    zip: "",
    phone: profile?.phone || "",
    isDefault: true,
  }));
  const [billing, setBilling] = useState<CommerceAddress>(() => ({ ...draft, id: `bill-${Date.now()}` }));
  const [selectedAddress, setSelectedAddress] = useState(profile?.addresses.find((address) => address.isDefault)?.id || profile?.addresses[0]?.id || "new");
  const subtotal = items.reduce((sum, item) => sum + (priceNumber(item.price) * item.qty), 0);
  const checkoutCoupon = readCheckoutCoupon(subtotal);
  const discount = checkoutCoupon?.discount ?? 0;
  const orderTotal = Math.max(subtotal - discount, 0);

  useEffect(() => {
    if (!profile) return;
    setSelectedAddress(profile.addresses.find((address) => address.isDefault)?.id || profile.addresses[0]?.id || "new");
  }, [profile]);

  const setDraftField = (key: keyof CommerceAddress, value: string | boolean) => setDraft((current) => ({ ...current, [key]: value }));
  const setBillingField = (key: keyof CommerceAddress, value: string | boolean) => setBilling((current) => ({ ...current, [key]: value }));
  const activeAddress = selectedAddress === "new" ? draft : profile?.addresses.find((address) => address.id === selectedAddress) || draft;

  const placeOrder = async () => {
    if (!session || !profile || items.length === 0) return;
    setSaving(true);
    let customer: CustomerProfile = profile;
    if (selectedAddress === "new") {
      const addresses = draft.isDefault ? profile.addresses.map((address) => ({ ...address, isDefault: false })) : profile.addresses;
      customer = { ...profile, addresses: [...addresses, draft], phone: draft.phone || profile.phone };
      upsertCustomer(customer);
      await saveCustomerRemote(customer);
    }
    await createOrdersFromCartRemote(items, customer, {
      deliveryAddress: `${deliveryType}: ${addressLine(activeAddress)}${billingSame ? "" : ` | Billing: ${addressLine(billing)}`}`,
      paymentMethod: `${paymentMethod}${checkoutCoupon ? ` / Coupon ${checkoutCoupon.code}` : ""}`,
    });
    clear();
    setSaving(false);
    setStep("done");
  };

  return (
    <PageShell session={session} onLogout={onLogout} onLogin={onLogin} darkNav>
      <section className="border-b border-[var(--ink)]/10 bg-[var(--ink)] text-[var(--bone)] -mt-20 pt-20">
        <div className="mx-auto flex max-w-[1200px] items-center justify-between px-6 py-8 md:px-12">
          <a href="/" className="font-display text-3xl hover:text-[var(--gold)] transition-colors">Follocia</a>
          <span className="eyebrow text-[var(--gold)]">Secure Checkout</span>
        </div>
      </section>

      <section className="bg-[var(--bone)] py-10 min-h-screen">
        {!session ? (
          <div className="mx-auto grid min-h-[60vh] max-w-[720px] place-items-center px-6 text-center">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass border border-[var(--ink)]/10 p-16 shadow-[var(--shadow-soft)] bg-white/80">
              <h1 className="font-display text-6xl">Sign in to checkout.</h1>
              <p className="mt-4 text-[var(--ink)]/60">Reserve your pair from the private atelier.</p>
              <button onClick={onLogin} className="magnetic-btn mt-8 bg-[var(--ink)] px-8 py-4 eyebrow text-white transition-colors hover:bg-[var(--gold)] hover:text-[var(--ink)]">Open Login</button>
            </motion.div>
          </div>
        ) : items.length === 0 && step !== "done" ? (
          <div className="mx-auto grid min-h-[60vh] max-w-[720px] place-items-center px-6 text-center">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass border border-[var(--ink)]/10 p-16 shadow-[var(--shadow-soft)] bg-white/80">
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="1" className="mx-auto mb-6 opacity-60"><path d="M6 7h12l-1 13H7L6 7z" /><path d="M9 7a3 3 0 1 1 6 0" /></svg>
              <h1 className="font-display text-5xl">Your bag is empty.</h1>
              <a href="#/shop" className="magnetic-btn mt-8 inline-block bg-[var(--ink)] px-8 py-4 eyebrow text-white transition-colors hover:bg-[var(--gold)] hover:text-[var(--ink)]">Start shopping</a>
            </motion.div>
          </div>
        ) : step === "done" ? (
          <div className="mx-auto grid min-h-[60vh] max-w-[820px] place-items-center px-6 text-center">
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="relative glass border border-[var(--gold)]/30 p-16 shadow-[var(--shadow-gold-glow)] bg-white/90">
              <GoldenParticles count={30} className="z-0" />
              <div className="relative z-10">
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", delay: 0.2 }} className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-[var(--gold)]/20 text-3xl text-[var(--gold)] mb-6">✓</motion.div>
                <p className="eyebrow text-[var(--gold)]">Order placed</p>
                <h1 className="mt-4 font-display text-6xl md:text-7xl">Reservation confirmed.</h1>
                <p className="mt-6 text-[var(--ink)]/60 max-w-md mx-auto">Your limited pair has been reserved. You will receive white-glove delivery updates in your account.</p>
                <a href="#/account/my-orders" className="magnetic-btn mt-8 inline-block bg-[var(--ink)] px-8 py-4 eyebrow text-white transition-colors hover:bg-[var(--gold)] hover:text-[var(--ink)]">View Orders Timeline</a>
              </div>
            </motion.div>
          </div>
        ) : (
          <div className="mx-auto grid max-w-[1300px] gap-8 px-6 py-10 md:px-12 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="grid gap-6 h-fit">
              <motion.article initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="glass border border-[var(--ink)]/10 bg-white/80 shadow-[var(--shadow-soft)] relative overflow-hidden">
                {step !== "delivery" && <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500" />}
                <header className="grid grid-cols-[76px_1fr_auto] items-center border-b border-[var(--ink)]/10">
                  <div className="grid h-20 place-items-center bg-[var(--gold)]/10 text-2xl text-[var(--gold)]">✓</div>
                  <h2 className="px-6 font-display text-2xl text-[var(--ink)]">Identity</h2>
                </header>
                <div className="px-10 py-8">
                  <p className="text-sm text-[var(--ink)]/60">Checkout securely as</p>
                  <p className="mt-1 text-lg font-semibold">{session.user.email}</p>
                </div>
              </motion.article>

              <motion.article initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }} className={`glass border bg-white/80 shadow-[var(--shadow-soft)] relative overflow-hidden ${step === "payment" ? "border-[var(--ink)]/10" : "border-[var(--gold)] shadow-[0_0_20px_oklch(0.78_0.12_80/0.1)]"}`}>
                {step === "payment" && <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500" />}
                <header className="grid grid-cols-[76px_1fr_auto] items-center border-b border-[var(--ink)]/10">
                  <div className={`grid h-20 place-items-center text-xl font-display ${step === "payment" ? "bg-[var(--gold)]/10 text-[var(--gold)]" : "bg-[var(--ink)] text-white"}`}>{step === "payment" ? "✓" : "2"}</div>
                  <h2 className="px-6 font-display text-2xl">Delivery</h2>
                  {step === "payment" && <button onClick={() => setStep("delivery")} className="px-6 text-sm underline text-[var(--gold)]">Edit</button>}
                </header>
                <AnimatePresence>
                  {step === "delivery" ? (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="grid gap-8 p-10">
                      <div>
                        <p className="eyebrow text-[var(--gold)] mb-3">Delivery Method</p>
                        <div className="grid gap-3 md:grid-cols-2">
                          {["Home Delivery", "Store Collection"].map((item) => (
                            <button key={item} onClick={() => setDeliveryType(item)} className={`border px-5 py-5 text-left text-sm font-semibold transition-all ${deliveryType === item ? "border-[var(--gold)] bg-[var(--gold)]/5 shadow-[0_0_10px_oklch(0.78_0.12_80/0.1)]" : "border-[var(--ink)]/15 hover:border-[var(--gold)]/50"}`}>
                              <span className={`inline-block w-3 h-3 rounded-full mr-3 border ${deliveryType === item ? "bg-[var(--gold)] border-[var(--gold)]" : "border-[var(--ink)]/30"}`} />
                              {item}
                            </button>
                          ))}
                        </div>
                      </div>
                      
                      {(profile?.addresses?.length ?? 0) > 0 && (
                        <div>
                          <p className="eyebrow text-[var(--gold)] mb-3">Saved Addresses</p>
                          <div className="grid gap-3">
                            {profile?.addresses.map((address) => (
                              <label key={address.id} className={`flex gap-4 border p-5 text-sm cursor-pointer transition-all ${selectedAddress === address.id ? "border-[var(--gold)] bg-[var(--gold)]/5" : "border-[var(--ink)]/10 hover:border-[var(--gold)]/50"}`}>
                                <input type="radio" checked={selectedAddress === address.id} onChange={() => setSelectedAddress(address.id)} className="mt-1 accent-[var(--gold)]" />
                                <div>
                                  {address.isDefault && <span className="inline-block bg-[var(--gold)] px-2 py-0.5 text-[0.6rem] uppercase tracking-widest text-[var(--ink)] mb-2 rounded-sm">Default</span>}
                                  <p>{addressLine(address)}</p>
                                </div>
                              </label>
                            ))}
                            <label className={`flex gap-4 border p-5 text-sm cursor-pointer transition-all ${selectedAddress === "new" ? "border-[var(--gold)] bg-[var(--gold)]/5" : "border-[var(--ink)]/10 hover:border-[var(--gold)]/50"}`}>
                              <input type="radio" checked={selectedAddress === "new"} onChange={() => setSelectedAddress("new")} className="mt-1 accent-[var(--gold)]" />
                              <span className="font-semibold">Add a new address</span>
                            </label>
                          </div>
                        </div>
                      )}

                      <AnimatePresence>
                        {selectedAddress === "new" && (
                          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                            <div className="grid gap-4 md:grid-cols-3 border-t border-[var(--ink)]/10 pt-6">
                              <CheckoutInput label="First Name*" value={draft.firstName} onChange={(value) => setDraftField("firstName", value)} />
                              <CheckoutInput label="Last Name*" value={draft.lastName} onChange={(value) => setDraftField("lastName", value)} />
                              <CheckoutInput label="Phone Number*" value={draft.phone} onChange={(value) => setDraftField("phone", value)} />
                              <CheckoutInput label="Find Your Address*" value={draft.address} onChange={(value) => setDraftField("address", value)} wide />
                              <CheckoutInput label="City*" value={draft.city} onChange={(value) => setDraftField("city", value)} />
                              <CheckoutInput label="Region*" value={draft.region} onChange={(value) => setDraftField("region", value)} />
                              <CheckoutInput label="Zip*" value={draft.zip} onChange={(value) => setDraftField("zip", value)} />
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                      
                      <button disabled={selectedAddress === "new" && (!draft.firstName || !draft.lastName || !draft.phone || !draft.address)} onClick={() => setStep("payment")} className="magnetic-btn ml-auto w-full bg-[var(--ink)] px-8 py-4 eyebrow text-[var(--bone)] disabled:opacity-50 md:w-auto transition-colors hover:bg-[var(--gold)] hover:text-[var(--ink)] hover:shadow-[var(--shadow-gold-glow)]">Continue to Payment →</button>
                    </motion.div>
                  ) : (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid gap-6 p-10 text-sm md:grid-cols-3 bg-[var(--bone)]/30">
                      <div><strong className="text-[var(--gold)] eyebrow">Delivery Method</strong><p className="mt-3 font-medium">{deliveryType}</p></div>
                      <div><strong className="text-[var(--gold)] eyebrow">Delivery Address</strong><p className="mt-3 text-[var(--ink)]/70">{addressLine(activeAddress)}</p></div>
                      <div><strong className="text-[var(--gold)] eyebrow">Delivery Option</strong><p className="mt-3 text-[var(--ink)]/70">Complimentary</p></div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.article>

              <motion.article initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }} className={`glass border bg-white/80 shadow-[var(--shadow-soft)] ${step === "payment" ? "border-[var(--gold)] shadow-[0_0_20px_oklch(0.78_0.12_80/0.1)]" : "border-[var(--ink)]/15 text-[var(--ink)]/50"}`}>
                <header className="grid grid-cols-[76px_1fr] items-center border-b border-[var(--ink)]/10">
                  <div className={`grid h-20 place-items-center text-xl font-display ${step === "payment" ? "bg-[var(--ink)] text-white" : "bg-[var(--ink)]/5"}`}>3</div>
                  <h2 className="px-6 font-display text-2xl">Payment</h2>
                </header>
                <AnimatePresence>
                  {step === "payment" && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} className="grid gap-8 p-10">
                      <div>
                        <div className="flex items-center justify-between"><p className="eyebrow text-[var(--gold)]">Billing Address</p><button onClick={() => setBillingSame((value) => !value)} className="text-sm underline">Edit</button></div>
                        <label className="mt-4 flex items-center gap-3 text-sm cursor-pointer"><input type="checkbox" checked={billingSame} onChange={(event) => setBillingSame(event.target.checked)} className="w-4 h-4 accent-[var(--gold)]" />Same as delivery address</label>
                        <AnimatePresence>
                          {!billingSame && (
                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                              <div className="mt-5 grid gap-4 md:grid-cols-3 border-t border-[var(--ink)]/10 pt-5">
                                <CheckoutInput label="First Name" value={billing.firstName} onChange={(value) => setBillingField("firstName", value)} />
                                <CheckoutInput label="Last Name" value={billing.lastName} onChange={(value) => setBillingField("lastName", value)} />
                                <CheckoutInput label="Phone" value={billing.phone} onChange={(value) => setBillingField("phone", value)} />
                                <CheckoutInput label="Billing Address" value={billing.address} onChange={(value) => setBillingField("address", value)} wide />
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                      
                      <div>
                        <p className="eyebrow text-[var(--gold)] mb-3">Payment Method</p>
                        <div className="grid gap-3 md:grid-cols-3">
                          {["Card Authorization", "UPI Intent", "Cash on Delivery"].map((item) => (
                            <button key={item} onClick={() => setPaymentMethod(item)} className={`border px-4 py-4 text-sm font-semibold transition-all ${paymentMethod === item ? "border-[var(--gold)] bg-[var(--gold)]/5 shadow-[0_0_10px_oklch(0.78_0.12_80/0.1)]" : "border-[var(--ink)]/15 hover:border-[var(--gold)]/50"}`}>
                              {item}
                            </button>
                          ))}
                        </div>
                      </div>
                      
                      <button onClick={placeOrder} disabled={saving} className="magnetic-btn w-full bg-[var(--ink)] px-8 py-5 eyebrow text-white disabled:opacity-50 transition-colors hover:bg-[var(--gold)] hover:text-[var(--ink)] hover:shadow-[var(--shadow-gold-glow)]">
                        {saving ? "Processing securely..." : `Pay ₹ ${orderTotal.toLocaleString("en-IN")}`}
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.article>
            </div>

            <motion.aside initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="h-fit glass border border-[var(--ink)]/10 bg-white/80 p-8 shadow-[var(--shadow-soft)] lg:sticky lg:top-28 backdrop-blur-xl">
              <div className="flex items-center justify-between border-b border-[var(--ink)]/10 pb-6"><h2 className="font-display text-2xl">Order Summary</h2><a href="#/shop" className="text-sm underline text-[var(--gold)] hover:text-[var(--ink)] transition-colors">Edit Bag</a></div>
              <div className="mt-5 grid gap-3 border border-[var(--gold)]/25 bg-[var(--gold)]/5 p-4 text-xs uppercase tracking-[0.14em] text-[var(--ink)]/60">
                <span>Secure authorization before capture</span>
                <span>White-glove dispatch updates in account</span>
                <span>Concierge support for size and delivery</span>
              </div>
              
              <div className="mt-6 grid gap-6 max-h-[40vh] overflow-y-auto pr-2">
                {items.map((item) => (
                  <div key={item.id} className="grid grid-cols-[80px_1fr] gap-4 group">
                    <div className="overflow-hidden bg-[var(--champagne)]/30"><img src={item.image} alt={item.title} className="aspect-[4/5] object-cover transition-transform duration-500 group-hover:scale-110" /></div>
                    <div className="text-sm flex flex-col justify-center">
                      <p className="eyebrow text-[var(--ink)]/50">{item.tone}</p>
                      <strong className="font-display text-lg leading-tight mt-1 group-hover:text-[var(--gold)] transition-colors">{item.title}</strong>
                      <div className="flex justify-between mt-2 text-[var(--ink)]/70">
                        <span>Size {item.size} × {item.qty}</span>
                        <span className="font-medium text-[var(--ink)]">{item.price}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-8 border-t border-[var(--ink)]/10 pt-6">
                <div className="grid gap-3 text-sm text-[var(--ink)]/70">
                  <div className="flex justify-between"><span>Subtotal</span><span>₹ {subtotal.toLocaleString("en-IN")}</span></div>
                  {discount > 0 && <div className="flex justify-between text-emerald-600 font-medium"><span>{checkoutCoupon?.title}</span><span>- ₹ {discount.toLocaleString("en-IN")}</span></div>}
                  <div className="flex justify-between"><span>Shipping</span><span>Complimentary</span></div>
                  <div className="flex justify-between"><span>Taxes & Duties</span><span>Included</span></div>
                </div>
                
                <div className="mt-6 border-t border-[var(--gold)]/30 pt-6">
                  <div className="flex justify-between items-end">
                    <span className="eyebrow text-[var(--ink)]/60">Estimated Total</span>
                    <span className="font-display text-3xl gradient-gold-text">₹ {orderTotal.toLocaleString("en-IN")}</span>
                  </div>
                </div>
              </div>
            </motion.aside>
          </div>
        )}
      </section>
    </PageShell>
  );
}

export function ContactPage({ session, onLogout, onLogin }: { session: AuthSession | null; onLogout: () => void; onLogin: () => void }) {
  const [sent, setSent] = useState(false);
  return (
    <PageShell session={session} onLogout={onLogout} onLogin={onLogin} darkNav>
      <section className="bg-[var(--ink)] text-[var(--bone)] -mt-20 pt-32 pb-16 relative overflow-hidden">
        <div className="absolute inset-0 animate-aurora opacity-30" style={{ background: "linear-gradient(135deg, oklch(0.2 0.08 60), oklch(0.12 0.1 80), oklch(0.18 0.06 40))", backgroundSize: "300% 300%" }} />
        <GoldenParticles count={20} className="z-[1] opacity-50" />
        <div className="absolute inset-0 luxe-grain z-[2]" />
        <div className="vignette absolute inset-0 z-[2]" />
        
        <div className="relative z-10 mx-auto max-w-[1300px] px-6 md:px-12 pt-10">
          <motion.p initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="eyebrow text-[var(--gold)]">Contact Follocia</motion.p>
          <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mt-5 font-display text-[clamp(4rem,8vw,8rem)] leading-[0.86]">Private concierge.</motion.h1>
        </div>
      </section>

      <section className="bg-[var(--bone)] py-20 relative">
        <div className="mx-auto grid max-w-[1300px] gap-12 px-6 md:px-12 lg:grid-cols-[0.8fr_1fr]">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
            <h2 className="font-display text-4xl">At your service.</h2>
            <p className="mt-6 max-w-md text-[var(--ink)]/60 text-lg leading-relaxed">For sizing, delivery updates, bespoke fittings, restoration and private collection previews. Our atelier responds within 2 hours.</p>
            
            <div className="mt-12 grid gap-6">
              <div className="glass border border-[var(--gold)]/20 bg-white/50 p-6 flex items-start gap-4">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[var(--gold)]/10 text-[var(--gold)]">✉</div>
                <div>
                  <p className="eyebrow text-[var(--ink)]/50">Direct Email</p>
                  <a href="mailto:concierge@follocia.com" className="mt-1 block text-lg font-semibold hover:text-[var(--gold)] transition-colors">concierge@follocia.com</a>
                </div>
              </div>
              
              <div className="glass border border-[var(--gold)]/20 bg-white/50 p-6 flex items-start gap-4">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[var(--gold)]/10 text-[var(--gold)]">📍</div>
                <div>
                  <p className="eyebrow text-[var(--ink)]/50">Private Fittings</p>
                  <p className="mt-1 font-semibold">Milan · Paris · Mumbai</p>
                  <p className="mt-2 text-sm text-[var(--ink)]/60">By appointment only for VIP tiers.</p>
                </div>
              </div>
            </div>
          </motion.div>
          
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="relative">
            {/* Decorative elements behind form */}
            <div className="absolute -inset-4 bg-gradient-to-r from-[var(--gold)]/20 to-[var(--champagne)]/20 blur-2xl opacity-50 z-0 rounded-[3rem]" />
            
            <form
              onSubmit={(event) => {
                event.preventDefault();
                setSent(true);
                event.currentTarget.reset();
              }}
              className="relative z-10 grid gap-5 glass border border-[var(--gold)]/20 bg-white/90 p-8 md:p-10 shadow-[var(--shadow-luxe)] backdrop-blur-xl"
            >
              <h3 className="font-display text-2xl mb-2">Send a Request</h3>
              <div className="grid gap-5 md:grid-cols-2">
                <label className="grid gap-2 text-xs uppercase tracking-[0.18em] text-[var(--ink)]/50">Name
                  <input name="name" required className="h-12 border border-[var(--ink)]/15 bg-transparent px-4 normal-case tracking-normal outline-none transition-all focus:border-[var(--gold)] focus:shadow-[0_0_10px_oklch(0.78_0.12_80/0.1)]" />
                </label>
                <label className="grid gap-2 text-xs uppercase tracking-[0.18em] text-[var(--ink)]/50">Email
                  <input name="email" required type="email" className="h-12 border border-[var(--ink)]/15 bg-transparent px-4 normal-case tracking-normal outline-none transition-all focus:border-[var(--gold)] focus:shadow-[0_0_10px_oklch(0.78_0.12_80/0.1)]" />
                </label>
              </div>
              <label className="grid gap-2 text-xs uppercase tracking-[0.18em] text-[var(--ink)]/50">Request type
                <select name="requestType" className="h-12 border border-[var(--ink)]/15 bg-transparent px-4 normal-case tracking-normal outline-none transition-all focus:border-[var(--gold)] cursor-pointer">
                  {["Sizing help", "Delivery update", "Private preview", "Restoration", "General"].map((item) => <option key={item}>{item}</option>)}
                </select>
              </label>
              <label className="grid gap-2 text-xs uppercase tracking-[0.18em] text-[var(--ink)]/50">Message
                <textarea name="message" required rows={6} className="border border-[var(--ink)]/15 bg-transparent p-4 normal-case tracking-normal outline-none transition-all focus:border-[var(--gold)] focus:shadow-[0_0_10px_oklch(0.78_0.12_80/0.1)] resize-none" />
              </label>
              
              <AnimatePresence>
                {sent && (
                  <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="border border-emerald-500/30 bg-emerald-50 text-emerald-800 px-4 py-3 text-sm flex items-center gap-2">
                    <span className="text-emerald-500">✓</span> Request received. Our atelier will follow up shortly.
                  </motion.p>
                )}
              </AnimatePresence>
              
              <button className="magnetic-btn mt-2 bg-[var(--ink)] px-8 py-4 eyebrow text-[var(--bone)] transition-all hover:bg-[var(--gold)] hover:text-[var(--ink)] hover:shadow-[var(--shadow-gold-glow)]">Submit Request →</button>
            </form>
          </motion.div>
        </div>
      </section>
    </PageShell>
  );
}
