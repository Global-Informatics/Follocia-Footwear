import { useEffect, useMemo, useState, type ReactNode } from "react";
import { motion } from "framer-motion";
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
    <main className="min-h-screen bg-white pt-28 text-[#1a2b34]">
      <div className="mx-auto grid max-w-[1080px] gap-12 px-6 pb-24 md:grid-cols-[250px_1fr]">
        <aside>
          <div className="relative grid h-[190px] place-items-center border border-[#d8d8d8] bg-white">
            <button aria-label="Account options" className="absolute right-7 top-7 text-2xl leading-none">⋮</button>
            <div className="text-center">
              <div className="mx-auto grid h-[90px] w-[90px] place-items-center rounded-full bg-[#5b3d32] text-5xl text-white">{initials(profile.name)}</div>
              <p className="mt-4 text-lg font-light">{profile.name}</p>
            </div>
          </div>
          <nav className="mt-8 grid border border-[#d8d8d8] bg-white py-3 text-[16px] font-light">
            {menu.map((item) => (
              <button key={item} onClick={() => onActive(item)} className={`px-8 py-2.5 text-left transition-colors ${active === item ? "text-[#5b3d32]" : "text-[#465966] hover:text-[#111]"}`}>
                {item}
              </button>
            ))}
          </nav>
        </aside>
        <section>{children}</section>
      </div>
    </main>
  );
}

function SectionHead({ title, copy }: { title: string; copy: string }) {
  return (
    <header className="border-b border-[#d8d8d8] pb-8">
      <h1 className="text-3xl font-semibold tracking-[-0.02em]">{title}</h1>
      <p className="mt-4 text-sm font-light text-[#687782]">{copy}</p>
    </header>
  );
}

function EmptyState({ title, copy, action }: { title: string; copy?: string; action?: ReactNode }) {
  return (
    <div className="grid min-h-[290px] place-items-center border-b border-[#d8d8d8] text-center">
      <div>
        <p className="text-xl font-light text-[#596b75]">{title}</p>
        {copy && <p className="mt-3 max-w-md text-sm font-light text-[#687782]">{copy}</p>}
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
    <div className="fixed inset-0 z-[100] bg-black/75 p-4">
      <motion.form
        initial={{ opacity: 0, y: 22 }}
        animate={{ opacity: 1, y: 0 }}
        onSubmit={(event) => {
          event.preventDefault();
          onSave(address);
        }}
        className="mx-auto mt-10 flex max-h-[86vh] max-w-[630px] flex-col bg-white text-[#1a2b34]"
      >
        <div className="flex items-center justify-between px-11 pt-10">
          <h2 className="text-lg font-light">Add New Address</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="text-3xl font-light">×</button>
        </div>
        <div className="mx-11 mt-4 border-t border-[#222]" />
        <div className="grid flex-1 gap-6 overflow-y-auto px-11 py-8">
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
          <label className="flex items-center gap-3 text-sm font-light text-[#687782]">
            <input type="checkbox" checked={address.isDefault} onChange={(event) => set("isDefault", event.target.checked)} />
            Make this my default address
          </label>
        </div>
        <footer className="border-t border-[#d8d8d8] px-11 py-8">
          <button className="w-full max-w-[260px] bg-[#333] px-8 py-3 text-sm text-white">Add Address</button>
        </footer>
      </motion.form>
    </div>
  );
}

