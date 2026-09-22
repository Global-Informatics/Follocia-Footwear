import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { readAuthSession } from "@/components/auth/AuthGateway";
import { useCart } from "@/components/cart/CartContext";
import {
  COMMERCE_EVENT,
  deleteCustomerRemote,
  deleteProductRemote,
  ensureCustomer,
  getCustomers,
  getOrders,
  getProducts,
  productImages,
  productPrimaryImage,
  saveCustomerRemote,
  saveCustomers,
  saveOrderRemote,
  saveProductRemote,
  saveOrders,
  saveProducts,
  resetToMasterCatalog,
  syncCommerceFromBackend,
  parsePriceNumber,
  ALL_AVAILABLE_EU_SIZES,
  DEFAULT_PRODUCT_SIZES,
  computeFullSku,
  computeAllFullSkus,
  getHeroColorCode,
  getProductVariants,
  getActiveVariant,
  uploadProductImages,
  upsertCustomer,
  type CommerceAddress,
  type CommerceOrder,
  type CommerceProduct,
  type CustomerProfile,
  type ProductVariant,
} from "@/lib/commerceStore";
import type { AuthSession } from "@/components/auth/AuthGateway";
import { BrandLogo } from "@/components/BrandLogo";
import { FOLLICIA_PRODUCTS } from "@/data/folliciaCatalogue";
import { defaultLegalRecords, legalPageConfig, type LegalSlug } from "@/lib/legalPages";
import { fetchFreeCurrentLocation, lookupPincodeDetails } from "@/lib/geoAddress";
import {
  getLaunchPrivilegeState,
  getUserDiscountEligibility,
  saveLaunchPrivilegeState,
  type LaunchPrivilegeState,
} from "@/lib/launchDiscounts";
import { saveCheckoutCoupon, quoteCoupon } from "@/lib/coupons";
import { getGatewaySettings, saveGatewaySettings, type GatewaySettings } from "@/lib/paymentGateway";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Users,
  Tag,
  Star,
  Megaphone,
  Calendar,
  Crown,
  BookOpen,
  Search,
  FileText,
  Scale,
  Mail,
  MessageSquare,
  History,
  ExternalLink,
  LogOut,
  Plus,
  Trash2,
  Menu,
  X,
  RefreshCw,
  Eye,
  Filter,
  BarChart3,
  Headphones,
  Bell,
  Ticket,
} from "lucide-react";
import { CustomerSupportPanel } from "./CustomerSupportPanel";

const menu = ["My Orders", "My Wishlist", "My Addresses", "My Wallet", "My Coupons", "Gift Cards", "My Reviews", "Notifications", "My Subscriptions", "My Account"] as const;
type AccountSection = (typeof menu)[number];

function initials(name: string) {
  return name.trim().charAt(0).toUpperCase() || "M";
}

