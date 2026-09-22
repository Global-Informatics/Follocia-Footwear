import { useEffect, useMemo, useState, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { motion, useMotionValue, useSpring, useTransform, AnimatePresence } from "framer-motion";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/sections/Footer";
import { CartDrawer } from "@/components/cart/CartDrawer";
import { useCart, parsePriceNumber } from "@/components/cart/CartContext";
import { GoldenParticles } from "@/components/GoldenParticles";
import { Search, X, SlidersHorizontal, RotateCcw, Check, ChevronDown, ChevronUp, Filter, Sparkles } from "lucide-react";
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
  computeFullSku,
  computeAllFullSkus,
  getHeroColorCode,
  getProductVariants,
  getActiveVariant,
  type CommerceAddress,
  type CommerceProduct,
  type CustomerProfile,
  type ProductVariant,
} from "@/lib/commerceStore";
import type { AuthSession } from "@/components/auth/AuthGateway";
import { readCheckoutCoupon, saveCheckoutCoupon, validateCoupon } from "@/lib/coupons";
import { recordLaunchOrder, getUserDiscountEligibility } from "@/lib/launchDiscounts";
import { fetchFreeCurrentLocation, lookupPincodeDetails } from "@/lib/geoAddress";
import { getGatewaySettings, getActiveRazorpayKey, isTestGateway } from "@/lib/paymentGateway";
import { ProductImageZoom } from "@/components/ui/ProductImageZoom";
const ease = [0.2, 0.8, 0.2, 1] as const;

const RAZORPAY_LIVE_KEY_ID = "";

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window !== "undefined" && (window as any).Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

type PageShellProps = {
  session: AuthSession | null;
  onLogout: () => void;
  onLogin: () => void;
  children: ReactNode;
  darkNav?: boolean;
};

export const DEFAULT_PRODUCT_SIZES = ["EU 38", "EU 39", "EU 40", "EU 41"];
const sizes = DEFAULT_PRODUCT_SIZES;

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

function priceNumber(price: string | number | undefined | null): number {
  return parsePriceNumber(price);
}

function matchesColorFilter(product: CommerceProduct, colorFilter: string): boolean {
  if (!colorFilter || colorFilter === "All") return true;

  const target = colorFilter.toLowerCase();
  const pAny = product as any;

  const colorTexts: string[] = [
    pAny.color || "",
    pAny.colors || "",
    pAny.tone || "",
    pAny.heroColour || "",
    pAny.colourName || "",
    pAny.colourFamily || "",
    ...(Array.isArray(pAny.availableColors) ? pAny.availableColors : []),
  ];

  if (Array.isArray(product.variants)) {
    for (const v of product.variants) {
      if (v.heroColour) colorTexts.push(v.heroColour);
      if (v.colourName) colorTexts.push(v.colourName);
      if (v.colourFamily) colorTexts.push(v.colourFamily);
    }
  }

  const combined = colorTexts.join(" ").toLowerCase();

  if (target === "black" || target.includes("black")) {
    return (
      combined.includes("black") ||
      combined.includes("noir") ||
      combined.includes("ebony") ||
      combined.includes("onyx") ||
      combined.includes("charcoal") ||
      combined.includes("jet black")
    );
  }
  if (target.includes("ivory") || target.includes("nude") || target.includes("white")) {
    return (
      combined.includes("ivory") ||
      combined.includes("nude") ||
      combined.includes("cream") ||
      combined.includes("beige") ||
      combined.includes("white") ||
      combined.includes("champagne") ||
      combined.includes("pearl") ||
      combined.includes("sand") ||
      combined.includes("butter")
    );
  }
  if (target.includes("brown") || target.includes("tan")) {
    return (
      combined.includes("brown") ||
      combined.includes("tan") ||
      combined.includes("chocolate") ||
      combined.includes("fawn") ||
      combined.includes("leopard") ||
      combined.includes("caramel") ||
      combined.includes("mocha") ||
      combined.includes("chestnut")
    );
  }
  if (target.includes("blush") || target.includes("rose") || target.includes("pink")) {
    return (
      combined.includes("blush") ||
      combined.includes("rose") ||
      combined.includes("pink") ||
      combined.includes("coral")
    );
  }
  if (target.includes("silver") || target.includes("chrome") || target.includes("gunmetal")) {
    return (
      combined.includes("silver") ||
      combined.includes("chrome") ||
      combined.includes("gunmetal") ||
      combined.includes("metallic") ||
      combined.includes("mirror")
    );
  }
  if (target.includes("gold") || target.includes("monarch") || target.includes("amber")) {
    return (
      combined.includes("gold") ||
      combined.includes("monarch") ||
      combined.includes("amber") ||
      combined.includes("bronze") ||
      combined.includes("brass") ||
      combined.includes("copper")
    );
  }
  if (target.includes("burgundy") || target.includes("maroon") || target.includes("red")) {
    return (
      combined.includes("burgundy") ||
      combined.includes("maroon") ||
      combined.includes("wine") ||
      combined.includes("red")
    );
  }
  if (target.includes("olive") || target.includes("green")) {
    return (
      combined.includes("olive") ||
      combined.includes("green") ||
      combined.includes("khaki")
    );
  }

  return combined.includes(target);
}

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function productPath(product: CommerceProduct) {
  return `#/shop/${product.id}`;
}

export async function shareProduct(product: { id: string; title: string; price?: string | number }, onCopied?: () => void) {
  const pId = product.id.toLowerCase();
  const shareUrl = `${window.location.origin}${window.location.pathname}#/shop/${pId}`;
  if (typeof navigator !== "undefined" && navigator.share) {
    try {
      await navigator.share({
        title: `Follicia | ${product.title}`,
        text: `Discover ${product.title} on Follicia Footwear: ${shareUrl}`,
        url: shareUrl,
      });
      return;
    } catch (err: any) {
      if (err?.name === "AbortError") return;
    }
  }
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(shareUrl);
      onCopied?.();
      return;
    } catch {}
  }
  try {
    const textarea = document.createElement("textarea");
    textarea.value = shareUrl;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    document.execCommand("copy");
    document.body.removeChild(textarea);
    onCopied?.();
  } catch {}
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
  if (!selectedSize) return "Select a size for fit guidance.";
  const sizeNumber = Number(selectedSize.replace(/\D/g, ""));
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
  const ticketData = {
    name,
    email,
    phone: "",
    subject: requestType,
    message,
    createdAt: new Date().toLocaleString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }),
    status: "Open",
    replies: [],
  };
  const next = [
    {
      id: `contact-${Date.now()}`,
      title: `${requestType} from ${name}`,
      meta: JSON.stringify(ticketData),
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
    <div className="follicia-home flex flex-col min-h-screen bg-white">
      <Navigation userName={session?.user.name} onLogout={session ? onLogout : undefined} onLogin={onLogin} solid={!darkNav} />
      <main className="flex-1 bg-white text-[var(--ink)]">{children}</main>
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
  alignRight,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (val: string) => void;
  alignRight?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  const updatePos = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const width = 160;
      let left = rect.left;
      if (alignRight) {
        left = rect.right - width;
      } else if (typeof window !== "undefined" && window.innerWidth < 640) {
        left = rect.left + rect.width / 2 - width / 2;
      }
      if (typeof window !== "undefined") {
        left = Math.max(12, Math.min(window.innerWidth - width - 12, left));
      }
      setPos({
        top: rect.bottom + 6,
        left,
      });
    }
  };

  const handleToggle = () => {
    if (!open) {
      updatePos();
    }
    setOpen(!open);
  };

  useEffect(() => {
    if (!open) return;
    const handleScrollOrResize = () => updatePos();
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        buttonRef.current &&
        !buttonRef.current.contains(target) &&
        !(target as HTMLElement).closest?.(".follocia-filter-popover")
      ) {
        setOpen(false);
      }
    };
    window.addEventListener("scroll", handleScrollOrResize, true);
    window.addEventListener("resize", handleScrollOrResize);
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      window.removeEventListener("scroll", handleScrollOrResize, true);
      window.removeEventListener("resize", handleScrollOrResize);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open]);

  const isFiltered = value !== "All" && value !== "Featured";

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={handleToggle}
        className={`flex items-center gap-0.5 cursor-pointer text-[9px] uppercase tracking-wider transition-all select-none px-1.5 py-0.5 sm:px-2 sm:py-0.5 rounded-full shrink-0 ${
          open || isFiltered
            ? "bg-[#351c13] text-white shadow-xs font-semibold"
            : "text-[var(--ink)]/75 hover:text-[var(--ink)] hover:bg-[var(--ink)]/5 font-medium"
        }`}
      >
        <span className={open || isFiltered ? "text-amber-200/80 font-normal" : "text-[var(--ink)]/45 font-medium"}>{label}</span>
        <span className="font-bold">{value}</span>
        <svg
          width="7"
          height="7"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {open && pos && createPortal(
        <div
          style={{
            position: "fixed",
            top: `${pos.top}px`,
            left: `${pos.left}px`,
            zIndex: 99999,
          }}
          className="follocia-filter-popover w-[160px] max-w-[calc(100vw-24px)] overflow-hidden rounded-xl border border-[#4b261a22] bg-white p-1 shadow-[0_16px_40px_rgba(0,0,0,0.25)] animate-in fade-in zoom-in-95 duration-150"
        >
          <div className="bg-[#351c13] px-2.5 py-1 rounded-t-lg text-left text-[9.5px] font-bold uppercase tracking-wider text-amber-200 flex items-center justify-between">
            <span>{label}</span>
            <span className="text-white text-[8.5px] font-normal">{value}</span>
          </div>
          <div className="py-0.5">
            {options.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => {
                  onChange(opt);
                  setOpen(false);
                }}
                className={`flex w-full items-center justify-between px-2.5 py-1 text-left text-[10.5px] rounded-lg transition-colors cursor-pointer ${
                  value === opt
                    ? "bg-[#351c13] font-semibold text-white"
                    : "text-[#24130d] hover:bg-white hover:text-[#24130d]"
                }`}
              >
                <span>{opt}</span>
                {value === opt && <span className="text-amber-300 ml-2 font-bold">✓</span>}
              </button>
            ))}
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

const COLOR_SWATCHES = [
  { name: "All", hex: "linear-gradient(135deg, #171310 0%, #d8a9a2 50%, #d9a15c 100%)" },
  { name: "Black", hex: "#171310" },
  { name: "Ivory / Nude", hex: "#f2e9d9" },
  { name: "Brown / Tan", hex: "#6c3d2c" },
  { name: "Blush / Rose", hex: "#d8a9a2" },
  { name: "Silver / Chrome", hex: "#b8b8b5" },
  { name: "Gold", hex: "#d9a15c" },
];

function PriceRangeDropdown({
  maxPrice,
  onChange,
  alignRight,
}: {
  maxPrice: number;
  onChange: (val: number) => void;
  alignRight?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [tempPrice, setTempPrice] = useState<string>(maxPrice >= 40000 ? "" : String(maxPrice));
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  useEffect(() => {
    setTempPrice(maxPrice >= 40000 ? "" : String(maxPrice));
  }, [maxPrice]);

  const updatePos = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const width = 270;
      let left = rect.left;
      if (alignRight) {
        left = rect.right - width;
      } else if (typeof window !== "undefined" && window.innerWidth < 640) {
        left = rect.left + rect.width / 2 - width / 2;
      }
      if (typeof window !== "undefined") {
        left = Math.max(12, Math.min(window.innerWidth - width - 12, left));
      }
      setPos({
        top: rect.bottom + 6,
        left,
      });
    }
  };

  const handleToggle = () => {
    if (!open) {
      updatePos();
    }
    setOpen(!open);
  };

  useEffect(() => {
    if (!open) return;
    const handleScrollOrResize = () => updatePos();
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        buttonRef.current &&
        !buttonRef.current.contains(target) &&
        !(target as HTMLElement).closest?.(".follocia-filter-popover")
      ) {
        setOpen(false);
      }
    };
    window.addEventListener("scroll", handleScrollOrResize, true);
    window.addEventListener("resize", handleScrollOrResize);
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      window.removeEventListener("scroll", handleScrollOrResize, true);
      window.removeEventListener("resize", handleScrollOrResize);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open]);

  const isFiltered = maxPrice < 40000;
  const displayVal = maxPrice >= 40000 ? "ALL" : `≤ ₹${maxPrice.toLocaleString("en-IN")}`;

  const handleApplyInput = (valStr: string) => {
    setTempPrice(valStr);
    const cleanStr = valStr.replace(/[^0-9]/g, "");
    if (!cleanStr) {
      onChange(40000);
      return;
    }
    const num = Number(cleanStr);
    if (!isNaN(num) && num > 0) {
      onChange(num);
    }
  };

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={handleToggle}
        className={`flex items-center gap-0.5 cursor-pointer text-[9px] uppercase tracking-wider transition-all select-none px-1.5 py-0.5 sm:px-2 sm:py-0.5 rounded-full shrink-0 ${
          open || isFiltered
            ? "bg-[#351c13] text-white shadow-xs font-semibold"
            : "text-[var(--ink)]/75 hover:text-[var(--ink)] hover:bg-[var(--ink)]/5 font-medium"
        }`}
      >
        <span className={open || isFiltered ? "text-amber-200/80 font-normal" : "text-[var(--ink)]/45 font-medium"}>PRICE</span>
        <span className="font-bold">{displayVal}</span>
        <svg
          width="7"
          height="7"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {open && pos && createPortal(
        <div
          style={{
            position: "fixed",
            top: `${pos.top}px`,
            left: `${pos.left}px`,
            zIndex: 99999,
          }}
          className="follocia-filter-popover w-[270px] max-w-[calc(100vw-24px)] p-3 rounded-xl border border-[#4b261a22] bg-white shadow-[0_16px_40px_rgba(0,0,0,0.25)] animate-in fade-in zoom-in-95 duration-150"
        >
          <div className="flex items-center justify-between text-[10px] font-bold text-[#24130d] mb-2">
            <span>SET PRICE LIMIT</span>
            <span className="text-[var(--gold)] font-bold">
              {maxPrice >= 40000 ? "All Prices" : `Up to ₹${maxPrice.toLocaleString("en-IN")}`}
            </span>
          </div>

          {/* Manual Custom Price Input */}
          <div className="mb-2.5">
            <label className="block text-[8.5px] font-medium text-[#4b261a99] uppercase tracking-wider mb-1">
              Custom Max Price (₹)
            </label>
            <div className="flex items-center gap-1.5">
              <div className="relative flex-1">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-[#4b261a70]">₹</span>
                <input
                  type="number"
                  min="1000"
                  max="100000"
                  step="500"
                  placeholder="e.g. 4000"
                  value={tempPrice}
                  onChange={(e) => handleApplyInput(e.target.value)}
                  className="w-full h-7 pl-6 pr-2 rounded-lg border border-[#4b261a25] bg-white/60 text-[10.5px] font-semibold text-[#24130d] outline-none focus:border-[#351c13] focus:ring-1 focus:ring-[#351c13]"
                />
              </div>
              {maxPrice < 40000 && (
                <button
                  type="button"
                  onClick={() => {
                    setTempPrice("");
                    onChange(40000);
                  }}
                  className="px-2 py-1 text-[8.5px] font-semibold text-[#4b261a99] hover:text-[#24130d] underline cursor-pointer"
                >
                  Reset
                </button>
              )}
            </div>
          </div>

          {/* Range Slider */}
          <input
            type="range"
            min="3000"
            max="40000"
            step="500"
            value={maxPrice >= 40000 ? 40000 : maxPrice}
            onChange={(e) => {
              const val = Number(e.target.value);
              setTempPrice(val >= 40000 ? "" : String(val));
              onChange(val);
            }}
            className="w-full accent-[#351c13] cursor-pointer h-1.5 bg-[#4b261a15] rounded-lg mb-2"
          />
        </div>,
        document.body
      )}
    </>
  );
}

