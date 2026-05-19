import { useEffect, useMemo, useState, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  COMMERCE_EVENT,
  ensureCustomer,
  getCustomers,
  getOrders,
  getProducts,
  saveCustomerRemote,
  saveOrderRemote,
  saveProductRemote,
  saveOrders,
  saveProducts,
  syncCommerceFromBackend,
  upsertCustomer,
  type CommerceAddress,
  type CommerceOrder,
  type CommerceProduct,
  type CustomerProfile,
} from "@/lib/commerceStore";
import type { AuthSession } from "@/components/auth/AuthGateway";
import { BrandLogo } from "@/components/BrandLogo";

const menu = ["My Orders", "My Wishlist", "My Addresses", "My Wallet", "My Coupons", "Gift Cards", "My Reviews", "Notifications", "My Subscriptions", "My Account"] as const;
type AccountSection = (typeof menu)[number];

function initials(name: string) {
  return name.trim().charAt(0).toUpperCase() || "M";
}

function AccountShell({ profile, active, onActive, children }: { profile: CustomerProfile; active: AccountSection; onActive: (section: AccountSection) => void; children: ReactNode }) {
  return (
    <main className="min-h-screen bg-[var(--bone)] pt-32 pb-24 text-[var(--ink)] relative">
      <div className="absolute inset-0 luxe-grain opacity-50 z-0 pointer-events-none" />
      <div className="mx-auto grid max-w-[1200px] gap-12 px-6 md:px-12 md:grid-cols-[280px_1fr] relative z-10">
        <aside className="h-fit lg:sticky lg:top-32">
          <div className="relative glass border border-[var(--gold)]/20 bg-white/80 p-8 text-center shadow-[var(--shadow-soft)]">
            <button aria-label="Account options" className="absolute right-4 top-4 text-xl text-[var(--ink)]/40 hover:text-[var(--gold)] transition-colors">⋮</button>
            <div className="mx-auto grid h-24 w-24 place-items-center rounded-full border border-[var(--gold)]/30 bg-[var(--champagne)]/30 text-4xl font-display text-[var(--gold)] relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-[var(--gold)]/10 to-transparent" />
              {initials(profile.name)}
            </div>
            <p className="mt-5 text-xl font-display leading-tight">{profile.name}</p>
            <p className="mt-1 text-xs uppercase tracking-[0.2em] text-[var(--gold)]">Private Client</p>
          </div>
          
          <nav className="mt-6 grid glass border border-[var(--ink)]/10 bg-white/80 py-4 shadow-[var(--shadow-soft)]">
            {menu.map((item) => (
              <button 
                key={item} 
                onClick={() => onActive(item)} 
                className={`relative px-8 py-3.5 text-left text-sm uppercase tracking-[0.1em] transition-all duration-300 ${active === item ? "text-[var(--gold)] font-semibold" : "text-[var(--ink)]/60 hover:text-[var(--ink)] hover:bg-[var(--ink)]/5"}`}
              >
                {active === item && <motion.div layoutId="activeNav" className="absolute left-0 top-0 bottom-0 w-1 bg-[var(--gold)]" />}
                {item}
              </button>
            ))}
          </nav>
        </aside>
        
        <section className="min-h-[60vh] glass border border-[var(--ink)]/10 bg-white/80 p-8 md:p-12 shadow-[var(--shadow-soft)]">
          <motion.div
            key={active}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            {children}
          </motion.div>
        </section>
      </div>
    </main>
  );
}

function SectionHead({ title, copy }: { title: string; copy: string }) {
  return (
    <header className="border-b border-[var(--ink)]/10 pb-8 mb-8">
      <h1 className="font-display text-4xl">{title}</h1>
      <p className="mt-3 text-[var(--ink)]/60">{copy}</p>
    </header>
  );
}

function EmptyState({ title, copy, action }: { title: string; copy?: string; action?: ReactNode }) {
  return (
    <div className="grid min-h-[300px] place-items-center text-center bg-[var(--champagne)]/20 border border-[var(--ink)]/5 p-8">
      <div>
        <p className="text-xl font-display text-[var(--ink)]/70">{title}</p>
        {copy && <p className="mt-3 max-w-md text-sm text-[var(--ink)]/50 mx-auto">{copy}</p>}
        {action && <div className="mt-8">{action}</div>}
      </div>
    </div>
  );
}

function AddressModal({ profile, onClose, onSave }: { profile: CustomerProfile; onClose: () => void; onSave: (address: CommerceAddress) => void }) {
  const [address, setAddress] = useState<CommerceAddress>({
    id: `addr-${Date.now()}`,
    firstName: profile.firstName,
    lastName: profile.lastName,
    company: "",
    address: "",
    address2: "",
    city: "",
    country: "India",
    region: "",
    zip: "",
    phone: profile.phone,
    isDefault: profile.addresses.length === 0,
  });
  const set = (key: keyof CommerceAddress, value: string | boolean) => setAddress((current) => ({ ...current, [key]: value }));

  return (
    <div className="fixed inset-0 z-[100] bg-[var(--ink)]/80 backdrop-blur-md p-4 flex items-center justify-center">
      <motion.form
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        onSubmit={(event) => {
          event.preventDefault();
          onSave(address);
        }}
        className="flex max-h-[90vh] w-full max-w-[700px] flex-col glass border border-[var(--gold)]/20 bg-white shadow-[var(--shadow-luxe)]"
      >
        <div className="flex items-center justify-between px-10 py-8 border-b border-[var(--ink)]/10">
          <h2 className="font-display text-2xl">Add New Address</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="text-3xl font-light hover:text-[var(--gold)] transition-colors">×</button>
        </div>
        
        <div className="grid flex-1 gap-6 overflow-y-auto px-10 py-8">
          <div className="grid gap-6 md:grid-cols-2">
            <Field label="* First name" value={address.firstName} onChange={(v) => set("firstName", v)} required />
            <Field label="* Last name" value={address.lastName} onChange={(v) => set("lastName", v)} required />
          </div>
          <Field label="Company name" value={address.company} onChange={(v) => set("company", v)} />
          <Field label="Address" value={address.address} onChange={(v) => set("address", v)} required />
          <Field label="Address - line 2" value={address.address2} onChange={(v) => set("address2", v)} placeholder="Apartment, suite, floor" />
          <Field label="City" value={address.city} onChange={(v) => set("city", v)} required />
          <div className="grid gap-6 md:grid-cols-2">
            <Field label="Country/Region" value={address.country} onChange={(v) => set("country", v)} />
            <Field label="Region" value={address.region} onChange={(v) => set("region", v)} />
            <Field label="Zip / Postal code" value={address.zip} onChange={(v) => set("zip", v)} />
            <Field label="Phone" value={address.phone} onChange={(v) => set("phone", v)} />
          </div>
          <label className="mt-2 flex items-center gap-3 text-sm text-[var(--ink)]/70 cursor-pointer">
            <input type="checkbox" checked={address.isDefault} onChange={(event) => set("isDefault", event.target.checked)} className="w-4 h-4 accent-[var(--gold)]" />
            Make this my default address
          </label>
        </div>
        <footer className="border-t border-[var(--ink)]/10 px-10 py-8 flex justify-end gap-4 bg-[var(--champagne)]/10">
          <button type="button" onClick={onClose} className="border border-[var(--ink)]/20 px-8 py-3 text-xs uppercase tracking-[0.1em] hover:bg-white transition-colors">Cancel</button>
          <button className="magnetic-btn bg-[var(--ink)] px-8 py-3 text-xs uppercase tracking-[0.1em] text-white hover:bg-[var(--gold)] hover:text-[var(--ink)] transition-colors">Add Address</button>
        </footer>
      </motion.form>
    </div>
  );
}

function Field({ label, value, onChange, required, placeholder }: { label: string; value: string; onChange: (value: string) => void; required?: boolean; placeholder?: string }) {
  return (
    <label className="grid gap-2 text-xs uppercase tracking-[0.15em] text-[var(--ink)]/50">
      <span>{label}</span>
      <input required={required} value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} className="h-12 border border-[var(--ink)]/15 bg-transparent px-4 normal-case tracking-normal text-[var(--ink)] outline-none transition-all focus:border-[var(--gold)] focus:shadow-[0_0_10px_oklch(0.78_0.12_80/0.1)]" />
    </label>
  );
}