function AccountShell({ profile, active, onActive, children }: { profile: CustomerProfile; active: AccountSection; onActive: (section: AccountSection) => void; children: ReactNode }) {
  const activeTabRef = useRef<HTMLButtonElement | null>(null);
  const navContainerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    // Only scroll the inner nav container horizontally to center the active tab.
    // NEVER call activeTabRef.current?.scrollIntoView() which scrolls window.scrollX/scrollY!
    if (activeTabRef.current && navContainerRef.current) {
      const container = navContainerRef.current;
      const tab = activeTabRef.current;
      const scrollTarget = tab.offsetLeft - (container.clientWidth / 2) + (tab.clientWidth / 2);
      container.scrollTo({
        left: Math.max(0, scrollTarget),
        behavior: "smooth",
      });
    }
  }, [active]);

  return (
    <main className="min-h-screen bg-[var(--bone)] pt-3 sm:pt-24 md:pt-28 pb-12 sm:pb-20 text-[var(--ink)] relative w-full max-w-full overflow-x-clip">
      <div className="absolute inset-0 luxe-grain opacity-40 z-0 pointer-events-none" />
      <div className="mx-auto grid max-w-[1240px] w-full min-w-0 gap-3 sm:gap-8 md:gap-12 px-3 sm:px-6 md:px-12 md:grid-cols-[280px_1fr] relative z-10">
        <aside className="h-fit lg:sticky lg:top-28 w-full min-w-0">
          {/* Mobile Profile Bar (Clean, compact, luxury-branded) */}
          <div className="md:hidden flex items-center justify-between p-3.5 rounded-2xl bg-white border border-[#4b261a]/15 shadow-sm">
            <div className="flex items-center gap-3 min-w-0">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#24130d] text-[#fffaf0] font-serif text-base font-semibold border-2 border-[var(--gold)]/50 shadow-xs">
                {initials(profile.name)}
              </div>
              <div className="min-w-0">
                <p className="font-serif text-base font-bold text-[#24130d] leading-tight truncate capitalize">{profile.name}</p>
                <p className="text-[11px] text-[#24130d]/60 font-medium truncate mt-0.5">
                  {profile.email || profile.phone || "Follicia Member"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <a
                href="#/shop"
                className="text-[10.5px] uppercase font-bold tracking-wider text-[#24130d] bg-[#fbf6ed] hover:bg-[#24130d] hover:text-white px-3.5 py-1.5 rounded-lg border border-[#4b261a]/20 transition-all shadow-2xs"
              >
                Shop →
              </a>
            </div>
          </div>

          {/* Desktop Sidebar Card */}
          <div className="hidden md:block relative glass border border-[var(--gold)]/20 bg-white/90 p-8 text-center shadow-[var(--shadow-soft)] rounded-xl">
            <div className="mx-auto grid h-20 w-20 place-items-center rounded-full border-2 border-[var(--gold)]/30 bg-[#24130d] text-white text-3xl font-serif relative overflow-hidden shadow-md">
              {initials(profile.name)}
            </div>
            <p className="mt-4 text-xl font-serif font-bold text-[#24130d] leading-tight capitalize">{profile.name}</p>
            <p className="mt-1 text-xs text-[#24130d]/60 font-medium truncate">
              {profile.email || profile.phone || "Follicia Member"}
            </p>
          </div>
          
          {/* Mobile Horizontal Navigation Tabs */}
          <div className="relative mt-2.5 md:hidden w-full min-w-0">
            <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-4 bg-gradient-to-r from-[var(--bone)] to-transparent z-10 opacity-70" />
            <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-4 bg-gradient-to-l from-[var(--bone)] to-transparent z-10 opacity-70" />
            <nav 
              ref={navContainerRef}
              className="flex overflow-x-auto gap-1.5 pb-1 no-scrollbar px-1 scroll-smooth w-full"
            >
              {menu.map((item) => {
                const isSelected = active === item;
                return (
                  <button
                    key={item}
                    ref={isSelected ? activeTabRef : null}
                    onClick={() => onActive(item)}
                    type="button"
                    className={`whitespace-nowrap px-3.5 py-1.5 rounded-full text-[11px] uppercase tracking-[0.08em] transition-all shrink-0 cursor-pointer font-medium ${
                      isSelected
                        ? "bg-[#24130d] text-[#e6ca97] shadow-xs font-semibold border border-[#24130d]"
                        : "bg-white text-[#24130d]/80 border border-[#24130d]/15 hover:border-[var(--gold)] shadow-2xs"
                    }`}
                  >
                    {item}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Desktop Sidebar Navigation */}
          <nav className="mt-5 hidden md:grid glass border border-[var(--ink)]/10 bg-white/90 py-3 shadow-[var(--shadow-soft)] rounded-xl overflow-hidden">
            {menu.map((item) => (
              <button 
                key={item} 
                onClick={() => onActive(item)} 
                type="button"
                className={`relative px-7 py-3 text-left text-xs uppercase tracking-[0.12em] transition-all duration-200 cursor-pointer ${active === item ? "text-[var(--gold)] font-bold bg-[#fbf6ed]" : "text-[var(--ink)]/70 hover:text-[var(--ink)] hover:bg-[var(--ink)]/5 font-medium"}`}
              >
                {active === item && <motion.div layoutId="activeNav" className="absolute left-0 top-0 bottom-0 w-1 bg-[var(--gold)]" />}
                {item}
              </button>
            ))}
          </nav>
          <div className="mt-4 hidden md:flex flex-col gap-2">
            <a href="#/" className="block text-center border border-[var(--ink)]/15 bg-white/90 py-2.5 rounded-lg text-xs uppercase tracking-[0.14em] hover:bg-white hover:text-[var(--gold)] transition-colors shadow-2xs font-semibold">
              ← Storefront
            </a>
            <a href="#/shop" className="block text-center border border-[var(--ink)]/15 bg-white/90 py-2.5 rounded-lg text-xs uppercase tracking-[0.14em] hover:bg-white hover:text-[var(--gold)] transition-colors shadow-2xs font-semibold">
              Explore Shop
            </a>
          </div>
        </aside>
        
        <section className="min-h-[260px] sm:min-h-[500px] w-full min-w-0 glass border border-[var(--ink)]/10 bg-white/90 p-3.5 sm:p-7 md:p-10 shadow-[var(--shadow-soft)] rounded-2xl overflow-hidden">
          <motion.div
            key={active}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="w-full min-w-0"
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
    <header className="border-b border-[#4b261a]/15 pb-3 sm:pb-6 mb-3.5 sm:mb-8 w-full min-w-0">
      <h1 className="font-serif text-xl sm:text-3xl text-[#24130d] font-bold tracking-tight truncate">{title}</h1>
      <p className="mt-0.5 sm:mt-1.5 text-xs sm:text-sm text-[#24130d]/70 leading-relaxed">{copy}</p>
    </header>
  );
}

function EmptyState({ title, copy, action, icon }: { title: string; copy?: string; action?: ReactNode; icon?: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[140px] sm:min-h-[200px] text-center bg-[#fbf6ed]/80 border border-[#4b261a]/15 rounded-2xl p-5 sm:p-8 shadow-xs w-full min-w-0">
      <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-white border border-[#4b261a]/15 grid place-items-center text-lg sm:text-xl mb-2.5 sm:mb-3 shadow-2xs">
        {icon || "✨"}
      </div>
      <p className="text-base sm:text-lg font-serif font-bold text-[#24130d]">{title}</p>
      {copy && <p className="mt-1 max-w-sm text-xs sm:text-sm text-[#24130d]/70 leading-relaxed mx-auto">{copy}</p>}
      {action && <div className="mt-4 sm:mt-5">{action}</div>}
    </div>
  );
}

function AddressModal({
  profile,
  initialAddress,
  onClose,
  onSave,
}: {
  profile: CustomerProfile;
  initialAddress?: CommerceAddress | null;
  onClose: () => void;
  onSave: (address: CommerceAddress) => void;
}) {
  const [address, setAddress] = useState<CommerceAddress>(() => {
    if (initialAddress) return { ...initialAddress };
    return {
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
    };
  });
  const [locating, setLocating] = useState(false);
  const [locError, setLocError] = useState("");
  const [locSuccess, setLocSuccess] = useState("");
  const [pinLoading, setPinLoading] = useState(false);
  const [pinSuccess, setPinSuccess] = useState("");
  const [pinOffices, setPinOffices] = useState<string[]>([]);

  const handleZipChange = async (value: string) => {
    const clean = value.replace(/\D/g, "").slice(0, 6);
    set("zip", clean);
    setPinSuccess("");
    setPinOffices([]);

    if (clean.length === 6) {
      setPinLoading(true);
      try {
        const info = await lookupPincodeDetails(clean);
        if (info && (info.district || info.state)) {
          setAddress((curr) => ({
            ...curr,
            city: info.district || curr.city,
            region: info.state || curr.region,
          }));
          setPinSuccess(`✓ PIN Verified: ${info.district}, ${info.state}`);
          if (info.offices && info.offices.length > 0) {
            setPinOffices(info.offices.slice(0, 6));
          }
        }
      } finally {
        setPinLoading(false);
      }
    }
  };

  const handleGetLocation = async () => {
    setLocating(true);
    setLocError("");
    setLocSuccess("");
    setPinSuccess("");
    setPinOffices([]);
    try {
      const geo = await fetchFreeCurrentLocation();

      // Guarantee pure English district & state via official Indian Postal service
      let finalCity = geo.city;
      let finalRegion = geo.region;
      if (geo.zip && geo.zip.length === 6) {
        try {
          const info = await lookupPincodeDetails(geo.zip);
          if (info) {
            if (info.district) finalCity = info.district;
            if (info.state) finalRegion = info.state;
            setPinSuccess(`✓ PIN Verified: ${info.district}, ${info.state}`);
            if (info.offices && info.offices.length > 0) {
              setPinOffices(info.offices.slice(0, 6));
            }
          }
        } catch {}
      }

      setAddress((curr) => ({
        ...curr,
        address: geo.address && geo.address !== "Current Area" && geo.address !== "Current Location" ? geo.address : curr.address,
        address2: geo.address2 || curr.address2,
        city: finalCity || curr.city,
        region: finalRegion || curr.region,
        zip: geo.zip || curr.zip,
        country: geo.country || curr.country,
      }));

      const pinText = geo.zip ? ` (PIN: ${geo.zip})` : "";
      const locParts = [
        geo.address && geo.address !== "Current Area" && geo.address !== "Current Location" ? geo.address : "",
        finalCity,
        finalRegion,
      ].filter(Boolean);
      const locText = locParts.length > 0 ? locParts.join(", ") : "Current Location";
      if (geo.source === "gps") {
        setLocSuccess(`📍 Live GPS Detected: ${locText}${pinText}`);
      } else if (finalCity || finalRegion) {
        setLocSuccess(`📍 Location Detected: ${locText}${pinText}. Please verify your street and PIN.`);
      } else {
        setLocError("Could not auto-detect location. Please type your 6-digit PIN code to auto-fill.");
      }
    } catch (err: any) {
      setLocError(err?.message || "Failed to retrieve location. Please type your 6-digit PIN code below.");
    } finally {
      setLocating(false);
    }
  };

  const set = (key: keyof CommerceAddress, value: string | boolean) => setAddress((current) => ({ ...current, [key]: value }));

  if (typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-6 overflow-y-auto min-h-screen">
      {/* Backdrop covering header and whole page */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/75 backdrop-blur-md"
      />
      <motion.form
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        onSubmit={(event) => {
          event.preventDefault();
          onSave(address);
        }}
        className="relative z-10 my-auto flex max-h-[90vh] w-full max-w-[720px] flex-col rounded-2xl border border-[#4b261a]/20 bg-[#fffdfa] text-[#351c13] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.5)] overflow-hidden"
      >
        <div className="flex items-center justify-between px-6 sm:px-8 py-5 border-b border-[#4b261a]/15 bg-[#fbf6ed] shrink-0">
          <div>
            <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#a87648]">Follicia Delivery</span>
            <h2 className="font-serif text-2xl font-medium text-[#351c13] tracking-tight">
              {initialAddress ? "Edit Delivery Address" : "Add New Address"}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-[#4b261a20] text-xl font-light text-[#351c13]/70 hover:bg-[#4b261a10] hover:text-[#a87648] cursor-pointer transition-colors"
          >
            ×
          </button>
        </div>
        
        <div className="grid flex-1 gap-5 overflow-y-auto px-6 sm:px-8 py-6 bg-[#fffdfa]">


          <div className="grid gap-5 md:grid-cols-2">
            <Field label="* First name" value={address.firstName} onChange={(v) => set("firstName", v)} required placeholder="First name" />
            <Field label="* Last name" value={address.lastName} onChange={(v) => set("lastName", v)} required placeholder="Last name" />
          </div>
          <Field label="Company name (optional)" value={address.company} onChange={(v) => set("company", v)} placeholder="Company" />
          <Field label="* Street Address" value={address.address} onChange={(v) => set("address", v)} required placeholder="House number and street name" />
          <Field label="Apartment / Suite / Floor" value={address.address2} onChange={(v) => set("address2", v)} placeholder="Apartment, suite, unit, etc." />
          <div className="grid gap-5 md:grid-cols-3">
            <div className="space-y-1">
              <Field label="* PIN / Postal code" value={address.zip} onChange={handleZipChange} required placeholder="PIN code" />
              {pinLoading && (
                <p className="text-[10px] text-amber-700 animate-pulse font-medium">⚡ Verifying PIN code...</p>
              )}
              {pinSuccess && (
                <p className="text-[10px] text-emerald-700 font-medium">✓ {pinSuccess}</p>
              )}
            </div>
            <Field label="* City" value={address.city} onChange={(v) => set("city", v)} required placeholder="City" />
            <Field label="State / Region" value={address.region} onChange={(v) => set("region", v)} placeholder="State" />
          </div>

          {pinOffices.length > 0 && (
            <div className="p-3 rounded-lg bg-[#fbf6ed] border border-[#a87648]/30">
              <span className="text-[10px] font-semibold text-[#351c13] block mb-1.5 uppercase tracking-wider">
                📍 Quick Select Area / Locality for PIN {address.zip}:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {pinOffices.map((office) => (
                  <button
                    key={office}
                    type="button"
                    onClick={() => set("address2", office)}
                    className="text-[11px] px-2.5 py-1 rounded-full bg-white hover:bg-[#a87648]/20 text-[#351c13] border border-[#a87648]/40 cursor-pointer transition-colors shadow-2xs font-medium"
                  >
                    + {office}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="grid gap-5 md:grid-cols-2">
            <Field label="Country" value={address.country} onChange={(v) => set("country", v)} placeholder="India" />
            <Field label="* Contact Phone" value={address.phone} onChange={(v) => set("phone", v)} required placeholder="10-digit mobile number" />
          </div>
          <label className="mt-2 flex items-center gap-3 text-sm text-[#351c13]/80 cursor-pointer select-none">
            <input type="checkbox" checked={address.isDefault} onChange={(event) => set("isDefault", event.target.checked)} className="w-4 h-4 accent-[#4b261a] rounded cursor-pointer" />
            Make this my default delivery address
          </label>
        </div>
        <footer className="border-t border-[#4b261a]/15 px-6 sm:px-8 py-4 flex justify-end gap-3 bg-[#fbf6ed] shrink-0">
          <button type="button" onClick={onClose} className="rounded-lg border border-[#4b261a]/20 bg-white px-6 py-2.5 text-xs font-semibold uppercase tracking-[0.12em] text-[#351c13] hover:bg-[#f2e9d9] cursor-pointer transition-colors">Cancel</button>
          <button type="submit" className="rounded-lg bg-[#351c13] px-7 py-2.5 text-xs font-semibold uppercase tracking-[0.12em] text-[#fffaf0] hover:bg-[#a87648] cursor-pointer transition-all shadow-md">{initialAddress ? "Save Changes" : "Add Address"}</button>
        </footer>
      </motion.form>
    </div>,
    document.body
  );
}

function Field({ label, value, onChange, required, placeholder }: { label: string; value: string; onChange: (value: string) => void; required?: boolean; placeholder?: string }) {
  return (
    <label className="grid gap-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-[#6c3d2c]">
      <span>{label}</span>
      <input
        required={required}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 rounded-lg border border-[#4b261a]/20 bg-white px-4 text-sm normal-case tracking-normal text-[#351c13] placeholder-[#4b261a]/40 outline-none transition-all focus:border-[#a87648] focus:ring-2 focus:ring-[#a87648]/20 shadow-sm"
      />
    </label>
  );
}

export function AccountPanel({ session, initialSection = "My Orders" }: { session: AuthSession; initialSection?: AccountSection }) {
  const { toggleWish } = useCart();
  const [profile, setProfile] = useState(() => ensureCustomer(session.user));
  const [active, setActive] = useState<AccountSection>(initialSection);
  const [orders, setOrders] = useState(() => getOrders());
  const [showAddress, setShowAddress] = useState(false);
  const [editingAddress, setEditingAddress] = useState<CommerceAddress | null>(null);
  const [products, setProducts] = useState(() => getProducts());
  const myOrders = orders.filter((order) => order.customerId === profile.id || order.email.toLowerCase() === profile.email.toLowerCase());
  const localWishlist = readLocalWishlist();
  const mergedWishlist = Array.from(new Set([...profile.wishlist, ...localWishlist])).map((id) => id.toLowerCase());
  const wishlistedProducts = products.filter((p) =>
    mergedWishlist.includes(p.id.toLowerCase()) || (p.designId && mergedWishlist.includes(p.designId.toLowerCase()))
  );
  const deliveredOrders = myOrders.filter((order) => order.deliveryStatus === "Delivered");

  const handleRemoveFromWishlist = (targetProductId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const lowerTarget = targetProductId.toLowerCase();
    
    // 1. Remove from local storage
    try {
      const raw = JSON.parse(localStorage.getItem("follocia_wishlist_items") || "[]") as string[];
      const updated = raw.filter((id) => id.toLowerCase() !== lowerTarget);
      localStorage.setItem("follocia_wishlist_items", JSON.stringify(updated));
    } catch {}

    // 2. Toggle in cart context
    toggleWish(lowerTarget);

    // 3. Remove from customer profile wishlist
    const updatedWishlist = profile.wishlist.filter((id) => id.toLowerCase() !== lowerTarget);
    const updatedProfile = { ...profile, wishlist: updatedWishlist };
    upsertCustomer(updatedProfile);
    void saveCustomerRemote(updatedProfile);
    setProfile(updatedProfile);
  };

  useEffect(() => {
    if (initialSection) {
      setActive(initialSection);
    }
  }, [initialSection]);

  const handleSectionSelect = (section: AccountSection) => {
    setActive(section);
    const slugMap: Record<AccountSection, string> = {
      "My Orders": "my-orders",
      "My Wishlist": "my-wishlist",
      "My Addresses": "my-addresses",
      "My Wallet": "my-wallet",
      "My Coupons": "my-coupons",
      "Gift Cards": "gift-cards",
      "My Reviews": "my-reviews",
      "Notifications": "notifications",
      "My Subscriptions": "my-subscriptions",
      "My Account": "my-account",
    };
    if (typeof window !== "undefined") {
      window.location.hash = `/account/${slugMap[section] || "my-orders"}`;
    }
  };

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
    try {
      const sess = readAuthSession();
      if (sess && sess.user) {
        sess.user.name = next.name;
        if (next.phone) sess.user.phone = next.phone;
        localStorage.setItem("follocia_session", JSON.stringify(sess));
      }
    } catch {
      // ignore
    }
  };
  const updateOrder = (next: CommerceOrder) => {
    const updated = orders.map((order) => (order.id === next.id ? next : order));
    setOrders(updated);
    saveOrders(updated);
    void saveOrderRemote(next);
  };

  return (
    <>
      <AccountShell profile={profile} active={active} onActive={handleSectionSelect}>
      {active === "My Orders" && (
        <>
          <SectionHead title="My Orders" copy="View your order history or track the status of a recent reservation." />
          {myOrders.length === 0 ? (
            <EmptyState
              icon="📦"
              title="You haven't placed any orders yet."
              copy="Explore our curated collection of luxury handcrafted footwear and reserve your pair."
              action={
                <a
                  className="inline-flex items-center gap-2 bg-[#24130d] text-white px-6 py-2.5 rounded-full text-xs font-semibold uppercase tracking-wider hover:bg-[#351c13] transition-all shadow-sm cursor-pointer"
                  href="#/shop"
                >
                  Explore the Collection →
                </a>
              }
            />
          ) : (
            <div className="grid gap-4 sm:gap-6 py-2 sm:py-4">
              {myOrders.map((order) => <OrderRow key={order.id} order={order} onUpdate={updateOrder} products={products} />)}
            </div>
          )}
        </>
      )}
      {active === "My Addresses" && (
        <>
          <SectionHead title="My Addresses" copy="Add and manage your saved delivery addresses." />
          {profile.addresses.length === 0 ? (
            <EmptyState
              icon="📍"
              title="You haven't saved any addresses yet."
              copy="Add your primary delivery address for fast 1-click checkout."
              action={
                <button
                  onClick={() => setShowAddress(true)}
                  className="inline-flex items-center gap-2 bg-[#24130d] text-white px-5 py-2 sm:px-6 sm:py-2.5 rounded-full text-xs font-semibold uppercase tracking-wider hover:bg-[#351c13] transition-all shadow-sm cursor-pointer"
                >
                  + Add New Address
                </button>
              }
            />
          ) : (
            <div className="grid gap-3 sm:gap-4 py-2 sm:py-4">
              {profile.addresses.map((address) => (
                <article key={address.id} className="rounded-xl border border-[#4b261a]/15 bg-[#fffdfa] p-3.5 sm:p-6 text-sm flex flex-col sm:flex-row justify-between items-start gap-3 sm:gap-4 hover:border-[var(--gold)]/50 transition-colors shadow-2xs">
                  <div className="w-full">
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <strong className="block text-base sm:text-lg font-serif font-bold text-[#24130d]">{address.firstName} {address.lastName}</strong>
                      {address.isDefault && <span className="inline-block bg-[var(--gold)] px-2 py-0.5 text-[0.62rem] uppercase tracking-widest text-[#24130d] rounded-sm font-bold shrink-0">Default</span>}
                    </div>
                    <p className="text-[#24130d]/80 leading-relaxed text-xs sm:text-sm">
                      {address.address}{address.address2 ? `, ${address.address2}` : ""}<br />
                      {address.city}, {address.region} {address.zip}<br />
                      {address.country} · Phone: {address.phone}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 w-full sm:w-auto justify-end pt-2 sm:pt-0 border-t sm:border-t-0 border-[#4b261a]/10 shrink-0">
                    <button
                      type="button"
                      onClick={() => setEditingAddress(address)}
                      className="flex-1 sm:flex-initial px-3.5 py-1.5 rounded-lg border border-[var(--gold)] text-[var(--gold)] text-xs uppercase tracking-[0.1em] hover:bg-[var(--gold)] hover:text-white transition-all cursor-pointer font-semibold text-center"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm("Are you sure you want to remove this address?")) {
                          saveProfile({ ...profile, addresses: profile.addresses.filter((a) => a.id !== address.id) });
                        }
                      }}
                      className="flex-1 sm:flex-initial px-3.5 py-1.5 rounded-lg border border-neutral-300 text-neutral-600 text-xs uppercase tracking-[0.1em] hover:border-rose-500 hover:text-rose-600 transition-all cursor-pointer font-semibold text-center"
                    >
                      Delete
                    </button>
                  </div>
                </article>
              ))}
              <button onClick={() => { setEditingAddress(null); setShowAddress(true); }} className="w-fit rounded-lg bg-[#24130d] text-white px-5 py-2.5 sm:px-6 sm:py-3 text-xs uppercase tracking-[0.12em] font-semibold hover:bg-[#351c13] transition-colors mt-2 cursor-pointer shadow-sm">+ Add New Address</button>
            </div>
          )}
        </>
      )}
      {active === "My Wallet" && (
        <>
          <SectionHead title="Wallet" copy="Save your payment details for faster checkout." />
          <EmptyState
            icon="💳"
            title="You haven't saved any payment methods yet"
            copy="Securely save your payment details for faster checkout whenever you place an order."
          />
        </>
      )}
      {active === "My Coupons" && (
        <>
          <SectionHead title="My Coupons" copy="Exclusive Follicia member benefits, launch privileges and coupons." />
          {(() => {
            const customerEmail = profile?.email || session?.user?.email;
            const eligibility = getUserDiscountEligibility(customerEmail);
            return (
              <div className="mb-4">
                {/* Unlocked Privilege Spotlight Card */}
                <div className={`rounded-2xl border-2 p-5 sm:p-7 relative overflow-hidden transition-all shadow-sm ${
                  eligibility.code === "LAUNCH35"
                    ? "border-[var(--gold)] bg-gradient-to-br from-[#fcf7ee] via-white to-[#fbf5e6] text-[#24130d]"
                    : "border-emerald-600/40 bg-gradient-to-br from-emerald-50/70 via-white to-emerald-50/30 text-emerald-950"
                }`}>
                  <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                    <span className={`text-[10px] font-bold uppercase tracking-[0.2em] px-3 py-1 rounded-full ${
                      eligibility.code === "LAUNCH35"
                        ? "bg-[var(--gold)]/20 text-[#83561a] border border-[var(--gold)]/30"
                        : "bg-emerald-100 text-emerald-800 border border-emerald-200"
                    }`}>
                      {eligibility.code === "LAUNCH35" ? `Early Bird Privilege · ${eligibility.spotsRemaining} Spots Left` : "VIP Welcome Offer"}
                    </span>
                    <span className="font-mono text-sm font-extrabold uppercase tracking-widest bg-white border border-[#4b261a]/20 px-3 py-1 rounded-lg text-[#24130d] shadow-xs">
                      {eligibility.code}
                    </span>
                  </div>

                  <h3 className="font-serif text-2xl sm:text-3xl font-bold text-[#24130d] leading-tight">
                    {eligibility.percent}% OFF Your Next Order
                  </h3>
                  <p className="mt-2 text-xs sm:text-sm text-[#24130d]/80 leading-relaxed max-w-xl">
                    {eligibility.code === "LAUNCH35"
                      ? "Exclusive launch privilege allocated for the first 10 clients to place an order. Once 10 clients complete their orders, this 35% offer automatically closes. Auto-applicable at checkout."
                      : eligibility.hasAlreadyUsed35
                        ? "You have already enjoyed your 35% launch discount. You are now unlocked for a permanent 15% VIP Welcome benefit on your orders."
                        : "Welcome to Follicia! All 10 initial early-bird launch spots have completed. Enjoy 15% privilege across all handcrafted collections."
                    }
                  </p>

                  <div className="mt-4 pt-4 border-t border-[#4b261a]/10 flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        if (navigator.clipboard) {
                          void navigator.clipboard.writeText(eligibility.code);
                          alert(`Coupon code "${eligibility.code}" copied to clipboard!`);
                        }
                      }}
                      className="px-4 py-2 rounded-xl border border-[#24130d]/20 bg-white text-xs font-bold uppercase tracking-wider text-[#24130d] hover:bg-[#FAF8F5] transition-colors cursor-pointer"
                    >
                      Copy Code ({eligibility.code})
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const quote = quoteCoupon(eligibility.code, 10000, customerEmail);
                        if (quote) {
                          saveCheckoutCoupon(quote);
                          alert(`Coupon ${eligibility.code} (${eligibility.percent}% OFF) applied! Proceeding to shop...`);
                          window.location.hash = "/shop";
                        }
                      }}
                      className="px-4 py-2 rounded-xl bg-[#24130d] text-white text-xs font-bold uppercase tracking-wider hover:bg-[var(--gold)] hover:text-[#24130d] transition-colors cursor-pointer shadow-xs"
                    >
                      Apply & Shop Now
                    </button>
                  </div>
                </div>
              </div>
            );
          })()}

          <div className="grid gap-3 sm:gap-4 py-2 sm:py-4 md:grid-cols-2">
            {[
              ["FOLLICIA10", "10% off your next reservation", "Valid on all live editions"],
              ["FOLLICIACARE", "Complimentary care kit", "Auto-applied on premium pairs"],
            ].map(([code, title, copy]) => (
              <article key={code} className="rounded-2xl border border-[#4b261a]/15 p-4 sm:p-6 bg-[#fbf6ed]/80 shadow-xs hover:border-[var(--gold)] transition-colors">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="font-mono text-xs font-bold uppercase tracking-[0.2em] bg-white border border-[#4b261a]/20 px-3 py-1 rounded-lg text-[#24130d] shadow-2xs">
                    {code}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      if (navigator.clipboard) {
                        void navigator.clipboard.writeText(code);
                        alert(`Coupon code "${code}" copied to clipboard!`);
                      }
                    }}
                    className="text-[10.5px] uppercase font-bold tracking-wider text-[#a87648] hover:text-[#24130d] transition-colors cursor-pointer"
                  >
                    Copy Code
                  </button>
                </div>
                <h3 className="font-serif text-lg sm:text-xl font-bold text-[#24130d] leading-snug">{title}</h3>
                <p className="mt-1 text-xs sm:text-sm text-[#24130d]/70 leading-relaxed">{copy}</p>
              </article>
            ))}
          </div>
        </>
      )}
      {active === "Gift Cards" && <><SectionHead title="Gift Cards" copy="Manage Follicia gift cards and store credit balance." /><EmptyState title="No gift cards added yet." copy="Gift card balance and redemption history will appear here." /></>}
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
            {["Order status updates", "Wishlist price and availability alerts", "New collection launch invitations", "Concierge support replies"].map((item) => (
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
          <SectionHead title="My Wishlist" copy="Saved pieces and drop alerts from your Follicia account." />
          {wishlistedProducts.length === 0 ? (
            <EmptyState
              icon="🤍"
              title="You haven't saved any pieces yet."
              copy="Save your favorite handcrafted designs for easy access."
              action={
                <a
                  className="inline-flex items-center gap-2 bg-[#24130d] text-white px-5 py-2 sm:px-6 sm:py-2.5 rounded-full text-xs font-semibold uppercase tracking-wider hover:bg-[#351c13] transition-all shadow-sm cursor-pointer"
                  href="#/shop"
                >
                  Explore Collection
                </a>
              }
            />
          ) : (
            <div className="grid gap-3 sm:gap-6 py-2 sm:py-6 grid-cols-1 md:grid-cols-2">
              {wishlistedProducts.map((product) => (
                <article
                  key={product.id}
                  onClick={() => {
                    window.location.hash = `#/shop/${product.id.toLowerCase()}`;
                  }}
                  className="flex gap-3 sm:gap-5 glass border border-[var(--ink)]/10 p-3 sm:p-5 group hover:shadow-[var(--shadow-soft)] transition-all cursor-pointer relative overflow-hidden rounded-xl bg-white/90"
                >
                  <div className="w-24 sm:w-[110px] shrink-0 overflow-hidden bg-[var(--champagne)]/30 rounded-lg">
                    <img
                      src={productPrimaryImage(product)}
                      alt={product.title}
                      onError={(e) => {
                        const fallback = `/products/${(product.designId || product.id).toLowerCase()}.webp`;
                        if (e.currentTarget.getAttribute("data-fallback") !== "true") {
                          e.currentTarget.setAttribute("data-fallback", "true");
                          e.currentTarget.src = fallback;
                        } else {
                          e.currentTarget.src = "/products/fa-01.webp";
                        }
                      }}
                      className="aspect-[4/5] w-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                  </div>

                  <div className="flex-1 flex flex-col justify-between min-w-0">
                    <div>
                      <p className="eyebrow text-[var(--gold)] text-[9.5px] uppercase tracking-widest">{product.edition}</p>
                      <h3 className="mt-0.5 font-display text-sm sm:text-lg group-hover:text-[var(--gold)] transition-colors leading-snug font-bold text-[var(--ink)] line-clamp-2">
                        {product.title}
                      </h3>
                      <p className="mt-1 text-xs sm:text-sm font-bold text-[var(--ink)]">{product.price}</p>
                      {product.status && (
                        <span className="inline-block mt-1 text-[9px] uppercase tracking-wider px-2 py-0.5 rounded bg-[#fbf6ed] border border-[#4b261a15] text-[#4b261a]">
                          {product.status}
                        </span>
                      )}
                    </div>

                    <div className="mt-2.5 flex items-center justify-end gap-2 pt-2 border-t border-[#4b261a]/10" onClick={(e) => e.stopPropagation()}>
                      <a
                        href={`#/shop/${product.id.toLowerCase()}`}
                        className="text-[10px] font-bold uppercase tracking-wider text-[var(--gold)] hover:bg-[var(--gold)] hover:text-white border border-[var(--gold)]/35 px-2.5 py-1 rounded-md transition-all shadow-2xs"
                      >
                        View
                      </a>
                      <button
                        type="button"
                        onClick={(e) => handleRemoveFromWishlist(product.id, e)}
                        title="Remove from wishlist"
                        aria-label={`Remove ${product.title} from wishlist`}
                        className="inline-flex items-center justify-center px-2.5 py-1 rounded-md bg-rose-50 text-rose-700 hover:bg-rose-600 hover:text-white border border-rose-200/80 transition-all cursor-pointer text-[10px] font-semibold tracking-wide shadow-2xs"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </>
      )}
      {active === "My Subscriptions" && <><SectionHead title="Subscriptions" copy="View and manage the subscriptions you've purchased." /><EmptyState title="No purchased subscriptions" copy="When you purchase a subscription, it'll appear here." /></>}
      {active === "My Account" && <AccountForm profile={profile} onSave={saveProfile} />}
    </AccountShell>

    <AnimatePresence>
      {(showAddress || editingAddress !== null) && (
        <AddressModal
          profile={profile}
          initialAddress={editingAddress}
          onClose={() => {
            setShowAddress(false);
            setEditingAddress(null);
          }}
          onSave={(savedAddr) => {
            let updated = editingAddress
              ? profile.addresses.map((a) => (a.id === savedAddr.id ? savedAddr : a))
              : [...profile.addresses, savedAddr];
            if (savedAddr.isDefault) {
              updated = updated.map((a) => ({ ...a, isDefault: a.id === savedAddr.id }));
            }
            saveProfile({ ...profile, addresses: updated });
            setShowAddress(false);
            setEditingAddress(null);
          }}
        />
      )}
    </AnimatePresence>
  </>
);
}

function AccountForm({ profile, onSave }: { profile: CustomerProfile; onSave: (profile: CustomerProfile) => void }) {
  const [draft, setDraft] = useState(profile);
  const [saved, setSaved] = useState(false);
  useEffect(() => setDraft(profile), [profile]);
  const update = (key: keyof CustomerProfile, value: string) =>
    setDraft((current) => ({
      ...current,
      [key]: value,
      name:
        key === "firstName" || key === "lastName"
          ? `${key === "firstName" ? value : current.firstName} ${key === "lastName" ? value : current.lastName}`.trim()
          : current.name,
    }));

  return (
    <>
      <SectionHead title="Account" copy="View and edit your personal info below." />
      <form
        onSubmit={(event) => {
          event.preventDefault();
          onSave(draft);
          setSaved(true);
          setTimeout(() => setSaved(false), 4000);
        }}
        className="border-b border-[var(--ink)]/10 pb-12 mb-10"
      >
        <h2 className="font-display text-2xl">Personal info</h2>
        <p className="mt-2 text-sm text-[var(--ink)]/60">Update your personal account details.</p>

        {saved && (
          <div className="mt-4 p-4 rounded-lg bg-[#f0fdf4] border border-[#86efac] text-[#166534] text-sm flex items-center gap-2.5 font-medium shadow-sm">
            <span className="text-base font-bold">✓</span> Personal information updated successfully!
          </div>
        )}

        <div className="mt-6 grid max-w-[600px] gap-6 md:grid-cols-2">
          <Field label="First name" value={draft.firstName} onChange={(value) => update("firstName", value)} />
          <Field label="Last name" value={draft.lastName} onChange={(value) => update("lastName", value)} />
          <Field label="Phone" value={draft.phone} onChange={(value) => update("phone", value)} />
        </div>
        <div className="mt-6 sm:mt-8 flex flex-wrap gap-3 sm:gap-4">
          <button
            type="button"
            onClick={() => {
              setDraft(profile);
              setSaved(false);
            }}
            className="flex-1 sm:flex-initial rounded-lg border border-[var(--ink)]/20 px-6 py-2.5 sm:px-8 sm:py-3 text-xs uppercase tracking-[0.1em] hover:bg-[var(--ink)]/5 transition-colors cursor-pointer text-center font-semibold"
          >
            Discard
          </button>
          <button
            type="submit"
            className="flex-1 sm:flex-initial rounded-lg bg-[#24130d] px-6 py-2.5 sm:px-8 sm:py-3 text-xs uppercase tracking-[0.1em] text-white hover:bg-[var(--gold)] hover:text-[var(--ink)] transition-colors cursor-pointer font-semibold text-center shadow-sm"
          >
            Update Info
          </button>
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

function OrderRow({
  order,
  onUpdate,
  products = [],
}: {
  order: CommerceOrder;
  onUpdate: (order: CommerceOrder) => void;
  products?: CommerceProduct[];
}) {
  // 8-Step pipeline tracking
  const steps = [
    "Order Received",
    "Identity Verified",
    "Materials Sourced",
    "Handcrafted Construction",
    "Quality Control",
    "Packaging",
    "Dispatched",
    "Delivered",
  ];

  const getPipelineIndex = (status: string) => {
    switch (status) {
      case "Order Placed": return 0;
      case "Fitting Scheduled": return 1;
      case "In Crafting": return 3;
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

  // Lookup matching shoe image from catalog or live products
  const matchedProduct = useMemo(() => {
    const list = products || [];
    const pName = (order.product || "").toLowerCase().trim();
    return (
      list.find(
        (p) =>
          p.title.toLowerCase().trim() === pName ||
          p.id.toLowerCase() === pName ||
          (p.designId && p.designId.toLowerCase() === pName)
      ) ||
      FOLLICIA_PRODUCTS.find(
        (p) =>
          p.name.toLowerCase().trim() === pName ||
          p.id.toLowerCase() === pName ||
          (p.designId && p.designId.toLowerCase() === pName)
      )
    );
  }, [order.product, products]);

  const orderImage = matchedProduct ? productPrimaryImage(matchedProduct as any) : "/products/fa-01.webp";

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
    <article className="rounded-2xl border border-[#4b261a]/15 bg-white shadow-sm overflow-hidden w-full min-w-0 transition-all hover:shadow-md">
      {/* Top Header Row: Order ID, Date, Payment Status */}
      <div className="px-4 py-3 sm:px-6 sm:py-4 bg-[#fbf6ed]/60 border-b border-[#4b261a]/10 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="font-serif text-base sm:text-lg font-bold text-[#24130d] tracking-tight truncate">
            {order.id}
          </span>
          {isCancelled ? (
            <span className="bg-rose-50 text-rose-700 px-2.5 py-0.5 text-[10px] uppercase tracking-wider rounded-full border border-rose-200 font-bold shrink-0">
              Cancelled
            </span>
          ) : (
            <span className="bg-[#24130d] text-[#e6ca97] px-2.5 py-0.5 text-[10px] uppercase tracking-wider rounded-full font-semibold shrink-0">
              {steps[activeIndex]}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-[11px] text-[#24130d]/60 font-medium">
            {order.date}
          </span>
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 text-[10px] uppercase tracking-wider rounded-full font-semibold ${
            order.paymentStatus.includes("Paid") ? "bg-emerald-50 text-emerald-800 border border-emerald-200" : "bg-amber-50 text-amber-800 border border-amber-200"
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${order.paymentStatus.includes("Paid") ? "bg-emerald-500" : "bg-amber-500"}`} />
            {order.paymentStatus}
          </span>
        </div>
      </div>

      <div className="p-4 sm:p-6 md:p-8">
        {/* Main Product Info Row: Shoe Image + Product Details + Price */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-5 border-b border-[#4b261a]/10">
          <div className="flex items-center gap-3.5 min-w-0 w-full sm:w-auto">
            {/* Shoe Thumbnail */}
            <div className="w-16 h-16 sm:w-20 sm:h-20 shrink-0 rounded-xl overflow-hidden bg-white border border-[#4b261a]/15 p-1 flex items-center justify-center shadow-2xs">
              <img
                src={orderImage}
                alt={order.product}
                className="max-h-full max-w-full object-contain brightness-[1.15] contrast-[1.05] saturate-[1.05] transition-transform hover:scale-105"
                style={{ backgroundColor: 'white' }}
                onError={(e) => {
                  e.currentTarget.src = "/products/fa-01.webp";
                }}
              />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] uppercase tracking-widest text-[#a87648] font-bold truncate">
                {matchedProduct?.edition || "Limited Edition"}
              </p>
              <h3 className="font-serif text-base sm:text-xl font-bold text-[#24130d] leading-tight truncate">
                {order.product}
              </h3>
              <div className="flex flex-wrap items-center gap-2 mt-1">
                <span className="inline-block px-2 py-0.5 rounded bg-[#fbf6ed] border border-[#4b261a]/15 text-[11px] font-semibold text-[#24130d]">
                  Size {order.size}
                </span>
                {order.paymentMethod && (
                  <span className="text-[11px] text-[#24130d]/60 font-medium">
                    via {order.paymentMethod}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between sm:justify-end sm:text-right w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-[#4b261a]/5">
            <span className="text-xs uppercase tracking-wider text-[#24130d]/50 font-semibold sm:hidden">Total Amount</span>
            <span className="font-serif text-2xl sm:text-3xl font-bold text-[var(--gold)]">
              {order.amount}
            </span>
          </div>
        </div>

        {/* 8-Step Visual Pipeline */}
        {!isCancelled && (
          <div className="mt-5 p-3.5 sm:p-5 rounded-xl bg-[#fbf6ed]/50 border border-[#4b261a]/10">
            <div className="flex items-center justify-between gap-2 mb-2 sm:mb-3">
              <span className="text-[10.5px] uppercase font-bold tracking-wider text-[#a87648] flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#a87648] animate-pulse" />
                Live Tracking
              </span>
              <span className="text-[11px] font-bold text-[#24130d] bg-white px-2.5 py-0.5 rounded-full border border-[#4b261a]/15 shadow-2xs truncate">
                Step {activeIndex + 1} of 8: {steps[activeIndex]}
              </span>
            </div>

            {/* Pipeline progress bar */}
            <div className="relative my-3 sm:my-4">
              <div className="absolute top-2 left-0 w-full h-1.5 bg-[#4b261a]/15 z-0 rounded-full" />
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${(activeIndex / (steps.length - 1)) * 100}%` }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="absolute top-2 left-0 h-1.5 bg-[var(--gold)] z-0 rounded-full shadow-xs"
              />
              <div className="relative z-10 flex justify-between">
                {steps.map((step, index) => {
                  const isActive = index <= activeIndex;
                  const isCurrent = index === activeIndex;
                  return (
                    <div key={step} className="flex flex-col items-center group relative">
                      <div
                        className={`w-4 h-4 sm:w-5 sm:h-5 rounded-full border-2 flex items-center justify-center bg-white transition-all duration-300 ${
                          isCurrent
                            ? "border-[var(--gold)] ring-4 ring-[var(--gold)]/20 shadow-xs scale-110"
                            : isActive
                            ? "border-[var(--gold)] bg-[var(--gold)]"
                            : "border-[#4b261a]/25"
                        }`}
                      >
                        {isCurrent && <div className="w-1.5 h-1.5 rounded-full bg-[var(--gold)] animate-pulse" />}
                        {isActive && !isCurrent && <span className="text-[8px] text-white font-bold leading-none">✓</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Milestone status labels */}
            <div className="flex items-center justify-between text-[10.5px] text-[#24130d]/70 pt-1">
              <span className="truncate">{steps[0]}</span>
              <span className="font-bold text-[#24130d] px-2 truncate text-center">{steps[activeIndex]}</span>
              <span className="truncate text-right">{steps[7]}</span>
            </div>
          </div>
        )}

        {/* Tracking & Delivery Details */}
        <div className="mt-4 grid gap-3 sm:grid-cols-2 text-xs text-[#24130d]">
          <div className="p-3.5 rounded-xl bg-white border border-[#4b261a]/10">
            <span className="text-[10px] uppercase font-bold tracking-wider text-[#a87648] block mb-1">
              🚚 Dispatch & Delivery
            </span>
            <p className="font-medium text-[#24130d] truncate">
              {order.trackingCode ? `Code: ${order.trackingCode}` : "Tracking code assigned upon dispatch"}
            </p>
            <p className="text-[#24130d]/70 mt-0.5">
              Estimated Arrival: <strong className="text-[#24130d]">{order.deliveryEta}</strong>
            </p>
          </div>
          <div className="p-3.5 rounded-xl bg-white border border-[#4b261a]/10">
            <span className="text-[10px] uppercase font-bold tracking-wider text-[#a87648] block mb-1">
              📍 Delivery Address
            </span>
            <p className="text-[#24130d]/80 leading-snug line-clamp-2">
              {order.deliveryAddress || "Address will appear after checkout confirmation."}
            </p>
          </div>
        </div>

        {/* Action Buttons: Responsive Grid */}
        <div className="mt-5 pt-4 border-t border-[#4b261a]/10 grid grid-cols-2 sm:flex sm:flex-wrap sm:justify-end gap-2.5">
          <button
            type="button"
            onClick={() => setShowInvoice((prev) => !prev)}
            className={`px-3 py-2 sm:px-4 sm:py-2.5 rounded-lg border text-[11px] uppercase tracking-wider font-semibold transition-all cursor-pointer text-center ${
              showInvoice
                ? "bg-[#24130d] text-[#fffaf0] border-[#24130d]"
                : "bg-white text-[#24130d] border-[#4b261a]/20 hover:border-[#a87648]"
            }`}
          >
            {showInvoice ? "Hide Invoice ↑" : "Invoice ↓"}
          </button>

          <button
            type="button"
            onClick={() => setActiveRequest("support")}
            className="px-3 py-2 sm:px-4 sm:py-2.5 rounded-lg bg-[#24130d] text-[#fffaf0] hover:bg-[#3d2016] text-[11px] uppercase tracking-wider font-semibold transition-all cursor-pointer text-center shadow-xs"
          >
            Concierge ✉
          </button>

          <a
            href="#/shop"
            className="px-3 py-2 sm:px-4 sm:py-2.5 rounded-lg border border-[#4b261a]/20 bg-white hover:border-[#a87648] text-[#24130d] text-[11px] uppercase tracking-wider font-semibold transition-all text-center"
          >
            Reorder Piece
          </a>

          {!isCancelled && order.deliveryStatus !== "Delivered" && (
            <button
              type="button"
              onClick={() => setActiveRequest("cancel")}
              className="px-3 py-2 sm:px-4 sm:py-2.5 rounded-lg border border-rose-200 bg-rose-50/60 text-rose-700 hover:bg-rose-100 text-[11px] uppercase tracking-wider font-semibold transition-all cursor-pointer text-center"
            >
              Cancel Order
            </button>
          )}

          {order.deliveryStatus === "Delivered" && (
            <button
              type="button"
              onClick={() => setActiveRequest("return")}
              className="px-3 py-2 sm:px-4 sm:py-2.5 rounded-lg border border-[#a87648]/40 bg-[#fbf6ed] text-[#4b261a] hover:bg-[#a87648] hover:text-white text-[11px] uppercase tracking-wider font-semibold transition-all cursor-pointer text-center"
            >
              Request Return
            </button>
          )}
        </div>
      </div>

      {/* Concierge / Cancel / Return Section */}
      <AnimatePresence>
        {activeRequest && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden bg-[#fbf6ed] border-t border-[#4b261a]/15"
          >
            <div className="p-4 sm:p-6 md:p-8">
              <h3 className="font-serif text-lg sm:text-xl font-bold text-[#24130d]">
                {activeRequest === "cancel" ? "Cancel Order Request" : activeRequest === "return" ? "Return Request" : "Follicia Concierge Support"}
              </h3>
              <p className="text-xs text-[#24130d]/70 mt-1">
                Our private concierge will review your request for Order #{order.id} and respond promptly.
              </p>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Reason or special instructions for the Footwear..."
                className="mt-3 min-h-24 w-full rounded-xl border border-[#4b261a]/20 bg-white p-3 text-xs text-[#24130d] outline-none transition-all focus:border-[#a87648] focus:ring-2 focus:ring-[#a87648]/20 resize-none shadow-inner"
              />
              <div className="mt-3 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => { setActiveRequest(null); setReason(""); }}
                  className="px-4 py-2 rounded-lg border border-[#4b261a]/20 bg-white text-xs font-semibold uppercase tracking-wider text-[#24130d] hover:bg-neutral-50 transition-colors cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={submitServiceRequest}
                  className="px-5 py-2 rounded-lg bg-[#24130d] text-white text-xs font-semibold uppercase tracking-wider hover:bg-[#a87648] transition-colors cursor-pointer shadow-sm"
                >
                  Submit Request
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Invoice Collapse */}
      <AnimatePresence>
        {showInvoice && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden bg-[#24130d] text-white border-t border-[#4b261a]/20"
          >
            <div className="p-4 sm:p-6 md:p-8 relative">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-widest text-[var(--gold)]">
                    Official Document
                  </span>
                  <h3 className="font-serif text-xl sm:text-2xl text-white">Tax Invoice / Receipt</h3>
                </div>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="border border-white/20 px-3.5 py-1.5 rounded-lg text-[10px] uppercase tracking-widest hover:bg-white hover:text-[#24130d] transition-colors flex items-center gap-1.5 cursor-pointer font-semibold"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9V2h12v7M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/><path d="M6 14h12v8H6z"/></svg>
                  Print PDF
                </button>
              </div>

              <div className="grid gap-2.5 sm:grid-cols-2 mt-4 text-xs text-white/80">
                <div className="flex justify-between border-b border-white/5 py-1.5">
                  <span className="text-[10px] uppercase tracking-wider text-[var(--gold)]">Order Ref:</span>
                  <span className="font-mono text-white break-all">{order.id}</span>
                </div>
                <div className="flex justify-between border-b border-white/5 py-1.5">
                  <span className="text-[10px] uppercase tracking-wider text-[var(--gold)]">Date:</span>
                  <span className="text-white">{order.date}</span>
                </div>
                <div className="flex justify-between border-b border-white/5 py-1.5">
                  <span className="text-[10px] uppercase tracking-wider text-[var(--gold)]">Customer:</span>
                  <span className="text-white truncate max-w-[180px]">{order.customer}</span>
                </div>
                <div className="flex justify-between border-b border-white/5 py-1.5">
                  <span className="text-[10px] uppercase tracking-wider text-[var(--gold)]">Email:</span>
                  <span className="text-white truncate max-w-[180px] break-all">{order.email}</span>
                </div>
                <div className="flex justify-between border-b border-white/5 py-1.5">
                  <span className="text-[10px] uppercase tracking-wider text-[var(--gold)]">Product:</span>
                  <span className="text-white truncate max-w-[180px]">{order.product}</span>
                </div>
                <div className="flex justify-between border-b border-white/5 py-1.5">
                  <span className="text-[10px] uppercase tracking-wider text-[var(--gold)]">Size:</span>
                  <span className="text-white">{order.size}</span>
                </div>
                <div className="flex justify-between border-b border-white/5 py-1.5">
                  <span className="text-[10px] uppercase tracking-wider text-[var(--gold)]">Payment:</span>
                  <span className="text-white">{order.paymentStatus}</span>
                </div>
                <div className="flex justify-between border-b border-white/5 py-1.5">
                  <span className="text-[10px] uppercase tracking-wider text-[var(--gold)]">Method:</span>
                  <span className="text-white">{order.paymentMethod}</span>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-white/10 flex items-end justify-between">
                <div className="min-w-0 flex-1 pr-4">
                  <span className="text-[10px] uppercase tracking-widest text-[var(--gold)] block mb-0.5">Delivery Address</span>
                  <p className="text-white/70 text-[11px] truncate">{order.deliveryAddress || "Address on file"}</p>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-[10px] uppercase tracking-widest text-[var(--gold)] block mb-0.5">Total Amount</span>
                  <span className="font-serif text-xl sm:text-2xl text-white font-bold">{order.amount}</span>
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

function getColorHex(colorName?: string): string {
  const c = (colorName || "").toLowerCase();
  if (c.includes("black")) return "#171310";
  if (c.includes("brown") || c.includes("chocolate")) return "#6c3d2c";
  if (c.includes("burgundy")) return "#711f2c";
  if (c.includes("olive")) return "#77704c";
  if (c.includes("blush") || c.includes("rose")) return "#d8a9a2";
  if (c.includes("silver") || c.includes("chrome")) return "#b8b8b5";
  if (c.includes("gold") || c.includes("monarch") || c.includes("orange")) return "#d9a15c";
  return "#f2e9d9";
}

function ProductImagePicker({
  images,
  onChange,
  activeImage,
  onSelectImage,
}: {
  images: string[];
  onChange: (images: string[]) => void;
  activeImage?: string;
  onSelectImage?: (image: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const slots = images.slice(0, 5);
  const acceptFiles = async (fileList: FileList | File[]) => {
    const files = Array.from(fileList).filter((file) => file.type.startsWith("image/")).slice(0, 5 - slots.length);
    if (!files.length) return;
    setBusy(true);
    const uploaded = await uploadProductImages(files);
    if (uploaded.length) onChange([...slots, ...uploaded].slice(0, 5));
    setBusy(false);
  };

  const removeImageAt = async (index: number, e: React.MouseEvent | React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const targetUrl = slots[index];
    const nextImages = slots.filter((_, itemIndex) => itemIndex !== index);
    onChange(nextImages);

    if (targetUrl && targetUrl.startsWith("/uploads/products/")) {
      try {
        await fetch(`/api/commerce/product-images?url=${encodeURIComponent(targetUrl)}`, {
          method: "DELETE",
        });
      } catch (err) {
        console.warn("Failed to delete remote image file:", err);
      }
    }
  };

  return (
    <div className="grid gap-3">
      <div
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          void acceptFiles(event.dataTransfer.files);
        }}
        className="grid min-h-[132px] place-items-center border border-dashed border-[var(--gold)]/50 bg-white/50 px-5 py-6 text-center transition-colors hover:bg-white"
      >
        <label className="grid cursor-pointer gap-2 text-xs uppercase tracking-[0.16em] text-[var(--ink)]/55">
          <span className="font-medium text-[var(--ink)]">{busy ? "Uploading images..." : "Select or drag product photos"}</span>
          <span>{slots.length}/5 uploaded (PNG, JPG, WEBP)</span>
          <input
            type="file"
            accept="image/*"
            multiple
            className="sr-only"
            onChange={(event) => {
              if (event.target.files) void acceptFiles(event.target.files);
              event.currentTarget.value = "";
            }}
          />
        </label>
      </div>
      {slots.length > 0 && (
        <div className="grid grid-cols-5 gap-2">
          {slots.map((image, index) => {
            const cleanActive = (activeImage || "").trim().toLowerCase();
            const cleanActiveFile = cleanActive.split("/").pop()?.split("?")[0] || cleanActive;
            const cleanImg = image.trim().toLowerCase();
            const cleanImgFile = cleanImg.split("/").pop()?.split("?")[0] || cleanImg;
            const isActive = cleanActive ? (cleanActive === cleanImg || cleanActiveFile === cleanImgFile) : index === 0;
            return (
              <div
                key={`${image}-${index}`}
                onClick={() => onSelectImage?.(image)}
                title={onSelectImage ? "Click to view & edit this colour variant" : undefined}
                className={`group relative aspect-square overflow-hidden border bg-[var(--champagne)]/30 transition-all ${
                  onSelectImage ? "cursor-pointer" : ""
                } ${
                  isActive
                    ? "border-[var(--gold)] ring-2 ring-[var(--gold)] ring-offset-1 shadow-md scale-102 z-10"
                    : "border-[var(--ink)]/15 hover:border-[var(--gold)]/70"
                }`}
              >
                <img src={image} alt={`Photo ${index + 1}`} className="h-full w-full object-cover" />
                {isActive && (
                  <span className="absolute top-1 left-1 bg-[#24130d] text-[#fffdf8] text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded shadow-sm z-10">
                    Active
                  </span>
                )}
                <button
                  type="button"
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                  }}
                  onClick={(e) => void removeImageAt(index, e)}
                  className="absolute inset-x-0 bottom-0 z-30 bg-red-800 text-white px-2 py-1.5 text-[9px] font-bold uppercase tracking-widest cursor-pointer hover:bg-red-900 transition-colors text-center"
                  style={{ pointerEvents: 'auto' }}
                >
                  ✕ Remove
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

type AdminRecord = { id: string; title: string; meta: string; status: string };

function readAdminRecords(key: string, seed: AdminRecord[]) {
  if (typeof window === "undefined") return seed;
  try {
    const existing = JSON.parse(localStorage.getItem(key) || "") as AdminRecord[];
    const missingSeeds = seed.filter((seedRecord) => !existing.some((record) => record.id === seedRecord.id));
    const merged = missingSeeds.length ? [...existing, ...missingSeeds] : existing;
    if (missingSeeds.length) localStorage.setItem(key, JSON.stringify(merged));
    return merged;
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

const adminSections = ["dashboard", "orders", "inventory", "customers", "drops", "vip", "stories", "seo", "coupons", "reviews", "banners", "cms", "legal", "analytics", "newsletter", "contact", "tickets", "audit"] as const;
type AdminSection = (typeof adminSections)[number];

const adminSectionCopy: Record<AdminSection, { label: string; title: string; copy: string }> = {
  dashboard: { label: "Dashboard", title: "Follicia command center", copy: "Live store health, order flow, stock alerts and customer activity." },
  orders: { label: "Orders", title: "Order operations", copy: "Payment, delivery, tracking, address and concierge status controls." },
  inventory: { label: "Inventory", title: "Product studio", copy: "Catalogue copy, prices, stock, reservations and visible product states." },
  customers: { label: "Customers", title: "Customer ecosystem", copy: "Buyers, tiers, addresses, wishlist intent and account signals." },
  drops: { label: "Drops", title: "Drop calendar", copy: "Launch windows, waitlists, VIP previews and closed collection moments." },
  vip: { label: "VIP Access", title: "Follicia VIP access", copy: "Invite-only customer/product mapping and concierge access rules." },
  stories: { label: "Stories", title: "Product storytelling", copy: "Craft notes, material origin, size guidance and collector copy." },
  seo: { label: "SEO", title: "Search and social preview", copy: "Page titles, descriptions, share cards and discoverability records." },
  coupons: { label: "Coupons", title: "Coupon desk", copy: "Private-drop offers, cart recovery codes and VIP access benefits." },
  reviews: { label: "Reviews", title: "Review moderation", copy: "Publish, pause and review customer feedback before storefront use." },
  banners: { label: "Banners", title: "Homepage banners", copy: "Hero slots, VIP strips and seasonal storefront placements." },
  cms: { label: "CMS", title: "Content pages", copy: "Brand story, policies, care guides and client-facing pages." },
  legal: { label: "Legal", title: "Legal page studio", copy: "Privacy policy, terms and cookie content published to ecommerce footer pages." },
  analytics: { label: "Analytics", title: "Performance room", copy: "Conversion, revenue, cart recovery and wishlist movement." },
  newsletter: { label: "Newsletter", title: "Audience segments", copy: "Private drop audiences and high-intent customer campaigns." },
  contact: { label: "Customer Support", title: "Customer Support & Concierge Desk", copy: "Manage incoming customer inquiries, view full customer emails, respond directly, and track resolution status." },
  tickets: { label: "Raise a Ticket", title: "Raise a Ticket – Customer Tickets", copy: "View and manage tickets raised by customers through the LIA AI concierge chat and contact forms." },
  audit: { label: "Audit", title: "Audit log", copy: "Operational changes kept visible for the client demo." },
};
const productStatuses = ["Live", "Private Preview", "Coming Soon", "Sold Out", "Draft"] as const;

function getAdminSectionFromHash(): AdminSection {
  if (typeof window === "undefined") return "dashboard";
  const raw = window.location.hash.toLowerCase().replace(/^#\/?/, "");
  const clean = raw.startsWith("admin/") ? raw.replace(/^admin\//, "") : raw === "admin" ? "dashboard" : raw;
  return adminSections.includes(clean as AdminSection) ? (clean as AdminSection) : "dashboard";
}

function AdminProductCard({
  product,
  products,
  productStatuses,
  persistProducts,
  publishProduct,
  archiveProduct,
  onDelete,
}: {
  product: CommerceProduct;
  products: CommerceProduct[];
  productStatuses: readonly string[];
  persistProducts: (next: CommerceProduct[]) => void;
  publishProduct: (product: CommerceProduct) => void;
  archiveProduct: (product: CommerceProduct) => void;
  onDelete?: (product: CommerceProduct) => void;
}) {
  const variants = useMemo(() => getProductVariants(product), [product]);
  const [selectedVariantIdx, setSelectedVariantIdx] = useState<number>(0);
  const [activeImage, setActiveImage] = useState<string>(() => productPrimaryImage(product));

  useEffect(() => {
    const images = productImages(product);
    if (!images.includes(activeImage)) {
      setActiveImage(productPrimaryImage(product));
    }
  }, [product]);

  const safeVariantIdx = selectedVariantIdx < variants.length ? selectedVariantIdx : 0;
  const currentVariant = variants[safeVariantIdx] || variants[0] || getActiveVariant(product, activeImage);

  const handleSelectVariant = (vIdx: number, v: ProductVariant) => {
    setSelectedVariantIdx(vIdx);
    if (v.image) {
      setActiveImage(v.image);
    }
  };

  const updateVariantField = (field: "heroColour" | "colourCode" | "colourVariantSku", val: string) => {
    const updatedVariants = variants.map((v, idx) => {
      if (idx === safeVariantIdx) {
        const nextV = { ...v, [field]: val };
        const code = field === "colourCode" ? val : (nextV.colourCode || getHeroColorCode(nextV.heroColour));
        if (field === "heroColour" || field === "colourCode") {
          nextV.colourVariantSku = `${(product.designId || product.id).toUpperCase()}-${code}`;
          nextV.fullSkus = computeAllFullSkus(product.designId || product.id, code, product.availableSizes);
        }
        return nextV;
      }
      return v;
    });

    const curr = updatedVariants[safeVariantIdx] || updatedVariants[0];
    const updatedProduct: CommerceProduct = {
      ...product,
      variants: updatedVariants,
    };

    if (safeVariantIdx === 0) {
      if (field === "heroColour") {
        updatedProduct.heroColour = val;
        updatedProduct.tone = val;
        updatedProduct.fullSkus = curr.fullSkus;
      } else if (field === "colourCode") {
        updatedProduct.colourCode = val;
      } else if (field === "colourVariantSku") {
        updatedProduct.colourVariantSku = val;
      }
    }

    persistProducts(products.map((item) => (item.id === product.id ? updatedProduct : item)));
  };

  return (
    <article key={product.id} className="flex flex-col sm:flex-row gap-5 border border-[#4b261a15] bg-white p-4 sm:p-5 rounded-xl shadow-2xs">
      {/* Product Thumbnail Column */}
      <div className="w-full sm:w-36 shrink-0 flex flex-col items-center sm:items-start">
        <div className="relative w-32 h-40 sm:w-36 sm:h-44 rounded-lg overflow-hidden border border-[#4b261a15] bg-white flex items-center justify-center p-2 shadow-2xs">
          <img
            src={activeImage || productPrimaryImage(product)}
            alt={product.title}
            onClick={() => {
              if (variants.length > 1) {
                const currIdx = variants.findIndex((v) => v.heroColour === currentVariant.heroColour);
                const nextIdx = (currIdx + 1) % variants.length;
                setActiveImage(variants[nextIdx].image);
              }
            }}
            className={`max-h-full max-w-full object-contain brightness-[1.15] contrast-[1.05] saturate-[1.05] transition-transform ${
              variants.length > 1 ? "cursor-pointer hover:scale-105" : ""
            }`}
            style={{ backgroundColor: 'white' }}
            title={variants.length > 1 ? "Click to switch variant photo" : undefined}
          />
        </div>
        {currentVariant.heroColour && (
          <div className="mt-2 text-center w-full">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#FAF8F5] border border-[#4b261a20] text-[10px] font-semibold text-[#24130d]">
              <span className="h-2 w-2 rounded-full border border-black/10 shrink-0" style={{ backgroundColor: getColorHex(currentVariant.heroColour) }} />
              {currentVariant.heroColour} {currentVariant.colourCode ? `(${currentVariant.colourCode})` : ""}
            </span>
          </div>
        )}
      </div>

      {/* Editable Fields Column */}
      <div className="flex-1 grid gap-3 sm:grid-cols-2 md:grid-cols-3">
        {variants.length > 1 && (
          <div className="md:col-span-3 flex flex-wrap items-center gap-2 pb-2 border-b border-[#4b261a10]">
            <span className="text-[10px] uppercase font-bold tracking-widest text-[#4b261a70]">
              Active Colour Variant ({variants.length}):
            </span>
            <div className="flex flex-wrap gap-1.5">
              {variants.map((v, vIdx) => {
                const isSel = vIdx === safeVariantIdx;
                return (
                  <button
                    key={`${v.colourVariantSku || v.heroColour}-${vIdx}`}
                    type="button"
                    onClick={() => handleSelectVariant(vIdx, v)}
                    className={`px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer ${
                      isSel
                        ? "bg-[#24130d] text-[#fffdf8] shadow-sm ring-1 ring-[#24130d]"
                        : "bg-white border border-[#4b261a20] text-[#4b261a90] hover:border-[#24130d] hover:text-[#24130d]"
                    }`}
                  >
                    <span
                      className="h-2.5 w-2.5 rounded-full border border-black/10 shrink-0"
                      style={{ backgroundColor: getColorHex(v.heroColour) }}
                    />
                    <span>{v.colourCode ? `${v.colourCode} - ` : ""}{v.heroColour}</span>
                    {isSel && <span className="text-[9px] text-[var(--gold)]">✓</span>}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <AdminField label="Design ID" value={product.designId || product.id.toUpperCase()} onChange={(value) => persistProducts(products.map((item) => item.id === product.id ? { ...item, designId: value } : item))} />
        <AdminField label="Title / Product Name" value={product.title} onChange={(value) => persistProducts(products.map((item) => item.id === product.id ? { ...item, title: value } : item))} />
        <AdminField label="Collection" value={product.collection || product.edition} onChange={(value) => persistProducts(products.map((item) => item.id === product.id ? { ...item, collection: value, edition: `${value} Collection` } : item))} />
        <AdminField label="Category" value={product.category || "Heel"} onChange={(value) => persistProducts(products.map((item) => item.id === product.id ? { ...item, category: value } : item))} />
        <AdminField label="Silhouette / Toe" value={product.silhouette || ""} onChange={(value) => persistProducts(products.map((item) => item.id === product.id ? { ...item, silhouette: value } : item))} />
        <AdminField label="Material" value={product.material || product.tone} onChange={(value) => persistProducts(products.map((item) => item.id === product.id ? { ...item, material: value } : item))} />

        <AdminField label="Hero Colour" value={currentVariant.heroColour} onChange={(value) => updateVariantField("heroColour", value)} />
        <AdminField label="Colour Code" value={currentVariant.colourCode || ""} onChange={(value) => updateVariantField("colourCode", value)} />
        <AdminField label="Variant SKU" value={currentVariant.colourVariantSku || ""} onChange={(value) => updateVariantField("colourVariantSku", value)} />

        <AdminField label="Price" value={product.price} onChange={(value) => persistProducts(products.map((item) => item.id === product.id ? { ...item, price: value } : item))} />
        <label className="grid gap-2 text-[10px] uppercase tracking-[0.2em] text-[var(--ink)]/50">
          Status
          <select value={product.status} onChange={(event) => persistProducts(products.map((item) => item.id === product.id ? { ...item, status: event.target.value } : item))} className="border border-[var(--ink)]/10 bg-white/50 px-4 py-3 text-sm normal-case tracking-normal text-[var(--ink)] outline-none focus:border-[var(--gold)]">
            {productStatuses.map((status) => <option key={status}>{status}</option>)}
          </select>
        </label>
        <AdminField label="Upcoming Drop Date / Expected (e.g. 25 Oct 2026)" value={product.dropDate || ""} onChange={(value) => persistProducts(products.map((item) => item.id === product.id ? { ...item, dropDate: value } : item))} />
        <label className="flex items-center gap-2.5 text-xs text-[#24130d] font-medium cursor-pointer pt-6">
          <input
            type="checkbox"
            checked={!!product.isNewArrival}
            onChange={(e) => persistProducts(products.map((item) => item.id === product.id ? { ...item, isNewArrival: e.target.checked } : item))}
            className="w-4 h-4 accent-[#4b261a] rounded"
          />
          <span>Featured in New Arrivals Page</span>
        </label>

        {/* Available Sizes (EU Sizing) */}
        <div className="md:col-span-3 bg-[#FAF8F5] border border-[#4b261a15] p-3.5 rounded-lg">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase font-bold tracking-widest text-[#4b261a]">
                Available Sizes (EU Sizing)
              </span>
              <span className="text-[9px] text-[#4b261a70]">
                Click sizes to toggle active inventory
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                const nextSizes = [...DEFAULT_PRODUCT_SIZES];
                const updatedProduct: CommerceProduct = {
                  ...product,
                  availableSizes: nextSizes,
                  sizeRange: "38–41",
                  fullSkus: computeAllFullSkus(product.designId || product.id, currentVariant.heroColour, nextSizes),
                };
                persistProducts(products.map((item) => (item.id === product.id ? updatedProduct : item)));
              }}
              className="text-[10px] uppercase tracking-wider text-[var(--gold)] font-semibold hover:underline cursor-pointer"
            >
              Reset to EU 38–41 (Default)
            </button>
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            {ALL_AVAILABLE_EU_SIZES.map((size) => {
              const currentSizes = product.availableSizes?.length ? product.availableSizes : DEFAULT_PRODUCT_SIZES;
              const isSelected = currentSizes.includes(size);
              return (
                <button
                  key={size}
                  type="button"
                  onClick={() => {
                    let nextSizes: string[];
                    if (isSelected) {
                      if (currentSizes.length <= 1) {
                        alert("At least one size must remain active for this product.");
                        return;
                      }
                      nextSizes = currentSizes.filter((s) => s !== size);
                    } else {
                      nextSizes = [...currentSizes, size].sort((a, b) => {
                        const numA = parseInt(a.replace(/\D/g, ""), 10) || 0;
                        const numB = parseInt(b.replace(/\D/g, ""), 10) || 0;
                        return numA - numB;
                      });
                    }
                    const numOnly = nextSizes.map((s) => s.replace(/\D/g, "")).filter(Boolean);
                    const newRange = numOnly.length > 1 ? `${numOnly[0]}–${numOnly[numOnly.length - 1]}` : numOnly[0] || "38–41";
                    const updatedProduct: CommerceProduct = {
                      ...product,
                      availableSizes: nextSizes,
                      sizeRange: newRange,
                      fullSkus: computeAllFullSkus(product.designId || product.id, currentVariant.heroColour, nextSizes),
                    };
                    persistProducts(products.map((item) => (item.id === product.id ? updatedProduct : item)));
                  }}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold tracking-wider uppercase transition-all flex items-center gap-1.5 cursor-pointer ${
                    isSelected
                      ? "bg-[#24130d] text-[#fffdf8] shadow-xs ring-1 ring-[#24130d]"
                      : "bg-white border border-[#4b261a20] text-[#4b261a80] hover:border-[#24130d] hover:text-[#24130d]"
                  }`}
                >
                  <span>{size}</span>
                  {isSelected ? <span className="text-[10px] text-[var(--gold)]">✓</span> : <span className="text-[10px] opacity-40">+</span>}
                </button>
              );
            })}
          </div>
        </div>

        {/* Dynamic Full SKUs for each size */}
        <div className="md:col-span-3 bg-[#FAF8F5] border border-[#4b261a15] p-3 rounded-lg">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
            <p className="text-[10px] uppercase font-bold tracking-widest text-[#4b261a70]">
              DYNAMIC FULL SKUS (FORMULA: &#123;DESIGN ID&#125;-&#123;COLOUR_CODE&#125;-&#123;SIZE&#125;)
            </p>
            <span className="text-[9px] uppercase tracking-wider text-[var(--gold)] font-semibold">
              SHOWING: {(currentVariant.heroColour || "WARM IVORY").toUpperCase()}
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {(product.availableSizes?.length ? product.availableSizes : DEFAULT_PRODUCT_SIZES).map((szLabel) => {
              const sz = szLabel.replace(/\D/g, "");
              const dynSku = currentVariant.fullSkus?.[sz] || computeFullSku(product.designId || product.id, currentVariant.colourCode || currentVariant.heroColour, sz);
              return (
                <span key={sz} className="inline-flex items-center gap-1.5 font-mono text-xs bg-white border border-[#4b261a20] px-2.5 py-1 rounded shadow-xs">
                  <strong className="text-[var(--gold)]">EU{sz}:</strong> {dynSku}
                </span>
              );
            })}
          </div>
        </div>

        <AdminField label="Available Stock" value={product.available} onChange={(value) => persistProducts(products.map((item) => item.id === product.id ? { ...item, available: Number(value) || 0 } : item))} />
        <div className="md:col-span-3">
          <ProductImagePicker
            images={productImages(product)}
            activeImage={activeImage}
            onSelectImage={(img) => setActiveImage(img)}
            onChange={(images) => persistProducts(products.map((item) => item.id === product.id ? { ...item, image: images[0] || "", images } : item))}
          />
        </div>
        <div className="md:col-span-3 flex flex-wrap items-center gap-3 pt-2">
          <button
            type="button"
            onClick={() => product.status === "Draft" ? publishProduct(product) : archiveProduct(product)}
            className={`flex-1 px-4 py-2.5 text-xs uppercase tracking-[0.16em] font-semibold cursor-pointer transition-colors border ${
              product.status === "Draft"
                ? "bg-[#24130d] text-[#fffdf8] hover:bg-[#351c13] border-[#24130d]"
                : "bg-white text-[#24130d] hover:bg-[#FAF8F5] border-[#4b261a20]"
            }`}
          >
            {product.status === "Draft" ? "✓ Publish to Storefront" : "Move to Draft"}
          </button>
          {onDelete && (
            <button
              type="button"
              onClick={() => onDelete(product)}
              className="flex items-center gap-1.5 px-4 py-2.5 text-xs uppercase tracking-[0.16em] font-semibold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 hover:border-red-300 transition-colors cursor-pointer"
            >
              <Trash2 size={13} />
              <span>Delete</span>
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

export function AdminPanel({ onLogout }: { onLogout?: () => void }) {
  const [activeSection, setActiveSection] = useState<AdminSection>(getAdminSectionFromHash);
  const [products, setProducts] = useState<CommerceProduct[]>(() => getProducts());
  const [orders, setOrders] = useState<CommerceOrder[]>(() => getOrders());
  const [customers, setCustomers] = useState<CustomerProfile[]>(() => getCustomers());
  const [launchPrivilege, setLaunchPrivilege] = useState<LaunchPrivilegeState>(() => getLaunchPrivilegeState());
  const [gatewaySettings, setGatewaySettings] = useState<GatewaySettings>(() => getGatewaySettings());
  const [rzpKeyIdInput, setRzpKeyIdInput] = useState("");
  const [rzpKeySecretInput, setRzpKeySecretInput] = useState("");
  const [rzpStatus, setRzpStatus] = useState<{ isConfigured: boolean; keyId: string; mode: string; maskedSecret?: string } | null>(null);
  const [rzpSaving, setRzpSaving] = useState(false);
  const [rzpMsg, setRzpMsg] = useState("");
  const [drops, setDrops] = useState<AdminRecord[]>(() => readAdminRecords("follocia_admin_drops", [
    { id: "drop-signature-iv", title: "Signature IV Preview", meta: "VIP preview opens Friday, public release Monday", status: "VIP Preview" },
    { id: "drop-restock-alert", title: "Size 38 Restock Watch", meta: "Notify wishlist clients before public stock update", status: "Scheduled" },
    { id: "drop-archive", title: "Archive Access Weekend", meta: "Private appointments for past edition collectors", status: "Planning" },
  ]));
  const [vipAccess, setVipAccess] = useState<AdminRecord[]>(() => readAdminRecords("follocia_admin_vip", [
    { id: "vip-private-preview", title: "Private Preview Access", meta: "Follicia Private and VIP customers see preview pieces first", status: "Active" },
    { id: "vip-concierge-hold", title: "Concierge 24h Hold", meta: "VIP customers can reserve one size for concierge review", status: "Active" },
    { id: "vip-early-drop", title: "Early Drop Link", meta: "Share secret drop links with selected customers", status: "Ready" },
  ]));
  const [storyBlocks, setStoryBlocks] = useState<AdminRecord[]>(() => readAdminRecords("follocia_admin_stories", [
    { id: "story-craft", title: "Craft Note", meta: "Hand-lasted construction, numbered editions and artisanal finishing", status: "Published" },
    { id: "story-material", title: "Material Origin", meta: "Italian leather, satin and patent finishes selected per drop", status: "Published" },
    { id: "story-size", title: "Size Confidence", meta: "Fits true to size; concierge recommends half-size review for narrow feet", status: "Published" },
    { id: "story-care", title: "Care Promise", meta: "Care kit, restoration guidance and post-purchase check-in", status: "Published" },
  ]));
  const [seoRecords, setSeoRecords] = useState<AdminRecord[]>(() => readAdminRecords("follocia_admin_seo", [
    { id: "seo-home", title: "Follicia - Handcrafted Luxury Footwear", meta: "Limited-edition handcrafted footwear with concierge reservations.", status: "Live" },
    { id: "seo-shop", title: "Shop Limited Follicia Editions", meta: "Browse live stock, private previews and numbered Follicia pieces.", status: "Live" },
    { id: "seo-product", title: "Follicia Product Detail", meta: "Product gallery, sizing confidence, reservations and craft story.", status: "Live" },
  ]));
  const [coupons, setCoupons] = useState<AdminRecord[]>(() => readAdminRecords("follocia_admin_coupons", [
    { id: "coupon-1", title: "FOLLICIA10", meta: "10% off - Live editions", status: "Active" },
    { id: "coupon-2", title: "FOLLICIACARE", meta: "Free care kit - Delivered orders", status: "Active" },
    { id: "coupon-3", title: "VIPFIRST", meta: "Priority fitting - Private members", status: "Paused" },
  ]));
  const [reviews, setReviews] = useState<AdminRecord[]>(() => readAdminRecords("follocia_admin_reviews", [
    { id: "review-1", title: "5.0 / 5", meta: "Fit was perfect, packaging felt premium", status: "Published" },
    { id: "review-2", title: "4.0 / 5", meta: "Concierge helped with size exchange", status: "Published" },
    { id: "review-3", title: "3.0 / 5", meta: "Waiting for dispatch update", status: "Review" },
  ]));
  const [banners, setBanners] = useState<AdminRecord[]>(() => readAdminRecords("follocia_admin_banners", [
    { id: "banner-home-hero", title: "Top Announcement Bar", meta: "Complimentary shipping across India on orders above Rs. 9,999", status: "Live" },
    { id: "banner-shop-strip", title: "Shop offer strip", meta: "Shop listing top strip", status: "Live" },
    { id: "banner-collection", title: "Collection banner", meta: "Collection landing highlight", status: "Live" },
    { id: "banner-product-note", title: "Product detail note", meta: "Product detail availability message", status: "Live" },
    { id: "banner-checkout-trust", title: "Checkout trust banner", meta: "Checkout assurance copy", status: "Live" },
  ]));
  const [cmsPages, setCmsPages] = useState<AdminRecord[]>(() => readAdminRecords("follocia_admin_cms", [
    { id: "cms-home", title: "Home page", meta: "Hero, featured products and brand story", status: "Published" },
    { id: "cms-shop", title: "Shop page", meta: "Catalogue listing, filters and product cards", status: "Published" },
    { id: "cms-collections", title: "Collections page", meta: "Featured edits and seasonal drops", status: "Published" },
    { id: "cms-product-detail", title: "Product detail page", meta: "Gallery, sizing, price and reservation copy", status: "Published" },
    { id: "cms-checkout", title: "Checkout page", meta: "Payment, shipping and confirmation content", status: "Published" },
    { id: "cms-account", title: "Account page", meta: "Profile, orders, wishlist and addresses", status: "Published" },
    { id: "cms-contact", title: "Contact page", meta: "Concierge, sizing and service enquiries", status: "Published" },
    { id: "cms-care-guide", title: "Care guide", meta: "Post-purchase care", status: "Published" },
    { id: "cms-return-policy", title: "Return policy", meta: "Customer support", status: "Draft" },
  ]));
  const [legalPages, setLegalPages] = useState<AdminRecord[]>(() => readAdminRecords("follocia_admin_legal", defaultLegalRecords));
  const [contactQueries, setContactQueries] = useState<AdminRecord[]>(() => readAdminRecords("follocia_admin_contact", [
    { id: "contact-1", title: "Sizing query from Mumbai", meta: "Customer asked for 38/39 fitting help", status: "Open" },
    { id: "contact-2", title: "Delivery request from Delhi", meta: "White-glove delivery timing", status: "Open" },
  ]));
  const [tickets, setTickets] = useState<AdminRecord[]>(() => readAdminRecords("follocia_admin_tickets", []));
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
    collection: "Aura",
    category: "Heel",
    silhouette: "Pointed Toe",
    material: "Vegan Leather",
    heroColour: "Warm Ivory",
    edition: "Aura Collection",
    tone: "Warm Ivory",
    price: "Rs. 4,990",
    image: getProducts()[0]?.image || "",
    images: [] as string[],
    availableSizes: [...DEFAULT_PRODUCT_SIZES] as string[],
    status: "Live",
    produced: "100",
    reserved: "0",
    available: "100",
    isNewArrival: false,
    dropDate: "",
  });
  const [productSearch, setProductSearch] = useState("");
  const [collectionFilter, setCollectionFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [showAddForm, setShowAddForm] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  const [draftCustomer, setDraftCustomer] = useState({
    name: "",
    email: "",
    phone: "",
    tier: "Follicia Private",
  });

  const metrics = useMemo(() => [
    { label: "Total orders", value: String(orders.length).padStart(2, "0"), delta: "Backend synced" },
    { label: "Reserved value", value: `Rs. ${orders.reduce((sum, order) => sum + parsePriceNumber(order.amount), 0).toLocaleString("en-IN")}`, delta: "Live order value" },
    { label: "VIP customers", value: String(customers.length).padStart(2, "0"), delta: "Customer ecosystem" },
    {
      label: "Launch 35% Orders",
      value: `${launchPrivilege.completedUsers.length}/${launchPrivilege.max35Users}`,
      delta: launchPrivilege.is35Retired || launchPrivilege.completedUsers.length >= launchPrivilege.max35Users
        ? "10/10 Reached (35% Closed)"
        : `${Math.max(0, launchPrivilege.max35Users - launchPrivilege.completedUsers.length)} spots left (35% Active)`,
      tone: launchPrivilege.is35Retired || launchPrivilege.completedUsers.length >= launchPrivilege.max35Users
        ? "warn"
        : "emerald",
    },
    { label: "Pairs remaining", value: String(products.reduce((sum, product) => sum + product.available, 0)), delta: "Across catalogue", tone: "warn" },
  ], [customers.length, orders, products, launchPrivilege]);

  const persistProducts = (next: CommerceProduct[]) => {
    setProducts(next);
    saveProducts(next);
    next.forEach((product) => void saveProductRemote(product));
  };
  const updateDraftProduct = (field: Exclude<keyof typeof draftProduct, "images" | "isNewArrival" | "availableSizes">, value: string) => setDraftProduct((current) => ({ ...current, [field]: value }));
  const updateDraftImages = (images: string[]) => setDraftProduct((current) => ({ ...current, image: images[0] || "", images }));
  const toggleDraftSize = (size: string) => {
    setDraftProduct((curr) => {
      const isSel = curr.availableSizes.includes(size);
      if (isSel) {
        if (curr.availableSizes.length <= 1) {
          alert("At least one size must remain active for the product.");
          return curr;
        }
        return { ...curr, availableSizes: curr.availableSizes.filter((s) => s !== size) };
      }
      const next = [...curr.availableSizes, size].sort((a, b) => {
        const numA = parseInt(a.replace(/\D/g, ""), 10) || 0;
        const numB = parseInt(b.replace(/\D/g, ""), 10) || 0;
        return numA - numB;
      });
      return { ...curr, availableSizes: next };
    });
  };
  const resetDraftSizes = () => {
    setDraftProduct((curr) => ({ ...curr, availableSizes: [...DEFAULT_PRODUCT_SIZES] }));
  };
  const createProduct = () => {
    if (!draftProduct.title.trim()) {
      alert("Please enter a product title");
      return;
    }
    const images = draftProduct.images.length ? draftProduct.images : [draftProduct.image.trim() || products[0]?.image || ""].filter(Boolean);
    const heroCol = draftProduct.heroColour.trim() || draftProduct.tone.trim() || "Warm Ivory";
    const collectionName = draftProduct.collection.trim() || "Aura";
    const dId = `FL-${Date.now().toString().slice(-4)}`;
    const cleanPrice = draftProduct.price.trim().startsWith("Rs.") ? draftProduct.price.trim() : `Rs. ${draftProduct.price.trim()}`;
    const chosenSizes = draftProduct.availableSizes.length ? draftProduct.availableSizes : DEFAULT_PRODUCT_SIZES;
    const numOnly = chosenSizes.map((s) => s.replace(/\D/g, "")).filter(Boolean);
    const calculatedRange = numOnly.length > 1 ? `${numOnly[0]}–${numOnly[numOnly.length - 1]}` : numOnly[0] || "38–41";
    const nextProduct: CommerceProduct = {
      id: `fl-${Date.now()}`,
      designId: dId,
      title: draftProduct.title.trim(),
      edition: `${collectionName} Collection`,
      collection: collectionName,
      category: draftProduct.category.trim() || "Heel",
      silhouette: draftProduct.silhouette.trim() || "Pointed Toe",
      material: draftProduct.material.trim() || "Vegan Leather",
      tone: heroCol,
      heroColour: heroCol,
      colourName: heroCol,
      colourCode: getHeroColorCode(heroCol),
      price: cleanPrice,
      image: images[0] || "",
      images,
      availableSizes: chosenSizes,
      sizeRange: calculatedRange,
      fullSkus: computeAllFullSkus(dId, heroCol, chosenSizes),
      status: draftProduct.status.trim() || "Live",
      produced: Number(draftProduct.produced) || 100,
      reserved: Number(draftProduct.reserved) || 0,
      available: Number(draftProduct.available) || 100,
      isNewArrival: draftProduct.isNewArrival,
      dropDate: draftProduct.dropDate.trim() || undefined,
    };
    persistProducts([nextProduct, ...products]);
    appendAdminRecord("audit", "Product created", `${nextProduct.title} added to catalogue (${nextProduct.status})`, "Logged");
    setDraftProduct({
      title: "",
      collection: "Aura",
      category: "Heel",
      silhouette: "Pointed Toe",
      material: "Vegan Leather",
      heroColour: "Warm Ivory",
      edition: "Aura Collection",
      tone: "Warm Ivory",
      price: "Rs. 4,990",
      image: "",
      images: [],
      availableSizes: [...DEFAULT_PRODUCT_SIZES],
      status: "Live",
      produced: "100",
      reserved: "0",
      available: "100",
      isNewArrival: false,
      dropDate: "",
    });
    setShowAddForm(false);
    alert(`Success! "${nextProduct.title}" has been published and added to your storefront.`);
  };
  const deleteProduct = (product: CommerceProduct) => {
    if (typeof window !== "undefined" && !window.confirm(`Are you sure you want to permanently delete "${product.title}"?`)) {
      return;
    }
    const next = products.filter((item) => item.id !== product.id);
    persistProducts(next);
    void deleteProductRemote(product.id);
    appendAdminRecord("audit", "Product deleted", `${product.title} permanently deleted`, "Logged");
  };
  const archiveProduct = (product: CommerceProduct) => {
    persistProducts(products.map((item) => item.id === product.id ? { ...item, status: "Draft", available: 0 } : item));
    appendAdminRecord("audit", "Product removed from storefront", `${product.title} moved to Draft`, "Logged");
  };
  const publishProduct = (product: CommerceProduct) => {
    persistProducts(products.map((item) => item.id === product.id ? { ...item, status: "Live", available: item.available > 0 ? item.available : Math.max(item.produced - item.reserved, 1) } : item));
    appendAdminRecord("audit", "Product published", `${product.title} is visible on storefront`, "Logged");
  };
  const persistOrders = (next: CommerceOrder[]) => {
    setOrders(next);
    saveOrders(next);
    next.forEach((order) => void saveOrderRemote(order));
  };
  const persistCustomers = (next: CustomerProfile[]) => {
    setCustomers(next);
    saveCustomers(next);
  };
  const updateCustomer = (customer: CustomerProfile, patch: Partial<CustomerProfile>) => {
    const nextName = (patch.name ?? customer.name).trim();
    const [firstName, ...rest] = nextName.split(" ");
    const nextCustomer = {
      ...customer,
      ...patch,
      name: nextName,
      firstName: patch.name === undefined ? customer.firstName : firstName || nextName,
      lastName: patch.name === undefined ? customer.lastName : rest.join(" "),
    };
    persistCustomers(customers.map((item) => item.id === customer.id ? nextCustomer : item));
    void saveCustomerRemote(nextCustomer);
  };
  const createCustomer = () => {
    if (!draftCustomer.name.trim() || !draftCustomer.email.trim()) return;
    const [firstName, ...rest] = draftCustomer.name.trim().split(" ");
    const nextCustomer: CustomerProfile = {
      id: `customer-${Date.now()}`,
      name: draftCustomer.name.trim(),
      email: draftCustomer.email.trim(),
      firstName: firstName || draftCustomer.name.trim(),
      lastName: rest.join(" "),
      phone: draftCustomer.phone.trim(),
      tier: draftCustomer.tier.trim() || "Follicia Private",
      memberSince: "MMXXVI",
      addresses: [],
      wishlist: [],
      subscriptions: [],
    };
    persistCustomers([nextCustomer, ...customers]);
    void saveCustomerRemote(nextCustomer);
    setDraftCustomer({ name: "", email: "", phone: "", tier: "Follicia Private" });
  };
  const deleteCustomer = (customer: CustomerProfile) => {
    persistCustomers(customers.filter((item) => item.id !== customer.id));
    void deleteCustomerRemote(customer.id);
  };
  const openSection = (section: AdminSection) => {
    setActiveSection(section);
    if (typeof window !== "undefined") {
      window.location.hash = section === "dashboard" ? "/admin" : `/admin/${section}`;
    }
  };

  useEffect(() => {
    const sync = () => {
      setProducts(getProducts());
      setOrders(getOrders());
      setCustomers(getCustomers());
      setLaunchPrivilege(getLaunchPrivilegeState());
      setGatewaySettings(getGatewaySettings());
    };
    void syncCommerceFromBackend();
    void syncAdminRecordsFromBackend({ drops: setDrops, vip: setVipAccess, stories: setStoryBlocks, seo: setSeoRecords, coupons: setCoupons, reviews: setReviews, banners: setBanners, cms: setCmsPages, legal: setLegalPages, newsletter: setNewsletter, contact: setContactQueries, tickets: setTickets, audit: setAudit });
    void fetchRzpConfig();
    window.addEventListener(COMMERCE_EVENT, sync);
    const onHashChange = () => setActiveSection(getAdminSectionFromHash());
    window.addEventListener("hashchange", onHashChange);
    return () => {
      window.removeEventListener(COMMERCE_EVENT, sync);
      window.removeEventListener("hashchange", onHashChange);
    };
  }, []);

  const fetchRzpConfig = async () => {
    try {
      const res = await fetch("/api/commerce/razorpay/config");
      if (res.ok) {
        const data = await res.json();
        setRzpStatus(data);
        if (data.keyId) setRzpKeyIdInput(data.keyId);
      }
    } catch {}
  };

  const handleSaveRzp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!rzpKeyIdInput.trim() || !rzpKeySecretInput.trim()) {
      setRzpMsg("⚠️ Please enter both Razorpay Key ID and Key Secret.");
      return;
    }
    setRzpSaving(true);
    setRzpMsg("");
    try {
      const res = await fetch("/api/commerce/razorpay/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyId: rzpKeyIdInput.trim(), keySecret: rzpKeySecretInput.trim() }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setRzpMsg("✓ Razorpay credentials updated and active on server!");
        setRzpKeySecretInput("");
        await fetchRzpConfig();
      } else {
        setRzpMsg("⚠️ " + (data.message || "Failed to save Razorpay settings."));
      }
    } catch {
      setRzpMsg("⚠️ Network error while saving Razorpay settings.");
    } finally {
      setRzpSaving(false);
    }
  };

  const is10GoalCompleted = launchPrivilege.is35Retired || launchPrivilege.completedUsers.length >= launchPrivilege.max35Users;

  const dashboardPanel = (
    <div className="grid gap-4">
      {/* 🔔 PROMINENT MILESTONE NOTIFICATION BANNER */}
      {is10GoalCompleted && (
        <div className="rounded-2xl border-2 border-amber-500 bg-gradient-to-r from-amber-50 via-amber-100/60 to-amber-50 p-5 sm:p-6 shadow-md flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center text-2xl font-bold shadow-sm shrink-0">
            🔔
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-display font-bold text-lg sm:text-xl text-amber-950">
                MILESTONE ALERT: First 10 Launch Clients Complete!
              </h3>
              <span className="text-[11px] font-extrabold uppercase tracking-widest bg-amber-200 text-amber-900 border border-amber-300 px-3 py-1 rounded-full">
                35% Automatically Stopped · 15% Welcome Active
              </span>
            </div>
            <p className="text-xs sm:text-sm text-amber-900/90 mt-1.5 leading-relaxed">
              Target achieved! All 10 initial early-bird customer orders have been completed. As designed, the 35% launch discount (<code>LAUNCH35</code>) has been automatically retired. All new and subsequent customers are now seamlessly receiving 15% off (<code>WELCOME15</code>).
            </p>
          </div>
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid gap-4 md:grid-cols-5">
        {metrics.map((metric) => (
          <article key={metric.label} className="border border-[var(--ink)]/10 bg-white p-4">
            <p className="eyebrow text-[var(--ink)]/45">{metric.label}</p>
            <strong className="mt-3 block font-display text-3xl">{metric.value}</strong>
            <small className={metric.tone === "warn" ? "text-amber-800 font-semibold" : "text-emerald-800"}>
              {metric.delta}
            </small>
          </article>
        ))}
      </div>

      {/* Launch Privilege Milestone Tracker Card */}
      <AdminCard id="launch-milestone" title="Early-Bird Launch Campaign (First 10 Orders: 35% → 15%)">
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl border border-[#4b261a]/15 bg-[#FAF8F5]">
            <div>
              <div className="flex items-center gap-2">
                <span className={`w-3 h-3 rounded-full ${is10GoalCompleted ? "bg-amber-500" : "bg-emerald-500 animate-pulse"}`} />
                <h4 className="font-bold text-sm text-[#24130d]">
                  Campaign Status: {is10GoalCompleted ? "Goal Completed (35% Retired)" : "Active (First 10 Orders in Progress)"}
                </h4>
              </div>
              <p className="text-xs text-[#4b261a]/70 mt-1">
                Rule: The first 10 unique clients to place an order receive 35% off (<code>LAUNCH35</code>). Once 10 clients complete their orders, 35% automatically shuts down and switches to 15% off (<code>WELCOME15</code>) for subsequent clients.
              </p>
            </div>
            <div className="text-right">
              <span className="font-mono text-2xl font-bold text-[#24130d]">
                {launchPrivilege.completedUsers.length} / {launchPrivilege.max35Users}
              </span>
              <span className="block text-[11px] uppercase tracking-wider text-[#4b261a]/60">
                Orders Claimed
              </span>
            </div>
          </div>

          {/* Progress bar */}
          <div className="w-full bg-[#4b261a]/10 h-3 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-500 rounded-full ${
                is10GoalCompleted ? "bg-amber-500" : "bg-emerald-600"
              }`}
              style={{ width: `${Math.min(100, (launchPrivilege.completedUsers.length / launchPrivilege.max35Users) * 100)}%` }}
            />
          </div>

          {/* Patrons list */}
          <div>
            <h5 className="font-bold text-xs uppercase tracking-wider text-[#4b261a]/70 mb-2">
              Claimed Launch Patrons ({launchPrivilege.completedUsers.length} of {launchPrivilege.max35Users})
            </h5>
            {launchPrivilege.completedUsers.length === 0 ? (
              <p className="text-xs text-[#4b261a]/60 italic p-3 border border-dashed border-[#4b261a]/20 rounded-lg text-center">
                No launch orders placed yet. As customers place orders with the launch code, their details will appear here.
              </p>
            ) : (
              <div className="border border-[#4b261a]/15 rounded-xl overflow-hidden text-xs">
                <div className="grid grid-cols-4 bg-[#24130d] text-white px-3 py-2 font-bold uppercase text-[10px] tracking-wider">
                  <span># & Patron Name</span>
                  <span>Client Email</span>
                  <span>Order ID</span>
                  <span>Timestamp</span>
                </div>
                <div className="divide-y divide-[#4b261a]/10 bg-white">
                  {launchPrivilege.completedUsers.map((patron, idx) => (
                    <div key={patron.email + idx} className="grid grid-cols-4 px-3 py-2.5 items-center">
                      <span className="font-semibold text-[#24130d] flex items-center gap-1.5">
                        <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-900 flex items-center justify-center text-[10px] font-bold">
                          {idx + 1}
                        </span>
                        {patron.name}
                      </span>
                      <span className="font-mono text-[#4b261a]/80 truncate">{patron.email}</span>
                      <span className="font-mono text-[#24130d] font-medium">{patron.orderId}</span>
                      <span className="text-[#4b261a]/60">{new Date(patron.orderedAt).toLocaleString("en-IN")}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Admin Testing Controls */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#4b261a]/10">
            <button
              type="button"
              onClick={() => {
                if (confirm("Reset Launch Privilege campaign back to 0 orders? (This will re-enable LAUNCH35 for testing)")) {
                  const resetState: LaunchPrivilegeState = {
                    completedUsers: [],
                    max35Users: 10,
                    is35Retired: false,
                  };
                  saveLaunchPrivilegeState(resetState);
                  setLaunchPrivilege(resetState);
                  alert("Launch privilege campaign reset to 0/10!");
                }
              }}
              className="text-[11px] text-[#4b261a]/60 hover:text-red-700 hover:underline cursor-pointer"
            >
              Reset Counter for Testing (0/10)
            </button>
            <button
              type="button"
              onClick={() => {
                const dummyIdx = launchPrivilege.completedUsers.length + 1;
                if (dummyIdx > 10) {
                  alert("Already reached 10 orders!");
                  return;
                }
                const newPatron = {
                  email: `client${dummyIdx}@follicia.com`,
                  name: `VIP Client #${dummyIdx}`,
                  orderId: `RSV-${Date.now().toString().slice(-6)}`,
                  orderedAt: new Date().toISOString(),
                  discount: 35,
                };
                const updated = [...launchPrivilege.completedUsers, newPatron];
                const just10 = updated.length >= 10;
                const nextState: LaunchPrivilegeState = {
                  completedUsers: updated,
                  max35Users: 10,
                  is35Retired: just10,
                };
                saveLaunchPrivilegeState(nextState);
                setLaunchPrivilege(nextState);
              }}
              className="text-[11px] bg-[#24130d] text-white hover:bg-[var(--gold)] hover:text-[#24130d] px-3 py-1.5 rounded-lg font-bold uppercase tracking-wider transition-colors cursor-pointer"
            >
              + Simulate Test Order ({launchPrivilege.completedUsers.length}/10)
            </button>
          </div>
        </div>
      </AdminCard>

      <AdminCard id="dashboard-gateway" title="Razorpay Payment Gateway Ecosystem">
        <div className="p-5 rounded-xl border border-[#4b261a15] bg-[#fffdfa] shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#4b261a10] pb-4 mb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                  rzpStatus?.isConfigured
                    ? rzpStatus.mode === "test"
                      ? "bg-amber-100 text-amber-900 border border-amber-300"
                      : "bg-emerald-100 text-emerald-900 border border-emerald-300"
                    : "bg-red-100 text-red-900 border border-red-300"
                }`}>
                  {rzpStatus?.isConfigured
                    ? rzpStatus.mode === "test"
                      ? "⚡ Razorpay Test Mode Active"
                      : "🔒 Razorpay Live Production Active"
                    : "⚠️ Razorpay Not Configured"}
                </span>
                {rzpStatus?.isConfigured && (
                  <span className="font-mono text-xs text-[#a87648] font-bold">
                    Key: {rzpStatus.keyId}
                  </span>
                )}
              </div>
              <h4 className="font-serif text-lg font-bold text-[#24130d]">
                Official Razorpay Payment Gateway
              </h4>
              <p className="text-xs text-[#24130d]/70 mt-0.5">
                {rzpStatus?.isConfigured
                  ? `Razorpay is fully connected and processing ${rzpStatus.mode === "test" ? "test simulated" : "live"} payments via UPI, Cards, Netbanking & Wallets.`
                  : "Enter your Razorpay Key ID and Secret below to activate online payments across the store."}
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <a
                href="https://dashboard.razorpay.com/app/keys"
                target="_blank"
                rel="noreferrer"
                className="px-3.5 py-2 rounded-lg border border-[#a87648]/40 bg-[#fbf6ed] text-[#24130d] text-xs font-semibold hover:bg-[#f3e7d5] transition-colors cursor-pointer inline-flex items-center gap-1.5"
              >
                <span>🔑 Razorpay Dashboard</span>
                <span className="text-[10px]">↗</span>
              </a>
            </div>
          </div>

          {/* Active Credentials Summary */}
          <div className="grid gap-3 sm:grid-cols-2 text-xs text-[#24130d]/80 mb-5">
            <div className="p-3 bg-[#fbf6ed] rounded-lg border border-[#a87648]/20">
              <strong className="block text-[#24130d] mb-0.5">Active Key ID:</strong>
              <code className="font-mono text-[11px] text-[#a87648]">
                {rzpStatus?.keyId || "None configured"}
              </code>
              <p className="text-[10px] text-[#24130d]/60 mt-1">
                {rzpStatus?.keyId?.startsWith("rzp_test_") ? "Test Key (Standard Razorpay Sandbox)" : "Live Production Key"}
              </p>
            </div>
            <div className="p-3 bg-white rounded-lg border border-[#4b261a]/15">
              <strong className="block text-[#24130d] mb-0.5">Key Secret Status:</strong>
              <code className="font-mono text-[11px] text-[#24130d]/70">
                {rzpStatus?.maskedSecret || "None configured"}
              </code>
              <p className="text-[10px] text-[#24130d]/60 mt-1">Used on backend for HMAC-SHA256 signature verification.</p>
            </div>
          </div>

          {/* Configuration Form */}
          <form onSubmit={handleSaveRzp} className="p-4 rounded-xl bg-white border border-[#4b261a]/15 shadow-inner space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#24130d] uppercase tracking-wider">Configure Razorpay Credentials</span>
              <span className="text-[11px] text-[#24130d]/50">Saved securely on server database</span>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-[11px] font-semibold text-[#24130d]/70 mb-1">Razorpay Key ID</label>
                <input
                  type="text"
                  placeholder="rzp_test_... or rzp_live_..."
                  value={rzpKeyIdInput}
                  onChange={(e) => setRzpKeyIdInput(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[#4b261a]/20 text-xs font-mono bg-[#fdfbf7] focus:outline-none focus:border-[var(--gold)]"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-[#24130d]/70 mb-1">Razorpay Key Secret</label>
                <input
                  type="password"
                  placeholder="Enter Key Secret"
                  value={rzpKeySecretInput}
                  onChange={(e) => setRzpKeySecretInput(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[#4b261a]/20 text-xs font-mono bg-[#fdfbf7] focus:outline-none focus:border-[var(--gold)]"
                />
              </div>
            </div>

            {rzpMsg && (
              <div className={`p-2.5 rounded-lg text-xs font-medium ${
                rzpMsg.startsWith("✓") ? "bg-emerald-50 text-emerald-800 border border-emerald-200" : "bg-red-50 text-red-800 border border-red-200"
              }`}>
                {rzpMsg}
              </div>
            )}

            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] text-[#24130d]/60">Supports Test Key (`rzp_test_`) & Live Key (`rzp_live_`)</span>
              <button
                type="submit"
                disabled={rzpSaving}
                className="px-5 py-2 rounded-lg bg-[#24130d] text-white text-xs font-bold uppercase tracking-wider hover:bg-[#381e14] transition-colors cursor-pointer shadow-sm disabled:opacity-50"
              >
                {rzpSaving ? "Saving..." : "Save & Activate Razorpay"}
              </button>
            </div>
          </form>
        </div>
      </AdminCard>

      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <AdminCard id="dashboard-orders" title="Latest Orders">
          <AdminMiniList items={orders.slice(0, 5).map((order) => `${order.id} - ${order.customer} - ${order.status}`)} />
        </AdminCard>
        <AdminCard id="dashboard-actions" title="Command Alerts">
          <AdminMiniList items={[
            "✉️ Email Relay: Live alerts dispatched to info@follicia.in",
            is10GoalCompleted
              ? "🔔 MILESTONE: 10/10 Launch Orders Complete (35% Retired)"
              : `Launch 35% campaign: ${launchPrivilege.completedUsers.length}/10 spots claimed`,
            `${products.filter((product) => product.available <= 12 && product.status !== "Draft").length} low-stock product alerts`,
            `${customers.reduce((sum, customer) => sum + customer.wishlist.length, 0)} wishlist intent signals`,
            `${contactQueries.filter((item) => item.status === "Open").length} open concierge requests`,
            `${drops.filter((item) => item.status !== "Closed").length} drop records ready`,
          ]} />
        </AdminCard>
      </div>
      <AdminCard id="dashboard-controls" title="Storefront Controls">
          <div className="grid gap-2">
            {(["inventory", "drops", "vip", "stories", "seo", "banners", "cms", "legal", "coupons", "reviews", "contact"] as AdminSection[]).map((section) => <button key={section} onClick={() => openSection(section)} className="flex items-center justify-between border border-[var(--ink)]/10 bg-white px-4 py-3 text-left text-sm"><span>{adminSectionCopy[section].label}</span><span className="text-[var(--gold)]">Open</span></button>)}
          </div>
      </AdminCard>
    </div>
  );

  const ordersPanel = (
    <AdminCard id="orders" title="Order Control">
      <div className="p-3 mb-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-2xs">
        <div className="flex items-center gap-2">
          <Mail size={15} className="text-emerald-700 shrink-0" />
          <span>
            <strong>Automatic Order Notifications Active:</strong> Every customer order automatically triggers an email alert to <strong>info@follicia.in</strong>.
          </span>
        </div>
        <span className="text-[10px] font-mono bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-bold self-start sm:self-auto">
          SMTP Relay Active
        </span>
      </div>
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
              <label className="grid gap-1 text-xs uppercase tracking-[0.22em] text-[var(--ink)]/45">Delivery<select value={order.deliveryStatus} onChange={(event) => persistOrders(orders.map((item) => item.id === order.id ? { ...item, deliveryStatus: event.target.value } : item))} className="border border-[var(--ink)]/15 bg-white px-3 py-2 text-sm normal-case tracking-normal text-[var(--ink)]">{["Order Placed", "Fitting Scheduled", "In Crafting", "Dispatched", "Delivered", "Cancelled", "Return Requested"].map((status) => <option key={status}>{status}</option>)}</select></label>
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

  const filteredAdminProducts = products.filter((p) => {
    if (collectionFilter !== "All") {
      const pCol = (p.collection || p.edition || "").toLowerCase();
      if (!pCol.includes(collectionFilter.toLowerCase())) return false;
    }
    if (statusFilter !== "All" && p.status !== statusFilter) {
      return false;
    }
    if (productSearch.trim()) {
      const q = productSearch.trim().toLowerCase();
      const match =
        p.title.toLowerCase().includes(q) ||
        (p.designId && p.designId.toLowerCase().includes(q)) ||
        p.id.toLowerCase().includes(q) ||
        (p.collection && p.collection.toLowerCase().includes(q)) ||
        (p.category && p.category.toLowerCase().includes(q));
      if (!match) return false;
    }
    return true;
  });

  const inventoryPanel = (
    <div className="grid gap-5">
      {/* Top Header & Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-5 rounded-xl border border-[#4b261a15] shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-display text-2xl font-bold text-[#24130d]">Product Inventory</h2>
            <span className="px-2.5 py-0.5 rounded-full bg-[var(--gold)]/15 text-[var(--gold)] font-semibold text-xs border border-[var(--gold)]/20">
              {products.length} total
            </span>
          </div>
          <p className="text-xs text-[#4b261a70] mt-1">
            Manage your footwear catalogue, stock counts, prices, and storefront visibility.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => {
              if (window.confirm("Reload all 40 products from Developer Master Excel Catalog? This will synchronize all product specifications, colors, SKUs, silhouettes, and materials.")) {
                const updated = resetToMasterCatalog();
                setProducts(updated);
                alert(`Success! ${updated.length} products synchronized with master catalog.`);
              }
            }}
            className="flex items-center gap-1.5 bg-white hover:bg-[#FAF8F5] border border-[#4b261a20] text-[#24130d] px-3.5 py-2.5 rounded-lg text-xs font-semibold tracking-wider uppercase transition-colors shadow-2xs cursor-pointer"
          >
            <RefreshCw size={13} />
            <span>Re-Sync Master</span>
          </button>
          <button
            type="button"
            onClick={() => setShowAddForm((prev) => !prev)}
            className="flex items-center gap-1.5 bg-[#24130d] hover:bg-[#351c13] text-[#fffdf8] px-4 py-2.5 rounded-lg text-xs font-semibold tracking-wider uppercase transition-all shadow-sm cursor-pointer"
          >
            <Plus size={14} />
            <span>{showAddForm ? "Close Form" : "Add New Product"}</span>
          </button>
        </div>
      </div>

      {/* Add New Product Form Card */}
      {showAddForm && (
        <section className="bg-white border-2 border-[var(--gold)]/40 rounded-xl p-6 shadow-md transition-all">
          <div className="flex items-center justify-between pb-4 mb-5 border-b border-[#4b261a15]">
            <div>
              <span className="text-[10px] uppercase font-bold tracking-widest text-[var(--gold)]">New Piece</span>
              <h3 className="font-display text-xl font-bold text-[#24130d]">Add Product to Storefront</h3>
            </div>
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="text-xs text-[#4b261a60] hover:text-[#24130d] px-2 py-1 rounded bg-[#4b261a08] cursor-pointer"
            >
              Cancel
            </button>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <AdminField label="Product Title / Name *" value={draftProduct.title} onChange={(value) => updateDraftProduct("title", value)} />

            <label className="grid gap-2 text-[10px] uppercase tracking-[0.2em] text-[var(--ink)]/60 font-semibold">
              Collection *
              <select
                value={draftProduct.collection}
                onChange={(e) => updateDraftProduct("collection", e.target.value)}
                className="border border-[var(--ink)]/15 bg-white px-3.5 py-2.5 text-sm text-[var(--ink)] rounded-md outline-none focus:border-[var(--gold)]"
              >
                <option value="Aura">Aura Collection</option>
                <option value="Bloom">Bloom Collection</option>
                <option value="Muse">Muse Collection</option>
                <option value="Noire">Noire Collection</option>
                <option value="Walk Light">Walk Light Collection</option>
              </select>
            </label>

            <label className="grid gap-2 text-[10px] uppercase tracking-[0.2em] text-[var(--ink)]/60 font-semibold">
              Category / Style *
              <select
                value={draftProduct.category}
                onChange={(e) => updateDraftProduct("category", e.target.value)}
                className="border border-[var(--ink)]/15 bg-white px-3.5 py-2.5 text-sm text-[var(--ink)] rounded-md outline-none focus:border-[var(--gold)]"
              >
                <option value="Heel">Heel</option>
                <option value="Flat">Flat</option>
                <option value="Mule">Mule</option>
                <option value="Boot">Boot</option>
              </select>
            </label>

            <AdminField label="Toe / Silhouette (e.g. Pointed Toe, Sculptural Heel)" value={draftProduct.silhouette} onChange={(value) => updateDraftProduct("silhouette", value)} />
            <AdminField label="Material / Tone (e.g. Vegan Leather, Satin)" value={draftProduct.material} onChange={(value) => updateDraftProduct("material", value)} />
            <AdminField label="Hero Colour (e.g. Warm Ivory, Noir Black, Gold)" value={draftProduct.heroColour} onChange={(value) => updateDraftProduct("heroColour", value)} />
            <AdminField label="Price (e.g. Rs. 4,990)" value={draftProduct.price} onChange={(value) => updateDraftProduct("price", value)} />
            <AdminField label="Available Stock" value={draftProduct.available} onChange={(value) => updateDraftProduct("available", value)} />

            <label className="grid gap-2 text-[10px] uppercase tracking-[0.2em] text-[var(--ink)]/60 font-semibold">
              Status *
              <select
                value={draftProduct.status}
                onChange={(event) => updateDraftProduct("status", event.target.value)}
                className="border border-[var(--ink)]/15 bg-white px-3.5 py-2.5 text-sm text-[var(--ink)] rounded-md outline-none focus:border-[var(--gold)]"
              >
                {productStatuses.map((status) => <option key={status}>{status}</option>)}
              </select>
            </label>

            <AdminField label="Upcoming Drop Date (Optional, e.g. 25 Oct 2026)" value={draftProduct.dropDate} onChange={(value) => updateDraftProduct("dropDate", value)} />

            <label className="flex items-center gap-2.5 text-xs text-[#24130d] font-semibold cursor-pointer pt-6">
              <input
                type="checkbox"
                checked={draftProduct.isNewArrival}
                onChange={(e) => setDraftProduct((curr) => ({ ...curr, isNewArrival: e.target.checked }))}
                className="w-4 h-4 accent-[#4b261a] rounded"
              />
              <span>Feature in New Arrivals Drop Page</span>
            </label>

            {/* Available Sizes (EU Sizing) */}
            <div className="md:col-span-3 bg-[#FAF8F5] border border-[#4b261a15] p-3.5 rounded-lg">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase font-bold tracking-widest text-[#4b261a]">
                    Available Sizes (EU Sizing)
                  </span>
                  <span className="text-[9px] text-[#4b261a70]">
                    Select sizes offered for this product
                  </span>
                </div>
                <button
                  type="button"
                  onClick={resetDraftSizes}
                  className="text-[10px] uppercase tracking-wider text-[var(--gold)] font-semibold hover:underline cursor-pointer"
                >
                  Reset to EU 38–41 (Default)
                </button>
              </div>
              <div className="flex flex-wrap gap-2 items-center">
                {ALL_AVAILABLE_EU_SIZES.map((size) => {
                  const isSelected = draftProduct.availableSizes.includes(size);
                  return (
                    <button
                      key={size}
                      type="button"
                      onClick={() => toggleDraftSize(size)}
                      className={`px-3 py-1.5 rounded-md text-xs font-semibold tracking-wider uppercase transition-all flex items-center gap-1.5 cursor-pointer ${
                        isSelected
                          ? "bg-[#24130d] text-[#fffdf8] shadow-xs ring-1 ring-[#24130d]"
                          : "bg-white border border-[#4b261a20] text-[#4b261a80] hover:border-[#24130d] hover:text-[#24130d]"
                      }`}
                    >
                      <span>{size}</span>
                      {isSelected ? <span className="text-[10px] text-[var(--gold)]">✓</span> : <span className="text-[10px] opacity-40">+</span>}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="md:col-span-3">
              <ProductImagePicker images={draftProduct.images} onChange={updateDraftImages} />
            </div>

            <div className="md:col-span-3 pt-2">
              <button
                type="button"
                onClick={createProduct}
                className="w-full sm:w-auto bg-[#24130d] hover:bg-[#351c13] text-white px-8 py-3.5 rounded-lg text-xs uppercase tracking-[0.18em] font-semibold transition-colors shadow-sm cursor-pointer"
              >
                ✓ Publish Product to Storefront
              </button>
            </div>
          </div>
        </section>
      )}

      {/* Search & Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-[#4b261a15] shadow-2xs">
        <div className="flex items-center gap-2 flex-1 min-w-[220px]">
          <Search size={16} className="text-[#4b261a60] ml-2" />
          <input
            type="text"
            placeholder="Search products by title, design ID, collection, category..."
            value={productSearch}
            onChange={(e) => setProductSearch(e.target.value)}
            className="w-full text-xs text-[#24130d] outline-none bg-transparent"
          />
          {productSearch && (
            <button type="button" onClick={() => setProductSearch("")} className="text-xs text-[#4b261a60] mr-2 cursor-pointer">
              ✕
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 text-xs text-[#4b261a70]">
            <Filter size={13} />
            <span>Collection:</span>
          </div>
          <select
            value={collectionFilter}
            onChange={(e) => setCollectionFilter(e.target.value)}
            className="text-xs border border-[#4b261a20] rounded-md px-2.5 py-1.5 bg-white text-[#24130d] outline-none cursor-pointer"
          >
            <option value="All">All Collections</option>
            <option value="Aura">Aura</option>
            <option value="Bloom">Bloom</option>
            <option value="Muse">Muse</option>
            <option value="Noire">Noire</option>
            <option value="Walk Light">Walk Light</option>
          </select>

          <div className="flex items-center gap-1.5 text-xs text-[#4b261a70] ml-2">
            <span>Status:</span>
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs border border-[#4b261a20] rounded-md px-2.5 py-1.5 bg-white text-[#24130d] outline-none cursor-pointer"
          >
            <option value="All">All Statuses</option>
            {productStatuses.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      {/* Product List */}
      <div className="grid gap-4">
        {filteredAdminProducts.map((product) => (
          <AdminProductCard
            key={product.id}
            product={product}
            products={products}
            productStatuses={productStatuses}
            persistProducts={persistProducts}
            publishProduct={publishProduct}
            archiveProduct={archiveProduct}
            onDelete={deleteProduct}
          />
        ))}

        {filteredAdminProducts.length === 0 && (
          <div className="p-12 text-center bg-white rounded-xl border border-[#4b261a15]">
            <Package size={36} className="mx-auto text-[#4b261a40] mb-3" />
            <h4 className="font-display text-lg font-semibold text-[#24130d]">No products found</h4>
            <p className="text-xs text-[#4b261a60] mt-1">Try adjusting your search query or filters.</p>
            <button
              type="button"
              onClick={() => {
                setProductSearch("");
                setCollectionFilter("All");
                setStatusFilter("All");
              }}
              className="mt-4 px-4 py-2 rounded-lg bg-[#24130d] text-white text-xs font-semibold cursor-pointer"
            >
              Clear Filters
            </button>
          </div>
        )}
      </div>
    </div>
  );

  const customersPanel = (
    <AdminCard id="customers" title="Customer Ecosystem">
      <div className="grid gap-4">
        <section className="grid gap-3 border border-[var(--ink)]/10 bg-[var(--bone)]/35 p-4 md:grid-cols-[1fr_1fr_160px_180px_auto]">
          <input value={draftCustomer.name} onChange={(event) => setDraftCustomer((current) => ({ ...current, name: event.target.value }))} placeholder="Customer name" className="border border-[var(--ink)]/10 bg-white px-4 py-3 text-sm outline-none focus:border-[var(--gold)]" />
          <input value={draftCustomer.email} onChange={(event) => setDraftCustomer((current) => ({ ...current, email: event.target.value }))} placeholder="Email" className="border border-[var(--ink)]/10 bg-white px-4 py-3 text-sm outline-none focus:border-[var(--gold)]" />
          <input value={draftCustomer.phone} onChange={(event) => setDraftCustomer((current) => ({ ...current, phone: event.target.value }))} placeholder="Phone" className="border border-[var(--ink)]/10 bg-white px-4 py-3 text-sm outline-none focus:border-[var(--gold)]" />
          <select value={draftCustomer.tier} onChange={(event) => setDraftCustomer((current) => ({ ...current, tier: event.target.value }))} className="border border-[var(--ink)]/10 bg-white px-4 py-3 text-sm outline-none focus:border-[var(--gold)]">
            {["Follicia Private", "VIP", "Collector", "New Client"].map((tier) => <option key={tier}>{tier}</option>)}
          </select>
          <button onClick={createCustomer} className="bg-[var(--ink)] px-5 py-3 text-xs uppercase tracking-[0.16em] text-[var(--bone)]">Add</button>
        </section>
        <div className="grid gap-3">
          {customers.map((customer) => (
            <article key={customer.id} className="grid gap-3 border border-[var(--ink)]/10 bg-white p-4 lg:grid-cols-[1fr_1fr_150px_150px_110px]">
              <input value={customer.name} onChange={(event) => updateCustomer(customer, { name: event.target.value })} className="border border-[var(--ink)]/10 px-3 py-2 text-sm outline-none focus:border-[var(--gold)]" />
              <input value={customer.email} onChange={(event) => updateCustomer(customer, { email: event.target.value })} className="border border-[var(--ink)]/10 px-3 py-2 text-sm outline-none focus:border-[var(--gold)]" />
              <input value={customer.phone} onChange={(event) => updateCustomer(customer, { phone: event.target.value })} placeholder="Phone" className="border border-[var(--ink)]/10 px-3 py-2 text-sm outline-none focus:border-[var(--gold)]" />
              <select value={customer.tier} onChange={(event) => updateCustomer(customer, { tier: event.target.value })} className="border border-[var(--ink)]/10 px-3 py-2 text-sm outline-none focus:border-[var(--gold)]">
                {["Follicia Private", "VIP", "Collector", "New Client"].map((tier) => <option key={tier}>{tier}</option>)}
              </select>
              <button onClick={() => deleteCustomer(customer)} className="border border-red-200 px-3 py-2 text-xs uppercase tracking-[0.12em] text-red-700">Delete</button>
              <p className="text-xs text-[var(--ink)]/50 lg:col-span-5">{customer.addresses.length} addresses · {customer.wishlist.length} wishlist · {orders.filter((order) => order.customerId === customer.id).length} orders</p>
            </article>
          ))}
        </div>
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

  const legalPanel = (
    <AdminCard id="legal" title="Privacy, Terms & Cookies">
      <LegalPagesEditor records={legalPages} onChange={setLegalPages} />
    </AdminCard>
  );

  const panels: Record<AdminSection, ReactNode> = {
    dashboard: dashboardPanel,
    orders: ordersPanel,
    inventory: inventoryPanel,
    customers: customersPanel,
    drops: <AdminCard id="drops" title="Drop Calendar"><AdminCrudList storageKey="follocia_admin_drops" records={drops} onChange={setDrops} titlePlaceholder="Drop name" metaPlaceholder="Launch window, waitlist or access note" /></AdminCard>,
    vip: <AdminCard id="vip" title="VIP Access Rules"><AdminCrudList storageKey="follocia_admin_vip" records={vipAccess} onChange={setVipAccess} titlePlaceholder="Access rule" metaPlaceholder="Customer tier, product or secret-link rule" /></AdminCard>,
    stories: <AdminCard id="stories" title="Product Story Blocks"><AdminCrudList storageKey="follocia_admin_stories" records={storyBlocks} onChange={setStoryBlocks} titlePlaceholder="Story block" metaPlaceholder="Craft, material, fit, care or styling copy" /></AdminCard>,
    seo: <AdminCard id="seo" title="SEO & Social Preview"><AdminCrudList storageKey="follocia_admin_seo" records={seoRecords} onChange={setSeoRecords} titlePlaceholder="Page or product title" metaPlaceholder="SEO description or share preview" /></AdminCard>,
    coupons: (
      <AdminCard id="coupons" title="Coupons & Launch Privileges">
        <div className="mb-6 p-5 rounded-2xl border-2 border-[var(--gold)]/30 bg-gradient-to-r from-[#FAF8F5] via-white to-[#FAF8F5]">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
            <span className="text-xs font-extrabold uppercase tracking-widest text-[#83561a] bg-amber-100 px-2.5 py-1 rounded-full">
              Automated Launch Campaign
            </span>
            <span className="font-mono text-xs font-bold text-[#24130d]">
              {launchPrivilege.completedUsers.length} / {launchPrivilege.max35Users} Orders Completed
            </span>
          </div>
          <h4 className="font-serif text-lg font-bold text-[#24130d]">
            First 10 Orders: 35% (LAUNCH35) → Subsequent: 15% (WELCOME15)
          </h4>
          <p className="text-xs text-[#4b261a]/70 mt-1 max-w-2xl">
            The first 10 unique customers to place an order receive 35% discount (<code>LAUNCH35</code>). Once 10 clients complete their orders, 35% automatically shuts down and will reject new attempts. All following users automatically get 15% discount (<code>WELCOME15</code>).
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
              launchPrivilege.is35Retired || launchPrivilege.completedUsers.length >= 10
                ? "bg-red-100 text-red-800"
                : "bg-emerald-100 text-emerald-800"
            }`}>
              {launchPrivilege.is35Retired || launchPrivilege.completedUsers.length >= 10
                ? "LAUNCH35 Retired (10/10 Reached)"
                : `LAUNCH35 Active (${10 - launchPrivilege.completedUsers.length} spots remaining)`}
            </span>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800">
              WELCOME15 Active (Subsequent Clients)
            </span>
          </div>
        </div>
        <AdminCrudList storageKey="follocia_admin_coupons" records={coupons} onChange={setCoupons} titlePlaceholder="Coupon code" metaPlaceholder="Benefit and scope" />
      </AdminCard>
    ),
    reviews: <AdminCard id="reviews" title="Reviews & Ratings"><AdminCrudList storageKey="follocia_admin_reviews" records={reviews} onChange={setReviews} titlePlaceholder="Rating" metaPlaceholder="Review text" /></AdminCard>,
    banners: <AdminCard id="banners" title="Banners"><AdminCrudList storageKey="follocia_admin_banners" records={banners} onChange={setBanners} titlePlaceholder="Banner title" metaPlaceholder="Placement" /></AdminCard>,
    cms: <AdminCard id="cms" title="CMS Pages"><AdminCrudList storageKey="follocia_admin_cms" records={cmsPages} onChange={setCmsPages} titlePlaceholder="Page title" metaPlaceholder="Page purpose" /></AdminCard>,
    legal: legalPanel,
    analytics: analyticsPanel,
    newsletter: <AdminCard id="newsletter" title="Newsletter"><AdminCrudList storageKey="follocia_admin_newsletter" records={newsletter} onChange={setNewsletter} titlePlaceholder="Segment" metaPlaceholder="Audience note" /></AdminCard>,
    contact: (
      <CustomerSupportPanel
        records={contactQueries}
        onChange={setContactQueries}
        storageKey="follocia_admin_contact"
      />
    ),
    tickets: (
      <CustomerSupportPanel
        records={tickets}
        onChange={setTickets}
        storageKey="follocia_admin_tickets"
      />
    ),
    audit: <AdminCard id="audit" title="Audit Log"><AdminCrudList storageKey="follocia_admin_audit" records={audit} onChange={setAudit} titlePlaceholder="Audit event" metaPlaceholder="Details" /></AdminCard>,
  };

  const navGroups = [
    {
      title: "COMMERCE",
      items: [
        { id: "dashboard" as const, label: "Dashboard", icon: LayoutDashboard },
        { id: "inventory" as const, label: "Products & Stock", icon: Package, badge: products.length },
        { id: "orders" as const, label: "Orders", icon: ShoppingCart, badge: orders.length },
        { id: "customers" as const, label: "Customers", icon: Users, badge: customers.length },
      ],
    },
    {
      title: "MARKETING",
      items: [
        { id: "coupons" as const, label: "Coupons", icon: Tag, badge: coupons.length },
        { id: "reviews" as const, label: "Customer Reviews", icon: Star },
        { id: "banners" as const, label: "Banners & Topbar", icon: Megaphone },
        { id: "drops" as const, label: "Drop Calendar", icon: Calendar },
        { id: "vip" as const, label: "VIP Access Rules", icon: Crown },
      ],
    },
    {
      title: "CONTENT & CMS",
      items: [
        { id: "stories" as const, label: "Brand Stories", icon: BookOpen },
        { id: "cms" as const, label: "CMS Pages", icon: FileText },
        { id: "legal" as const, label: "Legal & Policies", icon: Scale },
        { id: "seo" as const, label: "SEO & Social", icon: Search },
      ],
    },
    {
      title: "COMMUNICATION & AUDIT",
      items: [
        { id: "newsletter" as const, label: "Newsletter", icon: Mail },
        { id: "contact" as const, label: "Customer Support", icon: Headphones, badge: contactQueries.filter((c) => c.status === "Open").length },
        { id: "tickets" as const, label: "Raise a Ticket", icon: Ticket, badge: tickets.filter((t) => t.status === "Open").length },
        { id: "analytics" as const, label: "Analytics Notes", icon: BarChart3 },
        { id: "audit" as const, label: "Audit Log", icon: History },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-[#f7f5f0] text-[#1c1917] flex flex-col md:flex-row">
      {/* Mobile Top Header */}
      <div className="md:hidden flex items-center justify-between bg-[#171310] text-[#fffdf8] px-4 py-3 sticky top-0 z-50 shadow-md">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setMobileSidebarOpen((prev) => !prev)}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-[#fffdf8] cursor-pointer"
            aria-label="Toggle menu"
          >
            {mobileSidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <span className="font-display tracking-widest text-sm font-semibold uppercase text-[var(--gold)]">FOLLICIA ADMIN</span>
        </div>
        <a href="#/" className="text-xs text-white/70 hover:text-white flex items-center gap-1">
          Storefront <ExternalLink size={12} />
        </a>
      </div>

      {/* Mobile Backdrop */}
      {mobileSidebarOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/60 z-40 backdrop-blur-xs"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      {/* LEFT SIDEBAR (fixed / sticky on desktop) */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-[#171310] text-[#e7e5e4] flex flex-col justify-between transition-transform duration-300 ease-in-out md:translate-x-0 md:static md:sticky md:top-0 md:h-screen shrink-0 border-r border-black/30 shadow-xl ${
          mobileSidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Sidebar Header */}
        <div className="p-5 border-b border-white/10">
          <div className="flex items-center justify-between">
            <a href="#/" className="flex items-center gap-3 group">
              <div className="w-8 h-8 rounded-lg bg-[var(--gold)] flex items-center justify-center text-[#171310] font-bold font-display text-base shadow-sm">
                F
              </div>
              <div>
                <span className="font-display font-bold tracking-widest text-base text-white block leading-tight">FOLLICIA</span>
                <span className="text-[10px] tracking-wider uppercase text-[var(--gold)] font-medium">Control Center</span>
              </div>
            </a>
            <button
              type="button"
              onClick={() => setMobileSidebarOpen(false)}
              className="md:hidden text-white/60 hover:text-white p-1"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Sidebar Navigation Items (Scrollable) */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-5 text-xs">
          {navGroups.map((group) => (
            <div key={group.title}>
              <div className="px-3 pb-1.5 text-[10px] font-bold tracking-widest uppercase text-white/35">
                {group.title}
              </div>
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const IconComponent = item.icon;
                  const isSel = activeSection === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        openSection(item.id);
                        setMobileSidebarOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg font-medium transition-all text-left cursor-pointer ${
                        isSel
                          ? "bg-[var(--gold)] text-[#171310] font-semibold shadow-xs"
                          : "text-white/70 hover:text-white hover:bg-white/8"
                      }`}
                    >
                      <span className="flex items-center gap-2.5">
                        <IconComponent size={16} className={isSel ? "text-[#171310]" : "text-white/50"} />
                        <span>{item.label}</span>
                      </span>
                      {typeof item.badge === "number" && item.badge > 0 && (
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                            isSel
                              ? "bg-[#171310]/20 text-[#171310]"
                              : "bg-white/10 text-white/70"
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Sidebar Footer */}
        <div className="p-3 border-t border-white/10 bg-black/25 space-y-1.5">
          <a
            href="#/"
            className="flex items-center justify-between px-3 py-2 rounded-lg text-xs text-white/70 hover:text-white hover:bg-white/5 transition-colors"
          >
            <span className="flex items-center gap-2">
              <ExternalLink size={14} />
              <span>View Website</span>
            </span>
            <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded">Storefront</span>
          </a>
          {onLogout && (
            <button
              type="button"
              onClick={onLogout}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors cursor-pointer"
            >
              <LogOut size={14} />
              <span>Log Out</span>
            </button>
          )}
        </div>
      </aside>

      {/* MAIN CONTENT AREA (to the right of sidebar) */}
      <main className="flex-1 min-w-0 bg-[#f7f5f0] flex flex-col min-h-screen">
        {/* Sticky Desktop Top Bar */}
        <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-[#4b261a15] px-6 py-3.5 flex items-center justify-between gap-4 shadow-2xs">
          <div className="flex items-center gap-3">
            <span className="text-xs uppercase tracking-wider text-[#4b261a70] font-medium hidden sm:inline">Admin</span>
            <span className="text-[#4b261a30] hidden sm:inline">/</span>
            <h1 className="font-display font-bold text-lg text-[#24130d] leading-none">
              {adminSectionCopy[activeSection]?.label || "Dashboard"}
            </h1>
          </div>
          <div className="flex items-center gap-2.5">
            {/* Notification Center Popover */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowNotifications((prev) => !prev)}
                className="relative inline-flex items-center justify-center w-8 h-8 rounded-lg border border-[#4b261a20] bg-white text-[#24130d] hover:bg-[#FAF8F5] transition-colors shadow-2xs cursor-pointer"
                aria-label="View Admin Notifications"
                title="Notifications (Relayed to info@follicia.in)"
              >
                <Bell size={15} />
                {(contactQueries.filter((c) => c.status === "Open").length + orders.length) > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-600 text-white text-[9px] font-bold flex items-center justify-center animate-pulse">
                    {Math.min(9, contactQueries.filter((c) => c.status === "Open").length + orders.slice(0, 3).length)}
                  </span>
                )}
              </button>

              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl border border-[#4b261a20] shadow-2xl z-50 p-4">
                  <div className="flex items-center justify-between border-b border-[#4b261a10] pb-3 mb-3">
                    <div className="flex items-center gap-2">
                      <Bell size={15} className="text-[var(--gold)]" />
                      <h4 className="font-bold text-xs text-[#24130d] uppercase tracking-wider">
                        Store Notifications
                      </h4>
                    </div>
                    <span className="text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full">
                      Relayed to info@follicia.in
                    </span>
                  </div>

                  <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
                    {/* Customer Support Inquiries notification */}
                    <div className="p-3 rounded-xl bg-[#fffdfa] border border-[#a87648]/20 text-xs">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-[#24130d] flex items-center gap-1.5">
                          <Headphones size={13} className="text-[var(--gold)]" />
                          Customer Inquiries ({contactQueries.filter((c) => c.status === "Open").length} Open)
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            openSection("contact");
                            setShowNotifications(false);
                          }}
                          className="text-[10px] text-[var(--chocolate)] font-bold hover:underline cursor-pointer"
                        >
                          View All →
                        </button>
                      </div>
                      <p className="text-[11px] text-stone-600">
                        {contactQueries[0]
                          ? `Latest: "${contactQueries[0].title}"`
                          : "No recent inquiries"}
                      </p>
                      <span className="text-[10px] text-stone-400 block mt-1">
                        ✓ Dispatched to info@follicia.in
                      </span>
                    </div>

                    {/* Orders notification */}
                    <div className="p-3 rounded-xl bg-[#f0fdf4] border border-emerald-200 text-xs">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-emerald-950 flex items-center gap-1.5">
                          <ShoppingCart size={13} className="text-emerald-600" />
                          Orders ({orders.length} Total)
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            openSection("orders");
                            setShowNotifications(false);
                          }}
                          className="text-[10px] text-emerald-800 font-bold hover:underline cursor-pointer"
                        >
                          View All →
                        </button>
                      </div>
                      <p className="text-[11px] text-stone-700">
                        {orders[0]
                          ? `Latest: ${orders[0].id} by ${orders[0].customer} (${orders[0].amount})`
                          : "No orders placed yet"}
                      </p>
                      <span className="text-[10px] text-emerald-600 block mt-1">
                        ✓ Dispatched to info@follicia.in
                      </span>
                    </div>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-[#4b261a10] text-center">
                    <span className="text-[10px] text-stone-400">
                      Notifications sent to <strong>info@follicia.in</strong> via SMTP
                    </span>
                  </div>
                </div>
              )}
            </div>

            <a
              href="#/"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#4b261a20] bg-white text-xs font-semibold text-[#24130d] hover:bg-[#FAF8F5] transition-colors shadow-2xs"
            >
              <ExternalLink size={13} />
              <span>Storefront</span>
            </a>
            {activeSection !== "inventory" && (
              <button
                type="button"
                onClick={() => openSection("inventory")}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#24130d] text-xs font-semibold text-[#fffdf8] hover:bg-[#351c13] transition-colors shadow-2xs cursor-pointer"
              >
                <Plus size={13} />
                <span>Add Product</span>
              </button>
            )}
            <div className="h-4 w-px bg-black/10 mx-1 hidden sm:block" />
            <div className="hidden sm:flex items-center gap-2 pl-1">
              <div className="w-6 h-6 rounded-full bg-[#24130d] text-[var(--gold)] flex items-center justify-center text-[10px] font-bold">
                A
              </div>
              <span className="text-xs font-medium text-[#24130d]">admin@follicia.com</span>
            </div>
          </div>
        </header>

        {/* Content Body */}
        <div className="p-4 sm:p-6 lg:p-8 max-w-[1500px] w-full mx-auto">
          {panels[activeSection]}
        </div>
      </main>
    </div>
  );
}

function LegacyAdminPanel({ onLogout }: { onLogout?: () => void }) {
  const [products, setProducts] = useState<CommerceProduct[]>(() => getProducts());
  const [orders, setOrders] = useState<CommerceOrder[]>(() => getOrders());
  const [customers, setCustomers] = useState<CustomerProfile[]>(() => getCustomers());
  const [coupons, setCoupons] = useState<AdminRecord[]>(() => readAdminRecords("follocia_admin_coupons", [
    { id: "coupon-1", title: "FOLLICIA10", meta: "10% off - Live editions", status: "Active" },
    { id: "coupon-2", title: "FOLLICIACARE", meta: "Free care kit - Delivered orders", status: "Active" },
    { id: "coupon-3", title: "VIPFIRST", meta: "Priority fitting - Private members", status: "Paused" },
  ]));
  const [reviews, setReviews] = useState<AdminRecord[]>(() => readAdminRecords("follocia_admin_reviews", [
    { id: "review-1", title: "5.0 / 5", meta: "Fit was perfect, packaging felt premium", status: "Published" },
    { id: "review-2", title: "4.0 / 5", meta: "Concierge helped with size exchange", status: "Published" },
    { id: "review-3", title: "3.0 / 5", meta: "Waiting for dispatch update", status: "Review" },
  ]));
  const [banners, setBanners] = useState<AdminRecord[]>(() => readAdminRecords("follocia_admin_banners", [
    { id: "banner-1", title: "Top Announcement Bar", meta: "Complimentary shipping across India on orders above Rs. 9,999", status: "Live" },
    { id: "banner-2", title: "VIP access strip", meta: "Navigation and checkout", status: "Live" },
  ]));
  const [cmsPages, setCmsPages] = useState<AdminRecord[]>(() => readAdminRecords("follocia_admin_cms", [
    { id: "cms-1", title: "About Follicia", meta: "Brand story page", status: "Published" },
    { id: "cms-2", title: "Care guide", meta: "Post-purchase care", status: "Published" },
    { id: "cms-3", title: "Return policy", meta: "Customer support", status: "Draft" },
  ]));
  const [contactQueries, setContactQueries] = useState<AdminRecord[]>(() => readAdminRecords("follocia_admin_contact", [
    { id: "contact-1", title: "Sizing query from Mumbai", meta: "Customer asked for 38/39 fitting help", status: "Open" },
    { id: "contact-2", title: "Delivery request from Delhi", meta: "White-glove delivery timing", status: "Open" },
  ]));
  const [tickets, setTickets] = useState<AdminRecord[]>(() => readAdminRecords("follocia_admin_tickets", []));
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
    { label: "Reserved value", value: `Rs. ${orders.reduce((sum, order) => sum + parsePriceNumber(order.amount), 0).toLocaleString("en-IN")}`, delta: "Live order value" },
    { label: "VIP customers", value: String(customers.length).padStart(2, "0"), delta: "Customer ecosystem" },
    { label: "Pairs remaining", value: String(products.reduce((sum, product) => sum + product.available, 0)), delta: "Across catalogue", tone: "warn" },
    { label: "Open queries", value: String(contactQueries.filter((item) => item.status === "Open").length).padStart(2, "0"), delta: "Support desk" },
  ], [customers.length, orders, products, contactQueries]);

  const [draftProduct, setDraftProduct] = useState({
    title: "",
    edition: "Edition of 100",
    tone: "Italian satin",
    price: "Rs. 14,990",
    image: products[0]?.image || "",
    images: [] as string[],
    status: "Live",
    produced: "100",
    reserved: "0",
    available: "100",
  });

  const updateDraftProduct = (field: Exclude<keyof typeof draftProduct, "images">, value: string) => setDraftProduct((current) => ({ ...current, [field]: value }));
  const updateDraftImages = (images: string[]) => setDraftProduct((current) => ({ ...current, image: images[0] || "", images }));

  const persistProducts = (next: CommerceProduct[]) => {
    setProducts(next);
    saveProducts(next);
    next.forEach((product) => void saveProductRemote(product));
  };

  const createProduct = () => {
    if (!draftProduct.title.trim()) return;
    const images = draftProduct.images.length ? draftProduct.images : [draftProduct.image.trim() || products[0]?.image || ""].filter(Boolean);
    const nextProduct: CommerceProduct = {
      id: `fl-${Date.now()}`,
      title: draftProduct.title.trim(),
      edition: draftProduct.edition.trim() || "Edition of 100",
      tone: draftProduct.tone.trim() || "Italian satin",
      price: draftProduct.price.trim() || "Rs. 14,990",
      image: images[0] || "",
      images,
      status: draftProduct.status.trim() || "Live",
      produced: Number(draftProduct.produced) || 0,
      reserved: Number(draftProduct.reserved) || 0,
      available: Number(draftProduct.available) || 0,
    };
    persistProducts([nextProduct, ...products]);
    appendAdminRecord("audit", "Product created", `${nextProduct.title} added to catalogue`, "Logged");
    setDraftProduct((current) => ({ ...current, title: "", reserved: "0", image: "", images: [] }));
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
      tickets: setTickets,
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
          <a href="/" aria-label="Follicia home" className="flex items-center gap-4 group">
            <div className="relative overflow-hidden w-10 h-10 rounded-full border border-[var(--gold)] flex items-center justify-center bg-[var(--ink)] group-hover:bg-[var(--gold)] transition-colors">
              <span className="text-[var(--bone)] font-display text-xl group-hover:text-[var(--ink)]">F</span>
            </div>
            <span className="font-display text-xl uppercase tracking-widest hidden md:block group-hover:text-[var(--gold)] transition-colors">Follicia Admin</span>
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
            <p className="mt-4 text-xs tracking-widest uppercase text-[var(--bone)]/50 leading-loose">Manage Follicia ecosystem</p>
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
              <h2 className="mt-6 font-display text-5xl md:text-6xl lg:text-7xl leading-none tracking-tight">Follicia<br />Operations.</h2>
              <p className="mt-8 max-w-xl text-lg font-light text-[var(--ink)]/70">Complete administrative control over the digital boutique.</p>
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
                        {["Order Placed", "Fitting Scheduled", "In Crafting", "Dispatched", "Delivered", "Cancelled", "Return Requested"].map((status) => <option key={status}>{status}</option>)}
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
                    <ProductImagePicker images={draftProduct.images} onChange={updateDraftImages} />
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
                      className="group flex flex-col sm:flex-row gap-5 border border-[#4b261a15] bg-white/80 backdrop-blur-md p-4 sm:p-5 rounded-xl shadow-xs hover:shadow-md transition-all"
                    >
                      <div className="w-28 h-36 shrink-0 rounded-lg overflow-hidden border border-[#4b261a15] bg-white p-1.5 flex items-center justify-center">
                        <img src={productPrimaryImage(product)} alt={product.title} className="max-h-full max-w-full object-contain brightness-[1.15] contrast-[1.05] saturate-[1.05] transform group-hover:scale-105 transition-transform duration-500" style={{ backgroundColor: 'white' }} />
                      </div>
                      <div className="flex-1 grid gap-4 sm:grid-cols-2 md:grid-cols-3">
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
            <AdminCard id="tickets" title="Raise a Ticket">
              <AdminCrudList storageKey="follocia_admin_tickets" records={tickets} onChange={setTickets} titlePlaceholder="Ticket title" metaPlaceholder="Ticket detail" compact />
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

function LegalPagesEditor({ records, onChange }: { records: AdminRecord[]; onChange: (records: AdminRecord[]) => void }) {
  const [active, setActive] = useState<LegalSlug>("privacy");
  const [draftTitle, setDraftTitle] = useState("");
  const [draftMeta, setDraftMeta] = useState("");
  const persist = (next: AdminRecord[]) => {
    onChange(next);
    saveAdminRecords("follocia_admin_legal", next);
    void saveAdminRecordsRemote("legal", next);
  };
  const pageRecords = records.filter((record) => record.id.startsWith(`${active}-`));

  return (
    <div className="grid gap-5">
      <div className="grid gap-2 md:grid-cols-3">
        {(Object.keys(legalPageConfig) as LegalSlug[]).map((slug) => (
          <button
            key={slug}
            onClick={() => setActive(slug)}
            className={`border px-4 py-3 text-left transition-colors ${active === slug ? "border-[var(--ink)] bg-[var(--ink)] text-[var(--bone)]" : "border-[var(--ink)]/10 bg-white hover:border-[var(--gold)]"}`}
          >
            <span className="block text-[10px] uppercase tracking-[0.16em] opacity-55">Footer page</span>
            <strong className="font-display text-2xl">{legalPageConfig[slug].label}</strong>
          </button>
        ))}
      </div>
      <section className="grid gap-3 border border-[var(--ink)]/10 bg-[var(--bone)]/35 p-4">
        <div className="grid gap-3 md:grid-cols-[0.8fr_1.4fr_auto]">
          <input value={draftTitle} onChange={(event) => setDraftTitle(event.target.value)} placeholder={`${legalPageConfig[active].label} section title`} className="border border-[var(--ink)]/10 bg-white px-4 py-3 text-sm outline-none focus:border-[var(--gold)]" />
          <input value={draftMeta} onChange={(event) => setDraftMeta(event.target.value)} placeholder="Policy paragraph shown on public page" className="border border-[var(--ink)]/10 bg-white px-4 py-3 text-sm outline-none focus:border-[var(--gold)]" />
          <button
            onClick={() => {
              if (!draftTitle.trim()) return;
              persist([...records, { id: `${active}-${Date.now()}`, title: draftTitle.trim(), meta: draftMeta.trim() || "Add policy copy here.", status: "Published" }]);
              setDraftTitle("");
              setDraftMeta("");
            }}
            className="bg-[var(--ink)] px-5 py-3 text-xs uppercase tracking-[0.16em] text-[var(--bone)]"
          >
            Add Section
          </button>
        </div>
        <p className="text-xs leading-6 text-[var(--ink)]/55">
          Public URL: <a href={`/${active}`} className="text-[var(--gold)] underline">/{active}</a>. Use Published for live sections, Draft or Paused to hide a section.
        </p>
      </section>
      <div className="grid gap-3">
        {pageRecords.map((record) => (
          <article key={record.id} className="grid gap-3 border border-[var(--ink)]/10 bg-white p-4">
            <div className="grid gap-3 md:grid-cols-[1fr_160px_auto]">
              <input value={record.title} onChange={(event) => persist(records.map((item) => item.id === record.id ? { ...item, title: event.target.value } : item))} className="border border-[var(--ink)]/10 px-3 py-2 text-sm font-medium outline-none focus:border-[var(--gold)]" />
              <select value={record.status} onChange={(event) => persist(records.map((item) => item.id === record.id ? { ...item, status: event.target.value } : item))} className="border border-[var(--ink)]/10 bg-white px-3 py-2 text-sm outline-none focus:border-[var(--gold)]">
                {["Published", "Draft", "Paused", "Review"].map((status) => <option key={status}>{status}</option>)}
              </select>
              <button onClick={() => persist(records.filter((item) => item.id !== record.id))} className="border border-red-200 px-4 py-2 text-xs uppercase tracking-[0.14em] text-red-700">Delete</button>
            </div>
            <textarea value={record.meta} onChange={(event) => persist(records.map((item) => item.id === record.id ? { ...item, meta: event.target.value } : item))} rows={4} className="w-full resize-y border border-[var(--ink)]/10 px-3 py-3 text-sm leading-6 outline-none focus:border-[var(--gold)]" />
          </article>
        ))}
      </div>
    </div>
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
    <section id={id} className="border border-[var(--ink)]/10 bg-white p-4 shadow-[var(--shadow-soft)] scroll-mt-24 md:p-5">
      <div className="mb-4 flex items-center justify-between border-b border-[var(--ink)]/10 pb-3">
        <h2 className="font-display text-3xl text-[var(--ink)]">{title}</h2>
        <span className="text-[10px] uppercase tracking-[0.16em] text-[var(--gold)]">CRUD</span>
      </div>
      <div>
        {children}
      </div>
    </section>
  );
}
