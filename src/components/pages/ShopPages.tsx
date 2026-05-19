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
  saveCustomerRemote,
  syncCommerceFromBackend,
  upsertCustomer,
  type CommerceAddress,
  type CommerceProduct,
  type CustomerProfile,
} from "@/lib/commerceStore";
import type { AuthSession } from "@/components/auth/AuthGateway";
import { readCheckoutCoupon } from "@/lib/coupons";

const ease = [0.2, 0.8, 0.2, 1] as const;

type PageShellProps = {
  session: AuthSession | null;
  onLogout: () => void;
  onLogin: () => void;
  children: ReactNode;
  darkNav?: boolean;
};

const sizes = ["35", "36", "37", "38", "39", "40", "41"];

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
    <>
      <Navigation userName={session?.user.name} onLogout={session ? onLogout : undefined} onLogin={onLogin} solid={!darkNav} />
      <main className="min-h-screen bg-[var(--bone)] pt-20 text-[var(--ink)]">{children}</main>
      <Footer />
      <CartDrawer session={session} onLogin={onLogin} />
    </>
  );
}

function ProductCard({ product, index }: { product: CommerceProduct; index: number }) {
  const { add, wishlist, toggleWish } = useCart();
  const [quickOpen, setQuickOpen] = useState(false);
  const sold = Math.max(product.reserved, 0);
  const progress = Math.min(100, Math.round((sold / Math.max(product.produced, 1)) * 100));
  const wished = wishlist.includes(product.id);
  const cardRef = useRef<HTMLElement>(null);
  const mx = useMotionValue(0), my = useMotionValue(0);
  const rx = useSpring(useTransform(my, [-1, 1], [6, -6]), { stiffness: 150, damping: 20 });
  const ry = useSpring(useTransform(mx, [-1, 1], [-6, 6]), { stiffness: 150, damping: 20 });
  
  const urgencyBadge = product.available <= 12 && product.available > 0 ? `Only ${product.available} left` : null;

  return (
    <>
      <motion.article
        ref={cardRef}
        initial={{ opacity: 0, y: 30, rotateX: 10 }}
        whileInView={{ opacity: 1, y: 0, rotateX: 0 }}
        viewport={{ once: true, margin: "-10%" }}
        transition={{ duration: 0.8, delay: index * 0.1, ease }}
        onMouseMove={(e) => {
          const r = cardRef.current!.getBoundingClientRect();
          mx.set(((e.clientX - r.left) / r.width - 0.5) * 2);
          my.set(((e.clientY - r.top) / r.height - 0.5) * 2);
        }}
        onMouseLeave={() => { mx.set(0); my.set(0); }}
        style={{ perspective: 1000 }}
        className="group relative"
      >
        <motion.div style={{ rotateX: rx, rotateY: ry, transformStyle: "preserve-3d" }} className="h-full border border-[var(--ink)]/10 bg-white transition-shadow duration-500 hover:shadow-[0_20px_40px_rgba(0,0,0,0.08)]">
          <div className="relative overflow-hidden bg-[var(--champagne)]/30 holo-shine">
            <a href={productPath(product)} className="block aspect-[4/5] overflow-hidden">
              <motion.img 
                style={{ translateZ: 30 }}
                src={product.image} alt={product.title} loading="lazy" 
                className="h-full w-full object-cover transition-transform duration-1000 ease-out group-hover:scale-110" 
              />
            </a>
            
            {/* Badges */}
            <div className="absolute left-4 top-4 z-10 flex flex-col gap-2" style={{ transform: "translateZ(40px)" }}>
              <div className="bg-white/90 backdrop-blur-sm px-3 py-1.5 text-[0.62rem] font-semibold uppercase tracking-[0.18em] text-[var(--ink)] shadow-sm">
                {product.status}
              </div>
              {urgencyBadge && (
                <div className="bg-[var(--gold)]/90 backdrop-blur-sm px-3 py-1.5 text-[0.62rem] font-semibold uppercase tracking-[0.18em] text-[var(--ink)] shadow-sm animate-pulse">
                  {urgencyBadge}
                </div>
              )}
            </div>

            <button
              onClick={(e) => { e.preventDefault(); toggleWish(product.id); }}
              aria-label="Toggle wishlist"
              data-cursor="hover"
              style={{ transform: "translateZ(40px)" }}
              className="absolute right-4 top-4 z-10 grid h-10 w-10 place-items-center rounded-full bg-white/90 backdrop-blur-sm text-[var(--ink)] shadow-sm transition-transform hover:scale-110"
            >
              <motion.svg animate={{ scale: wished ? [1, 1.2, 1] : 1 }} transition={{ duration: 0.3 }} width="18" height="18" viewBox="0 0 24 24" fill={wished ? "var(--gold)" : "none"} stroke="currentColor" strokeWidth="1.6">
                <path d="M12 21s-7-4.35-7-10a4 4 0 0 1 7-2.65A4 4 0 0 1 19 11c0 5.65-7 10-7 10z" />
              </motion.svg>
            </button>

            {/* Quick Actions */}
            <div className="absolute inset-x-4 bottom-4 z-10 grid translate-y-8 gap-2 opacity-0 transition-all duration-500 ease-[cubic-bezier(0.2,0.8,0.2,1)] group-hover:translate-y-0 group-hover:opacity-100" style={{ transform: "translateZ(50px)" }}>
              <button onClick={() => setQuickOpen(true)} className="bg-white/95 backdrop-blur-sm px-4 py-3 text-xs font-semibold uppercase tracking-[0.2em] transition-colors hover:bg-[var(--gold)] hover:text-[var(--ink)]">Quick View</button>
              <button onClick={() => add({ id: `${product.id}-38`, title: product.title, price: product.price, image: product.image, tone: product.tone, size: "38" })} className="bg-[var(--ink)]/95 backdrop-blur-sm px-4 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--bone)] transition-colors hover:bg-[var(--gold)] hover:text-[var(--ink)]">Add Size 38</button>
            </div>
          </div>
          
          <div className="grid gap-4 p-5" style={{ transform: "translateZ(20px)" }}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-[var(--gold)]">{product.tone}</p>
                <a href={productPath(product)} className="mt-2 block font-display text-3xl leading-none transition-colors hover:text-[var(--gold)]">{product.title}</a>
                <p className="mt-2 text-sm text-[var(--ink)]/55">{product.edition}</p>
              </div>
              <strong className="whitespace-nowrap font-display text-2xl gradient-gold-text">{product.price}</strong>
            </div>
            <div>
              <div className="flex justify-between text-xs uppercase tracking-[0.18em] text-[var(--ink)]/45">
                <span>{product.available} left</span>
                <span>{progress}% reserved</span>
              </div>
              <div className="mt-2 h-1 overflow-hidden bg-[var(--ink)]/10">
                <motion.div initial={{ width: 0 }} whileInView={{ width: `${progress}%` }} viewport={{ once: true }} transition={{ duration: 1.5, ease }} className="h-full bg-[var(--gold)]" />
              </div>
            </div>
          </div>
        </motion.div>
      </motion.article>
      <QuickView item={quickOpen ? { id: product.id, title: product.title, edition: product.edition, tone: product.tone, price: product.price, image: product.image } : null} onClose={() => setQuickOpen(false)} />
    </>
  );
}

