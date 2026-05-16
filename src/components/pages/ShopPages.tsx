import { useEffect, useMemo, useState, type ReactNode } from "react";
import { motion } from "framer-motion";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/sections/Footer";
import { CartDrawer } from "@/components/cart/CartDrawer";
import { QuickView } from "@/components/cart/QuickView";
import { useCart } from "@/components/cart/CartContext";
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

type PageShellProps = {
  session: AuthSession | null;
  onLogout: () => void;
  onLogin: () => void;
  children: ReactNode;
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

function PageShell({ session, onLogout, onLogin, children }: PageShellProps) {
  return (
    <>
      <Navigation userName={session?.user.name} onLogout={session ? onLogout : undefined} onLogin={onLogin} solid />
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

  return (
    <>
      <motion.article
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: index * 0.04 }}
        className="group border border-[var(--ink)]/10 bg-white"
      >
        <div className="relative overflow-hidden bg-[#eee5d7]">
          <a href={productPath(product)} className="block aspect-[4/5] overflow-hidden">
            <img src={product.image} alt={product.title} loading="lazy" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
          </a>
          <div className="absolute left-4 top-4 bg-white/90 px-3 py-1 text-[0.62rem] font-semibold uppercase tracking-[0.18em] text-[var(--ink)]">
            {product.status}
          </div>
          <button
            onClick={() => toggleWish(product.id)}
            aria-label="Toggle wishlist"
            className="absolute right-4 top-4 grid h-10 w-10 place-items-center rounded-full bg-white/90 text-[var(--ink)] shadow-sm"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill={wished ? "var(--gold)" : "none"} stroke="currentColor" strokeWidth="1.6">
              <path d="M12 21s-7-4.35-7-10a4 4 0 0 1 7-2.65A4 4 0 0 1 19 11c0 5.65-7 10-7 10z" />
            </svg>
          </button>
          <div className="absolute inset-x-4 bottom-4 grid translate-y-4 gap-2 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
            <button onClick={() => setQuickOpen(true)} className="bg-white px-4 py-3 text-xs font-semibold uppercase tracking-[0.2em]">Quick View</button>
            <button onClick={() => add({ id: `${product.id}-38`, title: product.title, price: product.price, image: product.image, tone: product.tone, size: "38" })} className="bg-[var(--ink)] px-4 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--bone)]">Add Size 38</button>
          </div>
        </div>
        <div className="grid gap-4 p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-[var(--ink)]/45">{product.tone}</p>
              <a href={productPath(product)} className="mt-2 block font-display text-3xl leading-none hover:text-[var(--gold)]">{product.title}</a>
              <p className="mt-2 text-sm text-[var(--ink)]/55">{product.edition}</p>
            </div>
            <strong className="whitespace-nowrap font-display text-2xl">{product.price}</strong>
          </div>
          <div>
            <div className="flex justify-between text-xs uppercase tracking-[0.18em] text-[var(--ink)]/45">
              <span>{product.available} left</span>
              <span>{progress}% reserved</span>
            </div>
            <div className="mt-2 h-1 bg-[var(--ink)]/10"><div className="h-full bg-[var(--gold)]" style={{ width: `${progress}%` }} /></div>
          </div>
        </div>
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
    <PageShell session={session} onLogout={onLogout} onLogin={onLogin}>
      <section className="border-b border-[var(--ink)]/10 bg-[var(--ink)] text-[var(--bone)]">
        <div className="mx-auto grid max-w-[1500px] gap-10 px-6 py-16 md:px-12 lg:grid-cols-[1.1fr_0.9fr] lg:py-24">
          <div>
            <p className="eyebrow text-[var(--gold)]">Follocia shop</p>
            <h1 className="mt-5 font-display text-[clamp(4rem,9vw,9rem)] leading-[0.85]">Limited pairs, live inventory.</h1>
            <p className="mt-8 max-w-xl text-sm leading-7 text-[var(--bone)]/65">A premium Flipkart-style commerce room for a luxury brand: search, filter, sort, wishlist, quick view, add to bag and dynamic admin-managed inventory.</p>
          </div>
          <div className="grid content-end gap-3">
            {["Bank-style offers: FOLLOCIA10 live at checkout", "White-glove dispatch status in customer account", "Inventory changes update from admin panel"].map((item) => (
              <div key={item} className="border border-[var(--bone)]/12 bg-white/5 px-5 py-4 text-sm text-[var(--bone)]/75">{item}</div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1500px] px-6 py-8 md:px-12">
        <div className="mb-8 grid gap-3 border border-[var(--ink)]/10 bg-white p-4 shadow-[var(--shadow-soft)] lg:grid-cols-[1fr_170px_190px_170px_190px]">
          <label className="grid gap-2 text-xs uppercase tracking-[0.18em] text-[var(--ink)]/45">Search<input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search editions, tone, status..." className="h-12 border border-[var(--ink)]/15 px-4 normal-case tracking-normal outline-none focus:border-[var(--ink)]" /></label>
          <label className="grid gap-2 text-xs uppercase tracking-[0.18em] text-[var(--ink)]/45">Status<select value={status} onChange={(event) => setStatus(event.target.value)} className="h-12 border border-[var(--ink)]/15 px-4 normal-case tracking-normal outline-none">{statuses.map((item) => <option key={item}>{item}</option>)}</select></label>
          <label className="grid gap-2 text-xs uppercase tracking-[0.18em] text-[var(--ink)]/45">Material<select value={tone} onChange={(event) => setTone(event.target.value)} className="h-12 border border-[var(--ink)]/15 px-4 normal-case tracking-normal outline-none">{tones.map((item) => <option key={item}>{item}</option>)}</select></label>
          <label className="grid gap-2 text-xs uppercase tracking-[0.18em] text-[var(--ink)]/45">Stock<select value={stock} onChange={(event) => setStock(event.target.value)} className="h-12 border border-[var(--ink)]/15 px-4 normal-case tracking-normal outline-none">{["All", "Available now", "Last pairs"].map((item) => <option key={item}>{item}</option>)}</select></label>
          <label className="grid gap-2 text-xs uppercase tracking-[0.18em] text-[var(--ink)]/45">Sort<select value={sort} onChange={(event) => setSort(event.target.value)} className="h-12 border border-[var(--ink)]/15 px-4 normal-case tracking-normal outline-none">{["Featured", "Price low to high", "Price high to low", "Most limited", "Availability"].map((item) => <option key={item}>{item}</option>)}</select></label>
        </div>

        <div className="mb-6 flex items-center justify-between text-sm text-[var(--ink)]/55">
          <span>{visible.length} pieces found</span>
          <button onClick={() => { setQuery(""); setStatus("All"); setTone("All"); setStock("All"); setSort("Featured"); }} className="underline underline-offset-4">Clear all</button>
        </div>

        <div className="grid gap-8 md:grid-cols-2 xl:grid-cols-3">
          {visible.map((product, index) => <ProductCard key={product.id} product={product} index={index} />)}
        </div>
        {visible.length === 0 && (
          <div className="my-16 border border-[var(--ink)]/10 bg-white py-20 text-center">
            <h2 className="font-display text-4xl">No pieces match this filter.</h2>
            <button onClick={() => { setQuery(""); setStatus("All"); setTone("All"); setStock("All"); }} className="mt-6 bg-[var(--ink)] px-7 py-3 eyebrow text-[var(--bone)]">Reset filters</button>
          </div>
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
            <h1 className="mt-4 font-display text-6xl">Piece not found.</h1>
            <a href="#/shop" className="mt-8 inline-block bg-[var(--ink)] px-8 py-4 eyebrow text-[var(--bone)]">Back to shop</a>
          </div>
        </section>
      </PageShell>
    );
  }

  const wished = wishlist.includes(product.id);

  return (
    <PageShell session={session} onLogout={onLogout} onLogin={onLogin}>
      <section className="mx-auto grid max-w-[1280px] gap-12 bg-white px-6 py-14 md:px-12 lg:grid-cols-[0.9fr_1fr]">
        <div className="grid gap-4 lg:sticky lg:top-28 lg:self-start">
          <div className="aspect-[4/5] overflow-hidden bg-[#eee5d7]"><img src={product.image} alt={product.title} className="h-full w-full object-cover" /></div>
          <div className="grid grid-cols-3 gap-3">
            {[product.image, ...related.slice(0, 2).map((item) => item.image)].map((image, index) => <img key={`${image}-${index}`} src={image} alt="" className="aspect-square bg-white object-cover" />)}
          </div>
        </div>
        <div>
          <div className="flex items-start justify-between gap-6">
            <div>
              <p className="inline-block bg-[var(--bone)] px-3 py-1 text-xs">{product.status}</p>
              <h1 className="mt-4 text-3xl font-semibold tracking-[-0.02em]">{product.title}</h1>
              <p className="mt-3 text-sm text-[var(--ink)]/70">Colour <span className="ml-2 text-[var(--ink)]">{product.tone}</span></p>
              <p className="mt-4 text-xl">{product.price}</p>
            </div>
            <button onClick={() => toggleWish(product.id)} aria-label="Wishlist" className="grid h-11 w-11 place-items-center rounded-full border border-[var(--ink)]/15">
              <svg width="21" height="21" viewBox="0 0 24 24" fill={wished ? "var(--gold)" : "none"} stroke="currentColor" strokeWidth="1.5"><path d="M12 21s-7-4.35-7-10a4 4 0 0 1 7-2.65A4 4 0 0 1 19 11c0 5.65-7 10-7 10z" /></svg>
            </button>
          </div>

          <button className="mt-10 flex w-full items-center justify-between border-y border-[var(--ink)]/10 py-5 text-left text-sm font-semibold">
            Discover More From This Family <span>›</span>
          </button>

          <div className="mt-10">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">Size: <span className="ml-2 text-xs font-normal">EU | UK</span></p>
              <button className="text-xs underline underline-offset-4">Size Guide</button>
            </div>
            <div className="mt-4 grid grid-cols-4 gap-2 sm:grid-cols-7">
              {sizes.map((item) => <button key={item} onClick={() => setSize(item)} className={`h-12 border text-sm ${size === item ? "border-[var(--ink)] bg-[var(--ink)] text-[var(--bone)]" : "border-[var(--ink)]/15 bg-white"}`}>{item}</button>)}
            </div>
            {!size && <p className="mt-3 text-sm text-red-700">Please select a size</p>}
            <p className="mt-3 text-right text-xs text-[var(--ink)]/55">Italian sizing. Fits true to size.</p>
          </div>

          <button onClick={() => size && add({ id: `${product.id}-${size}`, title: product.title, price: product.price, image: product.image, tone: product.tone, size })} className={`mt-5 w-full border px-8 py-5 text-xs font-semibold uppercase tracking-[0.18em] ${size ? "border-[var(--ink)] bg-[var(--ink)] text-white" : "border-[var(--ink)] text-[var(--ink)]"}`}>
            {size ? "Add to Bag" : "Select Size"}
          </button>

          <div className="mt-8 border-t border-[var(--ink)]/10">
            {["Product Details", "Delivery & Returns", "Book An Appointment", "Contact Us"].map((panel) => (
              <div key={panel} className="border-b border-[var(--ink)]/10">
                <button onClick={() => setOpenPanel(openPanel === panel ? "" : panel)} className="flex w-full items-center justify-between py-4 text-sm">
                  {panel}<span>›</span>
                </button>
                {openPanel === panel && <p className="pb-5 text-sm leading-7 text-[var(--ink)]/60">Hand-lasted limited edition footwear with secure checkout, complimentary delivery and concierge support. This content is ready to be managed as CMS copy.</p>}
              </div>
            ))}
          </div>
        </div>
      </section>
      <section className="mx-auto max-w-[1500px] px-6 pb-24 md:px-12">
        <h2 className="font-display text-5xl">Related pieces</h2>
        <div className="mt-8 grid gap-8 md:grid-cols-3">{related.map((item, index) => <ProductCard key={item.id} product={item} index={index} />)}</div>
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
    <PageShell session={session} onLogout={onLogout} onLogin={onLogin}>
      <section className="mx-auto max-w-[1500px] px-6 py-20 md:px-12">
        <p className="eyebrow text-[var(--gold)]">Collections</p>
        <h1 className="mt-5 max-w-5xl font-display text-[clamp(4rem,9vw,8.5rem)] leading-[0.86]">Numbered editions, never repeated.</h1>
        <div className="mt-14 grid gap-8">
          {products.map((product, index) => (
            <a key={product.id} href={productPath(product)} className="group grid gap-6 border-t border-[var(--ink)]/10 py-8 md:grid-cols-[160px_1fr_auto] md:items-center">
              <img src={product.image} alt={product.title} className="aspect-square w-full object-cover md:w-40" />
              <div>
                <p className="eyebrow text-[var(--ink)]/45">Collection {String(index + 1).padStart(2, "0")}</p>
                <h2 className="mt-2 font-display text-5xl group-hover:text-[var(--gold)]">{product.title}</h2>
                <p className="mt-3 text-sm text-[var(--ink)]/60">{product.edition} - {product.tone} - {product.status}</p>
              </div>
              <span className="eyebrow">Explore</span>
            </a>
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
      <input value={value} onChange={(event) => onChange(event.target.value)} className="h-12 border border-[var(--ink)]/20 bg-white px-4 normal-case tracking-normal outline-none focus:border-[var(--ink)]" />
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
    <PageShell session={session} onLogout={onLogout} onLogin={onLogin}>
      <section className="border-b border-[var(--ink)]/10 bg-white">
        <div className="mx-auto flex max-w-[1200px] items-center justify-between px-6 py-8 md:px-12">
          <a href="/" className="font-display text-3xl">Follocia</a>
          <span className="eyebrow text-[var(--ink)]/60">Secure Checkout</span>
        </div>
      </section>
      {!session ? (
        <div className="mx-auto grid min-h-[60vh] max-w-[720px] place-items-center px-6 text-center">
          <div>
            <h1 className="font-display text-6xl">Sign in to checkout.</h1>
            <button onClick={onLogin} className="mt-8 bg-[var(--ink)] px-8 py-4 eyebrow text-white">Open Login</button>
          </div>
        </div>
      ) : items.length === 0 && step !== "done" ? (
        <div className="mx-auto grid min-h-[60vh] max-w-[720px] place-items-center px-6 text-center">
          <div>
            <h1 className="font-display text-6xl">Your bag is empty.</h1>
            <a href="#/shop" className="mt-8 inline-block bg-[var(--ink)] px-8 py-4 eyebrow text-white">Start shopping</a>
          </div>
        </div>
      ) : step === "done" ? (
        <div className="mx-auto grid min-h-[60vh] max-w-[820px] place-items-center px-6 text-center">
          <div>
            <p className="eyebrow text-[var(--gold)]">Order placed</p>
            <h1 className="mt-4 font-display text-7xl">Reservation confirmed.</h1>
            <a href="#/account/my-orders" className="mt-8 inline-block bg-[var(--ink)] px-8 py-4 eyebrow text-white">View Orders</a>
          </div>
        </div>
      ) : (
        <section className="mx-auto grid max-w-[1200px] gap-8 px-6 py-10 md:px-12 lg:grid-cols-[1fr_360px]">
          <div className="grid gap-6">
            <article className="border border-[var(--ink)]/15 bg-white">
              <header className="grid grid-cols-[76px_1fr_auto] items-center border-b border-[var(--ink)]/15">
                <div className="grid h-20 place-items-center bg-emerald-50 text-3xl text-emerald-700">✓</div>
                <h2 className="px-6 text-xl font-semibold">Email</h2>
                <button className="px-6 text-sm underline">Edit</button>
              </header>
              <p className="px-10 py-8 text-sm">Thank you, you'll receive updates from us on <strong>{session.user.email}</strong></p>
            </article>

            <article className="border border-[var(--ink)]/15 bg-white">
              <header className="grid grid-cols-[76px_1fr_auto] items-center border-b border-[var(--ink)]/15">
                <div className="grid h-20 place-items-center text-lg font-semibold">{step === "payment" ? "✓" : "2"}</div>
                <h2 className="px-6 text-xl font-semibold">Delivery</h2>
                {step === "payment" && <button onClick={() => setStep("delivery")} className="px-6 text-sm underline">Edit</button>}
              </header>
              {step === "delivery" ? (
                <div className="grid gap-6 p-10">
                  <p className="text-sm font-semibold">How would you like to receive your order?</p>
                  <div className="grid gap-3 md:grid-cols-2">
                    {["Home Delivery", "Store Collection"].map((item) => <button key={item} onClick={() => setDeliveryType(item)} className={`border px-5 py-5 text-left text-sm font-semibold ${deliveryType === item ? "border-[var(--ink)]" : "border-[var(--ink)]/15"}`}>● {item}</button>)}
                  </div>
                  {profile.addresses.length > 0 && (
                    <div className="grid gap-3">
                      {profile.addresses.map((address) => <label key={address.id} className="flex gap-3 border border-[var(--ink)]/10 p-4 text-sm"><input type="radio" checked={selectedAddress === address.id} onChange={() => setSelectedAddress(address.id)} />{addressLine(address)}</label>)}
                      <label className="flex gap-3 border border-[var(--ink)]/10 p-4 text-sm"><input type="radio" checked={selectedAddress === "new"} onChange={() => setSelectedAddress("new")} />Add a new address</label>
                    </div>
                  )}
                  {selectedAddress === "new" && (
                    <div className="grid gap-4 md:grid-cols-3">
                      <CheckoutInput label="First Name*" value={draft.firstName} onChange={(value) => setDraftField("firstName", value)} />
                      <CheckoutInput label="Last Name*" value={draft.lastName} onChange={(value) => setDraftField("lastName", value)} />
                      <CheckoutInput label="Phone Number*" value={draft.phone} onChange={(value) => setDraftField("phone", value)} />
                      <CheckoutInput label="Find Your Address*" value={draft.address} onChange={(value) => setDraftField("address", value)} wide />
                      <CheckoutInput label="City*" value={draft.city} onChange={(value) => setDraftField("city", value)} />
                      <CheckoutInput label="Region*" value={draft.region} onChange={(value) => setDraftField("region", value)} />
                      <CheckoutInput label="Zip*" value={draft.zip} onChange={(value) => setDraftField("zip", value)} />
                    </div>
                  )}
                  <button disabled={selectedAddress === "new" && (!draft.firstName || !draft.lastName || !draft.phone || !draft.address)} onClick={() => setStep("payment")} className="ml-auto w-full bg-[var(--ink)] px-8 py-4 eyebrow text-white disabled:bg-[var(--ink)]/30 md:w-64">Continue</button>
                </div>
              ) : (
                <div className="grid gap-6 p-10 text-sm md:grid-cols-3">
                  <div><strong>Delivery Method</strong><p className="mt-3">{deliveryType}</p></div>
                  <div><strong>Delivery Address</strong><p className="mt-3">{addressLine(activeAddress)}</p></div>
                  <div><strong>Delivery Option</strong><p className="mt-3">Complimentary</p></div>
                </div>
              )}
            </article>

            <article className={`border bg-white ${step === "payment" ? "border-[var(--ink)]" : "border-[var(--ink)]/15 text-[var(--ink)]/35"}`}>
              <header className="grid grid-cols-[76px_1fr] items-center border-b border-[var(--ink)]/15"><div className="grid h-20 place-items-center font-semibold">3</div><h2 className="px-6 text-xl font-semibold">Payment</h2></header>
              {step === "payment" && (
                <div className="grid gap-8 p-10">
                  <div>
                    <div className="flex items-center justify-between"><strong>Billing Address</strong><button onClick={() => setBillingSame((value) => !value)} className="text-sm underline">Edit</button></div>
                    <label className="mt-4 flex gap-3 text-sm"><input type="checkbox" checked={billingSame} onChange={(event) => setBillingSame(event.target.checked)} />Same as delivery address</label>
                    {!billingSame && <div className="mt-5 grid gap-4 md:grid-cols-3"><CheckoutInput label="First Name" value={billing.firstName} onChange={(value) => setBillingField("firstName", value)} /><CheckoutInput label="Last Name" value={billing.lastName} onChange={(value) => setBillingField("lastName", value)} /><CheckoutInput label="Phone" value={billing.phone} onChange={(value) => setBillingField("phone", value)} /><CheckoutInput label="Billing Address" value={billing.address} onChange={(value) => setBillingField("address", value)} wide /></div>}
                  </div>
                  <div className="grid gap-3 md:grid-cols-3">{["Card Authorization", "UPI Intent", "Cash on Delivery"].map((item) => <button key={item} onClick={() => setPaymentMethod(item)} className={`border px-4 py-4 text-sm font-semibold ${paymentMethod === item ? "border-[var(--ink)] bg-[var(--ink)] text-white" : "border-[var(--ink)]/15"}`}>{item}</button>)}</div>
                  <button onClick={placeOrder} disabled={saving} className="w-full bg-[var(--ink)] px-8 py-4 eyebrow text-white disabled:bg-[var(--ink)]/35 md:w-72">{saving ? "Processing..." : "Pay Now"}</button>
                </div>
              )}
            </article>
          </div>

          <aside className="h-fit border border-[var(--ink)]/15 bg-white p-6 lg:sticky lg:top-28">
            <div className="flex items-center justify-between"><h2 className="text-xl font-semibold">Order Summary</h2><a href="#/shop" className="text-sm underline">Edit</a></div>
            <div className="mt-6 grid gap-5">
              {items.map((item) => <div key={item.id} className="grid grid-cols-[110px_1fr] gap-4"><img src={item.image} alt={item.title} className="aspect-square object-cover" /><div className="text-sm"><strong>{item.title}</strong><p className="mt-2">{item.tone}</p><p>{item.size}</p><p>{item.price}</p></div></div>)}
            </div>
            <div className="mt-8 grid gap-3 border-t border-[var(--ink)]/15 pt-6 text-sm">
              <div className="flex justify-between"><span>Subtotal</span><span>{subtotal.toLocaleString()} EUR</span></div>
              {discount > 0 && <div className="flex justify-between text-emerald-800"><span>{checkoutCoupon?.title}</span><span>- {discount.toLocaleString()} EUR</span></div>}
              <div className="flex justify-between"><span>Shipping</span><span>From 0.00 EUR</span></div>
              <div className="flex justify-between"><span>Duties</span><span>Included</span></div>
              <div className="flex justify-between border-t border-[var(--ink)]/15 pt-5 font-semibold"><span>Estimated Total</span><span>{orderTotal.toLocaleString()} EUR</span></div>
            </div>
          </aside>
        </section>
      )}
    </PageShell>
  );
}

export function ContactPage({ session, onLogout, onLogin }: { session: AuthSession | null; onLogout: () => void; onLogin: () => void }) {
  const [sent, setSent] = useState(false);
  return (
    <PageShell session={session} onLogout={onLogout} onLogin={onLogin}>
      <section className="mx-auto grid max-w-[1300px] gap-12 px-6 py-20 md:px-12 lg:grid-cols-[0.8fr_1fr]">
        <div>
          <p className="eyebrow text-[var(--gold)]">Contact</p>
          <h1 className="mt-5 font-display text-[clamp(4rem,8vw,8rem)] leading-[0.86]">Private concierge desk.</h1>
          <p className="mt-8 max-w-md text-sm leading-7 text-[var(--ink)]/60">For sizing, delivery, fittings, restoration and private previews. Messages are captured locally for a premium demo flow.</p>
          <div className="mt-10 grid gap-3 text-sm text-[var(--ink)]/70">
            <div className="border border-[var(--ink)]/10 bg-white p-4">concierge@follocia.com</div>
            <div className="border border-[var(--ink)]/10 bg-white p-4">Mumbai - Milan - Paris fittings</div>
          </div>
        </div>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            const form = event.currentTarget;
            const data = new FormData(form);
            void saveContactQuery(String(data.get("name") || ""), String(data.get("email") || ""), String(data.get("requestType") || "General"), String(data.get("message") || ""));
            setSent(true);
            form.reset();
          }}
          className="grid gap-4 border border-[var(--ink)]/10 bg-white p-6 shadow-[var(--shadow-soft)]"
        >
          <label className="grid gap-2 text-xs uppercase tracking-[0.18em] text-[var(--ink)]/45">Name<input name="name" required className="h-12 border border-[var(--ink)]/15 px-4 normal-case tracking-normal outline-none" /></label>
          <label className="grid gap-2 text-xs uppercase tracking-[0.18em] text-[var(--ink)]/45">Email<input name="email" required type="email" className="h-12 border border-[var(--ink)]/15 px-4 normal-case tracking-normal outline-none" /></label>
          <label className="grid gap-2 text-xs uppercase tracking-[0.18em] text-[var(--ink)]/45">Request type<select name="requestType" className="h-12 border border-[var(--ink)]/15 px-4 normal-case tracking-normal outline-none">{["Sizing help", "Delivery update", "Private preview", "Restoration", "General"].map((item) => <option key={item}>{item}</option>)}</select></label>
          <label className="grid gap-2 text-xs uppercase tracking-[0.18em] text-[var(--ink)]/45">Message<textarea name="message" required rows={7} className="border border-[var(--ink)]/15 p-4 normal-case tracking-normal outline-none" /></label>
          <button className="bg-[var(--ink)] px-8 py-4 eyebrow text-[var(--bone)]">Send Request</button>
          {sent && <p className="border border-emerald-800/20 bg-emerald-800/5 px-4 py-3 text-sm text-emerald-900">Request received. Concierge follow-up is ready for demo.</p>}
        </form>
      </section>
    </PageShell>
  );
}
