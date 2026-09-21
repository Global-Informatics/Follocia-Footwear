import { AnimatePresence, motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { useRef, useState, useEffect, type MouseEvent } from "react";
import { useCart, parsePriceNumber } from "./CartContext";
import { shareProduct } from "@/components/pages/ShopPages";
import { ProductImageZoom } from "@/components/ui/ProductImageZoom";
import { X, Heart, Check, Truck, ShieldCheck, ArrowRight, RotateCcw, Sparkles, Share2 } from "lucide-react";

export type QuickItem = {
  id: string;
  title: string;
  edition?: string;
  tone: string;
  price: string;
  image: string;
  images?: string[];
  description?: string;
  category?: string;
  silhouette?: string;
  material?: string;
  heelHeight?: string;
  status?: string;
  available?: number;
};

const ease = [0.2, 0.8, 0.2, 1] as const;
const sizes = ["EU38", "EU39", "EU40", "EU41"];

function getColorHex(colorName?: string): string {
  if (!colorName) return "#f2e9d9";
  const c = colorName.toLowerCase();
  if (c.includes("black") || c.includes("noir") || c.includes("onyx")) return "#171310";
  if (c.includes("brown") || c.includes("chocolate") || c.includes("tan") || c.includes("cognac")) return "#6c3d2c";
  if (c.includes("burgundy") || c.includes("wine") || c.includes("maroon")) return "#711f2c";
  if (c.includes("olive") || c.includes("green") || c.includes("sage")) return "#556b2f";
  if (c.includes("blush") || c.includes("rose") || c.includes("pink")) return "#e899a8";
  if (c.includes("silver") || c.includes("chrome") || c.includes("platinum")) return "#b8b8b5";
  if (c.includes("gold") || c.includes("monarch") || c.includes("amber")) return "#d9a15c";
  return "#f2e9d9"; // default ivory/nude/champagne
}

export function QuickView({ item, onClose }: { item: QuickItem | null; onClose: () => void }) {
  const { add, wishlist, toggleWish, setOpen: setCartOpen } = useCart();
  const [size, setSize] = useState("EU38");
  const [activeImage, setActiveImage] = useState("");
  const [added, setAdded] = useState(false);
  const [copied, setCopied] = useState(false);

  const imgRef = useRef<HTMLDivElement>(null);
  const mx = useMotionValue(0), my = useMotionValue(0);
  const rx = useSpring(useTransform(my, [-1, 1], [6, -6]), { stiffness: 100, damping: 20 });
  const ry = useSpring(useTransform(mx, [-1, 1], [-8, 8]), { stiffness: 100, damping: 20 });

  useEffect(() => {
    if (item) {
      setActiveImage(item.image);
      setSize("EU38");
    }
  }, [item?.id, item?.image]);

  if (!item) return null;

  const wished = wishlist.some((x) => x.toLowerCase() === item.id.toLowerCase());
  const numPrice = parsePriceNumber(item.price);
  const formattedPrice = `Rs. ${numPrice.toLocaleString("en-IN")}`;
  const gallery = item.images && item.images.length > 0 ? item.images : [item.image];

  const onMove = (e: MouseEvent<HTMLDivElement>) => {
    if (!imgRef.current) return;
    const r = imgRef.current.getBoundingClientRect();
    mx.set(((e.clientX - r.left) / r.width - 0.5) * 2);
    my.set(((e.clientY - r.top) / r.height - 0.5) * 2);
  };
  const reset = () => { mx.set(0); my.set(0); };

  const handleAddToCart = () => {
    add({
      id: `${item.id}-${size}`,
      title: item.title,
      price: item.price,
      image: activeImage || item.image,
      tone: item.tone,
      size,
    }, 1);
    setAdded(true);
    setTimeout(() => {
      setAdded(false);
      onClose();
      setCartOpen(true);
    }, 900);
  };

  const handleBuyNow = () => {
    add({
      id: `${item.id}-${size}`,
      title: item.title,
      price: item.price,
      image: activeImage || item.image,
      tone: item.tone,
      size,
    }, 1);
    onClose();
    window.location.hash = "#checkout";
  };

  const handleGoToDetailPage = () => {
    onClose();
    window.location.hash = `#/shop/${item.id}`;
  };

  return (
    <AnimatePresence>
      <motion.div
        key="quickview-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        onClick={onClose}
        className="fixed inset-0 z-[999] bg-[#140b08]/75 backdrop-blur-md"
      />

      <motion.div
        key="quickview-modal"
        initial={{ opacity: 0, scale: 0.95, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.4, ease }}
        className="fixed left-1/2 top-1/2 z-[1000] w-[95vw] max-w-[1140px] max-h-[92vh] md:h-[680px] -translate-x-1/2 -translate-y-1/2 rounded-3xl bg-[#FAF8F5] border border-[#4b261a18] shadow-[0_30px_90px_rgba(20,11,8,0.35)] overflow-hidden flex flex-col md:flex-row"
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close modal"
          className="absolute right-4 top-4 z-30 flex h-9 w-9 items-center justify-center rounded-full border border-[#4b261a18] bg-white/90 text-[#24130d] shadow-sm backdrop-blur-sm transition-all hover:bg-[#24130d] hover:text-white cursor-pointer"
        >
          <X size={18} />
        </button>

        {/* LEFT COLUMN: Dedicated Shoe Display Stage (Uncropped) */}
        <div className="relative w-full md:w-[52%] bg-[#fffaf0] p-6 sm:p-8 md:p-10 flex flex-col justify-between border-b md:border-b-0 md:border-r border-[#4b261a12] shrink-0">
          {/* Top Bar inside image stage */}
          <div className="flex items-center justify-between z-10">
            <span className="rounded-full bg-white/90 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[#24130d] border border-black/5 shadow-2xs flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-pulse" />
              <span>{item.status === "Live" ? "Available Now" : (item.status || "Follicia Collection").toUpperCase()}</span>
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  void shareProduct(item, () => {
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2200);
                  });
                }}
                className="grid h-8 w-8 place-items-center rounded-full bg-white/90 border border-black/5 text-[#24130d] shadow-2xs hover:scale-110 transition-transform cursor-pointer hover:text-[var(--gold)]"
                title="Share Design"
                aria-label="Share Design"
              >
                {copied ? (
                  <span className="text-[10px] font-bold text-emerald-600">✓</span>
                ) : (
                  <Share2 size={15} />
                )}
              </button>

              <button
                type="button"
                onClick={() => toggleWish(item.id)}
                className="grid h-8 w-8 place-items-center rounded-full bg-white/90 border border-black/5 text-[#24130d] shadow-2xs hover:scale-110 transition-transform cursor-pointer"
                title="Save to Wishlist"
              >
                <Heart
                  size={16}
                  className={wished ? "fill-[var(--gold)] text-[var(--gold)]" : "text-[#4b261a80]"}
                />
              </button>
            </div>
          </div>

          {/* Main Shoe Canvas (Full uncropped view with Interactive Zoom) */}
          <div className="relative my-auto w-full aspect-[4/3] sm:aspect-[1/1] max-h-[360px] md:max-h-[420px] flex items-center justify-center">
            <ProductImageZoom
              src={activeImage || item.image}
              alt={item.title}
              images={gallery}
              productTitle={item.title}
              onSelectImage={(newImg) => setActiveImage(newImg)}
              containerClassName="h-full w-full rounded-2xl"
            />
          </div>

          {/* Angle Thumbnails */}
          {gallery.length > 1 && (
            <div className="flex items-center justify-center gap-2.5 z-10 pt-2">
              {gallery.slice(0, 4).map((img, idx) => (
                <button
                  type="button"
                  key={idx}
                  onClick={() => setActiveImage(img)}
                  className={`h-12 w-12 rounded-xl bg-white p-1 border transition-all cursor-pointer overflow-hidden ${
                    activeImage === img
                      ? "border-[var(--gold)] ring-2 ring-[var(--gold)]/40 shadow-xs scale-105"
                      : "border-[#4b261a15] hover:border-[#4b261a35] opacity-75 hover:opacity-100"
                  }`}
                >
                  <img src={img} alt="" className="h-full w-full object-contain mix-blend-multiply" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: Follicia Product Dossier & Actions */}
        <div className="relative w-full md:w-[48%] overflow-y-auto p-6 sm:p-8 lg:p-10 flex flex-col justify-between bg-white/70">
          <div>
            {/* Header info */}
            <div>
              <p className="text-[10.5px] uppercase font-bold tracking-[0.2em] text-[var(--gold)]">
                {item.edition || item.category || "Follicia Footwear"}
              </p>
              <h2 className="mt-1 font-display text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-[#24130d]">
                {item.title}
              </h2>

              <div className="mt-2.5 flex items-center gap-2 text-xs text-[#4b261a85]">
                <span
                  className="h-3 w-3 rounded-full border border-black/10 shadow-2xs shrink-0"
                  style={{ backgroundColor: getColorHex(item.tone) }}
                />
                <span className="font-semibold text-[#24130d]">{item.tone}</span>
                {item.material && <span>· {item.material}</span>}
              </div>

              {/* Price Tag */}
              <div className="mt-4 flex items-baseline gap-2 flex-wrap sm:flex-nowrap">
                <span className="font-display text-2xl sm:text-3xl font-bold text-[#24130d] whitespace-nowrap shrink-0">
                  {typeof formattedPrice === "string" ? formattedPrice.replace(/^Rs\.\s*/, "Rs.\u00A0") : formattedPrice}
                </span>
                <span className="text-[11px] text-[#4b261a70] whitespace-nowrap">
                  Inclusive of all taxes & duties
                </span>
              </div>
            </div>

            <div className="my-5 h-px bg-[#4b261a12]" />

            {/* Description */}
            <p className="text-xs sm:text-[13px] leading-relaxed text-[#4b261a90]">
              {item.description || "Hand-lasted luxury footwear designed for elegant movement. Crafted in limited numbered editions with bespoke proportions and plush memory comfort cushioning."}
            </p>

            {/* Size Selector */}
            <div className="mt-6">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#24130d]">
                  Select Size (EU)
                </span>
                <span className="text-[10px] uppercase tracking-wider text-[#4b261a60] font-semibold">
                  Fits True to Size
                </span>
              </div>

              <div className="mt-2.5 flex flex-wrap gap-2.5">
                {sizes.map((s) => {
                  const isSel = size === s;
                  return (
                    <button
                      type="button"
                      key={s}
                      onClick={() => setSize(s)}
                      className={`h-11 min-w-[62px] px-3.5 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer border ${
                        isSel
                          ? "bg-[#24130d] text-white border-[#24130d] shadow-sm ring-2 ring-[#24130d]/20 scale-102"
                          : "bg-white text-[#24130d] border-[#4b261a20] hover:border-[var(--gold)] hover:bg-[#fffdf8]"
                      }`}
                    >
                      {s}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="mt-7 flex flex-col gap-2.5">
              <motion.button
                type="button"
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleAddToCart}
                style={{
                  backgroundColor: "#15803d",
                  color: "#ffffff",
                  boxShadow: "0 6px 20px rgba(21, 128, 61, 0.35)",
                }}
                className="w-full h-13 rounded-xl bg-[#15803d] hover:bg-[#166534] text-white text-xs uppercase font-bold tracking-widest shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {added ? (
                  <>
                    <Check size={16} className="text-white" />
                    <span>Added to Follicia Bag</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={14} className="text-white" />
                    <span>Add to Bag · {formattedPrice}</span>
                  </>
                )}
              </motion.button>

              <button
                type="button"
                onClick={handleBuyNow}
                className="w-full h-11 rounded-xl border border-[#15803d]/40 bg-white hover:bg-emerald-50 text-[#15803d] text-xs uppercase font-bold tracking-wider transition-colors cursor-pointer"
              >
                Instant Checkout →
              </button>
            </div>
          </div>

          {/* Trust Assurances Footer */}
          <div className="mt-6 pt-5 border-t border-[#4b261a12]">
            <div className="grid grid-cols-2 gap-2 text-[11px] text-[#4b261a85]">
              <div className="flex items-center gap-1.5">
                <Truck size={13} className="text-[var(--gold)] shrink-0" />
                <span>Complimentary Express Delivery</span>
              </div>
              <div className="flex items-center gap-1.5">
                <RotateCcw size={13} className="text-[var(--gold)] shrink-0" />
                <span>7-Day Complimentary Size Exchange</span>
              </div>
              <div className="flex items-center gap-1.5">
                <ShieldCheck size={13} className="text-[var(--gold)] shrink-0" />
                <span>100% Authentic Handcrafted</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 shrink-0" />
                <span>Dispatches within 48 Hours</span>
              </div>
            </div>

            {/* Direct Link to Full Product Page */}
            <button
              type="button"
              onClick={handleGoToDetailPage}
              className="mt-4 inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-[var(--gold)] hover:underline cursor-pointer"
            >
              <span>Explore full story & styling details</span>
              <ArrowRight size={12} />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