export function ShopPage({ session, onLogout, onLogin }: { session: AuthSession | null; onLogout: () => void; onLogin: () => void }) {
  const [products, setProducts] = useState<CommerceProduct[]>(() => liveProducts());
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("All");
  const [tone, setTone] = useState("All");
  const [stock, setStock] = useState("All");
  const [sort, setSort] = useState("Featured");

  useEffect(() => {
    const sync = () => setProducts(liveProducts());
    window.addEventListener(COMMERCE_EVENT, sync);
    void syncCommerceFromBackend();
    return () => window.removeEventListener(COMMERCE_EVENT, sync);
  }, []);

  const tones = useMemo(() => ["All", ...Array.from(new Set(products.map((product) => product.tone)))], [products]);
  const statuses = useMemo(() => ["All", ...Array.from(new Set(products.map((product) => product.status)))], [products]);
  const visible = products
    .filter((product) => {
      const haystack = `${product.title} ${product.edition} ${product.tone} ${product.status}`.toLowerCase();
      const matchesQuery = haystack.includes(query.trim().toLowerCase());
      const matchesStatus = status === "All" || product.status === status;
      const matchesTone = tone === "All" || product.tone === tone;
      const matchesStock = stock === "All" || (stock === "Available now" ? product.available > 0 : product.available <= 12);
      return matchesQuery && matchesStatus && matchesTone && matchesStock;
    })
    .sort((a, b) => {
      if (sort === "Price low to high") return priceNumber(a.price) - priceNumber(b.price);
      if (sort === "Price high to low") return priceNumber(b.price) - priceNumber(a.price);
      if (sort === "Most limited") return a.produced - b.produced;
      if (sort === "Availability") return b.available - a.available;
      return a.title.localeCompare(b.title);
    });

  return (
    <PageShell session={session} onLogout={onLogout} onLogin={onLogin} darkNav>
      {/* Aurora Hero */}
      <section className="relative overflow-hidden bg-[var(--ink)] text-[var(--bone)] pt-32 pb-40 -mt-20 flex flex-col items-center justify-center min-h-[60svh]">
        <div className="absolute inset-0 animate-aurora opacity-30" style={{ background: "linear-gradient(135deg, oklch(0.2 0.08 60), oklch(0.12 0.1 80), oklch(0.18 0.06 40))", backgroundSize: "300% 300%" }} />
        <GoldenParticles count={30} className="z-[1] opacity-50" />
        <div className="absolute inset-0 luxe-grain z-[2]" />
        <div className="vignette absolute inset-0 z-[2]" />
        
        <div className="relative z-10 mx-auto flex flex-col items-center text-center max-w-4xl px-6 md:px-12 mt-10">
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
            {["FOLLOCIA10 active at checkout", "White-glove dispatch", "Dynamic inventory mapping"].map((item, i) => (
              <div key={item} className="flex items-center gap-2 rounded-full border border-[var(--bone)]/10 bg-[var(--ink)]/40 backdrop-blur-md px-4 py-1.5 text-[10px] uppercase tracking-widest text-[var(--bone)]/80">
                <span className="h-1 w-1 rounded-full bg-[var(--gold)] animate-pulse" />
                {item}
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      <section className="mx-auto max-w-[1500px] px-6 py-12 md:px-12">
        {/* Premium Compact Filter Bar */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ duration: 0.8, delay: 0.8 }} 
          className="mb-10 flex flex-wrap items-center justify-between gap-4 rounded-full border border-[var(--ink)]/10 bg-white/90 backdrop-blur-xl px-6 py-3 shadow-[var(--shadow-soft)] relative z-20 -mt-24 w-fit mx-auto"
        >
          <div className="flex flex-wrap items-center gap-6">
            <div className="relative flex items-center">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="absolute left-3 text-[var(--ink)]/40"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
              <input 
                value={query} 
                onChange={(e) => setQuery(e.target.value)} 
                placeholder="Search..." 
                className="h-9 w-40 bg-transparent pl-9 pr-4 text-xs outline-none transition-all focus:w-48 placeholder:text-[var(--ink)]/40" 
              />
            </div>
            
            <div className="h-4 w-px bg-[var(--ink)]/10 hidden md:block" />

            <div className="flex items-center gap-4 text-[10px] uppercase tracking-widest text-[var(--ink)]/60">
              <label className="flex items-center gap-2 cursor-pointer hover:text-[var(--ink)] transition-colors">
                <span className="hidden sm:inline">Status</span>
                <select value={status} onChange={(e) => setStatus(e.target.value)} className="bg-transparent font-medium text-[var(--ink)] outline-none cursor-pointer appearance-none">
                  {statuses.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
              </label>

              <label className="flex items-center gap-2 cursor-pointer hover:text-[var(--ink)] transition-colors">
                <span className="hidden sm:inline">Material</span>
                <select value={tone} onChange={(e) => setTone(e.target.value)} className="bg-transparent font-medium text-[var(--ink)] outline-none cursor-pointer appearance-none">
                  {tones.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
              </label>

              <label className="flex items-center gap-2 cursor-pointer hover:text-[var(--ink)] transition-colors">
                <span className="hidden sm:inline">Stock</span>
                <select value={stock} onChange={(e) => setStock(e.target.value)} className="bg-transparent font-medium text-[var(--ink)] outline-none cursor-pointer appearance-none">
                  {["All", "Available now", "Last pairs"].map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
              </label>

              <label className="flex items-center gap-2 cursor-pointer hover:text-[var(--ink)] transition-colors">
                <span className="hidden sm:inline">Sort</span>
                <select value={sort} onChange={(e) => setSort(e.target.value)} className="bg-transparent font-medium text-[var(--ink)] outline-none cursor-pointer appearance-none">
                  {["Featured", "Price low to high", "Price high to low", "Most limited", "Availability"].map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
              </label>
            </div>
          </div>
          
          <div className="h-4 w-px bg-[var(--ink)]/10 hidden lg:block" />

          <button onClick={() => { setQuery(""); setStatus("All"); setTone("All"); setStock("All"); setSort("Featured"); }} className="text-[10px] uppercase tracking-widest text-[var(--ink)]/50 hover:text-[var(--gold)] transition-colors hidden lg:block">
            Clear
          </button>
        </motion.div>

        <div className="mb-8 flex items-center justify-between text-xs uppercase tracking-widest text-[var(--ink)]/50">
          <span>{visible.length} pieces found</span>
          <span className="h-px flex-1 bg-gradient-to-r from-[var(--ink)]/10 mx-6" />
        </div>

        <div className="grid gap-x-8 gap-y-16 md:grid-cols-2 xl:grid-cols-3">
          <AnimatePresence mode="popLayout">
            {visible.map((product, index) => (
              <motion.div key={product.id} layout initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} transition={{ duration: 0.5 }}>
                <ProductCard product={product} index={index} />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
        
        {visible.length === 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="my-24 flex flex-col items-center justify-center border border-[var(--ink)]/10 bg-white py-32 text-center shadow-[var(--shadow-soft)]">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="1" className="mb-6 opacity-60"><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
            <h2 className="font-display text-4xl">No pieces match your search.</h2>
            <p className="mt-4 text-[var(--ink)]/60">Try adjusting your filters or search terms.</p>
            <button onClick={() => { setQuery(""); setStatus("All"); setTone("All"); setStock("All"); }} className="magnetic-btn mt-8 bg-[var(--ink)] px-8 py-4 eyebrow text-[var(--bone)] transition-colors hover:bg-[var(--gold)] hover:text-[var(--ink)]">Reset all filters</button>
          </motion.div>
        )}
      </section>
    </PageShell>
  );
}

export function ProductDetailPage({ productId, session, onLogout, onLogin }: { productId: string; session: AuthSession | null; onLogout: () => void; onLogin: () => void }) {
  const { add, toggleWish, wishlist } = useCart();
  const [products, setProducts] = useState<CommerceProduct[]>(() => liveProducts());
  const [size, setSize] = useState("");
  const [openPanel, setOpenPanel] = useState("Product Details");
  const [added, setAdded] = useState(false);
  const imgRef = useRef<HTMLDivElement>(null);
  const mx = useMotionValue(0), my = useMotionValue(0);
  const rx = useSpring(useTransform(my, [-1, 1], [4, -4]), { stiffness: 100, damping: 20 });
  const ry = useSpring(useTransform(mx, [-1, 1], [-4, 4]), { stiffness: 100, damping: 20 });

  useEffect(() => {
    const sync = () => setProducts(liveProducts());
    window.addEventListener(COMMERCE_EVENT, sync);
    void syncCommerceFromBackend();
    return () => window.removeEventListener(COMMERCE_EVENT, sync);
  }, []);

  const product = products.find((item) => item.id === productId || slugify(item.title) === productId);
  const related = products.filter((item) => item.id !== product?.id).slice(0, 3);

  if (!product) {
    return (
      <PageShell session={session} onLogout={onLogout} onLogin={onLogin}>
        <section className="mx-auto grid min-h-[60vh] max-w-[900px] place-items-center px-6 text-center">
          <div>
            <p className="eyebrow text-[var(--gold)]">Shop</p>
            <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mt-4 font-display text-6xl">Piece not found.</motion.h1>
            <a href="#/shop" className="magnetic-btn mt-8 inline-block bg-[var(--ink)] px-8 py-4 eyebrow text-[var(--bone)] transition-colors hover:bg-[var(--gold)] hover:text-[var(--ink)]">Back to shop</a>
          </div>
        </section>
      </PageShell>
    );
  }

  const wished = wishlist.includes(product.id);

  return (
    <PageShell session={session} onLogout={onLogout} onLogin={onLogin}>
      <section className="mx-auto grid max-w-[1400px] gap-12 bg-[var(--bone)] px-6 py-14 md:px-12 lg:grid-cols-[1fr_0.8fr] xl:grid-cols-[1.1fr_0.9fr]">
        <div className="grid gap-4 lg:sticky lg:top-28 lg:self-start">
          <motion.div 
            ref={imgRef}
            onMouseMove={(e) => {
              const r = imgRef.current!.getBoundingClientRect();
              mx.set(((e.clientX - r.left) / r.width - 0.5) * 2);
              my.set(((e.clientY - r.top) / r.height - 0.5) * 2);
            }}
            onMouseLeave={() => { mx.set(0); my.set(0); }}
            style={{ rotateX: rx, rotateY: ry, transformPerspective: 1200 }}
            className="relative aspect-[4/5] overflow-hidden bg-[var(--champagne)]/30 holo-shine shadow-[var(--shadow-soft)] cursor-crosshair"
          >
            <motion.img initial={{ scale: 1.1 }} animate={{ scale: 1 }} transition={{ duration: 1.2, ease }} src={product.image} alt={product.title} className="h-full w-full object-cover" />
            <div className="absolute left-0 top-0 h-16 w-px bg-gradient-to-b from-[var(--gold)]/40 to-transparent" />
            <div className="absolute left-0 top-0 h-px w-16 bg-gradient-to-r from-[var(--gold)]/40 to-transparent" />
          </motion.div>
          <div className="grid grid-cols-3 gap-4">
            {[product.image, ...related.slice(0, 2).map((item) => item.image)].map((image, index) => (
              <motion.div key={`${image}-${index}`} whileHover={{ scale: 1.02 }} className="aspect-square overflow-hidden bg-[var(--champagne)]/30 border border-[var(--ink)]/5 cursor-pointer">
                <img src={image} alt="" className="h-full w-full object-cover transition-transform duration-500 hover:scale-110" />
              </motion.div>
            ))}
          </div>
        </div>
        
        <div className="glass border border-[var(--ink)]/10 bg-white/80 p-8 shadow-[var(--shadow-soft)] lg:p-12 xl:p-16 backdrop-blur-xl">
          <div className="flex items-start justify-between gap-6">
            <div>
              <motion.p initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="eyebrow text-[var(--gold)]">{product.status}</motion.p>
              <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mt-4 font-display text-5xl leading-[1.05] tracking-[-0.02em] lg:text-6xl">{product.title}</motion.h1>
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="mt-4 text-sm text-[var(--ink)]/70 uppercase tracking-[0.1em]">Colour <span className="ml-2 font-semibold text-[var(--ink)]">{product.tone}</span></motion.p>
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="mt-6 font-display text-3xl gradient-gold-text">{product.price}</motion.p>
            </div>
            <button onClick={() => toggleWish(product.id)} aria-label="Wishlist" className="grid h-12 w-12 place-items-center rounded-full border border-[var(--ink)]/15 transition-colors hover:border-[var(--gold)] hover:shadow-[0_0_15px_oklch(0.78_0.12_80/0.15)]">
              <motion.svg animate={{ scale: wished ? [1, 1.2, 1] : 1 }} width="21" height="21" viewBox="0 0 24 24" fill={wished ? "var(--gold)" : "none"} stroke={wished ? "var(--gold)" : "currentColor"} strokeWidth="1.5"><path d="M12 21s-7-4.35-7-10a4 4 0 0 1 7-2.65A4 4 0 0 1 19 11c0 5.65-7 10-7 10z" /></motion.svg>
            </button>
          </div>

          <div className="mt-10 border-t border-[var(--gold)]/20 pt-10">
            <div className="flex items-center justify-between">
              <p className="eyebrow text-[var(--ink)]/60">Select Size <span className="ml-2 font-normal text-[var(--ink)]/40 lowercase">eu | uk</span></p>
              <button className="eyebrow text-[var(--gold)] hover-underline">Size Guide</button>
            </div>
            <div className="mt-5 flex flex-wrap gap-3">
              {sizes.map((item) => (
                <motion.button 
                  key={item} 
                  onClick={() => setSize(item)} 
                  whileTap={{ scale: 0.95 }}
                  className={`h-12 w-14 border text-sm transition-all duration-300 ${size === item ? "border-[var(--gold)] bg-[var(--ink)] text-[var(--bone)] shadow-[0_0_15px_oklch(0.78_0.12_80/0.2)]" : "border-[var(--ink)]/15 bg-transparent hover:border-[var(--gold)]/50"}`}
                >
                  {item}
                </motion.button>
              ))}
            </div>
            <AnimatePresence>
              {!size && <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="mt-3 text-sm text-[var(--gold)]">Please select a size to continue</motion.p>}
            </AnimatePresence>
            <p className="mt-4 text-xs tracking-wide text-[var(--ink)]/55">Italian sizing. Fits true to size.</p>
          </div>

          <motion.button 
            whileHover={{ scale: 1.02 }} 
            whileTap={{ scale: 0.98 }}
            onClick={() => { 
              if (!size) return;
              add({ id: `${product.id}-${size}`, title: product.title, price: product.price, image: product.image, tone: product.tone, size }, 1);
              setAdded(true);
              setTimeout(() => setAdded(false), 2000);
            }} 
            className={`magnetic-btn mt-10 w-full border px-8 py-5 eyebrow transition-all duration-500 ${size ? "border-[var(--ink)] bg-[var(--ink)] text-white hover:shadow-[var(--shadow-gold-glow)]" : "border-[var(--ink)]/20 text-[var(--ink)]/50 cursor-not-allowed"}`}
          >
            {added ? <><motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} className="inline-block mr-2">✓</motion.span> Added to Bag</> : size ? "Reserve Pair →" : "Select Size First"}
          </motion.button>

          <div className="mt-12 flex items-center gap-4 text-xs tracking-wide text-[var(--ink)]/60">
            <span className="flex items-center gap-2"><div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" /> Dispatches within 48 hours</span>
            <span>·</span>
            <span>Complimentary returns</span>
          </div>

          <div className="mt-12 border-t border-[var(--ink)]/10">
            {["Product Details", "Delivery & Returns", "Book An Appointment", "Contact Us"].map((panel) => (
              <div key={panel} className="border-b border-[var(--ink)]/10">
                <button onClick={() => setOpenPanel(openPanel === panel ? "" : panel)} className="flex w-full items-center justify-between py-5 text-sm font-semibold uppercase tracking-[0.1em]">
                  {panel}
                  <motion.span animate={{ rotate: openPanel === panel ? 180 : 0 }}>↓</motion.span>
                </button>
                <AnimatePresence>
                  {openPanel === panel && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                      <p className="pb-6 text-sm leading-relaxed text-[var(--ink)]/65">
                        Hand-lasted limited edition footwear with secure checkout, complimentary delivery and concierge support. Each pair takes 32 hours to construct using traditional Florentine techniques.
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1500px] px-6 py-24 md:px-12">
        <motion.div initial={{ scaleX: 0 }} whileInView={{ scaleX: 1 }} viewport={{ once: true }} className="mb-16 h-px bg-gradient-to-r from-[var(--gold)]/50 to-transparent" style={{ transformOrigin: "left" }} />
        <h2 className="font-display text-4xl lg:text-5xl">Curated for you</h2>
        <div className="mt-12 grid gap-8 md:grid-cols-3">
          {related.map((item, index) => <ProductCard key={item.id} product={item} index={index} />)}
        </div>
      </section>
    </PageShell>
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
                  <img src={product.image} alt={product.title} className="h-full w-full object-cover" />
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
                        {saving ? "Processing securely..." : `Pay ${orderTotal.toLocaleString()} EUR`}
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.article>
            </div>

            <motion.aside initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="h-fit glass border border-[var(--ink)]/10 bg-white/80 p-8 shadow-[var(--shadow-soft)] lg:sticky lg:top-28 backdrop-blur-xl">
              <div className="flex items-center justify-between border-b border-[var(--ink)]/10 pb-6"><h2 className="font-display text-2xl">Order Summary</h2><a href="#/shop" className="text-sm underline text-[var(--gold)] hover:text-[var(--ink)] transition-colors">Edit Bag</a></div>
              
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
                  <div className="flex justify-between"><span>Subtotal</span><span>{subtotal.toLocaleString()} EUR</span></div>
                  {discount > 0 && <div className="flex justify-between text-emerald-600 font-medium"><span>{checkoutCoupon?.title}</span><span>- {discount.toLocaleString()} EUR</span></div>}
                  <div className="flex justify-between"><span>Shipping</span><span>Complimentary</span></div>
                  <div className="flex justify-between"><span>Taxes & Duties</span><span>Included</span></div>
                </div>
                
                <div className="mt-6 border-t border-[var(--gold)]/30 pt-6">
                  <div className="flex justify-between items-end">
                    <span className="eyebrow text-[var(--ink)]/60">Estimated Total</span>
                    <span className="font-display text-3xl gradient-gold-text">{orderTotal.toLocaleString()} EUR</span>
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