function Field({ label, value, onChange, required, placeholder }: { label: string; value: string; onChange: (value: string) => void; required?: boolean; placeholder?: string }) {
  return (
    <label className="grid gap-2 text-sm font-light text-[#687782]">
      <span>{label}</span>
      <input required={required} value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} className="h-10 border border-[#cfd5d8] bg-white px-3 text-[#1a2b34] outline-none focus:border-[#1a2b34]" />
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
          <SectionHead title="My Orders" copy="View your order history or check the status of a recent order." />
          {myOrders.length === 0 ? (
            <EmptyState title="You haven't placed any orders yet." action={<a className="text-sm underline" href="/">Start Browsing</a>} />
          ) : (
            <div className="grid gap-3 py-12">
              {myOrders.map((order) => <OrderRow key={order.id} order={order} onUpdate={updateOrder} />)}
            </div>
          )}
        </>
      )}
      {active === "My Addresses" && (
        <>
          <SectionHead title="My Addresses" copy="Add and manage the addresses you use often." />
          {profile.addresses.length === 0 ? (
            <EmptyState title="You haven't saved any addresses yet." action={<button onClick={() => setShowAddress(true)} className="bg-[#333] px-9 py-3 text-sm text-white">Add New Address</button>} />
          ) : (
            <div className="grid gap-4 py-10">
              {profile.addresses.map((address) => (
                <article key={address.id} className="border border-[#d8d8d8] p-5 text-sm font-light">
                  <strong className="font-medium">{address.firstName} {address.lastName}</strong>
                  <p className="mt-2 text-[#687782]">{address.address}{address.address2 ? `, ${address.address2}` : ""}<br />{address.city}, {address.region} {address.zip}<br />{address.country} · {address.phone}</p>
                </article>
              ))}
              <button onClick={() => setShowAddress(true)} className="w-fit bg-[#333] px-9 py-3 text-sm text-white">Add New Address</button>
            </div>
          )}
        </>
      )}
      {active === "My Wallet" && <><SectionHead title="Wallet" copy="Save your payment details for faster checkout." /><EmptyState title="You haven't saved any payment methods yet" copy="Securely save your payment details for faster checkout whenever you place an order." /></>}
      {active === "My Coupons" && (
        <>
          <SectionHead title="My Coupons" copy="Private atelier coupons and limited drop benefits." />
          <div className="grid gap-4 py-10 md:grid-cols-2">
            {[
              ["FOLLOCIA10", "10% off your next reservation", "Valid on live editions"],
              ["ATELIERCARE", "Complimentary care kit", "Auto-applied on premium pairs"],
            ].map(([code, title, copy]) => (
              <article key={code} className="border border-dashed border-[#b7b7b7] p-5">
                <p className="text-xs uppercase tracking-[0.25em] text-[#5b3d32]">{code}</p>
                <h3 className="mt-3 text-xl font-light">{title}</h3>
                <p className="mt-2 text-sm text-[#687782]">{copy}</p>
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
            <div className="grid gap-4 py-10">
              {deliveredOrders.map((order) => <ReviewComposer key={order.id} order={order} />)}
            </div>
          )}
        </>
      )}
      {active === "Notifications" && (
        <>
          <SectionHead title="Notifications" copy="Order alerts, drop reminders and concierge updates." />
          <div className="grid gap-3 py-10">
            {["Order status updates", "Wishlist price and availability alerts", "New private drop invitations", "Concierge support replies"].map((item) => (
              <label key={item} className="flex items-center justify-between border border-[#d8d8d8] p-4 text-sm">
                {item}
                <input type="checkbox" defaultChecked />
              </label>
            ))}
          </div>
        </>
      )}
      {active === "My Wishlist" && (
        <>
          <SectionHead title="My Wishlist" copy="Saved pieces and drop alerts from your private atelier profile." />
          {mergedWishlist.length === 0 ? (
            <EmptyState title="You haven't saved any pieces yet." action={<a className="text-sm underline" href="/#collections">Start Browsing</a>} />
          ) : (
            <div className="grid gap-4 py-10 md:grid-cols-2">
              {products.filter((product) => mergedWishlist.includes(product.id)).map((product) => (
                <article key={product.id} className="grid grid-cols-[92px_1fr] gap-4 border border-[#d8d8d8] p-4">
                  <img src={product.image} alt={product.title} className="aspect-[3/4] w-full object-cover" />
                  <div>
                    <p className="text-sm font-light text-[#687782]">{product.edition}</p>
                    <h3 className="mt-1 text-lg font-light">{product.title}</h3>
                    <p className="mt-2 text-sm text-[#5b3d32]">{product.price}</p>
                    <p className="mt-1 text-xs uppercase tracking-[0.2em] text-[#9aa4aa]">{product.status}</p>
                  </div>
                </article>
              ))}
            </div>
          )}
        </>
      )}
      {active === "My Subscriptions" && <><SectionHead title="Subscriptions" copy="View and manage the subscriptions you've purchased." /><EmptyState title="No purchased subscriptions" copy="When you purchase a subscription, it'll appear here." /></>}
      {active === "My Account" && <AccountForm profile={profile} onSave={saveProfile} />}
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
        className="border-b border-[#d8d8d8] py-9"
      >
        <h2 className="text-xl font-semibold">Personal info</h2>
        <p className="mt-4 text-sm font-light text-[#687782]">Update your personal information.</p>
        <div className="mt-8 grid max-w-[600px] gap-6 md:grid-cols-2">
          <Field label="First name" value={draft.firstName} onChange={(value) => update("firstName", value)} />
          <Field label="Last name" value={draft.lastName} onChange={(value) => update("lastName", value)} />
          <Field label="Phone" value={draft.phone} onChange={(value) => update("phone", value)} />
        </div>
        <div className="mt-8 flex justify-end gap-3">
          <button type="button" onClick={() => setDraft(profile)} className="border border-[#333] px-7 py-2 text-sm">Discard</button>
          <button className="bg-[#333] px-7 py-2 text-sm text-white">Update Info</button>
        </div>
      </form>
      <section className="border-b border-[#d8d8d8] py-8 text-sm font-light text-[#687782]">
        <h2 className="text-xl font-semibold text-[#1a2b34]">Login info</h2>
        <p className="mt-4">View and update your login email and password.</p>
        <p className="mt-8">Login email:<br />{profile.email}</p>
        <button className="mt-3 underline">Change Email</button>
        <p className="mt-8">Password:<br />••••••••</p>
        <button className="mt-3 underline">Change Password</button>
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
    <article className="border border-[#d8d8d8] p-5">
      <p className="text-sm font-light text-[#687782]">{order.id} - {order.product}</p>
      <div className="mt-4 grid gap-3 md:grid-cols-[140px_1fr_auto]">
        <select value={rating} onChange={(event) => setRating(event.target.value)} className="border border-[#cfd5d8] px-3 py-3 text-sm">
          {["5.0 / 5", "4.0 / 5", "3.0 / 5", "2.0 / 5", "1.0 / 5"].map((item) => <option key={item}>{item}</option>)}
        </select>
        <input value={text} onChange={(event) => setText(event.target.value)} placeholder="Share fit, finish and concierge experience" className="border border-[#cfd5d8] px-3 py-3 text-sm" />
        <button onClick={submitReview} className="bg-[#333] px-5 py-3 text-xs uppercase tracking-[0.18em] text-white">Submit</button>
      </div>
      {saved && <p className="mt-3 text-sm text-emerald-800">Review submitted to admin moderation.</p>}
    </article>
  );
}