export function AccountPanel({ session, initialSection = "My Orders" }: { session: AuthSession; initialSection?: AccountSection }) {
  const [profile, setProfile] = useState(() => ensureCustomer(session.user));
  const [active, setActive] = useState<AccountSection>(initialSection);
  const [orders, setOrders] = useState(() => getOrders());
  const [showAddress, setShowAddress] = useState(false);
  const [products, setProducts] = useState(() => getProducts());
  const myOrders = orders.filter((order) => order.customerId === profile.id || order.email.toLowerCase() === profile.email.toLowerCase());
  const localWishlist = readLocalWishlist();
  const mergedWishlist = Array.from(new Set([...profile.wishlist, ...localWishlist]));
  const deliveredOrders = myOrders.filter((order) => order.deliveryStatus === "Delivered");

  useEffect(() => {
    const sync = () => {
      const nextProfile = ensureCustomer(session.user);
      const wishlist = readLocalWishlist();
      if (wishlist.some((id) => !nextProfile.wishlist.includes(id))) {
        const merged = { ...nextProfile, wishlist: Array.from(new Set([...nextProfile.wishlist, ...wishlist])) };
        upsertCustomer(merged);
        void saveCustomerRemote(merged);
        setProfile(merged);
      } else {
        setProfile(nextProfile);
      }
      setOrders(getOrders());
      setProducts(getProducts());
    };
    void syncCommerceFromBackend();
    window.addEventListener(COMMERCE_EVENT, sync);
    return () => window.removeEventListener(COMMERCE_EVENT, sync);
  }, [session.user]);

  const saveProfile = (next: CustomerProfile) => {
    upsertCustomer(next);
    void saveCustomerRemote(next);
    setProfile(next);
  };
  const updateOrder = (next: CommerceOrder) => {
    const updated = orders.map((order) => (order.id === next.id ? next : order));
    setOrders(updated);
    saveOrders(updated);
    void saveOrderRemote(next);
  };

  return (
    <AccountShell profile={profile} active={active} onActive={setActive}>
      {active === "My Orders" && (
        <>
          <SectionHead title="My Orders" copy="View your order history or track the status of a recent reservation." />
          {myOrders.length === 0 ? (
            <EmptyState title="You haven't placed any orders yet." action={<a className="text-sm underline text-[var(--gold)] hover:text-[var(--ink)] transition-colors" href="/#shop">Explore the Collection</a>} />
          ) : (
            <div className="grid gap-6 py-6">
              {myOrders.map((order) => <OrderRow key={order.id} order={order} onUpdate={updateOrder} />)}
            </div>
          )}
        </>
      )}
      {active === "My Addresses" && (
        <>
          <SectionHead title="My Addresses" copy="Add and manage the addresses you use for private deliveries." />
          {profile.addresses.length === 0 ? (
            <EmptyState title="You haven't saved any addresses yet." action={<button onClick={() => setShowAddress(true)} className="magnetic-btn bg-[var(--ink)] px-9 py-4 text-xs uppercase tracking-[0.1em] text-[var(--bone)] transition-colors hover:bg-[var(--gold)] hover:text-[var(--ink)]">Add New Address</button>} />
          ) : (
            <div className="grid gap-4 py-6">
              {profile.addresses.map((address) => (
                <article key={address.id} className="glass border border-[var(--ink)]/10 p-6 text-sm flex justify-between items-start group hover:border-[var(--gold)]/30 transition-colors shadow-[var(--shadow-soft)]">
                  <div>
                    {address.isDefault && <span className="inline-block bg-[var(--gold)] px-2 py-0.5 text-[0.6rem] uppercase tracking-widest text-[var(--ink)] mb-3 rounded-sm">Default</span>}
                    <strong className="block text-lg font-display mb-1">{address.firstName} {address.lastName}</strong>
                    <p className="text-[var(--ink)]/60 leading-relaxed">{address.address}{address.address2 ? `, ${address.address2}` : ""}<br />{address.city}, {address.region} {address.zip}<br />{address.country} · {address.phone}</p>
                  </div>
                  <button className="text-[var(--gold)] text-xs uppercase tracking-[0.1em] opacity-0 group-hover:opacity-100 transition-opacity">Edit</button>
                </article>
              ))}
              <button onClick={() => setShowAddress(true)} className="w-fit border border-[var(--ink)]/20 px-9 py-4 text-xs uppercase tracking-[0.1em] text-[var(--ink)] hover:border-[var(--gold)] transition-colors mt-4">Add New Address</button>
            </div>
          )}
        </>
      )}
      {active === "My Wallet" && <><SectionHead title="Wallet" copy="Save your payment details for faster checkout." /><EmptyState title="You haven't saved any payment methods yet" copy="Securely save your payment details for faster checkout whenever you place an order." /></>}
      {active === "My Coupons" && (
        <>
          <SectionHead title="My Coupons" copy="Private atelier coupons and limited drop benefits." />
          <div className="grid gap-4 py-6 md:grid-cols-2">
            {[
              ["FOLLOCIA10", "10% off your next reservation", "Valid on live editions"],
              ["ATELIERCARE", "Complimentary care kit", "Auto-applied on premium pairs"],
            ].map(([code, title, copy]) => (
              <article key={code} className="glass border border-dashed border-[var(--gold)]/40 p-6 bg-[var(--champagne)]/10 hover:shadow-[var(--shadow-luxe)] transition-shadow">
                <p className="text-xs uppercase tracking-[0.25em] text-[var(--gold)]">{code}</p>
                <h3 className="mt-4 font-display text-2xl">{title}</h3>
                <p className="mt-2 text-sm text-[var(--ink)]/60">{copy}</p>
              </article>
            ))}
          </div>
        </>
      )}
      {active === "Gift Cards" && <><SectionHead title="Gift Cards" copy="Manage atelier gift cards and private balance." /><EmptyState title="No gift cards added yet." copy="Gift card balance and redemption history will appear here." /></>}
      {active === "My Reviews" && (
        <>
          <SectionHead title="My Reviews" copy="Ratings and reviews shared for purchased pieces." />
          {deliveredOrders.length === 0 ? (
            <EmptyState title="No reviews yet." copy="After delivery, you can review fit, finish and concierge experience." />
          ) : (
            <div className="grid gap-6 py-6">
              {deliveredOrders.map((order) => <ReviewComposer key={order.id} order={order} />)}
            </div>
          )}
        </>
      )}
      {active === "Notifications" && (
        <>
          <SectionHead title="Notifications" copy="Order alerts, drop reminders and concierge updates." />
          <div className="grid gap-3 py-6">
            {["Order status updates", "Wishlist price and availability alerts", "New private drop invitations", "Concierge support replies"].map((item) => (
              <label key={item} className="flex items-center justify-between glass border border-[var(--ink)]/10 p-5 text-sm cursor-pointer hover:border-[var(--gold)]/30 transition-colors">
                {item}
                <input type="checkbox" defaultChecked className="w-4 h-4 accent-[var(--gold)]" />
              </label>
            ))}
          </div>
        </>
      )}
      {active === "My Wishlist" && (
        <>
          <SectionHead title="My Wishlist" copy="Saved pieces and drop alerts from your private atelier profile." />
          {mergedWishlist.length === 0 ? (
            <EmptyState title="You haven't saved any pieces yet." action={<a className="text-sm underline text-[var(--gold)] hover:text-[var(--ink)] transition-colors" href="/#collections">Start Browsing</a>} />
          ) : (
            <div className="grid gap-6 py-6 md:grid-cols-2">
              {products.filter((product) => mergedWishlist.includes(product.id)).map((product) => (
                <article key={product.id} className="grid grid-cols-[110px_1fr] gap-5 glass border border-[var(--ink)]/10 p-5 group hover:shadow-[var(--shadow-soft)] transition-shadow cursor-pointer relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-xs uppercase tracking-[0.1em] text-[var(--gold)] underline">View</span>
                  </div>
                  <div className="overflow-hidden bg-[var(--champagne)]/30">
                    <img src={product.image} alt={product.title} className="aspect-[4/5] w-full object-cover transition-transform duration-500 group-hover:scale-110" />
                  </div>
                  <div className="flex flex-col justify-center">
                    <p className="eyebrow text-[var(--ink)]/50">{product.edition}</p>
                    <h3 className="mt-1 font-display text-xl group-hover:text-[var(--gold)] transition-colors leading-tight">{product.title}</h3>
                    <p className="mt-3 text-sm font-medium">{product.price}</p>
                    <p className="mt-2 text-xs uppercase tracking-[0.2em] text-[var(--ink)]/40">{product.status}</p>
                  </div>
                </article>
              ))}
            </div>
          )}
        </>
      )}
      {active === "My Subscriptions" && <><SectionHead title="Subscriptions" copy="View and manage the subscriptions you've purchased." /><EmptyState title="No purchased subscriptions" copy="When you purchase a subscription, it'll appear here." /></>}
      {active === "My Account" && <AccountForm profile={profile} onSave={saveProfile} />}
      
      <AnimatePresence>
        {showAddress && (
          <AddressModal
            profile={profile}
            onClose={() => setShowAddress(false)}
            onSave={(address) => {
              const addresses = address.isDefault ? profile.addresses.map((item) => ({ ...item, isDefault: false })) : profile.addresses;
              saveProfile({ ...profile, addresses: [...addresses, address] });
              setShowAddress(false);
            }}
          />
        )}
      </AnimatePresence>
    </AccountShell>
  );
}

function AccountForm({ profile, onSave }: { profile: CustomerProfile; onSave: (profile: CustomerProfile) => void }) {
  const [draft, setDraft] = useState(profile);
  useEffect(() => setDraft(profile), [profile]);
  const update = (key: keyof CustomerProfile, value: string) => setDraft((current) => ({ ...current, [key]: value, name: key === "firstName" || key === "lastName" ? `${key === "firstName" ? value : current.firstName} ${key === "lastName" ? value : current.lastName}`.trim() : current.name }));

  return (
    <>
      <SectionHead title="Account" copy="View and edit your personal info below." />
      <form
        onSubmit={(event) => {
          event.preventDefault();
          onSave(draft);
        }}
        className="border-b border-[var(--ink)]/10 pb-12 mb-10"
      >
        <h2 className="font-display text-2xl">Personal info</h2>
        <p className="mt-2 text-sm text-[var(--ink)]/60">Update your private client information.</p>
        <div className="mt-8 grid max-w-[600px] gap-6 md:grid-cols-2">
          <Field label="First name" value={draft.firstName} onChange={(value) => update("firstName", value)} />
          <Field label="Last name" value={draft.lastName} onChange={(value) => update("lastName", value)} />
          <Field label="Phone" value={draft.phone} onChange={(value) => update("phone", value)} />
        </div>
        <div className="mt-8 flex gap-4">
          <button type="button" onClick={() => setDraft(profile)} className="border border-[var(--ink)]/20 px-8 py-3 text-xs uppercase tracking-[0.1em] hover:bg-[var(--ink)]/5 transition-colors">Discard</button>
          <button className="magnetic-btn bg-[var(--ink)] px-8 py-3 text-xs uppercase tracking-[0.1em] text-white hover:bg-[var(--gold)] hover:text-[var(--ink)] transition-colors">Update Info</button>
        </div>
      </form>
      <section className="text-sm">
        <h2 className="font-display text-2xl">Login info</h2>
        <p className="mt-2 text-[var(--ink)]/60">View and update your login email and password.</p>
        <div className="mt-8 grid gap-8 md:grid-cols-2 max-w-[600px]">
          <div className="glass border border-[var(--ink)]/10 p-5">
            <p className="eyebrow text-[var(--ink)]/50">Login email</p>
            <p className="mt-1 text-lg font-medium">{profile.email}</p>
            <button className="mt-4 text-[var(--gold)] text-xs uppercase tracking-[0.1em] hover:underline">Change Email</button>
          </div>
          <div className="glass border border-[var(--ink)]/10 p-5">
            <p className="eyebrow text-[var(--ink)]/50">Password</p>
            <p className="mt-1 text-lg tracking-widest text-[var(--ink)]/40">••••••••</p>
            <button className="mt-4 text-[var(--gold)] text-xs uppercase tracking-[0.1em] hover:underline">Change Password</button>
          </div>
        </div>
      </section>
    </>
  );
}

function ReviewComposer({ order }: { order: CommerceOrder }) {
  const [rating, setRating] = useState("5.0 / 5");
  const [text, setText] = useState("");
  const [saved, setSaved] = useState(false);
  const submitReview = () => {
    if (!text.trim()) return;
    const key = "follocia_admin_reviews";
    const existing = readAdminRecords(key, []);
    const next = [{ id: `review-${Date.now()}`, title: rating, meta: `${order.product}: ${text.trim()}`, status: "Review" }, ...existing];
    saveAdminRecords(key, next);
    void saveAdminRecordsRemote("reviews", next);
    setSaved(true);
    setText("");
  };

  return (
    <article className="glass border border-[var(--ink)]/10 p-6 shadow-[var(--shadow-soft)]">
      <p className="eyebrow text-[var(--ink)]/50">{order.id} - <span className="text-[var(--ink)]">{order.product}</span></p>
      <div className="mt-4 grid gap-4 md:grid-cols-[140px_1fr_auto]">
        <select value={rating} onChange={(event) => setRating(event.target.value)} className="h-12 border border-[var(--ink)]/15 bg-transparent px-3 text-sm focus:border-[var(--gold)] outline-none cursor-pointer">
          {["5.0 / 5", "4.0 / 5", "3.0 / 5", "2.0 / 5", "1.0 / 5"].map((item) => <option key={item}>{item}</option>)}
        </select>
        <input value={text} onChange={(event) => setText(event.target.value)} placeholder="Share fit, finish and concierge experience" className="h-12 border border-[var(--ink)]/15 bg-transparent px-4 text-sm focus:border-[var(--gold)] focus:shadow-[0_0_10px_oklch(0.78_0.12_80/0.1)] outline-none transition-all" />
        <button onClick={submitReview} className="bg-[var(--ink)] px-8 py-3 text-xs uppercase tracking-[0.1em] text-white hover:bg-[var(--gold)] hover:text-[var(--ink)] transition-colors">Submit Review</button>
      </div>
      <AnimatePresence>
        {saved && (
          <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="mt-4 text-sm text-emerald-600 bg-emerald-50 p-3 border border-emerald-100 flex items-center gap-2">
            <span>✓</span> Review submitted to admin moderation.
          </motion.p>
        )}
      </AnimatePresence>
    </article>
  );
}

