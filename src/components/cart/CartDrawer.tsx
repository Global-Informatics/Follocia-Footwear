import { AnimatePresence, motion } from "framer-motion";
import { useMemo, useState } from "react";
import { useCart } from "./CartContext";
import { createOrdersFromCartRemote, ensureCustomer, upsertCustomer, saveCustomerRemote, type CommerceAddress, type CustomerProfile } from "@/lib/commerceStore";
import type { AuthSession } from "@/components/auth/AuthGateway";

export function CartDrawer({ session, onLogin }: { session?: AuthSession | null; onLogin?: () => void }) {
  const { items, open, setOpen, remove, updateQty, clear, count } = useCart();
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [coupon, setCoupon] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState("");
  const subtotal = items.reduce((s, i) => {
    const n = Number(i.price.replace(/[^\d.]/g, "")) || 0;
    return s + n * i.qty;
  }, 0);
  const discount = appliedCoupon === "FOLLOCIA10" ? Math.round(subtotal * 0.1) : 0;
  const total = Math.max(subtotal - discount, 0);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-[90] bg-[var(--ink)]/60 backdrop-blur-sm"
          />
          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: 0.7, ease: [0.2, 0.8, 0.2, 1] }}
            className="fixed right-0 top-0 z-[91] flex h-full w-full max-w-md flex-col bg-[var(--bone)] text-[var(--ink)] shadow-[var(--shadow-luxe)]"
          >
            <div className="flex items-center justify-between border-b border-[var(--ink)]/10 px-8 py-7">
              <div>
                <p className="eyebrow text-[var(--ink)]/60">— Your Atelier</p>
                <h3 className="mt-1 font-display text-2xl">Reservation ({count})</h3>
              </div>
              <button onClick={() => setOpen(false)} aria-label="Close cart" className="text-2xl leading-none">
                ×
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-8 py-6">
              {items.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center text-center">
                  <p className="font-display text-3xl italic text-[var(--ink)]/70">Your selection awaits.</p>
                  <p className="mt-4 max-w-xs text-sm text-[var(--ink)]/50">
                    Add a piece from the current Atelier to begin your reservation.
                  </p>
                </div>
              ) : (
                <ul className="space-y-8">
                  <AnimatePresence initial={false}>
                    {items.map((i) => (
                      <motion.li
                        key={i.id}
                        initial={{ opacity: 0, x: 30 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 60 }}
                        layout
                        className="flex gap-5"
                      >
                        <div className="aspect-[3/4] w-24 flex-shrink-0 overflow-hidden bg-[var(--champagne)]/30">
                          <img src={i.image} alt={i.title} className="h-full w-full object-cover" />
                        </div>
                        <div className="flex flex-1 flex-col justify-between">
                          <div>
                            <p className="eyebrow text-[var(--ink)]/50">{i.tone}</p>
                            <h4 className="mt-1 font-display text-lg leading-tight">{i.title}</h4>
                            {i.size && <p className="mt-1 text-xs text-[var(--ink)]/50">Size {i.size}</p>}
                          </div>
                          <div className="flex items-end justify-between">
                            <div>
                              <p className="font-display text-base">{i.price}</p>
                              <div className="mt-3 inline-flex items-center border border-[var(--ink)]/15">
                                <button onClick={() => updateQty(i.id, i.qty - 1)} className="h-8 w-8 text-lg">-</button>
                                <span className="grid h-8 w-10 place-items-center text-sm">{i.qty}</span>
                                <button onClick={() => updateQty(i.id, i.qty + 1)} className="h-8 w-8 text-lg">+</button>
                              </div>
                            </div>
                            <button
                              onClick={() => remove(i.id)}
                              className="eyebrow text-[var(--ink)]/50 underline-offset-4 hover:text-[var(--ink)] hover:underline"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      </motion.li>
                    ))}
                  </AnimatePresence>
                </ul>
              )}
            </div>

            {items.length > 0 && (
              <div className="border-t border-[var(--ink)]/10 px-8 py-7">
                <div className="mb-5 grid grid-cols-[1fr_auto] gap-2">
                  <input value={coupon} onChange={(event) => setCoupon(event.target.value.toUpperCase())} placeholder="Coupon code" className="border border-[var(--ink)]/15 bg-transparent px-3 py-3 text-sm outline-none focus:border-[var(--ink)]" />
                  <button onClick={() => setAppliedCoupon(coupon.trim())} className="border border-[var(--ink)] px-4 py-3 eyebrow">Apply</button>
                </div>
                <div className="flex items-center justify-between text-sm text-[var(--ink)]/60">
                  <span>Subtotal</span>
                  <span>EUR {subtotal.toLocaleString()}</span>
                </div>
                {discount > 0 && (
                  <div className="mt-2 flex items-center justify-between text-sm text-emerald-700">
                    <span>FOLLOCIA10 discount</span>
                    <span>- EUR {discount.toLocaleString()}</span>
                  </div>
                )}
                <div className="mt-3 flex items-center justify-between border-t border-[var(--ink)]/10 pt-4">
                  <span className="eyebrow text-[var(--ink)]/60">Subtotal</span>
                  <span className="font-display text-2xl">EUR {total.toLocaleString()}</span>
                </div>
                <button
                  onClick={() => {
                    if (!session) {
                      setOpen(false);
                      onLogin?.();
                      return;
                    }
                    setCheckoutOpen(true);
                  }}
                  className="magnetic-btn mt-6 inline-flex w-full items-center justify-center gap-3 bg-[var(--ink)] px-8 py-4 eyebrow text-[var(--bone)] transition-colors hover:text-[var(--ink)]"
                >
                  Reserve · Concierge Checkout
                </button>
                <p className="mt-4 text-center text-[0.65rem] uppercase tracking-[0.25em] text-[var(--ink)]/40">
                  White-glove delivery · Worldwide
                </p>
              </div>
            )}
          </motion.aside>
          {checkoutOpen && session && (
            <CheckoutModal
              session={session}
              subtotal={total}
              onClose={() => setCheckoutOpen(false)}
              onComplete={async (checkout) => {
                await createOrdersFromCartRemote(items, ensureCustomer(session.user), checkout);
                clear();
                setCheckoutOpen(false);
                setOpen(false);
                window.location.href = "#/account/my-orders";
              }}
            />
          )}
        </>
      )}
    </AnimatePresence>
  );
}