function OrderRow({ order, onUpdate }: { order: CommerceOrder; onUpdate: (order: CommerceOrder) => void }) {
  const steps = ["Order Placed", "Fitting Scheduled", "In Atelier", "Dispatched", "Delivered"];
  const activeIndex = Math.max(0, steps.findIndex((step) => step === order.deliveryStatus));
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
    <article className="border border-[#d8d8d8] p-5 text-sm">
      <div className="grid gap-3 md:grid-cols-[1fr_auto]">
        <div>
          <strong>{order.id}</strong>
          <p className="mt-1 text-[#687782]">{order.product} - Size {order.size} - {order.amount}</p>
        </div>
        <div className="text-left md:text-right">
          <span className="text-[#5b3d32]">{order.status}</span>
          <p className="mt-1 text-[#687782]">{order.paymentStatus}</p>
        </div>
      </div>
      <div className="mt-5 grid gap-5 border-t border-[#e6e6e6] pt-5 md:grid-cols-[1fr_220px]">
        <div>
          <p className="font-medium">Delivery status: {order.deliveryStatus}</p>
          <p className="mt-1 text-[#687782]">ETA: {order.deliveryEta}</p>
          <p className="mt-1 text-[#687782]">Tracking: {order.trackingCode || "Assigned after dispatch"}</p>
          <p className="mt-3 text-[#687782]">{order.deliveryAddress || "Delivery address will appear after checkout confirmation."}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {!["Cancelled", "Delivered"].includes(order.deliveryStatus) && (
              <button onClick={() => setActiveRequest("cancel")} className="border border-[#333] px-4 py-2 text-xs uppercase tracking-[0.18em]">
                Cancel Order
              </button>
            )}
            {order.deliveryStatus === "Delivered" && (
              <button onClick={() => setActiveRequest("return")} className="border border-[#333] px-4 py-2 text-xs uppercase tracking-[0.18em]">
                Request Return
              </button>
            )}
            <button onClick={() => setShowInvoice((value) => !value)} className="border border-[#333] px-4 py-2 text-xs uppercase tracking-[0.18em]">
              Invoice
            </button>
            <a href="#/shop" className="border border-[#333] px-4 py-2 text-xs uppercase tracking-[0.18em]">
              Reorder
            </a>
            <button onClick={() => setActiveRequest("support")} className="bg-[#333] px-4 py-2 text-xs uppercase tracking-[0.18em] text-white">
              Need Help
            </button>
          </div>
          {activeRequest && (
            <div className="mt-4 border border-[#d8d8d8] bg-[#faf8f3] p-4">
              <p className="font-medium">{activeRequest === "cancel" ? "Cancel request" : activeRequest === "return" ? "Return request" : "Concierge support"}</p>
              <textarea
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                placeholder="Reason / note for the admin team"
                className="mt-3 min-h-24 w-full border border-[#cfd5d8] bg-white p-3 text-sm outline-none focus:border-[#333]"
              />
              <div className="mt-3 flex flex-wrap gap-2">
                <button onClick={submitServiceRequest} className="bg-[#333] px-4 py-2 text-xs uppercase tracking-[0.18em] text-white">Submit</button>
                <button onClick={() => { setActiveRequest(null); setReason(""); }} className="border border-[#333] px-4 py-2 text-xs uppercase tracking-[0.18em]">Close</button>
              </div>
            </div>
          )}
          {showInvoice && (
            <div className="mt-4 grid gap-3 border border-[#d8d8d8] bg-white p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <strong>Tax invoice / order receipt</strong>
                <button onClick={() => window.print()} className="border border-[#333] px-3 py-2 text-[10px] uppercase tracking-[0.18em]">Print</button>
              </div>
              <div className="grid gap-2 text-[#687782] md:grid-cols-2">
                <span>Order: <strong className="text-[#1a2b34]">{order.id}</strong></span>
                <span>Date: {order.date}</span>
                <span>Customer: {order.customer}</span>
                <span>Email: {order.email}</span>
                <span>Product: {order.product}</span>
                <span>Size: {order.size}</span>
                <span>Amount: <strong className="text-[#1a2b34]">{order.amount}</strong></span>
                <span>Payment: {order.paymentStatus}</span>
                <span>Method: {order.paymentMethod}</span>
                <span>Tracking: {order.trackingCode || "Pending dispatch"}</span>
              </div>
              <p className="border-t border-[#e6e6e6] pt-3 text-[#687782]">{order.deliveryAddress || "Delivery address pending"}</p>
            </div>
          )}
        </div>
        <div className="grid gap-2">
          {steps.map((step, index) => (
            <div key={step} className="flex items-center gap-3">
              <span className={`h-3 w-3 rounded-full ${index <= activeIndex ? "bg-[#5b3d32]" : "bg-[#d8d8d8]"}`} />
              <span className={index <= activeIndex ? "text-[#1a2b34]" : "text-[#9aa4aa]"}>{step}</span>
            </div>
          ))}
        </div>
      </div>
    </article>
  );
}