function OrderRow({ order, onUpdate }: { order: CommerceOrder; onUpdate: (order: CommerceOrder) => void }) {
  // 8-Step pipeline tracking
  const steps = [
    "Order Received",
    "Identity Verified",
    "Materials Sourced",
    "Atelier Construction",
    "Quality Control",
    "Packaging",
    "Dispatched",
    "Delivered"
  ];
  
  // Map old deliveryStatus to new pipeline logic for demo purposes
  const getPipelineIndex = (status: string) => {
    switch (status) {
      case "Order Placed": return 0;
      case "Fitting Scheduled": return 1;
      case "In Atelier": return 3;
      case "Dispatched": return 6;
      case "Delivered": return 7;
      default: return 0;
    }
  };
  
  const activeIndex = Math.max(0, getPipelineIndex(order.deliveryStatus));
  const isCancelled = order.deliveryStatus === "Cancelled";
  
  const [activeRequest, setActiveRequest] = useState<"cancel" | "return" | "support" | null>(null);
  const [reason, setReason] = useState("");
  const [showInvoice, setShowInvoice] = useState(false);

  const submitServiceRequest = () => {
    const trimmedReason = reason.trim();
    if (!activeRequest || !trimmedReason) return;

    if (activeRequest === "cancel") {
      const nextOrder = { ...order, status: "Cancelled", deliveryStatus: "Cancelled", deliveryEta: "Cancelled by customer" };
      onUpdate(nextOrder);
      appendAdminRecord("audit", `Customer cancelled ${order.id}`, `${order.product} - ${trimmedReason}`, "Logged");
    }

    if (activeRequest === "return") {
      const nextOrder = { ...order, status: "Return Requested", deliveryStatus: "Return Requested", deliveryEta: "Concierge will contact you" };
      onUpdate(nextOrder);
      appendAdminRecord("contact", `Return request - ${order.id}`, `${order.customer} requested return for ${order.product}. Reason: ${trimmedReason}`, "Open");
      appendAdminRecord("audit", `Return requested ${order.id}`, `${order.product} - ${trimmedReason}`, "Logged");
    }

    if (activeRequest === "support") {
      const nextOrder = { ...order, status: "Support Requested" };
      onUpdate(nextOrder);
      appendAdminRecord("contact", `Support request - ${order.id}`, `${order.customer}: ${trimmedReason}`, "Open");
    }

    setReason("");
    setActiveRequest(null);
  };

  return (
    <article className="glass border border-[var(--ink)]/10 bg-white/80 shadow-[var(--shadow-soft)] overflow-hidden">
      <div className="p-6 md:p-8">
        <div className="grid gap-4 md:grid-cols-[1fr_auto] border-b border-[var(--ink)]/10 pb-6">
          <div>
            <div className="flex items-center gap-3">
              <strong className="font-display text-2xl">{order.id}</strong>
              {isCancelled && <span className="bg-red-50 text-red-700 px-2 py-0.5 text-[0.6rem] uppercase tracking-widest rounded-sm border border-red-200">Cancelled</span>}
            </div>
            <p className="mt-2 text-lg">{order.product} <span className="text-[var(--ink)]/50 mx-2">|</span> Size {order.size}</p>
            <p className="mt-1 text-[var(--ink)]/60 text-sm">Placed on {order.date}</p>
          </div>
          <div className="text-left md:text-right">
            <span className="font-display text-3xl gradient-gold-text">{order.amount}</span>
            <p className="mt-2 text-sm text-[var(--ink)]/60 flex items-center md:justify-end gap-2">
              <span className={`w-2 h-2 rounded-full ${order.paymentStatus.includes("Paid") ? "bg-emerald-500" : "bg-amber-500"}`} />
              {order.paymentStatus}
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_260px]">
          <div>
            <p className="eyebrow text-[var(--gold)]">Delivery Status</p>
            <p className="mt-1 font-medium text-lg">{isCancelled ? "Cancelled" : order.deliveryStatus}</p>
            
            {!isCancelled && (
              <div className="mt-8 relative">
                {/* Visual Pipeline */}
                <div className="absolute top-2.5 left-0 w-full h-0.5 bg-[var(--ink)]/10 z-0 rounded-full" />
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${(activeIndex / (steps.length - 1)) * 100}%` }}
                  transition={{ duration: 1, delay: 0.2, ease: "easeOut" }}
                  className="absolute top-2.5 left-0 h-0.5 bg-[var(--gold)] z-0 rounded-full shadow-[0_0_10px_var(--gold)]" 
                />
                
                <div className="relative z-10 flex justify-between">
                  {steps.map((step, index) => {
                    const isActive = index <= activeIndex;
                    const isCurrent = index === activeIndex;
                    return (
                      <div key={step} className="flex flex-col items-center group relative cursor-help">
                        <motion.div 
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ delay: index * 0.1 }}
                          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center bg-white transition-colors duration-300 ${isActive ? "border-[var(--gold)]" : "border-[var(--ink)]/20"}`}
                        >
                          {isActive && <div className={`w-2 h-2 rounded-full ${isCurrent ? "bg-[var(--gold)] animate-pulse" : "bg-[var(--gold)]"}`} />}
                        </motion.div>
                        
                        {/* Tooltip */}
                        <div className="absolute top-8 opacity-0 group-hover:opacity-100 transition-opacity bg-[var(--ink)] text-[var(--bone)] text-[10px] uppercase tracking-widest px-3 py-2 whitespace-nowrap rounded-sm pointer-events-none z-20">
                          {step}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="mt-8 grid sm:grid-cols-2 gap-6 text-sm text-[var(--ink)]/70">
              <div>
                <p className="eyebrow text-[var(--ink)]/50">Tracking Information</p>
                <p className="mt-1">{order.trackingCode || "Assigned after dispatch"}</p>
                <p className="mt-1 font-medium text-[var(--ink)]">ETA: {order.deliveryEta}</p>
              </div>
              <div>
                <p className="eyebrow text-[var(--ink)]/50">Delivery Address</p>
                <p className="mt-1">{order.deliveryAddress || "Address will appear after checkout confirmation."}</p>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 lg:border-l lg:border-[var(--ink)]/10 lg:pl-8">
            {!isCancelled && order.deliveryStatus !== "Delivered" && (
              <button onClick={() => setActiveRequest("cancel")} className="border border-[var(--ink)]/20 px-4 py-3 text-xs uppercase tracking-[0.1em] hover:bg-red-50 hover:text-red-800 hover:border-red-200 transition-colors w-full text-left flex justify-between items-center group">
                Cancel Order <span className="opacity-0 group-hover:opacity-100 transition-opacity">→</span>
              </button>
            )}
            {order.deliveryStatus === "Delivered" && (
              <button onClick={() => setActiveRequest("return")} className="border border-[var(--ink)]/20 px-4 py-3 text-xs uppercase tracking-[0.1em] hover:border-[var(--gold)] transition-colors w-full text-left flex justify-between items-center group">
                Request Return <span className="opacity-0 group-hover:opacity-100 transition-opacity text-[var(--gold)]">→</span>
              </button>
            )}
            <button onClick={() => setShowInvoice((value) => !value)} className={`border ${showInvoice ? "border-[var(--gold)] bg-[var(--gold)]/5" : "border-[var(--ink)]/20 hover:border-[var(--gold)]"} px-4 py-3 text-xs uppercase tracking-[0.1em] transition-colors w-full text-left flex justify-between items-center group`}>
              Invoice & Receipt <span className="opacity-0 group-hover:opacity-100 transition-opacity text-[var(--gold)]">↓</span>
            </button>
            <a href="#/shop" className="border border-[var(--ink)]/20 px-4 py-3 text-xs uppercase tracking-[0.1em] hover:border-[var(--gold)] transition-colors w-full text-left flex justify-between items-center group">
              Reorder Piece <span className="opacity-0 group-hover:opacity-100 transition-opacity text-[var(--gold)]">→</span>
            </a>
            <button onClick={() => setActiveRequest("support")} className="mt-auto bg-[var(--ink)] px-4 py-3 text-xs uppercase tracking-[0.1em] text-white hover:bg-[var(--gold)] hover:text-[var(--ink)] transition-colors w-full text-left flex justify-between items-center group shadow-[var(--shadow-soft)] hover:shadow-[var(--shadow-gold-glow)]">
              Concierge Support <span className="opacity-50 group-hover:opacity-100 transition-opacity text-white group-hover:text-[var(--ink)]">✉</span>
            </button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {activeRequest && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden bg-[var(--champagne)]/20 border-t border-[var(--gold)]/20">
            <div className="p-6 md:p-8">
              <h3 className="font-display text-xl">{activeRequest === "cancel" ? "Cancel Request" : activeRequest === "return" ? "Return Request" : "Concierge Support"}</h3>
              <p className="text-sm text-[var(--ink)]/60 mt-1">Our atelier team will review your request and respond within 2 hours.</p>
              <textarea
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                placeholder="Reason / note for the concierge team..."
                className="mt-4 min-h-32 w-full border border-[var(--ink)]/15 bg-white/50 p-4 text-sm outline-none transition-all focus:border-[var(--gold)] focus:bg-white focus:shadow-[0_0_10px_oklch(0.78_0.12_80/0.1)] resize-none backdrop-blur-sm"
              />
              <div className="mt-4 flex gap-3">
                <button onClick={() => { setActiveRequest(null); setReason(""); }} className="border border-[var(--ink)]/20 px-6 py-3 text-xs uppercase tracking-[0.1em] hover:bg-white transition-colors">Close</button>
                <button onClick={submitServiceRequest} className="magnetic-btn bg-[var(--ink)] px-6 py-3 text-xs uppercase tracking-[0.1em] text-[var(--bone)] hover:bg-[var(--gold)] hover:text-[var(--ink)] transition-colors">Submit Request</button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showInvoice && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden bg-[var(--ink)] text-white border-t border-[var(--gold)]/20">
            <div className="p-6 md:p-8 relative">
              <div className="absolute inset-0 luxe-grain opacity-20 pointer-events-none" />
              <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-6">
                <h3 className="font-display text-2xl text-[var(--gold)]">Tax Invoice / Receipt</h3>
                <button onClick={() => window.print()} className="border border-white/20 px-4 py-2 text-[10px] uppercase tracking-[0.2em] hover:bg-white hover:text-[var(--ink)] transition-colors flex items-center gap-2">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9V2h12v7M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/><path d="M6 14h12v8H6z"/></svg>
                  Print PDF
                </button>
              </div>
              <div className="relative z-10 grid gap-x-8 gap-y-4 md:grid-cols-2 mt-6 text-sm text-white/70">
                <div className="grid grid-cols-[100px_1fr] gap-2">
                  <span className="uppercase tracking-widest text-[10px] text-[var(--gold)]">Order Ref:</span>
                  <span className="text-white font-medium">{order.id}</span>
                </div>
                <div className="grid grid-cols-[100px_1fr] gap-2">
                  <span className="uppercase tracking-widest text-[10px] text-[var(--gold)]">Date:</span>
                  <span className="text-white">{order.date}</span>
                </div>
                <div className="grid grid-cols-[100px_1fr] gap-2">
                  <span className="uppercase tracking-widest text-[10px] text-[var(--gold)]">Customer:</span>
                  <span className="text-white">{order.customer}</span>
                </div>
                <div className="grid grid-cols-[100px_1fr] gap-2">
                  <span className="uppercase tracking-widest text-[10px] text-[var(--gold)]">Email:</span>
                  <span className="text-white">{order.email}</span>
                </div>
                <div className="grid grid-cols-[100px_1fr] gap-2">
                  <span className="uppercase tracking-widest text-[10px] text-[var(--gold)]">Product:</span>
                  <span className="text-white">{order.product}</span>
                </div>
                <div className="grid grid-cols-[100px_1fr] gap-2">
                  <span className="uppercase tracking-widest text-[10px] text-[var(--gold)]">Size:</span>
                  <span className="text-white">{order.size}</span>
                </div>
                <div className="grid grid-cols-[100px_1fr] gap-2">
                  <span className="uppercase tracking-widest text-[10px] text-[var(--gold)]">Payment:</span>
                  <span className="text-white">{order.paymentStatus}</span>
                </div>
                <div className="grid grid-cols-[100px_1fr] gap-2">
                  <span className="uppercase tracking-widest text-[10px] text-[var(--gold)]">Method:</span>
                  <span className="text-white">{order.paymentMethod}</span>
                </div>
              </div>
              <div className="relative z-10 mt-6 border-t border-white/10 pt-6 flex justify-between items-end">
                <div>
                  <span className="uppercase tracking-widest text-[10px] text-[var(--gold)] block mb-1">Delivery</span>
                  <p className="text-white/70 max-w-[200px] text-xs">{order.deliveryAddress || "Delivery address pending"}</p>
                </div>
                <div className="text-right">
                  <span className="uppercase tracking-widest text-[10px] text-[var(--gold)] block mb-1">Total Amount</span>
                  <span className="font-display text-2xl text-white">{order.amount}</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </article>
  );
}

function AdminField({ label, value, onChange, placeholder }: { label: string; value: string | number; onChange: (value: string) => void; placeholder?: string }) {
  return (
    <label className="grid gap-2 text-[10px] uppercase tracking-[0.2em] text-[var(--ink)]/50">
      {label}
      <input 
        value={value} 
        onChange={(event) => onChange(event.target.value)} 
        placeholder={placeholder}
        className="border border-[var(--ink)]/10 bg-white/50 backdrop-blur-sm px-4 py-3 text-sm normal-case tracking-normal text-[var(--ink)] outline-none focus:border-[var(--gold)] focus:bg-white focus:shadow-[0_0_10px_oklch(0.78_0.12_80/0.1)] transition-all" 
      />
    </label>
  );
}

type AdminRecord = { id: string; title: string; meta: string; status: string };

function readAdminRecords(key: string, seed: AdminRecord[]) {
  if (typeof window === "undefined") return seed;
  try {
    return JSON.parse(localStorage.getItem(key) || "") as AdminRecord[];
  } catch {
    localStorage.setItem(key, JSON.stringify(seed));
    return seed;
  }
}

function saveAdminRecords(key: string, records: AdminRecord[]) {
  localStorage.setItem(key, JSON.stringify(records));
}

function readLocalWishlist() {
  try {
    return JSON.parse(localStorage.getItem("follocia_wishlist_items" ) || "[]") as string[];
  } catch {
    return [];
  }
}

function appendAdminRecord(module: string, title: string, meta: string, status: string) {
  if (typeof window === "undefined") return;
  const key = `follocia_admin_${module}`;
  const next = [{ id: `${module}-${Date.now()}`, title, meta, status }, ...readAdminRecords(key, [])];
  saveAdminRecords(key, next);
  void saveAdminRecordsRemote(module, next);
}

async function syncAdminRecordsFromBackend(setters: Record<string, (records: AdminRecord[]) => void>) {
  try {
    const response = await fetch("/api/commerce/admin-records");
    if (!response.ok) return;
    const records = (await response.json()) as Array<AdminRecord & { module: string }>;
    Object.entries(setters).forEach(([module, setRecords]) => {
      const moduleRecords = records.filter((record) => record.module === module).map(({ id, title, meta, status }) => ({ id, title, meta, status }));
      if (moduleRecords.length > 0) {
        saveAdminRecords(`follocia_admin_${module}`, moduleRecords);
        setRecords(moduleRecords);
      }
    });
  } catch {
    // Local fallback keeps admin usable while API/dev server is unavailable.
  }
}

async function saveAdminRecordsRemote(module: string, records: AdminRecord[]) {
  try {
    await fetch(`/api/commerce/admin-records/${module}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(records.map((record) => ({ ...record, module }))),
    });
  } catch {
    // Local persistence already happened.
  }
}

const adminSections = ["dashboard", "orders", "inventory", "customers", "coupons", "reviews", "banners", "cms", "analytics", "newsletter", "contact", "audit"] as const;
type AdminSection = (typeof adminSections)[number];

const adminSectionCopy: Record<AdminSection, { label: string; title: string; copy: string }> = {
  dashboard: { label: "Dashboard", title: "Maison command center", copy: "Live store health, order flow, stock alerts and customer activity." },
  orders: { label: "Orders", title: "Order operations", copy: "Payment, delivery, tracking, address and concierge status controls." },
  inventory: { label: "Inventory", title: "Product studio", copy: "Catalogue copy, prices, stock, reservations and visible product states." },
  customers: { label: "Customers", title: "Customer ecosystem", copy: "Buyers, tiers, addresses, wishlist intent and account signals." },
  coupons: { label: "Coupons", title: "Coupon desk", copy: "Private-drop offers, cart recovery codes and VIP access benefits." },
  reviews: { label: "Reviews", title: "Review moderation", copy: "Publish, pause and review customer feedback before storefront use." },
  banners: { label: "Banners", title: "Homepage banners", copy: "Hero slots, VIP strips and seasonal storefront placements." },
  cms: { label: "CMS", title: "Content pages", copy: "Atelier story, policies, care guides and client-facing pages." },
  analytics: { label: "Analytics", title: "Performance room", copy: "Conversion, revenue, cart recovery and wishlist movement." },
  newsletter: { label: "Newsletter", title: "Audience segments", copy: "Private drop audiences and high-intent customer campaigns." },
  contact: { label: "Contact", title: "Client concierge", copy: "Sizing questions, delivery requests and service follow-ups." },
  audit: { label: "Audit", title: "Audit log", copy: "Operational changes kept visible for the client demo." },
};

function getAdminSectionFromHash() {
  if (typeof window === "undefined") return "dashboard" as AdminSection;
  const hash = window.location.hash.replace("#", "").toLowerCase();
  return adminSections.includes(hash as AdminSection) ? (hash as AdminSection) : "dashboard";
}

export function AdminPanel({ onLogout }: { onLogout?: () => void }) {
  const [activeSection, setActiveSection] = useState<AdminSection>(getAdminSectionFromHash);
  const [products, setProducts] = useState<CommerceProduct[]>(() => getProducts());
  const [orders, setOrders] = useState<CommerceOrder[]>(() => getOrders());
  const [customers, setCustomers] = useState<CustomerProfile[]>(() => getCustomers());
  const [coupons, setCoupons] = useState<AdminRecord[]>(() => readAdminRecords("follocia_admin_coupons", [
    { id: "coupon-1", title: "FOLLOCIA10", meta: "10% off - Live editions", status: "Active" },
    { id: "coupon-2", title: "ATELIERCARE", meta: "Free care kit - Delivered orders", status: "Active" },
    { id: "coupon-3", title: "VIPFIRST", meta: "Priority fitting - Private members", status: "Paused" },
  ]));
  const [reviews, setReviews] = useState<AdminRecord[]>(() => readAdminRecords("follocia_admin_reviews", [
    { id: "review-1", title: "5.0 / 5", meta: "Fit was perfect, packaging felt premium", status: "Published" },
    { id: "review-2", title: "4.0 / 5", meta: "Concierge helped with size exchange", status: "Published" },
    { id: "review-3", title: "3.0 / 5", meta: "Waiting for dispatch update", status: "Review" },
  ]));
  const [banners, setBanners] = useState<AdminRecord[]>(() => readAdminRecords("follocia_admin_banners", [
    { id: "banner-1", title: "Hero drop banner", meta: "Homepage first viewport", status: "Live" },
    { id: "banner-2", title: "VIP access strip", meta: "Navigation and checkout", status: "Live" },
  ]));
  const [cmsPages, setCmsPages] = useState<AdminRecord[]>(() => readAdminRecords("follocia_admin_cms", [
    { id: "cms-1", title: "About atelier", meta: "Brand story page", status: "Published" },
    { id: "cms-2", title: "Care guide", meta: "Post-purchase care", status: "Published" },
    { id: "cms-3", title: "Return policy", meta: "Customer support", status: "Draft" },
  ]));
  const [contactQueries, setContactQueries] = useState<AdminRecord[]>(() => readAdminRecords("follocia_admin_contact", [
    { id: "contact-1", title: "Sizing query from Mumbai", meta: "Customer asked for 38/39 fitting help", status: "Open" },
    { id: "contact-2", title: "Delivery request from Delhi", meta: "White-glove delivery timing", status: "Open" },
  ]));
  const [newsletter, setNewsletter] = useState<AdminRecord[]>(() => readAdminRecords("follocia_admin_newsletter", [
    { id: "news-1", title: "1,284 subscribers", meta: "Private drop audience", status: "Ready" },
    { id: "news-2", title: "92 high-intent members", meta: "Wishlist and repeat customers", status: "Segmented" },
  ]));
  const [audit, setAudit] = useState<AdminRecord[]>(() => readAdminRecords("follocia_admin_audit", [
    { id: "audit-1", title: "Product inventory updated", meta: "Admin changed available stock", status: "Logged" },
    { id: "audit-2", title: "Order status changed", meta: "Delivery timeline updated", status: "Logged" },
  ]));
  const [draftProduct, setDraftProduct] = useState({
    title: "",
    edition: "Edition of 100",
    tone: "Italian satin",
    price: "EUR 950",
    image: getProducts()[0]?.image || "",
    status: "Live",
    produced: "100",
    reserved: "0",
    available: "100",
  });

  const metrics = useMemo(() => [
    { label: "Total orders", value: String(orders.length).padStart(2, "0"), delta: "Backend synced" },
    { label: "Reserved value", value: `EUR ${orders.reduce((sum, order) => sum + (Number(order.amount.replace(/[^\d.]/g, "")) || 0), 0).toLocaleString()}`, delta: "Live order value" },
    { label: "VIP customers", value: String(customers.length).padStart(2, "0"), delta: "Customer ecosystem" },
    { label: "Pairs remaining", value: String(products.reduce((sum, product) => sum + product.available, 0)), delta: "Across catalogue", tone: "warn" },
  ], [customers.length, orders, products]);

  const persistProducts = (next: CommerceProduct[]) => {
    setProducts(next);
    saveProducts(next);
    next.forEach((product) => void saveProductRemote(product));
  };
  const updateDraftProduct = (field: keyof typeof draftProduct, value: string) => setDraftProduct((current) => ({ ...current, [field]: value }));
  const createProduct = () => {
    if (!draftProduct.title.trim()) return;
    const nextProduct: CommerceProduct = {
      id: `atelier-${Date.now()}`,
      title: draftProduct.title.trim(),
      edition: draftProduct.edition.trim() || "Edition of 100",
      tone: draftProduct.tone.trim() || "Italian satin",
      price: draftProduct.price.trim() || "EUR 950",
      image: draftProduct.image.trim() || products[0]?.image || "",
      status: draftProduct.status.trim() || "Live",
      produced: Number(draftProduct.produced) || 0,
      reserved: Number(draftProduct.reserved) || 0,
      available: Number(draftProduct.available) || 0,
    };
    persistProducts([nextProduct, ...products]);
    appendAdminRecord("audit", "Product created", `${nextProduct.title} added to catalogue`, "Logged");
    setDraftProduct((current) => ({ ...current, title: "", reserved: "0" }));
  };
  const archiveProduct = (product: CommerceProduct) => {
    persistProducts(products.map((item) => item.id === product.id ? { ...item, status: "Draft", available: 0 } : item));
    appendAdminRecord("audit", "Product removed from storefront", `${product.title} moved to Draft`, "Logged");
  };
  const persistOrders = (next: CommerceOrder[]) => {
    setOrders(next);
    saveOrders(next);
    next.forEach((order) => void saveOrderRemote(order));
  };
  const openSection = (section: AdminSection) => {
    setActiveSection(section);
    if (typeof window !== "undefined") window.location.hash = section;
  };

  useEffect(() => {
    const sync = () => {
      setProducts(getProducts());
      setOrders(getOrders());
      setCustomers(getCustomers());
    };
    void syncCommerceFromBackend();
    void syncAdminRecordsFromBackend({ coupons: setCoupons, reviews: setReviews, banners: setBanners, cms: setCmsPages, newsletter: setNewsletter, contact: setContactQueries, audit: setAudit });
    window.addEventListener(COMMERCE_EVENT, sync);
    const onHashChange = () => setActiveSection(getAdminSectionFromHash());
    window.addEventListener("hashchange", onHashChange);
    return () => {
      window.removeEventListener(COMMERCE_EVENT, sync);
      window.removeEventListener("hashchange", onHashChange);
    };
  }, []);

  const dashboardPanel = (
    <div className="grid gap-5">
      <section className="grid gap-8 bg-[var(--ink)] p-8 text-[var(--bone)] lg:grid-cols-[1.35fr_0.65fr]">
        <div>
          <p className="eyebrow text-[var(--gold)]">Maison operations</p>
          <h2 className="mt-4 max-w-3xl font-display text-6xl leading-none">Premium commerce dashboard.</h2>
          <p className="mt-5 max-w-xl text-sm leading-6 text-[var(--bone)]/62">Orders, product CMS, customers, offers, reviews, banners, content, analytics, newsletter, concierge and audit are split into real working modules.</p>
        </div>
        <div className="grid gap-3 border border-[var(--bone)]/12 p-5">
          <p className="eyebrow text-[var(--bone)]/45">Demo readiness</p>
          <strong className="font-display text-5xl">Live</strong>
          <span className="text-sm text-[var(--bone)]/60">Backend API, LocalDB persistence and local fallback are connected.</span>
        </div>
      </section>
      <div className="grid gap-4 md:grid-cols-4">
        {metrics.map((metric) => <article key={metric.label} className="border border-[var(--ink)]/10 bg-white p-5"><p className="eyebrow text-[var(--ink)]/45">{metric.label}</p><strong className="mt-4 block font-display text-4xl">{metric.value}</strong><small className={metric.tone === "warn" ? "text-red-800" : "text-emerald-800"}>{metric.delta}</small></article>)}
      </div>
      <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <AdminCard id="dashboard-orders" title="Latest Orders">
          <AdminMiniList items={orders.slice(0, 5).map((order) => `${order.id} - ${order.customer} - ${order.status}`)} />
        </AdminCard>
        <AdminCard id="dashboard-actions" title="Quick Actions">
          <div className="grid gap-3 md:grid-cols-2">
            {(["orders", "inventory", "customers", "coupons"] as AdminSection[]).map((section) => <button key={section} onClick={() => openSection(section)} className="border border-[var(--ink)]/15 bg-white px-4 py-4 text-left"><span className="eyebrow text-[var(--ink)]/45">Open</span><strong className="mt-2 block font-display text-2xl">{adminSectionCopy[section].label}</strong></button>)}
          </div>
        </AdminCard>
      </div>
    </div>
  );

  const ordersPanel = (
    <AdminCard id="orders" title="Order Control">
      <div className="grid gap-4">
        {orders.map((order) => (
          <article key={order.id} className="grid gap-4 border border-[var(--ink)]/10 bg-white p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div><p className="eyebrow text-[var(--ink)]/45">{order.id}</p><h3 className="mt-1 font-display text-3xl">{order.customer}</h3><p className="text-sm text-[var(--ink)]/60">{order.product} - Size {order.size} - {order.amount}</p></div>
              <div className="grid min-w-[220px] gap-1 border border-[var(--ink)]/10 bg-[var(--bone)]/35 p-3 text-sm"><span>Payment: <strong>{order.paymentStatus}</strong></span><span>Delivery: <strong>{order.deliveryStatus}</strong></span></div>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              <label className="grid gap-1 text-xs uppercase tracking-[0.22em] text-[var(--ink)]/45">Order status<select value={order.status} onChange={(event) => persistOrders(orders.map((item) => item.id === order.id ? { ...item, status: event.target.value } : item))} className="border border-[var(--ink)]/15 bg-white px-3 py-2 text-sm normal-case tracking-normal text-[var(--ink)]">{["Concierge Review", "Fitting Booked", "Paid", "White-glove Dispatch", "Delivered", "Cancelled", "Return Requested", "Support Requested"].map((status) => <option key={status}>{status}</option>)}</select></label>
              <label className="grid gap-1 text-xs uppercase tracking-[0.22em] text-[var(--ink)]/45">Payment<select value={order.paymentStatus} onChange={(event) => persistOrders(orders.map((item) => item.id === order.id ? { ...item, paymentStatus: event.target.value } : item))} className="border border-[var(--ink)]/15 bg-white px-3 py-2 text-sm normal-case tracking-normal text-[var(--ink)]">{["Payment Pending", "Authorized", "Paid", "Due on Delivery", "Refunded"].map((status) => <option key={status}>{status}</option>)}</select></label>
              <label className="grid gap-1 text-xs uppercase tracking-[0.22em] text-[var(--ink)]/45">Delivery<select value={order.deliveryStatus} onChange={(event) => persistOrders(orders.map((item) => item.id === order.id ? { ...item, deliveryStatus: event.target.value } : item))} className="border border-[var(--ink)]/15 bg-white px-3 py-2 text-sm normal-case tracking-normal text-[var(--ink)]">{["Order Placed", "Fitting Scheduled", "In Atelier", "Dispatched", "Delivered", "Cancelled", "Return Requested"].map((status) => <option key={status}>{status}</option>)}</select></label>
              <AdminField label="Order date" value={order.date} onChange={(value) => persistOrders(orders.map((item) => item.id === order.id ? { ...item, date: value } : item))} />
              <AdminField label="Delivery ETA" value={order.deliveryEta} onChange={(value) => persistOrders(orders.map((item) => item.id === order.id ? { ...item, deliveryEta: value } : item))} />
              <AdminField label="Tracking code" value={order.trackingCode} onChange={(value) => persistOrders(orders.map((item) => item.id === order.id ? { ...item, trackingCode: value } : item))} />
            </div>
            <AdminField label="Delivery address" value={order.deliveryAddress} onChange={(value) => persistOrders(orders.map((item) => item.id === order.id ? { ...item, deliveryAddress: value } : item))} />
          </article>
        ))}
      </div>
    </AdminCard>
  );

  const inventoryPanel = (
    <AdminCard id="inventory" title="Product CMS">
      <div className="grid gap-4">
        <section className="border border-[var(--ink)]/10 bg-[var(--bone)]/35 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="eyebrow text-[var(--gold)]">New product</p>
              <h3 className="mt-1 font-display text-3xl">Add catalogue piece</h3>
            </div>
            <button onClick={createProduct} className="bg-[var(--ink)] px-5 py-3 text-xs uppercase tracking-[0.2em] text-[var(--bone)]">Publish</button>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            <AdminField label="Title" value={draftProduct.title} onChange={(value) => updateDraftProduct("title", value)} />
            <AdminField label="Edition" value={draftProduct.edition} onChange={(value) => updateDraftProduct("edition", value)} />
            <AdminField label="Tone / material" value={draftProduct.tone} onChange={(value) => updateDraftProduct("tone", value)} />
            <AdminField label="Price" value={draftProduct.price} onChange={(value) => updateDraftProduct("price", value)} />
            <AdminField label="Status" value={draftProduct.status} onChange={(value) => updateDraftProduct("status", value)} />
            <AdminField label="Produced" value={draftProduct.produced} onChange={(value) => updateDraftProduct("produced", value)} />
            <AdminField label="Reserved" value={draftProduct.reserved} onChange={(value) => updateDraftProduct("reserved", value)} />
            <AdminField label="Available" value={draftProduct.available} onChange={(value) => updateDraftProduct("available", value)} />
            <label className="grid gap-1 text-xs uppercase tracking-[0.22em] text-[var(--ink)]/45 md:col-span-3">
              Image URL
              <input value={draftProduct.image} onChange={(event) => updateDraftProduct("image", event.target.value)} className="border border-[var(--ink)]/15 bg-white px-3 py-2 text-sm normal-case tracking-normal text-[var(--ink)] outline-none focus:border-[var(--gold)]" />
            </label>
          </div>
        </section>
        {products.map((product) => (
          <article key={product.id} className="grid gap-5 border border-[var(--ink)]/10 bg-white p-5 xl:grid-cols-[150px_1fr]">
            <img src={product.image} alt={product.title} className="aspect-[3/4] w-full object-cover" />
            <div className="grid gap-3 md:grid-cols-3">
              <AdminField label="Title" value={product.title} onChange={(value) => persistProducts(products.map((item) => item.id === product.id ? { ...item, title: value } : item))} />
              <AdminField label="Edition" value={product.edition} onChange={(value) => persistProducts(products.map((item) => item.id === product.id ? { ...item, edition: value } : item))} />
              <AdminField label="Tone / material" value={product.tone} onChange={(value) => persistProducts(products.map((item) => item.id === product.id ? { ...item, tone: value } : item))} />
              <AdminField label="Price" value={product.price} onChange={(value) => persistProducts(products.map((item) => item.id === product.id ? { ...item, price: value } : item))} />
              <AdminField label="Status" value={product.status} onChange={(value) => persistProducts(products.map((item) => item.id === product.id ? { ...item, status: value } : item))} />
              <AdminField label="Produced" value={product.produced} onChange={(value) => persistProducts(products.map((item) => item.id === product.id ? { ...item, produced: Number(value) || 0 } : item))} />
              <AdminField label="Reserved" value={product.reserved} onChange={(value) => persistProducts(products.map((item) => item.id === product.id ? { ...item, reserved: Number(value) || 0 } : item))} />
              <AdminField label="Available" value={product.available} onChange={(value) => persistProducts(products.map((item) => item.id === product.id ? { ...item, available: Number(value) || 0 } : item))} />
              <label className="grid gap-1 text-xs uppercase tracking-[0.22em] text-[var(--ink)]/45 md:col-span-3">
                Image URL
                <input value={product.image} onChange={(event) => persistProducts(products.map((item) => item.id === product.id ? { ...item, image: event.target.value } : item))} className="border border-[var(--ink)]/15 bg-white px-3 py-2 text-sm normal-case tracking-normal text-[var(--ink)] outline-none focus:border-[var(--gold)]" />
              </label>
              <button onClick={() => archiveProduct(product)} className="border border-[var(--ink)] px-4 py-3 text-xs uppercase tracking-[0.18em] md:col-span-3">
                Move to Draft
              </button>
            </div>
          </article>
        ))}
      </div>
    </AdminCard>
  );

  const customersPanel = (
    <AdminCard id="customers" title="Customer Ecosystem">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[860px] bg-white text-left text-sm">
          <thead className="eyebrow text-[var(--ink)]/45"><tr><th className="p-4">Name</th><th>Email</th><th>Tier</th><th>Phone</th><th>Addresses</th><th>Wishlist</th><th>Orders</th></tr></thead>
          <tbody>{customers.map((customer) => <tr key={customer.id} className="border-t border-[var(--ink)]/10"><td className="p-4 font-medium">{customer.name}</td><td>{customer.email}</td><td>{customer.tier}</td><td>{customer.phone || "Not added"}</td><td>{customer.addresses.length}</td><td>{customer.wishlist.length}</td><td>{orders.filter((order) => order.customerId === customer.id).length}</td></tr>)}</tbody>
        </table>
      </div>
    </AdminCard>
  );

  const analyticsPanel = (
    <div className="grid gap-5">
      <div className="grid gap-4 md:grid-cols-4">
        <article className="border border-[var(--ink)]/10 bg-white p-5"><p className="eyebrow text-[var(--ink)]/45">Conversion</p><strong className="font-display text-5xl">8.4%</strong></article>
        <article className="border border-[var(--ink)]/10 bg-white p-5"><p className="eyebrow text-[var(--ink)]/45">Revenue</p><strong className="font-display text-5xl">+18%</strong></article>
        <article className="border border-[var(--ink)]/10 bg-white p-5"><p className="eyebrow text-[var(--ink)]/45">Cart recovery</p><strong className="font-display text-5xl">{orders.filter((order) => order.status === "Support Requested").length}</strong></article>
        <article className="border border-[var(--ink)]/10 bg-white p-5"><p className="eyebrow text-[var(--ink)]/45">Wishlist intent</p><strong className="font-display text-5xl">{customers.reduce((sum, customer) => sum + customer.wishlist.length, 0)}</strong></article>
      </div>
      <AdminCard id="analytics" title="Performance Notes"><AdminMiniList items={["Orders from checkout appear in customer account and admin.", "Inventory stock changes sync to storefront product cards.", "Coupons, reviews, banners and CMS persist through backend records.", "Customer wishlist and account data are visible for demo."]} /></AdminCard>
    </div>
  );

  const panels: Record<AdminSection, ReactNode> = {
    dashboard: dashboardPanel,
    orders: ordersPanel,
    inventory: inventoryPanel,
    customers: customersPanel,
    coupons: <AdminCard id="coupons" title="Coupons"><AdminCrudList storageKey="follocia_admin_coupons" records={coupons} onChange={setCoupons} titlePlaceholder="Coupon code" metaPlaceholder="Benefit and scope" /></AdminCard>,
    reviews: <AdminCard id="reviews" title="Reviews & Ratings"><AdminCrudList storageKey="follocia_admin_reviews" records={reviews} onChange={setReviews} titlePlaceholder="Rating" metaPlaceholder="Review text" /></AdminCard>,
    banners: <AdminCard id="banners" title="Banners"><AdminCrudList storageKey="follocia_admin_banners" records={banners} onChange={setBanners} titlePlaceholder="Banner title" metaPlaceholder="Placement" /></AdminCard>,
    cms: <AdminCard id="cms" title="CMS Pages"><AdminCrudList storageKey="follocia_admin_cms" records={cmsPages} onChange={setCmsPages} titlePlaceholder="Page title" metaPlaceholder="Page purpose" /></AdminCard>,
    analytics: analyticsPanel,
    newsletter: <AdminCard id="newsletter" title="Newsletter"><AdminCrudList storageKey="follocia_admin_newsletter" records={newsletter} onChange={setNewsletter} titlePlaceholder="Segment" metaPlaceholder="Audience note" /></AdminCard>,
    contact: <AdminCard id="contact" title="Contact Queries"><AdminCrudList storageKey="follocia_admin_contact" records={contactQueries} onChange={setContactQueries} titlePlaceholder="Query title" metaPlaceholder="Query detail" /></AdminCard>,
    audit: <AdminCard id="audit" title="Audit Log"><AdminCrudList storageKey="follocia_admin_audit" records={audit} onChange={setAudit} titlePlaceholder="Audit event" metaPlaceholder="Details" /></AdminCard>,
  };

  return (
    <main className="min-h-screen bg-[var(--bone)] text-[var(--ink)]">
      <header className="sticky top-0 z-40 border-b border-[var(--ink)]/10 bg-[var(--bone)]/90 px-6 backdrop-blur-xl">
        <div className="mx-auto flex h-20 max-w-[1500px] items-center justify-between">
          <a href="/" aria-label="Follocia home" className="flex items-center">
            <BrandLogo compact imageClassName="border border-[var(--ink)]/10" />
          </a>
          <div className="flex gap-2">
            <a href="/" className="border border-[var(--ink)]/15 px-4 py-3 eyebrow">Storefront</a>
            {onLogout && <button onClick={onLogout} className="bg-[var(--ink)] px-4 py-3 eyebrow text-[var(--bone)]">Logout</button>}
          </div>
        </div>
      </header>
      <div className="mx-auto grid max-w-[1500px] gap-5 p-5 lg:grid-cols-[270px_1fr]">
        <aside className="border border-[var(--ink)]/10 bg-[var(--ink)] p-6 text-[var(--bone)] lg:sticky lg:top-24 lg:h-[calc(100vh-7rem)]">
          <h1 className="font-display text-5xl">Admin</h1>
          <p className="mt-4 text-sm text-[var(--bone)]/60">Manage storefront, products, orders, customers and profile ecosystem from one place.</p>
          <nav className="mt-10 grid gap-2 eyebrow text-[var(--bone)]/70">
            {adminSections.map((section) => <button key={section} onClick={() => openSection(section)} className={`border px-4 py-3 text-left transition-colors ${activeSection === section ? "border-[var(--gold)]/60 bg-[var(--bone)] text-[var(--ink)]" : "border-transparent hover:border-[var(--gold)]/40"}`}>{adminSectionCopy[section].label}</button>)}
          </nav>
        </aside>
        <section className="grid gap-5">
          <header className="border border-[var(--ink)]/10 bg-[var(--ivory)] p-6">
            <p className="eyebrow text-[var(--gold)]">{adminSectionCopy[activeSection].label}</p>
            <h2 className="mt-2 font-display text-5xl leading-none">{adminSectionCopy[activeSection].title}</h2>
            <p className="mt-3 max-w-2xl text-sm text-[var(--ink)]/55">{adminSectionCopy[activeSection].copy}</p>
          </header>
          {panels[activeSection]}
        </section>
      </div>
    </main>
  );
}

function LegacyAdminPanel({ onLogout }: { onLogout?: () => void }) {
  const [products, setProducts] = useState<CommerceProduct[]>(() => getProducts());
  const [orders, setOrders] = useState<CommerceOrder[]>(() => getOrders());
  const [customers, setCustomers] = useState<CustomerProfile[]>(() => getCustomers());
  const [coupons, setCoupons] = useState<AdminRecord[]>(() => readAdminRecords("follocia_admin_coupons", [
    { id: "coupon-1", title: "FOLLOCIA10", meta: "10% off - Live editions", status: "Active" },
    { id: "coupon-2", title: "ATELIERCARE", meta: "Free care kit - Delivered orders", status: "Active" },
    { id: "coupon-3", title: "VIPFIRST", meta: "Priority fitting - Private members", status: "Paused" },
  ]));
  const [reviews, setReviews] = useState<AdminRecord[]>(() => readAdminRecords("follocia_admin_reviews", [
    { id: "review-1", title: "5.0 / 5", meta: "Fit was perfect, packaging felt premium", status: "Published" },
    { id: "review-2", title: "4.0 / 5", meta: "Concierge helped with size exchange", status: "Published" },
    { id: "review-3", title: "3.0 / 5", meta: "Waiting for dispatch update", status: "Review" },
  ]));
  const [banners, setBanners] = useState<AdminRecord[]>(() => readAdminRecords("follocia_admin_banners", [
    { id: "banner-1", title: "Hero drop banner", meta: "Homepage first viewport", status: "Live" },
    { id: "banner-2", title: "VIP access strip", meta: "Navigation and checkout", status: "Live" },
  ]));
  const [cmsPages, setCmsPages] = useState<AdminRecord[]>(() => readAdminRecords("follocia_admin_cms", [
    { id: "cms-1", title: "About atelier", meta: "Brand story page", status: "Published" },
    { id: "cms-2", title: "Care guide", meta: "Post-purchase care", status: "Published" },
    { id: "cms-3", title: "Return policy", meta: "Customer support", status: "Draft" },
  ]));
  const [contactQueries, setContactQueries] = useState<AdminRecord[]>(() => readAdminRecords("follocia_admin_contact", [
    { id: "contact-1", title: "Sizing query from Mumbai", meta: "Customer asked for 38/39 fitting help", status: "Open" },
    { id: "contact-2", title: "Delivery request from Delhi", meta: "White-glove delivery timing", status: "Open" },
  ]));
  const [newsletter, setNewsletter] = useState<AdminRecord[]>(() => readAdminRecords("follocia_admin_newsletter", [
    { id: "news-1", title: "1,284 subscribers", meta: "Private drop audience", status: "Ready" },
    { id: "news-2", title: "92 high-intent members", meta: "Wishlist and repeat customers", status: "Segmented" },
  ]));
  const [audit, setAudit] = useState<AdminRecord[]>(() => readAdminRecords("follocia_admin_audit", [
    { id: "audit-1", title: "Product inventory updated", meta: "Admin changed available stock", status: "Logged" },
    { id: "audit-2", title: "Order status changed", meta: "Delivery timeline updated", status: "Logged" },
  ]));
  const metrics = useMemo(() => [
    { label: "Total orders", value: String(orders.length).padStart(2, "0"), delta: "Backend synced" },
    { label: "Reserved value", value: `EUR ${orders.reduce((sum, order) => sum + (Number(order.amount.replace(/[^\d.]/g, "")) || 0), 0).toLocaleString()}`, delta: "Live order value" },
    { label: "VIP customers", value: String(customers.length).padStart(2, "0"), delta: "Customer ecosystem" },
    { label: "Pairs remaining", value: String(products.reduce((sum, product) => sum + product.available, 0)), delta: "Across catalogue", tone: "warn" },
    { label: "Open queries", value: String(contactQueries.filter((item) => item.status === "Open").length).padStart(2, "0"), delta: "Support desk" },
  ], [customers.length, orders, products, contactQueries]);

  const [draftProduct, setDraftProduct] = useState({
    title: "",
    edition: "Edition of 100",
    tone: "Italian satin",
    price: "EUR 950",
    image: products[0]?.image || "",
    status: "Live",
    produced: "100",
    reserved: "0",
    available: "100",
  });

  const updateDraftProduct = (field: keyof typeof draftProduct, value: string) => setDraftProduct((current) => ({ ...current, [field]: value }));

  const persistProducts = (next: CommerceProduct[]) => {
    setProducts(next);
    saveProducts(next);
    next.forEach((product) => void saveProductRemote(product));
  };

  const createProduct = () => {
    if (!draftProduct.title.trim()) return;
    const nextProduct: CommerceProduct = {
      id: `atelier-${Date.now()}`,
      title: draftProduct.title.trim(),
      edition: draftProduct.edition.trim() || "Edition of 100",
      tone: draftProduct.tone.trim() || "Italian satin",
      price: draftProduct.price.trim() || "EUR 950",
      image: draftProduct.image.trim() || products[0]?.image || "",
      status: draftProduct.status.trim() || "Live",
      produced: Number(draftProduct.produced) || 0,
      reserved: Number(draftProduct.reserved) || 0,
      available: Number(draftProduct.available) || 0,
    };
    persistProducts([nextProduct, ...products]);
    appendAdminRecord("audit", "Product created", `${nextProduct.title} added to catalogue`, "Logged");
    setDraftProduct((current) => ({ ...current, title: "", reserved: "0" }));
  };
  const persistOrders = (next: CommerceOrder[]) => {
    setOrders(next);
    saveOrders(next);
    next.forEach((order) => void saveOrderRemote(order));
  };

  useEffect(() => {
    const sync = () => {
      setProducts(getProducts());
      setOrders(getOrders());
      setCustomers(getCustomers());
    };
    void syncCommerceFromBackend();
    void syncAdminRecordsFromBackend({
      coupons: setCoupons,
      reviews: setReviews,
      banners: setBanners,
      cms: setCmsPages,
      newsletter: setNewsletter,
      contact: setContactQueries,
      audit: setAudit,
    });
    window.addEventListener(COMMERCE_EVENT, sync);
    return () => window.removeEventListener(COMMERCE_EVENT, sync);
  }, []);

  return (
    <main className="min-h-screen bg-[var(--bone)] text-[var(--ink)] relative">
      <div className="fixed inset-0 luxe-grain opacity-50 z-0 pointer-events-none" />
      
      {/* Glass Header */}
      <header className="sticky top-0 z-40 border-b border-[var(--ink)]/10 bg-white/70 backdrop-blur-xl shadow-[var(--shadow-soft)]">
        <div className="mx-auto flex h-20 max-w-[1600px] items-center justify-between px-6 lg:px-12">
          <a href="/" aria-label="Follocia home" className="flex items-center gap-4 group">
            <div className="relative overflow-hidden w-10 h-10 rounded-full border border-[var(--gold)] flex items-center justify-center bg-[var(--ink)] group-hover:bg-[var(--gold)] transition-colors">
              <span className="text-[var(--bone)] font-display text-xl group-hover:text-[var(--ink)]">F</span>
            </div>
            <span className="font-display text-xl uppercase tracking-widest hidden md:block group-hover:text-[var(--gold)] transition-colors">Atelier Follocia</span>
          </a>
          <div className="flex gap-4 items-center">
            <span className="text-xs uppercase tracking-[0.2em] text-[var(--gold)] hidden sm:block">Admin Console</span>
            <div className="h-6 w-px bg-[var(--ink)]/10 hidden sm:block" />
            <a href="/" className="eyebrow hover:text-[var(--gold)] transition-colors text-xs">Storefront</a>
            {onLogout && <button onClick={onLogout} className="magnetic-btn bg-[var(--ink)] px-6 py-2 text-xs uppercase tracking-[0.1em] text-[var(--bone)] hover:bg-[var(--gold)] hover:text-[var(--ink)] transition-colors">Logout</button>}
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1600px] gap-8 p-6 lg:p-12 lg:grid-cols-[280px_1fr] relative z-10">
        
        {/* Dark Sidebar */}
        <aside className="relative border border-[var(--gold)]/20 bg-[var(--ink)] p-8 text-[var(--bone)] lg:sticky lg:top-32 lg:h-[calc(100vh-10rem)] shadow-[var(--shadow-luxe)] overflow-hidden">
          <div className="absolute inset-0 luxe-grain opacity-30 pointer-events-none" />
          <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--gold)] opacity-10 blur-3xl rounded-full" />
          
          <div className="relative z-10">
            <h1 className="font-display text-4xl gradient-gold-text">Command<br />Center</h1>
            <p className="mt-4 text-xs tracking-widest uppercase text-[var(--bone)]/50 leading-loose">Manage atelier ecosystem</p>
            <nav className="mt-12 grid gap-1 relative">
              {["Dashboard", "Orders", "Inventory", "Customers", "Coupons", "Reviews", "Banners", "CMS", "Analytics", "Audit"].map((item) => (
                <a 
                  key={item} 
                  href={`#${item.toLowerCase()}`} 
                  className="group relative border border-transparent px-5 py-3.5 text-sm uppercase tracking-[0.15em] transition-all hover:bg-[var(--gold)]/10 overflow-hidden"
                >
                  <span className="relative z-10 group-hover:text-[var(--gold)] transition-colors">{item}</span>
                  <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-[var(--gold)] scale-y-0 group-hover:scale-y-100 transition-transform origin-top" />
                </a>
              ))}
            </nav>
          </div>
        </aside>

        <section className="grid gap-12 max-w-[100%] overflow-hidden">
          <section id="dashboard" className="relative glass border border-[var(--gold)]/20 bg-white/60 p-10 lg:p-16 shadow-[var(--shadow-soft)] overflow-hidden">
            <div className="absolute -top-24 -right-24 w-64 h-64 bg-[var(--champagne)] opacity-50 blur-3xl rounded-full pointer-events-none" />
            <div className="relative z-10">
              <p className="eyebrow text-[var(--gold)] flex items-center gap-3">
                <span className="w-2 h-2 rounded-full bg-[var(--gold)] animate-pulse" /> Live Status
              </p>
              <h2 className="mt-6 font-display text-5xl md:text-6xl lg:text-7xl leading-none tracking-tight">Atelier<br />Operations.</h2>
              <p className="mt-8 max-w-xl text-lg font-light text-[var(--ink)]/70">Complete administrative control over the digital maison.</p>
            </div>
          </section>

          {/* Premium Metric Cards */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {metrics.map((metric, i) => (
              <motion.article 
                key={metric.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="glass relative overflow-hidden border border-[var(--ink)]/10 bg-white p-6 shadow-[var(--shadow-soft)] hover:shadow-[var(--shadow-luxe)] transition-shadow group"
              >
                <div className="absolute top-0 right-0 w-16 h-16 bg-[var(--gold)] opacity-5 blur-2xl group-hover:opacity-20 transition-opacity" />
                <p className="text-xs uppercase tracking-[0.15em] text-[var(--ink)]/50">{metric.label}</p>
                <strong className="mt-4 block font-display text-4xl group-hover:text-[var(--gold)] transition-colors">{metric.value}</strong>
                <div className="mt-6 flex items-center justify-between border-t border-[var(--ink)]/5 pt-4">
                  <small className={`text-[10px] uppercase tracking-widest ${metric.tone === "warn" ? "text-amber-600" : "text-emerald-600"}`}>{metric.delta}</small>
                  <span className="opacity-0 group-hover:opacity-100 transition-opacity text-[var(--gold)]">→</span>
                </div>
              </motion.article>
            ))}
          </div>

          <AdminCard id="orders" title="Order Pipeline">
            <div className="grid gap-4">
              <AnimatePresence>
                {orders.map((order, i) => (
                  <motion.article 
                    key={order.id} 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="grid gap-4 border border-[var(--ink)]/5 bg-white/60 backdrop-blur-md p-6 shadow-[var(--shadow-soft)] hover:shadow-[var(--shadow-luxe)] transition-all xl:grid-cols-[1.5fr_160px_160px]"
                  >
                    <div>
                      <div className="flex items-center gap-3">
                        <strong className="font-display text-2xl">{order.id}</strong>
                        <span className="px-2 py-0.5 bg-[var(--gold)]/10 text-[var(--gold)] text-[10px] uppercase tracking-widest">{order.status}</span>
                      </div>
                      <p className="mt-2 text-sm text-[var(--ink)]/70">{order.customer} <span className="mx-2 text-[var(--gold)]">•</span> {order.product} <span className="mx-2 text-[var(--gold)]">•</span> Size {order.size}</p>
                      <strong className="mt-1 block text-lg font-display">{order.amount}</strong>
                    </div>
                    <div className="grid gap-3">
                      <select value={order.status} onChange={(event) => persistOrders(orders.map((item) => item.id === order.id ? { ...item, status: event.target.value } : item))} className="border border-[var(--ink)]/10 bg-white/80 px-4 py-3 text-sm outline-none focus:border-[var(--gold)] transition-all cursor-pointer appearance-none rounded-none w-full">
                        {["Concierge Review", "Fitting Booked", "Paid", "White-glove Dispatch", "Delivered", "Cancelled", "Return Requested", "Support Requested"].map((status) => <option key={status}>{status}</option>)}
                      </select>
                      <AdminField label="Order Date" value={order.date} onChange={(event) => persistOrders(orders.map((item) => item.id === order.id ? { ...item, date: event } : item))} />
                    </div>
                    <div className="grid gap-3">
                      <select value={order.paymentStatus} onChange={(event) => persistOrders(orders.map((item) => item.id === order.id ? { ...item, paymentStatus: event.target.value } : item))} className="border border-[var(--ink)]/10 bg-white/80 px-4 py-3 text-sm outline-none focus:border-[var(--gold)] transition-all cursor-pointer appearance-none rounded-none w-full">
                        {["Payment Pending", "Authorized", "Paid", "Due on Delivery", "Refunded"].map((status) => <option key={status}>{status}</option>)}
                      </select>
                      <select value={order.deliveryStatus} onChange={(event) => persistOrders(orders.map((item) => item.id === order.id ? { ...item, deliveryStatus: event.target.value } : item))} className="border border-[var(--ink)]/10 bg-white/80 px-4 py-3 text-sm outline-none focus:border-[var(--gold)] transition-all cursor-pointer appearance-none rounded-none w-full">
                        {["Order Placed", "Fitting Scheduled", "In Atelier", "Dispatched", "Delivered", "Cancelled", "Return Requested"].map((status) => <option key={status}>{status}</option>)}
                      </select>
                    </div>
                    <div className="xl:col-span-3 grid gap-3 md:grid-cols-3 mt-2 border-t border-[var(--ink)]/5 pt-4">
                      <AdminField label="ETA" placeholder="Delivery ETA" value={order.deliveryEta} onChange={(event) => persistOrders(orders.map((item) => item.id === order.id ? { ...item, deliveryEta: event } : item))} />
                      <AdminField label="Tracking Code" placeholder="Tracking code" value={order.trackingCode} onChange={(event) => persistOrders(orders.map((item) => item.id === order.id ? { ...item, trackingCode: event } : item))} />
                      <AdminField label="Delivery Address" placeholder="Delivery address" value={order.deliveryAddress} onChange={(event) => persistOrders(orders.map((item) => item.id === order.id ? { ...item, deliveryAddress: event } : item))} />
                    </div>
                  </motion.article>
                ))}
              </AnimatePresence>
            </div>
          </AdminCard>
          <AdminCard id="inventory" title="Product CMS">
            <div className="grid gap-6">
              <section className="border border-[var(--gold)]/20 bg-white/40 backdrop-blur-md p-6 lg:p-8 shadow-[var(--shadow-soft)]">
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--ink)]/5 pb-6">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--gold)]">New Product</p>
                    <h3 className="mt-2 font-display text-3xl">Add Catalogue Piece</h3>
                  </div>
                  <button onClick={createProduct} className="magnetic-btn bg-[var(--ink)] px-8 py-3 text-xs uppercase tracking-[0.1em] text-[var(--bone)] hover:bg-[var(--gold)] hover:text-[var(--ink)] transition-colors">Publish Piece</button>
                </div>
                <div className="mt-8 grid gap-4 md:grid-cols-3 lg:grid-cols-4">
                  <AdminField label="Title" value={draftProduct.title} onChange={(value) => updateDraftProduct("title", value)} />
                  <AdminField label="Edition" value={draftProduct.edition} onChange={(value) => updateDraftProduct("edition", value)} />
                  <AdminField label="Tone / Material" value={draftProduct.tone} onChange={(value) => updateDraftProduct("tone", value)} />
                  <AdminField label="Price" value={draftProduct.price} onChange={(value) => updateDraftProduct("price", value)} />
                  <AdminField label="Status" value={draftProduct.status} onChange={(value) => updateDraftProduct("status", value)} />
                  <AdminField label="Produced" value={draftProduct.produced} onChange={(value) => updateDraftProduct("produced", value)} />
                  <AdminField label="Reserved" value={draftProduct.reserved} onChange={(value) => updateDraftProduct("reserved", value)} />
                  <AdminField label="Available" value={draftProduct.available} onChange={(value) => updateDraftProduct("available", value)} />
                  <div className="md:col-span-3 lg:col-span-4">
                    <AdminField label="Image URL" value={draftProduct.image} onChange={(value) => updateDraftProduct("image", value)} />
                  </div>
                </div>
              </section>

              <div className="grid gap-4">
                <AnimatePresence>
                  {products.map((product, i) => (
                    <motion.article 
                      key={product.id} 
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="group grid gap-6 border border-[var(--ink)]/5 bg-white/60 backdrop-blur-md p-5 shadow-[var(--shadow-soft)] hover:shadow-[var(--shadow-luxe)] transition-all xl:grid-cols-[120px_1fr]"
                    >
                      <div className="relative overflow-hidden aspect-[3/4] w-full border border-[var(--ink)]/10">
                        <img src={product.image} alt={product.title} className="absolute inset-0 w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700" />
                        <div className="absolute inset-0 bg-[var(--ink)]/10 group-hover:bg-transparent transition-colors duration-500" />
                      </div>
                      <div className="grid gap-4 md:grid-cols-3">
                        <AdminField label="Title" value={product.title} onChange={(value) => persistProducts(products.map((item) => item.id === product.id ? { ...item, title: value } : item))} />
                        <AdminField label="Price" value={product.price} onChange={(value) => persistProducts(products.map((item) => item.id === product.id ? { ...item, price: value } : item))} />
                        <AdminField label="Status" value={product.status} onChange={(value) => persistProducts(products.map((item) => item.id === product.id ? { ...item, status: value } : item))} />
                        <AdminField label="Produced" value={product.produced} onChange={(value) => persistProducts(products.map((item) => item.id === product.id ? { ...item, produced: Number(value) || 0 } : item))} />
                        <AdminField label="Reserved" value={product.reserved} onChange={(value) => persistProducts(products.map((item) => item.id === product.id ? { ...item, reserved: Number(value) || 0 } : item))} />
                        <AdminField label="Available" value={product.available} onChange={(value) => persistProducts(products.map((item) => item.id === product.id ? { ...item, available: Number(value) || 0 } : item))} />
                      </div>
                    </motion.article>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          </AdminCard>
          <AdminCard id="customers" title="Customer Ecosystem">
            <div className="overflow-x-auto border border-[var(--ink)]/10 bg-white/60 backdrop-blur-md shadow-[var(--shadow-soft)]">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="bg-[var(--ink)]/5 text-[10px] uppercase tracking-[0.2em] text-[var(--ink)]/50">
                  <tr>
                    <th className="p-5 font-medium">Name</th>
                    <th className="p-5 font-medium">Email</th>
                    <th className="p-5 font-medium">Tier</th>
                    <th className="p-5 font-medium">Addresses</th>
                    <th className="p-5 font-medium">Wishlist</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--ink)]/5">
                  {customers.map((customer) => (
                    <tr key={customer.id} className="group hover:bg-[var(--gold)]/5 transition-colors">
                      <td className="p-5 font-medium group-hover:text-[var(--gold)] transition-colors">{customer.name}</td>
                      <td className="p-5 text-[var(--ink)]/70">{customer.email}</td>
                      <td className="p-5">
                        <span className={`px-2 py-1 text-[10px] uppercase tracking-widest ${customer.tier === "VIP" ? "bg-[var(--gold)]/10 text-[var(--gold)]" : "bg-[var(--ink)]/5 text-[var(--ink)]/60"}`}>
                          {customer.tier}
                        </span>
                      </td>
                      <td className="p-5 text-[var(--ink)]/70">{customer.addresses.length} stored</td>
                      <td className="p-5 text-[var(--ink)]/70">{customer.wishlist.length} items</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </AdminCard>
          <div className="grid gap-5 xl:grid-cols-2">
            <AdminCard id="coupons" title="Coupons">
              <AdminCrudList storageKey="follocia_admin_coupons" records={coupons} onChange={setCoupons} titlePlaceholder="Coupon code" metaPlaceholder="Benefit and scope" />
            </AdminCard>
            <AdminCard id="reviews" title="Reviews & Ratings">
              <AdminCrudList storageKey="follocia_admin_reviews" records={reviews} onChange={setReviews} titlePlaceholder="Rating" metaPlaceholder="Review text" />
            </AdminCard>
          </div>
          <div className="grid gap-5 xl:grid-cols-3">
            <AdminCard id="banners" title="Banners">
              <AdminCrudList storageKey="follocia_admin_banners" records={banners} onChange={setBanners} titlePlaceholder="Banner title" metaPlaceholder="Placement" compact />
            </AdminCard>
            <AdminCard id="cms" title="CMS Pages">
              <AdminCrudList storageKey="follocia_admin_cms" records={cmsPages} onChange={setCmsPages} titlePlaceholder="Page title" metaPlaceholder="Page purpose" compact />
            </AdminCard>
            <AdminCard id="analytics" title="Analytics">
              <AdminMiniList items={["Conversion: 8.4%", `Cart recovery: ${orders.filter((order) => order.status === "Support Requested").length} leads`, `Wishlist intent: ${customers.reduce((sum, customer) => sum + customer.wishlist.length, 0)} pieces`, "Revenue trend: +18%"]} />
            </AdminCard>
          </div>
          <div className="grid gap-5 xl:grid-cols-3">
            <AdminCard id="newsletter" title="Newsletter">
              <AdminCrudList storageKey="follocia_admin_newsletter" records={newsletter} onChange={setNewsletter} titlePlaceholder="Segment" metaPlaceholder="Audience note" compact />
            </AdminCard>
            <AdminCard id="contact" title="Contact Queries">
              <AdminCrudList storageKey="follocia_admin_contact" records={contactQueries} onChange={setContactQueries} titlePlaceholder="Query title" metaPlaceholder="Query detail" compact />
            </AdminCard>
            <AdminCard id="audit" title="Audit Log">
              <AdminCrudList storageKey="follocia_admin_audit" records={audit} onChange={setAudit} titlePlaceholder="Audit event" metaPlaceholder="Details" compact />
            </AdminCard>
          </div>
        </section>
      </div>
    </main>
  );
}

function AdminMiniList({ items }: { items: string[] }) {
  return (
    <div className="grid gap-3">
      {items.map((item) => (
        <div key={item} className="group relative border border-[var(--ink)]/5 bg-white/50 backdrop-blur-sm px-5 py-4 text-sm text-[var(--ink)]/80 hover:border-[var(--gold)]/30 hover:bg-white transition-all hover:shadow-[var(--shadow-soft)] overflow-hidden">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-[var(--gold)] scale-y-0 group-hover:scale-y-100 transition-transform origin-top" />
          <span className="relative z-10">{item}</span>
        </div>
      ))}
    </div>
  );
}

function AdminCrudList({
  storageKey,
  records,
  onChange,
  titlePlaceholder,
  metaPlaceholder,
  compact,
}: {
  storageKey: string;
  records: AdminRecord[];
  onChange: (records: AdminRecord[]) => void;
  titlePlaceholder: string;
  metaPlaceholder: string;
  compact?: boolean;
}) {
  const [draftTitle, setDraftTitle] = useState("");
  const [draftMeta, setDraftMeta] = useState("");
  const persist = (next: AdminRecord[]) => {
    onChange(next);
    saveAdminRecords(storageKey, next);
    const module = storageKey.replace("follocia_admin_", "");
    void saveAdminRecordsRemote(module, next);
  };

  return (
    <div className="grid gap-4">
      <div className={`grid gap-3 ${compact ? "" : "md:grid-cols-[1fr_1fr_auto]"}`}>
        <input value={draftTitle} onChange={(event) => setDraftTitle(event.target.value)} placeholder={titlePlaceholder} className="border border-[var(--ink)]/10 bg-white/50 backdrop-blur-sm px-4 py-3 text-sm outline-none focus:border-[var(--gold)] focus:bg-white focus:shadow-[0_0_10px_oklch(0.78_0.12_80/0.1)] transition-all" />
        <input value={draftMeta} onChange={(event) => setDraftMeta(event.target.value)} placeholder={metaPlaceholder} className="border border-[var(--ink)]/10 bg-white/50 backdrop-blur-sm px-4 py-3 text-sm outline-none focus:border-[var(--gold)] focus:bg-white focus:shadow-[0_0_10px_oklch(0.78_0.12_80/0.1)] transition-all" />
        <button
          onClick={() => {
            if (!draftTitle.trim()) return;
            persist([{ id: `${storageKey}-${Date.now()}`, title: draftTitle.trim(), meta: draftMeta.trim() || "No details", status: "Active" }, ...records]);
            setDraftTitle("");
            setDraftMeta("");
          }}
          className="magnetic-btn bg-[var(--ink)] px-6 py-3 text-xs uppercase tracking-[0.1em] text-[var(--bone)] hover:bg-[var(--gold)] hover:text-[var(--ink)] transition-colors"
        >
          Add Record
        </button>
      </div>
      <div className="grid gap-3">
        <AnimatePresence>
          {records.map((record) => (
            <motion.article 
              key={record.id} 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="group grid gap-3 border border-[var(--ink)]/5 bg-white/50 backdrop-blur-sm p-4 hover:border-[var(--gold)]/20 hover:bg-white transition-all hover:shadow-[var(--shadow-soft)]"
            >
              <div className="grid gap-3 md:grid-cols-[1fr_1.4fr_140px_auto]">
                <input value={record.title} onChange={(event) => persist(records.map((item) => item.id === record.id ? { ...item, title: event.target.value } : item))} className="border border-transparent bg-transparent px-3 py-2 text-sm font-medium outline-none focus:border-[var(--gold)] focus:bg-white transition-all" />
                <input value={record.meta} onChange={(event) => persist(records.map((item) => item.id === record.id ? { ...item, meta: event.target.value } : item))} className="border border-transparent bg-transparent px-3 py-2 text-sm text-[var(--ink)]/60 outline-none focus:border-[var(--gold)] focus:bg-white transition-all" />
                <select value={record.status} onChange={(event) => persist(records.map((item) => item.id === record.id ? { ...item, status: event.target.value } : item))} className="border border-[var(--ink)]/10 bg-white px-3 py-2 text-sm outline-none focus:border-[var(--gold)] transition-colors cursor-pointer appearance-none rounded-none">
                  {["Active", "Live", "Published", "Draft", "Paused", "Open", "Resolved", "Review", "Logged", "Ready", "Segmented"].map((status) => <option key={status}>{status}</option>)}
                </select>
                <button onClick={() => persist(records.filter((item) => item.id !== record.id))} className="border border-[var(--ink)]/10 px-4 py-2 text-xs uppercase tracking-[0.15em] text-[var(--ink)]/50 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors">Delete</button>
              </div>
            </motion.article>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

function AdminCard({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section id={id} className="glass relative overflow-hidden border border-[var(--gold)]/20 bg-white/60 p-6 md:p-8 shadow-[var(--shadow-soft)] scroll-mt-32">
      <div className="mb-8 flex items-center justify-between border-b border-[var(--gold)]/20 pb-5">
        <h2 className="font-display text-4xl text-[var(--ink)]">{title}</h2>
        <span className="text-xs uppercase tracking-[0.2em] text-[var(--gold)]">Manage Module</span>
      </div>
      <div className="relative z-10">
        {children}
      </div>
    </section>
  );
}