function addressLine(address: CommerceAddress) {
  return `${address.firstName} ${address.lastName}, ${address.address}${address.address2 ? `, ${address.address2}` : ""}, ${address.city}, ${address.region} ${address.zip}, ${address.country}, ${address.phone}`.replace(/\s+/g, " ").trim();
}

function CheckoutModal({ session, subtotal, onClose, onComplete }: { session: AuthSession; subtotal: number; onClose: () => void; onComplete: (checkout: { deliveryAddress: string; paymentMethod: string }) => Promise<void> }) {
  const profile = useMemo(() => ensureCustomer(session.user), [session.user]);
  const [selectedAddress, setSelectedAddress] = useState(profile.addresses.find((address) => address.isDefault)?.id || profile.addresses[0]?.id || "new");
  const [paymentMethod, setPaymentMethod] = useState("Card Authorization");
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<CommerceAddress>({
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
  const set = (key: keyof CommerceAddress, value: string | boolean) => setDraft((current) => ({ ...current, [key]: value }));

  const submit = async () => {
    setSaving(true);
    let customer: CustomerProfile = profile;
    let deliveryAddress = "";

    if (selectedAddress === "new") {
      deliveryAddress = addressLine(draft);
      const addresses = draft.isDefault ? profile.addresses.map((address) => ({ ...address, isDefault: false })) : profile.addresses;
      customer = { ...profile, addresses: [...addresses, draft] };
      upsertCustomer(customer);
      await saveCustomerRemote(customer);
    } else {
      const address = profile.addresses.find((item) => item.id === selectedAddress);
      deliveryAddress = address ? addressLine(address) : "";
    }

    await onComplete({ deliveryAddress, paymentMethod });
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-[110] bg-[var(--ink)]/70 p-4 backdrop-blur-sm">
      <motion.div initial={{ opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }} className="mx-auto mt-8 max-h-[88vh] max-w-3xl overflow-y-auto bg-white p-8 text-[var(--ink)] shadow-[var(--shadow-luxe)]">
        <div className="flex items-start justify-between gap-4 border-b border-[var(--ink)]/10 pb-5">
          <div>
            <p className="eyebrow text-[var(--gold)]">Secure checkout</p>
            <h2 className="mt-2 font-display text-4xl">Confirm reservation</h2>
          </div>
          <button onClick={onClose} className="text-3xl leading-none" aria-label="Close checkout">x</button>
        </div>

        <section className="py-6">
          <h3 className="text-lg font-semibold">Delivery address</h3>
          <div className="mt-4 grid gap-3">
            {profile.addresses.map((address) => (
              <label key={address.id} className="flex gap-3 border border-[var(--ink)]/10 p-4 text-sm">
                <input type="radio" checked={selectedAddress === address.id} onChange={() => setSelectedAddress(address.id)} />
                <span>{addressLine(address)}</span>
              </label>
            ))}
            <label className="flex gap-3 border border-[var(--ink)]/10 p-4 text-sm">
              <input type="radio" checked={selectedAddress === "new"} onChange={() => setSelectedAddress("new")} />
              <span>Add new delivery address</span>
            </label>
          </div>

          {selectedAddress === "new" && (
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <CheckoutField label="First name" value={draft.firstName} onChange={(value) => set("firstName", value)} />
              <CheckoutField label="Last name" value={draft.lastName} onChange={(value) => set("lastName", value)} />
              <CheckoutField label="Address" value={draft.address} onChange={(value) => set("address", value)} wide />
              <CheckoutField label="Address line 2" value={draft.address2} onChange={(value) => set("address2", value)} wide />
              <CheckoutField label="City" value={draft.city} onChange={(value) => set("city", value)} />
              <CheckoutField label="Region" value={draft.region} onChange={(value) => set("region", value)} />
              <CheckoutField label="Zip" value={draft.zip} onChange={(value) => set("zip", value)} />
              <CheckoutField label="Phone" value={draft.phone} onChange={(value) => set("phone", value)} />
            </div>
          )}
        </section>

        <section className="border-t border-[var(--ink)]/10 py-6">
          <h3 className="text-lg font-semibold">Payment</h3>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {["Card Authorization", "UPI Intent", "Cash on Delivery"].map((method) => (
              <button key={method} onClick={() => setPaymentMethod(method)} className={`border px-4 py-3 text-sm ${paymentMethod === method ? "border-[var(--ink)] bg-[var(--ink)] text-white" : "border-[var(--ink)]/15"}`}>
                {method}
              </button>
            ))}
          </div>
        </section>

        <footer className="flex flex-col gap-4 border-t border-[var(--ink)]/10 pt-6 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="eyebrow text-[var(--ink)]/45">Reservation total</p>
            <p className="font-display text-3xl">EUR {subtotal.toLocaleString()}</p>
          </div>
          <button disabled={saving || (selectedAddress === "new" && (!draft.address || !draft.city || !draft.phone))} onClick={submit} className="bg-[var(--ink)] px-8 py-4 eyebrow text-white disabled:bg-[var(--ink)]/35">
            {saving ? "Placing order..." : "Place Order"}
          </button>
        </footer>
      </motion.div>
    </div>
  );
}

function CheckoutField({ label, value, onChange, wide }: { label: string; value: string; onChange: (value: string) => void; wide?: boolean }) {
  return (
    <label className={`grid gap-2 text-sm text-[var(--ink)]/65 ${wide ? "md:col-span-2" : ""}`}>
      {label}
      <input value={value} onChange={(event) => onChange(event.target.value)} className="border border-[var(--ink)]/15 px-3 py-3 text-[var(--ink)] outline-none focus:border-[var(--ink)]" />
    </label>
  );
}