function AdminField({ label, value, onChange }: { label: string; value: string | number; onChange: (value: string) => void }) {
  return (
    <label className="grid gap-1 text-xs uppercase tracking-[0.22em] text-[var(--ink)]/45">
      {label}
      <input value={value} onChange={(event) => onChange(event.target.value)} className="border border-[var(--ink)]/15 bg-white px-3 py-2 text-sm normal-case tracking-normal text-[var(--ink)] outline-none focus:border-[var(--gold)]" />
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

  const persistProducts = (next: CommerceProduct[]) => {
    setProducts(next);
    saveProducts(next);
    next.forEach((product) => void saveProductRemote(product));
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
      <div className="mx-auto grid max-w-[1500px] gap-5 p-5 lg:grid-cols-[260px_1fr]">
        <aside className="border border-[var(--ink)]/10 bg-[var(--ink)] p-6 text-[var(--bone)] lg:sticky lg:top-24 lg:h-[calc(100vh-7rem)]">
          <h1 className="font-display text-5xl">Admin</h1>
          <p className="mt-4 text-sm text-[var(--bone)]/60">Manage storefront, products, orders, customers and profile ecosystem from one place.</p>
          <nav className="mt-10 grid gap-2 eyebrow text-[var(--bone)]/70">
            {["Dashboard", "Orders", "Inventory", "Customers", "Coupons", "Reviews", "Banners", "CMS", "Analytics", "Audit"].map((item) => <a key={item} href={`#${item.toLowerCase()}`} className="border border-transparent px-4 py-3 hover:border-[var(--gold)]/40">{item}</a>)}
          </nav>
        </aside>
        <section className="grid gap-5">
          <section id="dashboard" className="bg-[var(--ink)] p-8 text-[var(--bone)]">
            <p className="eyebrow text-[var(--gold)]">Maison operations</p>
            <h2 className="mt-4 font-display text-6xl leading-none">Premium commerce dashboard.</h2>
          </section>
          <div className="grid gap-4 md:grid-cols-5">
            {metrics.map((metric) => <article key={metric.label} className="border border-[var(--ink)]/10 bg-white p-5"><p className="eyebrow text-[var(--ink)]/45">{metric.label}</p><strong className="mt-4 block font-display text-4xl">{metric.value}</strong><small className={metric.tone === "warn" ? "text-red-800" : "text-emerald-800"}>{metric.delta}</small></article>)}
          </div>
          <AdminCard id="orders" title="Order Control">
            <div className="grid gap-3">
              {orders.map((order) => (
                <article key={order.id} className="grid gap-3 border border-[var(--ink)]/10 bg-white p-4 xl:grid-cols-[1fr_160px_180px]">
                  <div><strong>{order.id}</strong><p className="text-sm text-[var(--ink)]/60">{order.customer} · {order.product} · Size {order.size} · {order.amount}</p></div>
                  <select value={order.status} onChange={(event) => persistOrders(orders.map((item) => item.id === order.id ? { ...item, status: event.target.value } : item))} className="border border-[var(--ink)]/15 bg-white px-3 py-2 text-sm">
                    {["Concierge Review", "Fitting Booked", "Paid", "White-glove Dispatch", "Delivered", "Cancelled", "Return Requested", "Support Requested"].map((status) => <option key={status}>{status}</option>)}
                  </select>
                  <input value={order.date} onChange={(event) => persistOrders(orders.map((item) => item.id === order.id ? { ...item, date: event.target.value } : item))} className="border border-[var(--ink)]/15 px-3 py-2 text-sm" />
                  <select value={order.paymentStatus} onChange={(event) => persistOrders(orders.map((item) => item.id === order.id ? { ...item, paymentStatus: event.target.value } : item))} className="border border-[var(--ink)]/15 bg-white px-3 py-2 text-sm">
                    {["Payment Pending", "Authorized", "Paid", "Due on Delivery", "Refunded"].map((status) => <option key={status}>{status}</option>)}
                  </select>
                  <select value={order.deliveryStatus} onChange={(event) => persistOrders(orders.map((item) => item.id === order.id ? { ...item, deliveryStatus: event.target.value } : item))} className="border border-[var(--ink)]/15 bg-white px-3 py-2 text-sm">
                    {["Order Placed", "Fitting Scheduled", "In Atelier", "Dispatched", "Delivered", "Cancelled", "Return Requested"].map((status) => <option key={status}>{status}</option>)}
                  </select>
                  <input placeholder="ETA" value={order.deliveryEta} onChange={(event) => persistOrders(orders.map((item) => item.id === order.id ? { ...item, deliveryEta: event.target.value } : item))} className="border border-[var(--ink)]/15 px-3 py-2 text-sm" />
                  <input placeholder="Tracking code" value={order.trackingCode} onChange={(event) => persistOrders(orders.map((item) => item.id === order.id ? { ...item, trackingCode: event.target.value } : item))} className="border border-[var(--ink)]/15 px-3 py-2 text-sm" />
                  <input placeholder="Delivery address" value={order.deliveryAddress} onChange={(event) => persistOrders(orders.map((item) => item.id === order.id ? { ...item, deliveryAddress: event.target.value } : item))} className="border border-[var(--ink)]/15 px-3 py-2 text-sm xl:col-span-3" />
                </article>
              ))}
            </div>
          </AdminCard>
          <AdminCard id="inventory" title="Product CMS">
            <div className="grid gap-4">
              {products.map((product) => (
                <article key={product.id} className="grid gap-4 border border-[var(--ink)]/10 bg-white p-4 xl:grid-cols-[100px_1fr]">
                  <img src={product.image} alt={product.title} className="aspect-[3/4] w-full object-cover" />
                  <div className="grid gap-3 md:grid-cols-3">
                    <AdminField label="Title" value={product.title} onChange={(value) => persistProducts(products.map((item) => item.id === product.id ? { ...item, title: value } : item))} />
                    <AdminField label="Price" value={product.price} onChange={(value) => persistProducts(products.map((item) => item.id === product.id ? { ...item, price: value } : item))} />
                    <AdminField label="Status" value={product.status} onChange={(value) => persistProducts(products.map((item) => item.id === product.id ? { ...item, status: value } : item))} />
                    <AdminField label="Produced" value={product.produced} onChange={(value) => persistProducts(products.map((item) => item.id === product.id ? { ...item, produced: Number(value) || 0 } : item))} />
                    <AdminField label="Reserved" value={product.reserved} onChange={(value) => persistProducts(products.map((item) => item.id === product.id ? { ...item, reserved: Number(value) || 0 } : item))} />
                    <AdminField label="Available" value={product.available} onChange={(value) => persistProducts(products.map((item) => item.id === product.id ? { ...item, available: Number(value) || 0 } : item))} />
                  </div>
                </article>
              ))}
            </div>
          </AdminCard>
          <AdminCard id="customers" title="Customer Ecosystem">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] bg-white text-left text-sm">
                <thead className="eyebrow text-[var(--ink)]/45"><tr><th className="p-4">Name</th><th>Email</th><th>Tier</th><th>Addresses</th><th>Wishlist</th></tr></thead>
                <tbody>{customers.map((customer) => <tr key={customer.id} className="border-t border-[var(--ink)]/10"><td className="p-4 font-medium">{customer.name}</td><td>{customer.email}</td><td>{customer.tier}</td><td>{customer.addresses.length}</td><td>{customer.wishlist.length}</td></tr>)}</tbody>
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
    <div className="grid gap-2">
      {items.map((item) => (
        <div key={item} className="border border-[var(--ink)]/10 bg-white px-4 py-3 text-sm text-[var(--ink)]/70">{item}</div>
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
    <div className="grid gap-3">
      <div className={`grid gap-2 ${compact ? "" : "md:grid-cols-[1fr_1fr_auto]"}`}>
        <input value={draftTitle} onChange={(event) => setDraftTitle(event.target.value)} placeholder={titlePlaceholder} className="border border-[var(--ink)]/15 bg-white px-3 py-2 text-sm outline-none focus:border-[var(--ink)]" />
        <input value={draftMeta} onChange={(event) => setDraftMeta(event.target.value)} placeholder={metaPlaceholder} className="border border-[var(--ink)]/15 bg-white px-3 py-2 text-sm outline-none focus:border-[var(--ink)]" />
        <button
          onClick={() => {
            if (!draftTitle.trim()) return;
            persist([{ id: `${storageKey}-${Date.now()}`, title: draftTitle.trim(), meta: draftMeta.trim() || "No details", status: "Active" }, ...records]);
            setDraftTitle("");
            setDraftMeta("");
          }}
          className="bg-[var(--ink)] px-4 py-2 eyebrow text-[var(--bone)]"
        >
          Add
        </button>
      </div>
      {records.map((record) => (
        <article key={record.id} className="grid gap-2 border border-[var(--ink)]/10 bg-white p-4">
          <div className="grid gap-2 md:grid-cols-[1fr_1.4fr_130px_auto]">
            <input value={record.title} onChange={(event) => persist(records.map((item) => item.id === record.id ? { ...item, title: event.target.value } : item))} className="border border-transparent bg-[var(--bone)]/50 px-2 py-2 text-sm font-semibold outline-none focus:border-[var(--ink)]/20" />
            <input value={record.meta} onChange={(event) => persist(records.map((item) => item.id === record.id ? { ...item, meta: event.target.value } : item))} className="border border-transparent bg-[var(--bone)]/50 px-2 py-2 text-sm text-[var(--ink)]/65 outline-none focus:border-[var(--ink)]/20" />
            <select value={record.status} onChange={(event) => persist(records.map((item) => item.id === record.id ? { ...item, status: event.target.value } : item))} className="border border-[var(--ink)]/10 bg-white px-2 py-2 text-sm">
              {["Active", "Live", "Published", "Draft", "Paused", "Open", "Resolved", "Review", "Logged", "Ready", "Segmented"].map((status) => <option key={status}>{status}</option>)}
            </select>
            <button onClick={() => persist(records.filter((item) => item.id !== record.id))} className="border border-[var(--ink)]/15 px-3 py-2 text-xs uppercase tracking-[0.18em] text-[var(--ink)]/55">Delete</button>
          </div>
        </article>
      ))}
    </div>
  );
}

function AdminCard({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section id={id} className="border border-[var(--ink)]/10 bg-[var(--ivory)] p-5 shadow-[var(--shadow-soft)]">
      <div className="mb-5 flex items-center justify-between border-b border-[var(--ink)]/10 pb-4">
        <h2 className="font-display text-4xl">{title}</h2>
        <span className="eyebrow text-[var(--ink)]/35">Manage</span>
      </div>
      {children}
    </section>
  );
}