function ColorFilterDropdown({
  value,
  onChange,
  alignRight,
}: {
  value: string;
  onChange: (val: string) => void;
  alignRight?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  const updatePos = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const width = 200;
      let left = rect.left;
      if (alignRight) {
        left = rect.right - width;
      } else if (typeof window !== "undefined" && window.innerWidth < 640) {
        left = rect.left + rect.width / 2 - width / 2;
      }
      if (typeof window !== "undefined") {
        left = Math.max(12, Math.min(window.innerWidth - width - 12, left));
      }
      setPos({
        top: rect.bottom + 6,
        left,
      });
    }
  };

  const handleToggle = () => {
    if (!open) {
      updatePos();
    }
    setOpen(!open);
  };

  useEffect(() => {
    if (!open) return;
    const handleScrollOrResize = () => updatePos();
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        buttonRef.current &&
        !buttonRef.current.contains(target) &&
        !(target as HTMLElement).closest?.(".follocia-filter-popover")
      ) {
        setOpen(false);
      }
    };
    window.addEventListener("scroll", handleScrollOrResize, true);
    window.addEventListener("resize", handleScrollOrResize);
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      window.removeEventListener("scroll", handleScrollOrResize, true);
      window.removeEventListener("resize", handleScrollOrResize);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open]);

  const isFiltered = value !== "All";

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={handleToggle}
        className={`flex items-center gap-0.5 cursor-pointer text-[9px] uppercase tracking-wider transition-all select-none px-1.5 py-0.5 sm:px-2 sm:py-0.5 rounded-full shrink-0 ${
          open || isFiltered
            ? "bg-[#351c13] text-white shadow-xs font-semibold"
            : "text-[var(--ink)]/75 hover:text-[var(--ink)] hover:bg-[var(--ink)]/5 font-medium"
        }`}
      >
        <span className={open || isFiltered ? "text-amber-200/80 font-normal" : "text-[var(--ink)]/45 font-medium"}>COLOR</span>
        <span className="font-bold">{value}</span>
        <svg
          width="7"
          height="7"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {open && pos && createPortal(
        <div
          style={{
            position: "fixed",
            top: `${pos.top}px`,
            left: `${pos.left}px`,
            zIndex: 99999,
          }}
          className="follocia-filter-popover w-[200px] max-w-[calc(100vw-24px)] overflow-hidden rounded-xl border border-[#4b261a22] bg-white p-1.5 shadow-[0_16px_40px_rgba(0,0,0,0.25)] animate-in fade-in zoom-in-95 duration-150"
        >
          <div className="px-2.5 py-1 text-[8.5px] font-bold uppercase tracking-widest text-[#4b261a80] border-b border-[#4b261a12] mb-1">
            Filter by Color
          </div>
          <div className="py-0.5 grid gap-0.5">
            {COLOR_SWATCHES.map((swatch) => (
              <button
                key={swatch.name}
                type="button"
                onClick={() => {
                  onChange(swatch.name);
                  setOpen(false);
                }}
                className={`flex w-full items-center justify-between px-2.5 py-1 text-left text-[10.5px] rounded-lg transition-colors cursor-pointer ${
                  value === swatch.name
                    ? "bg-[#351c13] text-[#fffdf8] font-semibold"
                    : "text-[#24130d] hover:bg-white"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span
                    className="h-3 w-3 rounded-full border border-[#4b261a30] shrink-0 shadow-xs"
                    style={{ background: swatch.hex }}
                  />
                  <span>{swatch.name}</span>
                </div>
                {value === swatch.name && <span className="text-amber-300 font-bold text-[10px]">✓</span>}
              </button>
            ))}
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

export function ProductCard({
  product,
  colorFilter,
  index,
  isSelected,
  onSelect,
}: {
  product: CommerceProduct;
  colorFilter?: string;
  index: number;
  isSelected?: boolean;
  onSelect?: () => void;
}) {
  const { wishlist, toggleWish } = useCart();
  const wished = wishlist.some((x) => x.toLowerCase() === product.id.toLowerCase());
  const [copied, setCopied] = useState(false);

  const displayImage = useMemo(() => {
    if (colorFilter && colorFilter !== "All") {
      const variants = getProductVariants(product);
      const matched = variants.find((v) => matchesColorFilter({ heroColour: v.heroColour, colourName: v.colourName } as any, colorFilter));
      if (matched?.image) return matched.image;
    }
    return productPrimaryImage(product) || product.image || `/products/${(product.designId || product.id).toLowerCase()}.webp`;
  }, [product, colorFilter]);

  const colors = useMemo(() => {
    const raw = product.tone.split(/[\/,·+]/).map((c) => c.trim()).filter(Boolean);
    return raw.length ? raw : [product.tone];
  }, [product.tone]);

  return (
    <article
      onClick={() => {
        window.location.hash = productPath(product);
      }}
      className={`group cursor-pointer rounded-[22px] border bg-white p-2 pb-3.5 shadow-[0_16px_45px_rgba(75,38,26,0.06)] transition-all duration-500 hover:-translate-y-1 hover:shadow-[0_24px_50px_rgba(75,38,26,0.12)] flex flex-col justify-between ${
        isSelected
          ? "border-[var(--gold)] ring-2 ring-[var(--gold)]/40 shadow-[0_20px_50px_rgba(196,141,63,0.15)]"
          : "border-[#4b261a1a] hover:border-[#4b261a33]"
      }`}
    >
      <div className="relative aspect-[0.9] overflow-hidden rounded-[16px] bg-white flex items-center justify-center">
        {/* Available badge matching Pic 1 */}
        <div className="absolute left-2.5 top-2.5 z-10 rounded bg-white/95 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-[#24130d] shadow-sm border border-black/5">
          {product.status === "Live" ? "AVAILABLE" : product.status.toUpperCase()}
        </div>

        <div className="flex h-full w-full items-center justify-center p-3 bg-white">
          <img
            loading="lazy"
            src={displayImage}
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
            className="h-full w-full object-contain transition-transform duration-700 ease-out group-hover:scale-105"
          />
        </div>

        {/* Luxury brown pill button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            window.location.hash = productPath(product);
          }}
          style={{ backgroundColor: "#24130d", color: "#ffffff" }}
          className="absolute bottom-2.5 sm:bottom-3.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-[#24130d] px-4 py-1.5 sm:px-6 sm:py-2 text-[10px] sm:text-[11px] font-semibold uppercase tracking-widest text-white shadow-md opacity-90 sm:opacity-0 sm:group-hover:opacity-100 transition-all duration-300 hover:bg-[#351c13] hover:scale-105 cursor-pointer z-10"
        >
          VIEW
        </button>

        {/* Share Button on Card Image */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            void shareProduct(product, () => {
              setCopied(true);
              setTimeout(() => setCopied(false), 2200);
            });
          }}
          aria-label={`Share ${product.title}`}
          title="Share piece"
          className="absolute right-11 top-2.5 z-10 grid h-8 w-8 place-items-center rounded-full bg-white/95 shadow-sm text-xs transition-transform hover:scale-110 text-[#4b261a] hover:text-[var(--gold)] cursor-pointer border border-black/5"
        >
          {copied ? (
            <span className="text-[10px] font-bold text-emerald-600">✓</span>
          ) : (
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="18" cy="5" r="3" />
              <circle cx="6" cy="12" r="3" />
              <circle cx="18" cy="19" r="3" />
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
              <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
            </svg>
          )}
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
            <a
              href={productPath(product)}
              onClick={(e) => {
                e.stopPropagation();
                window.location.hash = productPath(product);
              }}
              className="mt-0.5 block font-display text-base font-semibold leading-tight text-[#24130d] transition-colors group-hover:text-[var(--gold)] line-clamp-1 cursor-pointer"
            >
              {product.title}
            </a>
          </div>
          <strong className="whitespace-nowrap shrink-0 font-display text-sm font-semibold text-[#24130d]">{typeof product.price === "string" ? product.price.replace(/^Rs\.\s*/, "Rs.\u00A0") : product.price}</strong>
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
          <span>
            {product.availableSizes && product.availableSizes.length > 0
              ? `${product.availableSizes[0]}–${product.availableSizes[product.availableSizes.length - 1].replace("EU ", "")}`
              : "EU 38–41"}
          </span>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                toggleWish(product.id);
              }}
              className={`transition-colors cursor-pointer ${wished ? "font-semibold text-[var(--gold)]" : "hover:text-[#24130d]"}`}
            >
              {wished ? "Saved" : "♡ Save"}
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}

const SIDEBAR_COLOR_LIST = [
  { name: "Black", filterKey: "Black", hex: "#171310" },
  { name: "Ivory / Nude / White", filterKey: "Ivory", hex: "#f8f6f0" },
  { name: "Brown / Tan", filterKey: "Brown", hex: "#6c3d2c" },
  { name: "Pink / Blush", filterKey: "Blush", hex: "#e899a8" },
  { name: "Gold / Monarch", filterKey: "Gold", hex: "#d9a15c" },
  { name: "Silver / Chrome", filterKey: "Silver", hex: "#b8b8b5" },
  { name: "Red / Burgundy", filterKey: "Burgundy", hex: "#9b1b30" },
  { name: "Olive Green", filterKey: "Olive", hex: "#556b2f" },
];

const SIDEBAR_COLLECTIONS = ["All", "Aura", "Bloom", "Muse", "Noire"] as const;
const SIDEBAR_STYLES = ["All", "Heel", "Flat", "Mule", "Boot"] as const;
const SIDEBAR_MATERIALS = [
  "All",
  "Vegan Leather",
  "Satin",
  "Embroidered & Textile",
  "Metallic & Glossy",
  "Crystal & Embellished",
] as const;

interface LeftFilterSidebarProps {
  query: string;
  setQuery: (val: string) => void;
  selectedCollection: string;
  setSelectedCollection: (val: string) => void;
  selectedCategory: string;
  setSelectedCategory: (val: string) => void;
  maxPrice: number;
  setMaxPrice: (val: number) => void;
  colorFilter: string;
  setColorFilter: (val: string) => void;
  materialFilter: string;
  setMaterialFilter: (val: string) => void;
  stock: string;
  setStock: (val: string) => void;
  products: CommerceProduct[];
  activeFilterCount: number;
  onResetAll: () => void;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

function LeftFilterSidebarContent({
  query,
  setQuery,
  selectedCollection,
  setSelectedCollection,
  selectedCategory,
  setSelectedCategory,
  maxPrice,
  setMaxPrice,
  colorFilter,
  setColorFilter,
  materialFilter,
  setMaterialFilter,
  stock,
  setStock,
  products,
  activeFilterCount,
  onResetAll,
  onApplyMobile,
}: LeftFilterSidebarProps & { onApplyMobile?: () => void }) {
  const [colorSearch, setColorSearch] = useState("");

  const collectionCounts = useMemo(() => {
    const map: Record<string, number> = { All: products.length };
    SIDEBAR_COLLECTIONS.forEach((col) => {
      if (col === "All") return;
      map[col] = products.filter((p) =>
        (p.collection || p.edition || "").toLowerCase().includes(col.toLowerCase())
      ).length;
    });
    return map;
  }, [products]);

  const styleCounts = useMemo(() => {
    const map: Record<string, number> = { All: products.length };
    SIDEBAR_STYLES.forEach((st) => {
      if (st === "All") return;
      map[st] = products.filter((p) => {
        const cat = (p.category || "").toLowerCase();
        const sil = (p.silhouette || "").toLowerCase();
        return cat === st.toLowerCase() || sil.includes(st.toLowerCase());
      }).length;
    });
    return map;
  }, [products]);

  const colorCounts = useMemo(() => {
    const map: Record<string, number> = {};
    SIDEBAR_COLOR_LIST.forEach((c) => {
      map[c.filterKey] = products.filter((p) => matchesColorFilter(p, c.filterKey)).length;
    });
    return map;
  }, [products]);

  const filteredColors = useMemo(() => {
    if (!colorSearch.trim()) return SIDEBAR_COLOR_LIST;
    return SIDEBAR_COLOR_LIST.filter((c) =>
      c.name.toLowerCase().includes(colorSearch.toLowerCase())
    );
  }, [colorSearch]);

  return (
    <div className="flex flex-col gap-5 text-[#24130d]">
      {/* Header with Title & Reset Button */}
      <div className="flex items-center justify-between pb-3 border-b border-[#4b261a12]">
        <div className="flex items-center gap-2">
          <SlidersHorizontal size={15} className="text-[#4b261a80]" />
          <h2 className="font-display text-sm font-bold tracking-wider uppercase text-[#24130d]">
            Filters
          </h2>
          {activeFilterCount > 0 && (
            <span className="h-5 min-w-5 px-1.5 rounded-full bg-[#24130d] text-[#fffdf8] text-[10px] font-bold inline-flex items-center justify-center">
              {activeFilterCount}
            </span>
          )}
        </div>

        {activeFilterCount > 0 && (
          <button
            type="button"
            onClick={onResetAll}
            className="flex items-center gap-1 text-[10.5px] font-semibold uppercase tracking-wider text-[var(--gold)] hover:underline cursor-pointer transition-colors"
          >
            <RotateCcw size={11} />
            <span>Reset</span>
          </button>
        )}
      </div>

      {/* 1. KEYWORD SEARCH */}
      <div>
        <label className="block text-[10px] font-bold uppercase tracking-widest text-[#4b261a70] mb-1.5">
          Keyword Search
        </label>
        <div className="relative flex items-center">
          <Search size={14} className="absolute left-3 text-[#4b261a60]" />
          <input
            type="text"
            placeholder="Search piece, color..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full h-9.5 pl-8.5 pr-7.5 rounded-xl border border-[#4b261a20] bg-[#FAF8F5] text-xs text-[#24130d] placeholder:text-[#4b261a50] outline-none focus:border-[#351c13] focus:bg-white transition-all"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="absolute right-2.5 text-xs text-[#4b261a60] hover:text-[#24130d] cursor-pointer"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* 2. COLLECTION */}
      <div className="pt-2 border-t border-[#4b261a0f]">
        <div className="flex items-center justify-between mb-2">
          <label className="text-[10.5px] font-bold uppercase tracking-widest text-[#4b261a80]">
            Collection
          </label>
          {selectedCollection !== "All" && (
            <button
              type="button"
              onClick={() => setSelectedCollection("All")}
              className="text-[10px] text-[var(--gold)] hover:underline cursor-pointer"
            >
              Clear
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {SIDEBAR_COLLECTIONS.map((col) => {
            const isSelected = selectedCollection === col;
            const count = collectionCounts[col] ?? 0;
            return (
              <button
                key={col}
                type="button"
                onClick={() => setSelectedCollection(isSelected && col !== "All" ? "All" : col)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-all cursor-pointer border ${
                  isSelected
                    ? "bg-[#24130d] text-[#fffdf8] border-[#24130d] shadow-2xs"
                    : "bg-white text-[#4b261a99] border-[#4b261a18] hover:border-[#4b261a35] hover:text-[#24130d]"
                }`}
              >
                <span>{col === "All" ? "All Collections" : col}</span>
                <span className={`text-[10px] font-normal ${isSelected ? "text-amber-200" : "text-[#4b261a50]"}`}>
                  ({count})
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. STYLE / CATEGORY */}
      <div className="pt-2 border-t border-[#4b261a0f]">
        <div className="flex items-center justify-between mb-2">
          <label className="text-[10.5px] font-bold uppercase tracking-widest text-[#4b261a80]">
            Style / Category
          </label>
          {selectedCategory !== "All" && (
            <button
              type="button"
              onClick={() => setSelectedCategory("All")}
              className="text-[10px] text-[var(--gold)] hover:underline cursor-pointer"
            >
              Clear
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {SIDEBAR_STYLES.map((st) => {
            const isSelected = selectedCategory === st;
            const count = styleCounts[st] ?? 0;
            return (
              <button
                key={st}
                type="button"
                onClick={() => setSelectedCategory(isSelected && st !== "All" ? "All" : st)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-all cursor-pointer border ${
                  isSelected
                    ? "bg-[#24130d] text-[#fffdf8] border-[#24130d] shadow-2xs"
                    : "bg-white text-[#4b261a99] border-[#4b261a18] hover:border-[#4b261a35] hover:text-[#24130d]"
                }`}
              >
                <span>{st === "All" ? "All Styles" : `${st}s`}</span>
                <span className={`text-[10px] font-normal ${isSelected ? "text-amber-200" : "text-[#4b261a50]"}`}>
                  ({count})
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. PRICE RANGE SLIDER */}
      <div className="pt-2 border-t border-[#4b261a0f]">
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-[10.5px] font-bold uppercase tracking-widest text-[#4b261a80]">
            Price Range
          </label>
          {maxPrice < 40000 && (
            <button
              type="button"
              onClick={() => setMaxPrice(40000)}
              className="text-[10px] text-[var(--gold)] hover:underline cursor-pointer font-semibold"
            >
              Reset
            </button>
          )}
        </div>

        <div className="text-xs font-bold text-[#24130d] mb-2 tracking-wide">
          {maxPrice >= 40000 ? "All Prices (Up to ₹40,000+)" : `Up to ₹${maxPrice.toLocaleString("en-IN")}`}
        </div>

        <input
          type="range"
          min={1000}
          max={40000}
          step={500}
          value={maxPrice >= 40000 ? 40000 : maxPrice}
          onChange={(e) => setMaxPrice(Number(e.target.value))}
          className="w-full accent-[#351c13] cursor-pointer h-2 bg-[#4b261a15] rounded-lg mb-2"
        />

        <div className="flex items-center justify-between text-[10px] text-[#4b261a60] font-medium">
          <span>₹1,000</span>
          <span>₹20,000</span>
          <span>₹40,000+</span>
        </div>

        {/* Quick price chips */}
        <div className="flex items-center gap-1.5 mt-2.5 flex-wrap">
          {[
            { label: "All", val: 40000 },
            { label: "< ₹5k", val: 5000 },
            { label: "< ₹10k", val: 10000 },
            { label: "< ₹20k", val: 20000 },
          ].map((chip) => (
            <button
              key={chip.val}
              type="button"
              onClick={() => setMaxPrice(chip.val)}
              className={`px-2 py-0.5 rounded-md text-[10px] font-semibold transition-all cursor-pointer border ${
                maxPrice === chip.val
                  ? "bg-[#24130d] text-white border-[#24130d]"
                  : "bg-[#FAF8F5] text-[#4b261a80] border-[#4b261a15] hover:text-[#24130d]"
              }`}
            >
              {chip.label}
            </button>
          ))}
        </div>
      </div>

      {/* 5. COLOR WITH SWATCHES */}
      <div className="pt-2 border-t border-[#4b261a0f]">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <label className="text-[10.5px] font-bold uppercase tracking-widest text-[#4b261a80]">
              Color
            </label>
            {colorFilter !== "All" && (
              <span className="text-[10px] font-bold text-[var(--gold)]">
                · {colorFilter}
              </span>
            )}
          </div>
          {colorFilter !== "All" && (
            <button
              type="button"
              onClick={() => setColorFilter("All")}
              className="text-[10px] text-[var(--gold)] hover:underline cursor-pointer font-semibold"
            >
              Reset
            </button>
          )}
        </div>

        {/* Color Search */}
        <input
          type="text"
          placeholder="Find color..."
          value={colorSearch}
          onChange={(e) => setColorSearch(e.target.value)}
          className="w-full h-8 px-3 rounded-lg border border-[#4b261a15] bg-[#FAF8F5] text-xs text-[#24130d] placeholder:text-[#4b261a50] outline-none focus:border-[#351c13] focus:bg-white transition-all mb-2.5"
        />

        {/* Color Swatches Grid */}
        <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1 no-scrollbar">
          {/* All Colors Option */}
          <button
            type="button"
            onClick={() => setColorFilter("All")}
            className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-xs transition-colors cursor-pointer text-left ${
              colorFilter === "All"
                ? "bg-[#24130d] text-[#fffdf8] font-bold"
                : "text-[#4b261a99] hover:bg-[#FAF8F5] hover:text-[#24130d]"
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="h-3.5 w-3.5 rounded-full border border-[#4b261a25] shrink-0 bg-gradient-to-tr from-amber-200 via-rose-300 to-amber-600 shadow-2xs" />
              <span>All Colors</span>
            </div>
            <span className="text-[10.5px] opacity-70">({products.length})</span>
          </button>

          {filteredColors.map((c) => {
            const isSelected = colorFilter === c.filterKey;
            const count = colorCounts[c.filterKey] ?? 0;
            return (
              <button
                key={c.name}
                type="button"
                onClick={() => setColorFilter(isSelected ? "All" : c.filterKey)}
                className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-xs transition-colors cursor-pointer text-left ${
                  isSelected
                    ? "bg-[#24130d] text-[#fffdf8] font-bold"
                    : "text-[#4b261a99] hover:bg-[#FAF8F5] hover:text-[#24130d]"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span
                    className="h-3.5 w-3.5 rounded-full border border-[#4b261a25] shrink-0 shadow-2xs"
                    style={{ backgroundColor: c.hex }}
                  />
                  <span>{c.name}</span>
                </div>
                <span className="text-[10.5px] opacity-70">({count})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 6. MATERIAL */}
      <div className="pt-2 border-t border-[#4b261a0f]">
        <div className="flex items-center justify-between mb-2">
          <label className="text-[10.5px] font-bold uppercase tracking-widest text-[#4b261a80]">
            Material
          </label>
          {materialFilter !== "All" && (
            <button
              type="button"
              onClick={() => setMaterialFilter("All")}
              className="text-[10px] text-[var(--gold)] hover:underline cursor-pointer"
            >
              Clear
            </button>
          )}
        </div>
        <div className="flex flex-col gap-1">
          {SIDEBAR_MATERIALS.map((mat) => {
            const isSelected = materialFilter === mat;
            return (
              <button
                key={mat}
                type="button"
                onClick={() => setMaterialFilter(isSelected && mat !== "All" ? "All" : mat)}
                className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors cursor-pointer text-left ${
                  isSelected
                    ? "bg-[#24130d] text-[#fffdf8] font-bold"
                    : "text-[#4b261a99] hover:bg-[#FAF8F5] hover:text-[#24130d]"
                }`}
              >
                <span>{mat}</span>
                {isSelected && <Check size={13} className="text-amber-300" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* 7. AVAILABILITY */}
      <div className="pt-2 border-t border-[#4b261a0f]">
        <label className="block text-[10.5px] font-bold uppercase tracking-widest text-[#4b261a80] mb-2">
          Availability
        </label>
        <div className="flex flex-col gap-1">
          {[
            { label: "All Pieces", val: "All" },
            { label: "Available now", val: "Available now" },
            { label: "Last pairs (≤ 12 left)", val: "Last pairs" },
          ].map((item) => {
            const isSelected = stock === item.val;
            return (
              <button
                key={item.val}
                type="button"
                onClick={() => setStock(item.val)}
                className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors cursor-pointer text-left ${
                  isSelected
                    ? "bg-[#24130d] text-[#fffdf8] font-bold"
                    : "text-[#4b261a99] hover:bg-[#FAF8F5] hover:text-[#24130d]"
                }`}
              >
                <span>{item.label}</span>
                {isSelected && <Check size={13} className="text-amber-300" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Mobile drawer apply button */}
      {onApplyMobile && (
        <div className="pt-4 border-t border-[#4b261a15]">
          <button
            type="button"
            onClick={onApplyMobile}
            className="w-full py-3 bg-[#24130d] text-white rounded-xl text-xs uppercase font-bold tracking-widest hover:bg-[#351c13] transition-colors cursor-pointer"
          >
            Apply Filters
          </button>
        </div>
      )}
    </div>
  );
}

function LeftFilterSidebar(props: LeftFilterSidebarProps) {
  return (
    <>
      {/* Desktop Sticky Sidebar */}
      <aside className="hidden lg:block w-72 shrink-0 bg-white border border-[#4b261a18] rounded-2xl p-5 shadow-xs sticky top-24 self-start max-h-[calc(100vh-120px)] overflow-y-auto no-scrollbar">
        <LeftFilterSidebarContent {...props} />
      </aside>

      {/* Mobile Off-Canvas Drawer */}
      <AnimatePresence>
        {props.isMobileOpen && (
          <div className="fixed inset-0 z-[9999] lg:hidden flex">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={props.onCloseMobile}
              className="fixed inset-0 bg-black/60 backdrop-blur-xs"
            />

            {/* Drawer */}
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 26, stiffness: 280 }}
              className="relative w-[85vw] max-w-xs bg-white h-full shadow-2xl p-5 overflow-y-auto z-10 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-[#4b261a15] mb-4">
                  <span className="font-display font-bold text-base text-[#24130d]">Filter Footwear</span>
                  <button
                    type="button"
                    onClick={props.onCloseMobile}
                    className="p-1 rounded-full text-[#4b261a70] hover:text-[#24130d] cursor-pointer"
                  >
                    <X size={18} />
                  </button>
                </div>
                <LeftFilterSidebarContent {...props} onApplyMobile={props.onCloseMobile} />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}

export function ShopPage({
  session,
  onLogout,
  onLogin,
}: {
  session: AuthSession | null;
  onLogout: () => void;
  onLogin: () => void;
}) {
  const { add, wishlist, toggleWish, setOpen: setCartOpen } = useCart();
  const [products, setProducts] = useState<CommerceProduct[]>(() => liveProducts());

  // Filter States
  const [query, setQuery] = useState("");
  const [selectedCollection, setSelectedCollection] = useState("All");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [materialFilter, setMaterialFilter] = useState("All");
  const [stock, setStock] = useState("All");
  const [sort, setSort] = useState("Featured");
  const [maxPrice, setMaxPrice] = useState<number>(40000);
  const [colorFilter, setColorFilter] = useState<string>("All");
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  useEffect(() => {
    const sync = () => setProducts(liveProducts());
    window.addEventListener(COMMERCE_EVENT, sync);
    void syncCommerceFromBackend();
    return () => window.removeEventListener(COMMERCE_EVENT, sync);
  }, []);

  // Sync hash/search parameters
  useEffect(() => {
    const updateFromUrl = () => {
      try {
        const hash = window.location.hash || "";
        const search = window.location.search || "";
        const queryStr = hash.includes("?") ? hash.split("?")[1] : search.replace(/^\?/, "");
        const validCols = ["Aura", "Bloom", "Muse", "Noire"];
        const cleanHash = hash.replace(/^#\/?/, "").toLowerCase().split("?")[0];

        if (cleanHash === "shop/flats" || cleanHash === "shop/flat") {
          setSelectedCategory("Flat");
          setSelectedCollection("All");
          return;
        }
        if (cleanHash === "shop/heels" || cleanHash === "shop/heel") {
          setSelectedCategory("Heel");
          setSelectedCollection("All");
          return;
        }
        if (cleanHash === "shop/mules" || cleanHash === "shop/mule") {
          setSelectedCategory("Mule");
          setSelectedCollection("All");
          return;
        }
        if (cleanHash === "shop/boots" || cleanHash === "shop/boot") {
          setSelectedCategory("Boot");
          setSelectedCollection("All");
          return;
        }

        if (cleanHash.startsWith("collection/") || cleanHash.startsWith("collections/")) {
          const colParam = cleanHash.replace(/^collections?\//, "");
          const matched = validCols.find((c) => c.toLowerCase() === colParam.toLowerCase());
          if (matched) {
            setSelectedCollection(matched);
            setSelectedCategory("All");
            return;
          }
        }

        if (queryStr) {
          const params = new URLSearchParams(queryStr);
          const cat = params.get("category") || params.get("cat") || params.get("style");
          if (cat) setSelectedCategory(cat.charAt(0).toUpperCase() + cat.slice(1).toLowerCase());
          const col = params.get("collection") || params.get("col");
          if (col) {
            const matched = validCols.find((c) => c.toLowerCase() === col.toLowerCase());
            if (matched) setSelectedCollection(matched);
          }
        }
      } catch {}
    };
    updateFromUrl();
    window.addEventListener("hashchange", updateFromUrl);
    return () => window.removeEventListener("hashchange", updateFromUrl);
  }, []);

  // Compute filtered & sorted products with high performance
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const tokens = q.split(/\s+/).filter(Boolean);

    return products
      .filter((product) => {
        // 1. Query search
        if (tokens.length > 0) {
          const searchable = [
            product.title,
            product.collection,
            product.edition,
            product.category,
            product.tone,
            product.heroColour,
            product.colourName,
            product.material,
            product.silhouette,
            product.id,
            product.designId,
            String(priceNumber(product.price)),
          ].join(" ").toLowerCase();

          const matchesAll = tokens.every((token) => {
            const root = token.replace(/s$/, "");
            return searchable.includes(token) || searchable.includes(root);
          });
          if (!matchesAll) return false;
        }

        // 2. Collection
        if (selectedCollection !== "All") {
          const col = (product.collection || product.edition || "").toLowerCase();
          if (!col.includes(selectedCollection.toLowerCase())) return false;
        }

        // 3. Category / Style
        if (selectedCategory !== "All") {
          const cat = (product.category || "").toLowerCase();
          const sil = (product.silhouette || "").toLowerCase();
          const target = selectedCategory.toLowerCase();
          if (cat !== target && !sil.includes(target)) return false;
        }

        // 4. Price Limit
        if (maxPrice < 40000) {
          const pPrice = priceNumber(product.price);
          if (pPrice > maxPrice) return false;
        }

        // 5. Color
        if (colorFilter !== "All" && !matchesColorFilter(product, colorFilter)) {
          return false;
        }

        // 6. Material
        if (materialFilter !== "All") {
          const mat = (product.material || "").toLowerCase();
          const tone = (product.tone || "").toLowerCase();
          const title = (product.title || "").toLowerCase();
          const combined = `${mat} ${tone} ${title}`;

          if (materialFilter === "Vegan Leather") {
            if (!combined.includes("leather")) return false;
          } else if (materialFilter === "Satin") {
            if (!combined.includes("satin")) return false;
          } else if (materialFilter === "Embroidered & Textile") {
            const isTextile =
              combined.includes("textile") ||
              combined.includes("embroider") ||
              combined.includes("woven") ||
              combined.includes("mesh");
            if (!isTextile) return false;
          } else if (materialFilter === "Crystal & Embellished") {
            const isEmbellished =
              combined.includes("crystal") ||
              combined.includes("embellish") ||
              combined.includes("pearl") ||
              combined.includes("bead");
            if (!isEmbellished) return false;
          } else if (materialFilter === "Metallic & Glossy") {
            const isMetallic =
              combined.includes("metallic") ||
              combined.includes("glossy") ||
              combined.includes("chrome") ||
              combined.includes("shine") ||
              combined.includes("patent");
            if (!isMetallic) return false;
          } else {
            if (!combined.includes(materialFilter.toLowerCase())) return false;
          }
        }

        // 7. Stock
        if (stock === "Available now" && product.available <= 0) return false;
        if (stock === "Last pairs" && (product.available <= 0 || product.available > 12)) return false;

        return true;
      })
      .sort((a, b) => {
        const pA = priceNumber(a.price);
        const pB = priceNumber(b.price);
        if (sort === "Price low to high") return pA - pB;
        if (sort === "Price high to low") return pB - pA;
        if (sort === "Availability") return b.available - a.available;
        if (sort === "Most limited") return a.produced - b.produced;
        return a.title.localeCompare(b.title);
      });
  }, [products, query, selectedCollection, selectedCategory, maxPrice, colorFilter, materialFilter, stock, sort]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (query.trim()) count++;
    if (selectedCollection !== "All") count++;
    if (selectedCategory !== "All") count++;
    if (maxPrice < 40000) count++;
    if (colorFilter !== "All") count++;
    if (materialFilter !== "All") count++;
    if (stock !== "All") count++;
    return count;
  }, [query, selectedCollection, selectedCategory, maxPrice, colorFilter, materialFilter, stock]);

  const handleResetAll = () => {
    setQuery("");
    setSelectedCollection("All");
    setSelectedCategory("All");
    setMaxPrice(40000);
    setColorFilter("All");
    setMaterialFilter("All");
    setStock("All");
    setSort("Featured");
  };

  const pageTitle = useMemo(() => {
    if (selectedCollection !== "All") return `${selectedCollection} Collection`;
    if (selectedCategory !== "All") return `${selectedCategory}s Collection`;
    if (colorFilter !== "All") return `${colorFilter} Footwear Pieces`;
    if (query) return `Search results for "${query}"`;
    return "All Collection Designs";
  }, [selectedCollection, selectedCategory, colorFilter, query]);

  return (
    <PageShell session={session} onLogout={onLogout} onLogin={onLogin}>
      <div className="mx-auto max-w-[1520px] px-4 sm:px-6 lg:px-8 py-6">
        {/* Page Top Heading Bar */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-[#4b261a12] pb-5">
          <div>
            <span className="text-[10px] uppercase font-bold tracking-[0.2em] text-[var(--gold)]">
              Follicia Footwear
            </span>
            <h1 className="font-display text-2xl sm:text-3xl text-[#24130d] font-bold tracking-tight">
              {pageTitle}
            </h1>
            <p className="text-xs uppercase tracking-widest text-[#4b261a70] mt-1">
              {visible.length} {visible.length === 1 ? "piece" : "pieces"} available
            </p>
          </div>

          <div className="flex items-center gap-3 self-start sm:self-auto">
            {/* Mobile Filter Trigger */}
            <button
              type="button"
              onClick={() => setMobileFiltersOpen(true)}
              className="lg:hidden inline-flex items-center gap-2 rounded-xl border border-[#4b261a25] bg-white px-3.5 py-2 text-xs font-semibold text-[#24130d] shadow-2xs hover:bg-[#FAF8F5] cursor-pointer"
            >
              <SlidersHorizontal size={14} />
              <span>Filters {activeFilterCount > 0 ? `(${activeFilterCount})` : ""}</span>
            </button>

            {/* Sort Selector */}
            <div className="flex items-center gap-2">
              <span className="text-[11px] uppercase tracking-wider text-[#4b261a70] font-semibold hidden sm:inline">Sort:</span>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                className="rounded-xl border border-[#4b261a20] bg-white px-3 py-2 text-xs font-semibold text-[#24130d] outline-none cursor-pointer focus:border-[var(--gold)] shadow-2xs"
              >
                <option value="Featured">Featured Pieces</option>
                <option value="Price low to high">Price: Low to High</option>
                <option value="Price high to low">Price: High to Low</option>
                <option value="Availability">Stock Availability</option>
                <option value="Most limited">Most Limited</option>
              </select>
            </div>
          </div>
        </div>

        {/* Main Two-Column Layout: Left Sidebar + Product Grid */}
        <div className="flex flex-col lg:flex-row gap-8 items-start">
          {/* Left Sidebar Filter */}
          <LeftFilterSidebar
            query={query}
            setQuery={setQuery}
            selectedCollection={selectedCollection}
            setSelectedCollection={setSelectedCollection}
            selectedCategory={selectedCategory}
            setSelectedCategory={setSelectedCategory}
            maxPrice={maxPrice}
            setMaxPrice={setMaxPrice}
            colorFilter={colorFilter}
            setColorFilter={setColorFilter}
            materialFilter={materialFilter}
            setMaterialFilter={setMaterialFilter}
            stock={stock}
            setStock={setStock}
            products={products}
            activeFilterCount={activeFilterCount}
            onResetAll={handleResetAll}
            isMobileOpen={mobileFiltersOpen}
            onCloseMobile={() => setMobileFiltersOpen(false)}
          />

          {/* Right Product Grid Area */}
          <div className="flex-1 min-w-0 w-full">
            {/* Active Filter Chips */}
            {activeFilterCount > 0 && (
              <div className="mb-5 flex flex-wrap items-center gap-1.5 pb-2">
                <span className="text-[10px] uppercase font-bold tracking-wider text-[#4b261a60] mr-1">Active:</span>

                {selectedCollection !== "All" && (
                  <button
                    onClick={() => setSelectedCollection("All")}
                    className="inline-flex items-center gap-1.5 rounded-full bg-[#351c13] text-white px-3 py-1 text-xs font-medium shadow-2xs cursor-pointer hover:bg-[#24130d]"
                  >
                    <span>{selectedCollection} Collection</span>
                    <X size={12} />
                  </button>
                )}

                {selectedCategory !== "All" && (
                  <button
                    onClick={() => setSelectedCategory("All")}
                    className="inline-flex items-center gap-1.5 rounded-full bg-[#351c13] text-white px-3 py-1 text-xs font-medium shadow-2xs cursor-pointer hover:bg-[#24130d]"
                  >
                    <span>{selectedCategory}</span>
                    <X size={12} />
                  </button>
                )}

                {maxPrice < 40000 && (
                  <button
                    onClick={() => setMaxPrice(40000)}
                    className="inline-flex items-center gap-1.5 rounded-full bg-[#351c13] text-white px-3 py-1 text-xs font-medium shadow-2xs cursor-pointer hover:bg-[#24130d]"
                  >
                    <span>Under ₹{maxPrice.toLocaleString("en-IN")}</span>
                    <X size={12} />
                  </button>
                )}

                {colorFilter !== "All" && (
                  <button
                    onClick={() => setColorFilter("All")}
                    className="inline-flex items-center gap-1.5 rounded-full bg-[#351c13] text-white px-3 py-1 text-xs font-medium shadow-2xs cursor-pointer hover:bg-[#24130d]"
                  >
                    <span>Color: {colorFilter}</span>
                    <X size={12} />
                  </button>
                )}

                {materialFilter !== "All" && (
                  <button
                    onClick={() => setMaterialFilter("All")}
                    className="inline-flex items-center gap-1.5 rounded-full bg-[#351c13] text-white px-3 py-1 text-xs font-medium shadow-2xs cursor-pointer hover:bg-[#24130d]"
                  >
                    <span>{materialFilter}</span>
                    <X size={12} />
                  </button>
                )}

                {stock !== "All" && (
                  <button
                    onClick={() => setStock("All")}
                    className="inline-flex items-center gap-1.5 rounded-full bg-[#351c13] text-white px-3 py-1 text-xs font-medium shadow-2xs cursor-pointer hover:bg-[#24130d]"
                  >
                    <span>{stock}</span>
                    <X size={12} />
                  </button>
                )}

                {query.trim() && (
                  <button
                    onClick={() => setQuery("")}
                    className="inline-flex items-center gap-1.5 rounded-full bg-[#351c13] text-white px-3 py-1 text-xs font-medium shadow-2xs cursor-pointer hover:bg-[#24130d]"
                  >
                    <span>"{query}"</span>
                    <X size={12} />
                  </button>
                )}

                <button
                  onClick={handleResetAll}
                  className="text-xs font-semibold text-[var(--gold)] hover:underline ml-2 cursor-pointer"
                >
                  Clear all
                </button>
              </div>
            )}

            {/* Product Cards Grid: 3 columns on desktop, 2 on mobile */}
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-3 gap-3.5 sm:gap-5">
              {visible.map((product, index) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  colorFilter={colorFilter}
                  index={index}
                />
              ))}
            </div>

            {/* Empty State */}
            {visible.length === 0 && (
              <div className="my-8 flex flex-col items-center justify-center border border-[#4b261a1a] bg-white rounded-2xl py-16 px-4 text-center shadow-xs">
                <div className="h-12 w-12 rounded-full bg-[#FAF8F5] flex items-center justify-center mb-3 text-[#4b261a60]">
                  <Filter size={20} />
                </div>
                <h3 className="font-display text-lg font-bold text-[#24130d]">No pieces match your filter selection</h3>
                <p className="mt-1 text-xs text-[#4b261a80] max-w-sm">
                  Try adjusting your price range, clearing color filters, or searching for another silhouette.
                </p>
                <button
                  type="button"
                  onClick={handleResetAll}
                  className="mt-4 px-5 py-2.5 rounded-full bg-[#24130d] text-white text-xs uppercase font-semibold tracking-wider hover:bg-[#351c13] transition-colors cursor-pointer shadow-xs"
                >
                  Reset All Filters
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
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
  const { add, toggleWish, wishlist, setOpen: setCartOpen } = useCart();
  const [products, setProducts] = useState<CommerceProduct[]>(() => liveProducts());
  const [size, setSize] = useState("");
  const [openPanel, setOpenPanel] = useState("Product Details");
  const [added, setAdded] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const [activeImage, setActiveImage] = useState("");
  const imgRef = useRef<HTMLDivElement>(null);
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const rx = useSpring(useTransform(my, [-1, 1], [4, -4]), { stiffness: 100, damping: 20 });
  const ry = useSpring(useTransform(mx, [-1, 1], [-4, 4]), { stiffness: 100, damping: 20 });

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [productId]);

  useEffect(() => {
    const sync = () => setProducts(liveProducts());
    window.addEventListener(COMMERCE_EVENT, sync);
    void syncCommerceFromBackend();
    return () => window.removeEventListener(COMMERCE_EVENT, sync);
  }, []);

  const product = useMemo(() => {
    const target = (productId || "").toLowerCase();
    return products.find(
      (item) => item.id.toLowerCase() === target || slugify(item.title) === target || item.designId?.toLowerCase() === target
    );
  }, [products, productId]);

  const related = useMemo(() => {
    return products.filter((item) => item.id !== product?.id).slice(0, 4);
  }, [products, product?.id]);

  useEffect(() => {
    if (product) {
      setActiveImage(productPrimaryImage(product));
      const activeSizes = product.availableSizes && product.availableSizes.length > 0
        ? product.availableSizes
        : DEFAULT_PRODUCT_SIZES;
      setSize((prev) => (activeSizes.includes(prev) ? prev : activeSizes[0]));
    }
  }, [product?.id, product?.image, product?.images, product?.availableSizes]);

  const storyRecords = activeRecords("stories", [
    { id: "story-craft", title: "Craft Note", meta: "Hand-lasted construction, numbered editions and handcrafted finishing.", status: "Published" },
    { id: "story-size", title: "Size Confidence", meta: "Fits true to size; concierge can review your usual size.", status: "Published" },
    { id: "story-care", title: "Care Promise", meta: "Care kit, restoration guidance and post-purchase check-in.", status: "Published" },
  ]);
  const dropRecords = activeRecords("drops", [{ id: "drop-default", title: "Private drop window", meta: "VIP holds and concierge reservations are open.", status: "Live" }]);
  const seoRecord = activeRecords("seo").find((record) => record.id.includes("product")) || null;

  useEffect(() => {
    if (!product || typeof document === "undefined") return;
    document.title = seoRecord?.title || `${product.title} - Follocia`;
  }, [product?.id, seoRecord?.title]);

  if (!product) {
    return (
      <PageShell session={session} onLogout={onLogout} onLogin={onLogin}>
        <section className="mx-auto grid min-h-[60vh] max-w-[900px] place-items-center px-6 text-center">
          <div>
            <p className="eyebrow text-[var(--gold)]">Shop</p>
            <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mt-4 font-display text-5xl sm:text-6xl text-[#24130d]">Piece not found.</motion.h1>
            <p className="mt-3 text-sm text-[#4b261a70]">The requested design could not be found or has been archived.</p>
            <a href="#/shop" className="mt-8 inline-block rounded-full bg-[#24130d] px-8 py-3.5 text-xs font-semibold uppercase tracking-wider text-white transition-colors hover:bg-[#351c13] shadow-md">Back to Catalogue</a>
          </div>
        </section>
      </PageShell>
    );
  }

  const wished = wishlist.some((x) => x.toLowerCase() === product.id.toLowerCase());
  const gallery = productImages(product);
  const displayImage = activeImage || productPrimaryImage(product);
  const confidence = sizeConfidence(product, size);
  const variants = useMemo(() => getProductVariants(product), [product]);
  const activeVariant = useMemo(() => getActiveVariant(product, displayImage), [product, displayImage]);

  return (
    <PageShell session={session} onLogout={onLogout} onLogin={onLogin}>
      <div className="mx-auto max-w-[1400px] w-full min-w-0 px-3.5 sm:px-6 pt-2.5 pb-1 md:px-10 flex items-center justify-between gap-2 overflow-hidden">
        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-[#4b261a70] min-w-0">
          <a href="#/" className="hover:text-[#24130d] transition-colors shrink-0">Home</a>
          <span className="text-[#4b261a30]">/</span>
          <a href="#/shop" className="hover:text-[#24130d] transition-colors shrink-0">Shop</a>
          {product.category && (
            <>
              <span className="text-[#4b261a30]">/</span>
              <a href={`#/shop?category=${encodeURIComponent(product.category)}`} className="hover:text-[#24130d] transition-colors capitalize shrink-0">{product.category}</a>
            </>
          )}
          <span className="text-[#4b261a30]">/</span>
          <span className="font-semibold text-[#24130d] truncate max-w-[110px] xs:max-w-[180px] sm:max-w-none">{product.title}</span>
        </nav>
        <a href="#/shop" className="inline-flex items-center gap-1 text-[11px] uppercase tracking-widest text-[#4b261a80] hover:text-[#24130d] transition-colors font-semibold shrink-0">
          <span>←</span> <span className="hidden xs:inline">Back to </span><span>Catalogue</span>
        </a>
      </div>

      <section className="mx-auto grid max-w-[1400px] w-full min-w-0 gap-5 sm:gap-6 bg-white px-3.5 sm:px-6 py-2 sm:py-3 md:px-10 lg:grid-cols-[1fr_1fr] xl:grid-cols-[1.05fr_0.95fr] items-start">
        {/* Left Column: Interactive Zoom Hero Image & Thumbnails */}
        <div className="grid gap-2 sm:gap-3 w-full min-w-0">
          <ProductImageZoom
            src={displayImage}
            alt={product.title}
            status={product.status}
            images={gallery}
            productTitle={product.title}
            onSelectImage={(newImg) => setActiveImage(newImg)}
            containerClassName={`${gallery.length > 1 ? "h-[250px] xs:h-[290px] sm:h-[400px] lg:h-[470px]" : "h-[270px] xs:h-[330px] sm:h-[440px] lg:h-[536px]"} rounded-2xl bg-white`}
          />

          {/* Thumbnail Gallery */}
          {gallery.length > 1 && (
            <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
              {gallery.slice(0, 4).map((image, index) => (
                <motion.button type="button" key={`${image}-${index}`} onClick={() => setActiveImage(image)} whileHover={{ scale: 1.02 }} className={`h-12 sm:h-16 w-full overflow-hidden rounded-xl bg-white border cursor-pointer p-1 transition-all flex items-center justify-center ${displayImage === image ? "border-[var(--gold)] ring-2 ring-[var(--gold)]/30 shadow-xs" : "border-[#4b261a15] hover:border-[#4b261a35]"}`}>
                  <img src={image} alt="" className="h-full w-full object-contain transition-transform duration-500 hover:scale-105" />
                </motion.button>
              ))}
            </div>
          )}
        </div>
        
        {/* Right Column: Compact Details, Sizing, Add to Bag */}
        <div className="border border-[#4b261a15] bg-white/95 p-3.5 sm:p-5 lg:p-6 rounded-2xl shadow-[0_12px_35px_rgba(75,38,26,0.05)] backdrop-blur-xl w-full min-w-0 overflow-hidden box-border">
          <div>
            {/* Top Row: Edition, Title & Action Buttons */}
            <div className="flex items-start justify-between gap-2.5 w-full min-w-0">
              <div className="flex-1 min-w-0">
                <motion.p initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="eyebrow text-[var(--gold)] font-bold tracking-widest text-[10px] uppercase truncate">{product.edition || product.collection || "Follicia Collection"}</motion.p>
                <motion.h1 initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mt-1 font-display text-2xl sm:text-3xl font-bold text-[#24130d] tracking-tight leading-tight break-words">{product.title}</motion.h1>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    void shareProduct(product, () => {
                      setShareCopied(true);
                      setTimeout(() => setShareCopied(false), 2400);
                    });
                  }}
                  aria-label="Share piece"
                  title="Share piece"
                  className="grid h-8 w-8 sm:h-9 sm:w-9 place-items-center rounded-full border border-[#4b261a18] transition-all hover:border-[var(--gold)] hover:scale-105 shadow-xs cursor-pointer bg-white text-[#24130d]"
                >
                  {shareCopied ? (
                    <span className="text-xs font-bold text-emerald-600">✓</span>
                  ) : (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="18" cy="5" r="3" />
                      <circle cx="6" cy="12" r="3" />
                      <circle cx="18" cy="19" r="3" />
                      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                      <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                    </svg>
                  )}
                </button>

                <button type="button" onClick={() => toggleWish(product.id)} aria-label="Wishlist" className="grid h-8 w-8 sm:h-9 sm:w-9 place-items-center rounded-full border border-[#4b261a18] transition-all hover:border-[var(--gold)] hover:scale-105 shadow-xs cursor-pointer bg-white">
                  <motion.svg animate={{ scale: wished ? [1, 1.25, 1] : 1 }} width="15" height="15" viewBox="0 0 24 24" fill={wished ? "var(--gold)" : "none"} stroke={wished ? "var(--gold)" : "currentColor"} strokeWidth="1.6"><path d="M12 21s-7-4.35-7-10a4 4 0 0 1 7-2.65A4 4 0 0 1 19 11c0 5.65-7 10-7 10z" /></motion.svg>
                </button>
              </div>
            </div>

            {/* Colour and Price Row */}
            <div className="mt-2 flex items-start justify-between gap-2 border-b border-[#4b261a10] pb-2.5 w-full min-w-0">
              <div className="flex-1 min-w-0 pr-1">
                <p className="text-[11px] text-[#4b261a80] uppercase tracking-[0.12em] font-medium truncate">
                  Colour: <span className="font-semibold text-[#24130d] ml-0.5">{activeVariant.heroColour || product.heroColour || product.colourName || product.tone}</span>
                </p>
                {variants.length > 1 && (
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    {variants.map((v) => {
                      const isSel = v.heroColour === activeVariant.heroColour || v.image === displayImage;
                      return (
                        <button
                          key={v.heroColour}
                          type="button"
                          onClick={() => {
                            if (v.image) setActiveImage(v.image);
                          }}
                          className={`h-6 px-2 rounded-full text-[9.5px] font-semibold uppercase tracking-wider transition-all flex items-center gap-1 cursor-pointer border ${
                            isSel
                              ? "bg-[#24130d] text-white border-[#24130d] shadow-2xs"
                              : "bg-white text-[#4b261a90] border-[#4b261a20] hover:border-[#24130d]"
                          }`}
                          title={v.heroColour}
                        >
                          <span className="h-2 w-2 rounded-full border border-black/10 shrink-0" style={{ backgroundColor: getColorHex(v.heroColour) }} />
                          <span className="truncate max-w-[120px]">{v.colourCode ? `${v.colourCode} - ` : ""}{v.heroColour}</span>
                          {isSel && <span className="text-[9px] text-[var(--gold)]">✓</span>}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
              <div className="text-right shrink-0 whitespace-nowrap pl-2 self-start">
                <span className="font-display text-xl sm:text-2xl text-[#24130d] font-bold whitespace-nowrap inline-block tracking-tight">
                  {typeof product.price === "string" ? product.price.replace(/^Rs\.\s*/, "Rs.\u00A0") : product.price}
                </span>
                <span className="block text-[9px] text-[#4b261a70] whitespace-nowrap">Incl. all taxes</span>
              </div>
            </div>

            {/* Size Selector */}
            <div className="mt-2.5 w-full min-w-0">
              <div className="flex items-center justify-between">
                <p className="eyebrow text-[#4b261a80] font-bold tracking-widest text-[10px]">SELECT SIZE</p>
                <span className="text-[9px] uppercase tracking-widest text-[#4b261a50] font-semibold">EU SIZING</span>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5 sm:gap-2">
                {(product.availableSizes && product.availableSizes.length > 0 ? product.availableSizes : DEFAULT_PRODUCT_SIZES).map((item) => (
                  <motion.button 
                    type="button"
                    key={item} 
                    onClick={() => setSize(item)} 
                    whileTap={{ scale: 0.95 }}
                    className={`h-8 sm:h-9 min-w-[44px] sm:min-w-[48px] px-2 sm:px-2.5 rounded-lg border text-[11px] font-semibold uppercase tracking-wider transition-all duration-200 cursor-pointer ${size === item ? "border-[#24130d] bg-[#24130d] text-white shadow-sm ring-1 ring-[#24130d]/20" : "border-[#4b261a20] bg-white text-[#24130d] hover:border-[var(--gold)] hover:bg-white"}`}
                  >
                    {item}
                  </motion.button>
                ))}
              </div>
              
              {/* Compact Size Confidence helper banner */}
              <div className="mt-2.5 flex items-center justify-between rounded-lg bg-white border border-[#4b261a15] px-2.5 sm:px-3 py-1.5 text-[10px] sm:text-[11px] text-[#4b261a90] w-full min-w-0 box-border">
                <div className="flex items-center gap-1.5 min-w-0 truncate">
                  <span className="text-[var(--gold)] font-bold text-xs shrink-0">✦</span>
                  <span className="truncate">{confidence || "Standard Italian lasts · True to size"}</span>
                </div>
                {size ? (
                  <span className="text-[9.5px] sm:text-[10px] font-semibold text-emerald-700 uppercase tracking-wider shrink-0 ml-1.5">EU {size.replace(/\D/g, "")}</span>
                ) : (
                  <span className="text-[9.5px] sm:text-[10px] text-[var(--gold)] font-medium shrink-0 ml-1.5">Size</span>
                )}
              </div>
            </div>

            {/* Order Action Button */}
            <motion.button 
              type="button"
              whileHover={{ scale: size ? 1.005 : 1 }} 
              whileTap={{ scale: size ? 0.98 : 1 }}
              onClick={() => { 
                if (!size) return;
                add({ id: `${product.id}-${size}`, title: product.title, price: product.price, image: productPrimaryImage(product), tone: product.tone, size }, 1);
                setAdded(true);
                setCartOpen(true);
                setTimeout(() => setAdded(false), 2500);
              }} 
              className={`mt-2.5 w-full rounded-full py-3 sm:py-3.5 eyebrow transition-all duration-300 font-semibold cursor-pointer text-xs uppercase tracking-widest ${size ? "bg-[#15803d] text-white hover:bg-[#166534] shadow-md hover:shadow-lg" : "border border-[#4b261a20] bg-gray-100 text-gray-400 cursor-not-allowed"}`}
              style={size ? { backgroundColor: "#15803d", color: "#ffffff", boxShadow: "0 6px 20px rgba(21, 128, 61, 0.35)" } : undefined}
            >
              {added ? <><motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} className="inline-block mr-2 text-white font-bold">✓</motion.span> Added to Follicia Bag</> : size ? "Reserve & Order Pair →" : "Select Size First"}
            </motion.button>

            {/* Stylist & Hold Buttons */}
            <div className="mt-2 grid gap-2 grid-cols-2 w-full min-w-0">
              <button
                type="button"
                onClick={() => {
                  void saveContactQuery(session?.user.name || "Guest", session?.user.email || "guest@follicia.local", "Concierge reservation", `${product.title}${size ? ` size ${size}` : ""}`);
                  alert("Concierge request sent! Our Follicia team will contact you shortly.");
                }}
                className="rounded-full border border-[#4b261a25] bg-white px-2.5 py-2 text-[10px] sm:text-[11px] uppercase tracking-wider font-semibold text-[#24130d] transition-colors hover:border-[#24130d] hover:bg-[#FAF8F5] cursor-pointer shadow-2xs flex items-center justify-center gap-1 min-w-0"
              >
                <span className="shrink-0">💬</span> <span className="truncate">Ask Stylist</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  void saveContactQuery(session?.user.name || "Guest", session?.user.email || "guest@follicia.local", "24h hold request", `${product.title}${size ? ` size ${size}` : ""}`);
                  alert("24h Hold Requested! Your pair has been reserved for the next 24 hours.");
                }}
                className="rounded-full border border-[var(--gold)]/40 bg-[var(--gold)]/10 px-2.5 py-2 text-[10px] sm:text-[11px] uppercase tracking-wider font-semibold text-[#24130d] transition-colors hover:bg-[var(--gold)]/20 cursor-pointer shadow-2xs flex items-center justify-center gap-1 min-w-0"
              >
                <span className="shrink-0">⏳</span> <span className="truncate">24h Hold</span>
              </button>
            </div>

            {/* Trust Signals: Compact 3-Pill Banner */}
            <div className="mt-2.5 pt-2 border-t border-[#4b261a10] grid grid-cols-3 gap-1 text-center w-full min-w-0">
              <div className="rounded-md bg-white border border-[#4b261a0f] p-1 sm:p-1.5 min-w-0 overflow-hidden">
                <span className="block text-[8px] xs:text-[9px] sm:text-[10px] font-bold uppercase text-[#24130d] truncate">⚡ 48h Dispatch</span>
                <span className="block text-[7.5px] xs:text-[8px] sm:text-[9px] text-[#4b261a70] truncate">Ready to ship</span>
              </div>
              <div className="rounded-md bg-white border border-[#4b261a0f] p-1 sm:p-1.5 min-w-0 overflow-hidden">
                <span className="block text-[8px] xs:text-[9px] sm:text-[10px] font-bold uppercase text-[#24130d] truncate">🚚 Free Express</span>
                <span className="block text-[7.5px] xs:text-[8px] sm:text-[9px] text-[#4b261a70] truncate">All India</span>
              </div>
              <div className="rounded-md bg-white border border-[#4b261a0f] p-1 sm:p-1.5 min-w-0 overflow-hidden">
                <span className="block text-[8px] xs:text-[9px] sm:text-[10px] font-bold uppercase text-[#24130d] truncate">🔄 7D Return</span>
                <span className="block text-[7.5px] xs:text-[8px] sm:text-[9px] text-[#4b261a70] truncate">Size exchange</span>
              </div>
            </div>
          </div>

          {/* Accordion Panels */}
          <div className="mt-3 border-t border-[#4b261a12]">
            {["Product Details", "Craft Story", "Delivery & Returns", "Contact Concierge"].map((panel) => (
              <div key={panel} className="border-b border-[#4b261a10]">
                <button type="button" onClick={() => setOpenPanel(openPanel === panel ? "" : panel)} className="flex w-full items-center justify-between py-2 text-[11px] font-bold uppercase tracking-[0.12em] text-[#24130d] cursor-pointer hover:text-[var(--gold)] transition-colors">
                  <span>{panel}</span>
                  <motion.span animate={{ rotate: openPanel === panel ? 180 : 0 }}>↓</motion.span>
                </button>
                <AnimatePresence>
                  {openPanel === panel && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                      {panel === "Craft Story" ? (
                        <div className="grid gap-1.5 pb-2.5">
                          {storyRecords.slice(0, 3).map((record) => <p key={record.id} className="text-xs leading-relaxed text-[#4b261a80]"><strong className="text-[#24130d]">{record.title}:</strong> {record.meta}</p>)}
                        </div>
                      ) : panel === "Product Details" ? (
                        <div className="grid gap-2 pb-2.5 text-xs leading-relaxed text-[#4b261a80]">
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 p-3 rounded-xl bg-white border border-[#4b261a10]">
                            <div>
                              <span className="block text-[10px] uppercase font-bold tracking-wider text-[#4b261a70]">Design ID</span>
                              <strong className="text-[#24130d] font-mono text-xs">{product.designId || product.id.toUpperCase()}</strong>
                            </div>
                            <div>
                              <span className="block text-[10px] uppercase font-bold tracking-wider text-[#4b261a70]">Product Name</span>
                              <strong className="text-[#24130d] text-xs">{product.title}</strong>
                            </div>
                            <div>
                              <span className="block text-[10px] uppercase font-bold tracking-wider text-[#4b261a70]">Category</span>
                              <strong className="text-[#24130d] text-xs">{product.category || "Heel"}</strong>
                            </div>
                            <div>
                              <span className="block text-[10px] uppercase font-bold tracking-wider text-[#4b261a70]">Silhouette / Toe</span>
                              <strong className="text-[#24130d] text-xs">{product.silhouette || "Open square toe"}</strong>
                            </div>
                            <div className="sm:col-span-2">
                              <span className="block text-[10px] uppercase font-bold tracking-wider text-[#4b261a70]">Material</span>
                              <strong className="text-[#24130d] text-xs">{product.material || "Fine Italian leather & handcrafted textiles"}</strong>
                            </div>
                            <div>
                              <span className="block text-[10px] uppercase font-bold tracking-wider text-[#4b261a70]">Hero Colour</span>
                              <strong className="text-[#24130d] text-xs flex items-center gap-1.5 mt-0.5">
                                <span className="h-2 w-2 rounded-full border border-black/10 inline-block" style={{ backgroundColor: getColorHex(activeVariant.heroColour) }} />
                                {activeVariant.heroColour}
                              </strong>
                            </div>
                            <div>
                              <span className="block text-[10px] uppercase font-bold tracking-wider text-[#4b261a70]">Variant SKU</span>
                              <strong className="text-[#24130d] font-mono text-xs">{activeVariant.colourVariantSku || `${(product.designId || product.id).toUpperCase()}-${activeVariant.colourCode || getHeroColorCode(activeVariant.heroColour)}`}</strong>
                            </div>
                            <div>
                              <span className="block text-[10px] uppercase font-bold tracking-wider text-[#4b261a70]">Full SKU ({size || "EU 38"})</span>
                              <strong className="text-[var(--gold)] font-mono text-xs font-bold">{computeFullSku(product.designId || product.id, activeVariant.colourCode || activeVariant.heroColour, size || "38")}</strong>
                            </div>
                          </div>
                          {product.notes && (
                            <p className="mt-1 text-[11px] text-[#4b261a70] italic">
                              {product.notes}
                            </p>
                          )}
                        </div>
                      ) : panel === "Delivery & Returns" ? (
                        <p className="pb-2.5 text-xs leading-relaxed text-[#4b261a80]">
                          Every order is dispatched in handcrafted luxury packaging. Enjoy complimentary doorstep delivery across India and seamless 7-day complimentary size exchanges.
                        </p>
                      ) : (
                        <p className="pb-2.5 text-xs leading-relaxed text-[#4b261a80]">
                          Need custom sizing or styling assistance? Reach our private concierge at{" "}
                          <a
                            href="mailto:concierge@follicia.com"
                            className="font-medium text-[#24130d] hover:text-[var(--gold)] underline decoration-dotted transition-colors"
                          >
                            concierge@follicia.com
                          </a>{" "}
                          or WhatsApp our personal stylists 24/7.
                        </p>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Curated For You Related Products */}
      <section className="mx-auto max-w-[1400px] px-4 sm:px-6 py-14 md:px-12">
        <div className="mb-8 h-px bg-gradient-to-r from-[var(--gold)]/50 to-transparent" />
        <div className="flex items-center justify-between mb-6">
          <div>
            <span className="text-[10px] uppercase font-bold tracking-[0.2em] text-[var(--gold)]">Curated Selection</span>
            <h2 className="font-display text-2xl sm:text-3xl text-[#24130d] font-bold">You may also admire</h2>
          </div>
          <a href="#/shop" className="text-xs uppercase tracking-wider font-semibold text-[var(--gold)] hover:underline">
            View All →
          </a>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {related.map((item, index) => (
            <ProductCard key={item.id} product={item} index={index} />
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
  const [paymentMethod, setPaymentMethod] = useState("Razorpay Live Gateway");
  const [billingSame, setBillingSame] = useState(true);
  const [saving, setSaving] = useState(false);

  // COD State
  const [codAgreed, setCodAgreed] = useState(true);

  // UI Feedback States
  const [payError, setPayError] = useState("");
  const [payProcessingMessage, setPayProcessingMessage] = useState("");
  const [placedOrderSummary, setPlacedOrderSummary] = useState<{ id: string; method: string; total: number } | null>(null);

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
  const [locating, setLocating] = useState(false);
  const [locError, setLocError] = useState("");
  const [locSuccess, setLocSuccess] = useState("");
  const [pinLoading, setPinLoading] = useState(false);
  const [pinSuccess, setPinSuccess] = useState("");
  const [pinOffices, setPinOffices] = useState<string[]>([]);

  const handleZipChange = async (value: string) => {
    const clean = value.replace(/\D/g, "").slice(0, 6);
    setDraftField("zip", clean);
    setPinSuccess("");
    setPinOffices([]);

    if (clean.length === 6) {
      setPinLoading(true);
      try {
        const info = await lookupPincodeDetails(clean);
        if (info && (info.district || info.state)) {
          setDraft((curr) => ({
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

      setDraft((curr) => ({
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

  const [couponRefreshKey, setCouponRefreshKey] = useState(0);
  const subtotal = items.reduce((sum, item) => sum + (priceNumber(item.price) * item.qty), 0);
  const checkoutCoupon = readCheckoutCoupon(subtotal, session?.user?.email);
  const discount = checkoutCoupon?.discount ?? 0;
  const orderTotal = Math.max(subtotal - discount, 0);
  const privilege = getUserDiscountEligibility(session?.user?.email);

  useEffect(() => {
    if (!profile) return;
    setSelectedAddress(profile.addresses.find((address) => address.isDefault)?.id || profile.addresses[0]?.id || "new");
  }, [profile]);

  const setDraftField = (key: keyof CommerceAddress, value: string | boolean) => setDraft((current) => ({ ...current, [key]: value }));
  const setBillingField = (key: keyof CommerceAddress, value: string | boolean) => setBilling((current) => ({ ...current, [key]: value }));
  const activeAddress = selectedAddress === "new" ? draft : profile?.addresses.find((address) => address.id === selectedAddress) || draft;

  const finalizeOrder = async (payMethodString: string) => {
    let customer: CustomerProfile = profile!;
    if (selectedAddress === "new") {
      const addresses = draft.isDefault ? profile!.addresses.map((address) => ({ ...address, isDefault: false })) : profile!.addresses;
      customer = { ...profile!, addresses: [...addresses, draft], phone: draft.phone || profile!.phone };
      upsertCustomer(customer);
      await saveCustomerRemote(customer);
    }
    const created = await createOrdersFromCartRemote(items, customer, {
      deliveryAddress: `${deliveryType}: ${addressLine(activeAddress)}${billingSame ? "" : ` | Billing: ${addressLine(billing)}`}`,
      paymentMethod: `${payMethodString}${checkoutCoupon ? ` / Coupon ${checkoutCoupon.code}` : ""}`,
    });

    const firstOrderId = Array.isArray(created) && created[0]?.id ? created[0].id : `RSV-${Date.now().toString().slice(-6)}`;
    
    // Record launch discount order for first 10 clients milestone
    if (session?.user?.email) {
      recordLaunchOrder(
        session.user.email,
        session.user.name || profile?.fullName || "Private Client",
        firstOrderId,
        checkoutCoupon?.code
      );
    }
    saveCheckoutCoupon(null);

    setPlacedOrderSummary({
      id: firstOrderId,
      method: payMethodString,
      total: orderTotal,
    });

    clear();
    setSaving(false);
    setPayProcessingMessage("");
    setStep("done");
  };

  const placeOrder = async () => {
    if (!session || !profile || items.length === 0) return;
    setPayError("");

    if (paymentMethod === "Cash on Delivery") {
      if (!codAgreed) {
        setPayError("Please confirm your acceptance of Cash on Delivery.");
        return;
      }
      setSaving(true);
      setPayProcessingMessage("Confirming Cash on Delivery Reservation...");
      await new Promise((r) => setTimeout(r, 600));
      await finalizeOrder("Cash on Delivery");
      return;
    }

    // Official Razorpay Payment Gateway Ecosystem
    setSaving(true);
    setPayProcessingMessage("Connecting to Razorpay Secure Gateway...");

    // 1. Ensure official Razorpay checkout.js script is loaded
    const loaded = await loadRazorpayScript();
    if (!loaded) {
      setSaving(false);
      setPayProcessingMessage("");
      setPayError("Unable to load Razorpay checkout script. Please check your internet connection or adblocker.");
      return;
    }

    // 2. Call backend to create authentic Razorpay Order via Razorpay Orders API
    let rzpOrderData: { orderId: string; keyId: string; amount: number; currency: string } | null = null;
    try {
      const orderRes = await fetch("/api/commerce/razorpay/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: orderTotal,
          currency: "INR",
          receipt: `rcpt_${Date.now()}`,
          customerName: `${activeAddress.firstName} ${activeAddress.lastName}`.trim() || session.user.name,
          customerEmail: session.user.email,
        }),
      });

      const data = await orderRes.json();
      if (!orderRes.ok || !data.success || !data.orderId) {
        setSaving(false);
        setPayProcessingMessage("");
        setPayError(data.message || "Failed to initialize Razorpay order. Please configure Razorpay Key ID & Secret in Admin Settings or appsettings.json.");
        return;
      }
      rzpOrderData = data;
    } catch (err: any) {
      setSaving(false);
      setPayProcessingMessage("");
      setPayError("Cannot connect to server to generate Razorpay order. Ensure backend is running.");
      return;
    }

    // 3. Open official Razorpay Checkout Modal
    setPayProcessingMessage("Opening Razorpay Payment Gateway...");

    const options: any = {
      key: rzpOrderData.keyId,
      amount: rzpOrderData.amount,
      currency: rzpOrderData.currency || "INR",
      name: "Follicia Footwear",
      description: `Reservation - ${items.map((i) => i.title).join(", ")}`,
      image: "/react/assets/follocia-logo-new.png",
      order_id: rzpOrderData.orderId,
      prefill: {
        name: `${activeAddress.firstName} ${activeAddress.lastName}`.trim() || session.user.name,
        email: session.user.email,
        contact: activeAddress.phone || profile.phone || "",
      },
      notes: {
        address: `${activeAddress.address}, ${activeAddress.city}, ${activeAddress.region}`,
      },
      theme: {
        color: "#24130d",
      },
      handler: async function (response: any) {
        setSaving(true);
        setPayProcessingMessage("Verifying Razorpay payment with bank...");
        try {
          const verifyRes = await fetch("/api/commerce/razorpay/verify-payment", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
            }),
          });

          const verifyData = await verifyRes.json();
          if (verifyRes.ok && verifyData.success) {
            await finalizeOrder(`Razorpay (${response.razorpay_payment_id})`);
          } else {
            setSaving(false);
            setPayProcessingMessage("");
            setPayError(verifyData.message || "Razorpay signature verification failed.");
          }
        } catch (err: any) {
          setSaving(false);
          setPayProcessingMessage("");
          setPayError("Network error during Razorpay payment verification.");
        }
      },
      modal: {
        ondismiss: function () {
          setSaving(false);
          setPayProcessingMessage("");
        },
      },
    };

    try {
      const razorpayInstance = new (window as any).Razorpay(options);
      razorpayInstance.on("payment.failed", function (resp: any) {
        setSaving(false);
        setPayProcessingMessage("");
        setPayError(resp.error?.description || "Payment failed via Razorpay.");
      });
      razorpayInstance.open();
    } catch (err: any) {
      setSaving(false);
      setPayProcessingMessage("");
      setPayError(err?.message || "Failed to initialize Razorpay checkout.");
    }
  };

  return (
    <PageShell session={session} onLogout={onLogout} onLogin={onLogin} darkNav>
      <section className="border-b border-[var(--ink)]/10 bg-[var(--ink)] text-[var(--bone)] -mt-20 pt-20">
        <div className="mx-auto flex max-w-[1200px] items-center justify-between px-6 py-8 md:px-12">
          <a href="/" className="font-display text-3xl hover:text-[var(--gold)] transition-colors">Follicia</a>
          <span className="eyebrow text-[var(--gold)]">Secure Checkout</span>
        </div>
      </section>

      <section className="bg-[var(--bone)] py-10 min-h-screen">
        {!session ? (
          <div className="mx-auto grid min-h-[60vh] max-w-[720px] place-items-center px-6 text-center">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass border border-[var(--ink)]/10 p-16 shadow-[var(--shadow-soft)] bg-white/80">
              <h1 className="font-display text-6xl">Sign in to checkout.</h1>
              <p className="mt-4 text-[var(--ink)]/60">Reserve your pair from Follicia.</p>
              <button
                onClick={onLogin}
                style={{
                  backgroundColor: "#15803d",
                  color: "#ffffff",
                  border: "none",
                  boxShadow: "0 6px 20px rgba(21, 128, 61, 0.35)",
                }}
                className="mt-8 rounded-full px-8 py-4 eyebrow text-white transition-all duration-300 bg-[#15803d] hover:bg-[#166534] hover:scale-105 cursor-pointer font-semibold shadow-md"
              >
                Open Login
              </button>
            </motion.div>
          </div>
        ) : items.length === 0 && step !== "done" ? (
          <div className="mx-auto grid min-h-[60vh] max-w-[720px] place-items-center px-6 text-center">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass border border-[var(--ink)]/10 p-16 shadow-[var(--shadow-soft)] bg-white/80">
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="1" className="mx-auto mb-6 opacity-60"><path d="M6 7h12l-1 13H7L6 7z" /><path d="M9 7a3 3 0 1 1 6 0" /></svg>
              <h1 className="font-display text-5xl">Your bag is empty.</h1>
              <a href="#/shop" className="magnetic-btn mt-8 inline-block bg-[#15803d] px-8 py-4 eyebrow text-white transition-colors hover:bg-[#166534]">Start shopping</a>
            </motion.div>
          </div>
        ) : step === "done" ? (
          <div className="mx-auto grid min-h-[60vh] max-w-[820px] place-items-center px-6 text-center">
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="relative glass border border-[var(--gold)]/30 p-12 md:p-16 shadow-[var(--shadow-gold-glow)] bg-white/95 rounded-2xl">
              <GoldenParticles count={30} className="z-0" />
              <div className="relative z-10">
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", delay: 0.2 }} className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 text-3xl text-emerald-700 mb-6 shadow-md">✓</motion.div>
                <p className="eyebrow text-[var(--gold)]">Order Placed Successfully</p>
                <h1 className="mt-4 font-display text-5xl md:text-6xl text-[var(--ink)]">Reservation confirmed.</h1>
                <p className="mt-4 text-[var(--ink)]/70 max-w-md mx-auto text-sm leading-relaxed">
                  Your luxury Follicia footwear has been reserved and registered for preparation.
                </p>

                    {placedOrderSummary && (
                  <div className="my-6 p-5 rounded-xl bg-[#fbf6ed] border border-[var(--gold)]/30 max-w-md mx-auto text-sm text-left shadow-sm">
                    <div className="flex justify-between py-2 border-b border-[var(--ink)]/10">
                      <span className="text-[var(--ink)]/60 text-xs uppercase tracking-wider">Order ID</span>
                      <span className="font-mono font-bold text-[var(--ink)]">{placedOrderSummary.id}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-[var(--ink)]/10">
                      <span className="text-[var(--ink)]/60 text-xs uppercase tracking-wider">Payment Method</span>
                      <span className="font-semibold text-emerald-700">{placedOrderSummary.method}</span>
                    </div>
                    <div className="flex justify-between py-2">
                      <span className="text-[var(--ink)]/60 text-xs uppercase tracking-wider">Total Paid / Payable</span>
                      <span className="font-bold text-lg text-[var(--gold)]">Rs. {placedOrderSummary.total.toLocaleString("en-IN")}</span>
                    </div>
                  </div>
                )}

                <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
                  <a
                    href="#/account/my-orders"
                    style={{
                      backgroundColor: "#15803d",
                      color: "#ffffff",
                      border: "none",
                      boxShadow: "0 6px 20px rgba(21, 128, 61, 0.35)",
                    }}
                    className="rounded-full px-8 py-4 eyebrow text-white transition-all duration-300 bg-[#15803d] hover:bg-[#166534] hover:scale-105 font-semibold shadow-md inline-block"
                  >
                    View Orders Timeline
                  </a>
                  <a href="#/shop" className="rounded-full border border-[var(--ink)]/20 px-8 py-4 eyebrow text-[var(--ink)] transition-colors hover:border-[#24130d] hover:text-[#24130d] font-semibold inline-block">Continue Shopping</a>
                </div>
              </div>
            </motion.div>
          </div>
        ) : (
          <div className="mx-auto grid max-w-[1300px] gap-8 px-4 sm:px-6 py-6 sm:py-10 md:px-12 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="grid gap-6 h-fit">
              <motion.article initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="glass border border-[var(--ink)]/10 bg-white/80 shadow-[var(--shadow-soft)] relative overflow-hidden">
                {step !== "delivery" && <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500" />}
                <header className="grid grid-cols-[52px_1fr_auto] sm:grid-cols-[76px_1fr_auto] items-center border-b border-[var(--ink)]/10">
                  <div className="grid h-14 sm:h-20 place-items-center bg-[var(--gold)]/10 text-xl sm:text-2xl text-[var(--gold)]">✓</div>
                  <h2 className="px-4 sm:px-6 font-display text-xl sm:text-2xl text-[var(--ink)]">Identity</h2>
                </header>
                <div className="px-5 sm:px-10 py-5 sm:py-8">
                  <p className="text-sm text-[var(--ink)]/60">Checkout securely as</p>
                  <p className="mt-1 text-base sm:text-lg font-semibold truncate">{session.user.email}</p>
                </div>
              </motion.article>

              <motion.article initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }} className={`glass border bg-white/80 shadow-[var(--shadow-soft)] relative overflow-hidden ${step === "payment" ? "border-[var(--ink)]/10" : "border-[var(--gold)] shadow-[0_0_20px_oklch(0.78_0.12_80/0.1)]"}`}>
                {step === "payment" && <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500" />}
                <header className="grid grid-cols-[52px_1fr_auto] sm:grid-cols-[76px_1fr_auto] items-center border-b border-[var(--ink)]/10">
                  <div className={`grid h-14 sm:h-20 place-items-center text-lg sm:text-xl font-display ${step === "payment" ? "bg-[var(--gold)]/10 text-[var(--gold)]" : "bg-[var(--ink)] text-white"}`}>{step === "payment" ? "✓" : "2"}</div>
                  <h2 className="px-4 sm:px-6 font-display text-xl sm:text-2xl">Delivery</h2>
                  {step === "payment" && <button onClick={() => setStep("delivery")} className="px-4 sm:px-6 text-sm underline text-[var(--gold)] cursor-pointer">Edit</button>}
                </header>
                <AnimatePresence>
                  {step === "delivery" ? (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="grid gap-6 sm:gap-8 p-4 sm:p-10">
                      <div>
                        <p className="eyebrow text-[var(--gold)] mb-3">Delivery Method</p>
                        <div className="grid gap-3 md:grid-cols-2">
                          {["Home Delivery", "Store Collection"].map((item) => (
                            <button key={item} onClick={() => setDeliveryType(item)} className={`border px-5 py-5 text-left text-sm font-semibold transition-all cursor-pointer ${deliveryType === item ? "border-[var(--gold)] bg-[var(--gold)]/5 shadow-[0_0_10px_oklch(0.78_0.12_80/0.1)]" : "border-[var(--ink)]/15 hover:border-[var(--gold)]/50"}`}>
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
                            <div className="border-t border-[var(--ink)]/10 pt-6">


                              <div className="grid gap-4 md:grid-cols-3">
                                <CheckoutInput label="First Name*" value={draft.firstName} onChange={(value) => setDraftField("firstName", value)} />
                                <CheckoutInput label="Last Name*" value={draft.lastName} onChange={(value) => setDraftField("lastName", value)} />
                                <CheckoutInput label="Phone Number*" value={draft.phone} onChange={(value) => setDraftField("phone", value)} />
                                <CheckoutInput label="Street Address / House No.*" value={draft.address} onChange={(value) => setDraftField("address", value)} wide />
                                <CheckoutInput label="Apartment, Suite, Landmark (Optional)" value={draft.address2} onChange={(value) => setDraftField("address2", value)} wide />
                                <div className="space-y-1">
                                  <CheckoutInput label="PIN / Postal Code*" value={draft.zip} onChange={handleZipChange} />
                                  {pinLoading && (
                                    <p className="text-[11px] text-amber-700 animate-pulse font-medium">⚡ Verifying PIN code...</p>
                                  )}
                                  {pinSuccess && (
                                    <p className="text-[11px] text-emerald-700 font-medium">✓ {pinSuccess}</p>
                                  )}
                                </div>
                                <CheckoutInput label="City*" value={draft.city} onChange={(value) => setDraftField("city", value)} />
                                <CheckoutInput label="State / Region*" value={draft.region} onChange={(value) => setDraftField("region", value)} />
                              </div>

                              {pinOffices.length > 0 && (
                                <div className="mt-3 p-3 rounded-lg bg-[var(--champagne)]/25 border border-[var(--gold)]/30">
                                  <span className="text-[11px] font-semibold text-[var(--ink)] block mb-1.5">
                                    📍 Quick Select Area / Colony for PIN {draft.zip}:
                                  </span>
                                  <div className="flex flex-wrap gap-1.5">
                                    {pinOffices.map((office) => (
                                      <button
                                        key={office}
                                        type="button"
                                        onClick={() => setDraftField("address2", office)}
                                        className="text-[11px] px-2.5 py-1 rounded-full bg-white hover:bg-[var(--gold)]/20 text-[var(--ink)] border border-[var(--gold)]/40 cursor-pointer transition-colors shadow-2xs font-medium"
                                      >
                                        + {office}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                      
                      <button
                        disabled={selectedAddress === "new" && (!draft.firstName || !draft.lastName || !draft.phone || !draft.address)}
                        onClick={() => setStep("payment")}
                        style={{
                          backgroundColor: "#15803d",
                          color: "#ffffff",
                          border: "none",
                          boxShadow: "0 6px 20px rgba(21, 128, 61, 0.35)",
                        }}
                        className="ml-auto w-full rounded-full px-8 py-4 eyebrow text-white disabled:opacity-50 disabled:cursor-not-allowed md:w-auto transition-all duration-300 bg-[#15803d] hover:bg-[#166534] hover:scale-105 cursor-pointer font-semibold shadow-md"
                      >
                        Continue to Payment →
                      </button>
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
                <header className="grid grid-cols-[52px_1fr] sm:grid-cols-[76px_1fr] items-center border-b border-[var(--ink)]/10">
                  <div className={`grid h-14 sm:h-20 place-items-center text-lg sm:text-xl font-display ${step === "payment" ? "bg-[var(--ink)] text-white" : "bg-[var(--ink)]/5"}`}>3</div>
                  <h2 className="px-4 sm:px-6 font-display text-xl sm:text-2xl">Payment</h2>
                </header>
                <AnimatePresence>
                  {step === "payment" && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} className="grid gap-6 sm:gap-8 p-4 sm:p-10">
                      <div>
                        <div className="flex items-center justify-between"><p className="eyebrow text-[var(--gold)]">Billing Address</p><button onClick={() => setBillingSame((value) => !value)} className="text-sm underline cursor-pointer">Edit</button></div>
                        <label className="mt-4 flex items-center gap-3 text-sm cursor-pointer select-none"><input type="checkbox" checked={billingSame} onChange={(event) => setBillingSame(event.target.checked)} className="w-4 h-4 accent-[var(--gold)]" />Same as delivery address</label>
                        <AnimatePresence>
                          {!billingSame && (
                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                              <div className="mt-5 grid gap-4 md:grid-cols-3 border-t border-[var(--ink)]/10 pt-5">
                                <CheckoutInput label="First Name" value={billing.firstName} onChange={(value) => setBillingField("firstName", value)} />
                                <CheckoutInput label="Last Name" value={billing.lastName} onChange={(value) => setBillingField("lastName", value)} />
                                <CheckoutInput label="Phone" value={billing.phone} onChange={(value) => setBillingField("phone", value)} />
                                <CheckoutInput label="Billing Address / Street" value={billing.address} onChange={(value) => setBillingField("address", value)} wide />
                                <CheckoutInput label="Apartment, Suite, Landmark (Optional)" value={billing.address2} onChange={(value) => setBillingField("address2", value)} wide />
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                      
                      <div>
                        <p className="eyebrow text-[var(--gold)] mb-3">Select Payment Method</p>
                        <div className="grid gap-3 md:grid-cols-2">
                          {[
                            { id: "Razorpay Live Gateway", label: "Razorpay Payment Gateway", sub: "Instant UPI (GPay/PhonePe/Paytm), Cards & Netbanking", icon: "🛡️" },
                            { id: "Cash on Delivery", label: "Cash on Delivery", sub: "Pay at Doorstep", icon: "💵" },
                          ].map((item) => (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => {
                                setPaymentMethod(item.id);
                                setPayError("");
                              }}
                              className={`flex flex-col text-left p-4 rounded-xl border transition-all cursor-pointer ${
                                paymentMethod === item.id
                                  ? "border-[var(--gold)] bg-[var(--gold)]/10 shadow-[0_0_15px_oklch(0.78_0.12_80/0.15)] ring-1 ring-[var(--gold)]/30"
                                  : "border-[var(--ink)]/15 hover:border-[var(--gold)]/50 bg-white"
                              }`}
                            >
                              <div className="flex items-center justify-between mb-1.5">
                                <span className="text-xl">{item.icon}</span>
                                <span className={`h-4 w-4 rounded-full border flex items-center justify-center ${
                                  paymentMethod === item.id ? "border-[var(--gold)] bg-[var(--gold)]" : "border-[var(--ink)]/30"
                                }`}>
                                  {paymentMethod === item.id && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
                                </span>
                              </div>
                              <span className="text-sm font-semibold text-[var(--ink)]">{item.label}</span>
                              <span className="text-[11px] text-[var(--ink)]/60 mt-0.5">{item.sub}</span>
                            </button>
                          ))}
                        </div>

                        {/* Cash on Delivery Panel */}
                        {paymentMethod === "Cash on Delivery" && (
                          <div className="mt-6 p-6 rounded-xl border border-[var(--gold)]/30 bg-[#fffdfa] shadow-sm">
                            <div className="flex items-center justify-between border-b border-[var(--ink)]/10 pb-4 mb-5">
                              <div>
                                <h3 className="font-display text-lg text-[var(--ink)]">Cash on Delivery (COD)</h3>
                                <p className="text-xs text-[var(--ink)]/60">Pay at your doorstep upon receiving your package</p>
                              </div>
                              <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800 border border-emerald-200">
                                Available in India
                              </span>
                            </div>

                            <div className="grid gap-4">
                              <div className="rounded-lg bg-[#fbf6ed] p-4 border border-[#4b261a]/10 text-sm text-[var(--ink)]/80 leading-relaxed">
                                <p className="font-semibold text-[var(--ink)] mb-1">How Cash on Delivery works:</p>
                                <ul className="list-disc pl-5 space-y-1 text-xs text-[var(--ink)]/70">
                                  <li>Pay exact amount of <strong className="text-[var(--ink)] font-semibold">Rs. {orderTotal.toLocaleString("en-IN")}</strong> when the delivery agent arrives.</li>
                                  <li>Cash or UPI QR scan at the door are both accepted by our courier partner.</li>
                                  <li>Zero advance payment required. Your pairs will be dispatched immediately.</li>
                                </ul>
                              </div>

                              <label className="flex items-start gap-3 text-xs text-[var(--ink)]/80 cursor-pointer pt-2 select-none">
                                <input
                                  type="checkbox"
                                  checked={codAgreed}
                                  onChange={(e) => {
                                    setCodAgreed(e.target.checked);
                                    setPayError("");
                                  }}
                                  className="mt-0.5 w-4 h-4 accent-[var(--gold)] rounded"
                                />
                                <span>I confirm this reservation with Cash on Delivery and agree to pay Rs. {orderTotal.toLocaleString("en-IN")} upon delivery.</span>
                              </label>
                            </div>
                          </div>
                        )}
                      </div>

                      {payError && (
                        <div className="p-3.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-center gap-2">
                          <span>⚠️</span> {payError}
                        </div>
                      )}

                      {payProcessingMessage && (
                        <div className="p-4 rounded-lg bg-[var(--gold)]/15 border border-[var(--gold)]/40 text-[var(--ink)] text-xs font-semibold flex items-center gap-3 animate-pulse">
                          <span className="inline-block h-3 w-3 rounded-full bg-[var(--gold)] animate-ping" />
                          <span>{payProcessingMessage}</span>
                        </div>
                      )}
                      
                      <button
                        onClick={placeOrder}
                        disabled={saving || (paymentMethod === "Cash on Delivery" && !codAgreed)}
                        className="w-full rounded-full px-8 py-5 eyebrow text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 bg-[#24130d] hover:bg-[#381e14] hover:scale-[1.01] cursor-pointer font-semibold shadow-xl border border-[var(--gold)]/40"
                      >
                        {saving ? (
                          payProcessingMessage || "Authorizing payment..."
                        ) : paymentMethod === "Razorpay Live Gateway" ? (
                          `Pay Rs. ${orderTotal.toLocaleString("en-IN")} via Razorpay`
                        ) : (
                          `Confirm Order (Cash on Delivery) · Rs. ${orderTotal.toLocaleString("en-IN")}`
                        )}
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
                        <span className="font-medium text-[var(--ink)]">Rs. {(priceNumber(item.price) * item.qty).toLocaleString("en-IN")}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-8 border-t border-[var(--ink)]/10 pt-6">
                <div className="grid gap-3 text-sm text-[var(--ink)]/70">
                  <div className="flex justify-between"><span>Subtotal</span><span>Rs. {subtotal.toLocaleString("en-IN")}</span></div>
                  {discount > 0 && (
                    <div className="flex justify-between items-center text-emerald-600 font-medium">
                      <div className="flex items-center gap-1.5">
                        <span>{checkoutCoupon?.title}</span>
                        <button
                          type="button"
                          onClick={() => {
                            saveCheckoutCoupon(null);
                            setCouponRefreshKey((k) => k + 1);
                          }}
                          className="text-[10px] text-red-500 hover:underline font-normal cursor-pointer"
                        >
                          (Remove)
                        </button>
                      </div>
                      <span>- Rs. {discount.toLocaleString("en-IN")}</span>
                    </div>
                  )}
                  {!checkoutCoupon && session?.user?.email && (
                    <div className="my-1.5 p-2.5 rounded-xl border border-amber-300/80 bg-amber-50/80 flex items-center justify-between gap-2 text-xs">
                      <div>
                        <span className="font-bold text-[#24130d] flex items-center gap-1">
                          <span>✨</span>
                          <span>{privilege.code}: {privilege.percent}% OFF</span>
                        </span>
                        <span className="text-[10.5px] text-[#4b261a90] block">
                          {privilege.badge}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const res = validateCoupon(privilege.code, subtotal, session?.user?.email);
                          if (res.quote) {
                            saveCheckoutCoupon(res.quote);
                            setCouponRefreshKey((k) => k + 1);
                          }
                        }}
                        className="bg-[#24130d] text-white hover:bg-[var(--gold)] hover:text-[#24130d] px-2.5 py-1 rounded text-[11px] font-bold uppercase tracking-wider transition-colors cursor-pointer shrink-0"
                      >
                        Apply
                      </button>
                    </div>
                  )}
                  <div className="flex justify-between"><span>Shipping</span><span>Complimentary</span></div>
                  <div className="flex justify-between"><span>Taxes & Duties</span><span>Included</span></div>
                </div>
                
                <div className="mt-6 border-t border-[var(--gold)]/30 pt-6">
                  <div className="flex justify-between items-end">
                    <span className="eyebrow text-[var(--ink)]/60">Estimated Total</span>
                    <span className="font-display text-3xl gradient-gold-text">Rs. {orderTotal.toLocaleString("en-IN")}</span>
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

export { ContactPage } from "./ContactPage";
export { NewArrivalsPage } from "./NewArrivalsPage";
export { OurStoryPage } from "./OurStoryPage";
export { CollectionsPage } from "./CollectionsPage";
