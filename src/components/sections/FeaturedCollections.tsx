import { useEffect, useRef, useState, type MouseEvent } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { Reveal } from "../Reveal";
import { useCart } from "../cart/CartContext";
import { QuickView, type QuickItem } from "../cart/QuickView";
import c1 from "@/assets/collection-1.jpg";
import c2 from "@/assets/collection-2.jpg";
import c3 from "@/assets/collection-3.jpg";
import { COMMERCE_EVENT, getProducts, syncCommerceFromBackend } from "@/lib/commerceStore";

const items: QuickItem[] = [
  { id: "atelier-01", title: "Atelier 01 — Lumière", edition: "Edition of 220", price: "€ 1,480", image: c1, tone: "Ivory Calfskin" },
  { id: "atelier-02", title: "Atelier 02 — Noir Suspendu", edition: "Edition of 180", price: "€ 1,640", image: c2, tone: "Patent Obsidian" },
  { id: "atelier-03", title: "Atelier 03 — Or Liquide", edition: "Edition of 140", price: "€ 1,820", image: c3, tone: "Brushed Champagne" },
];

function Heart({ active }: { active: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill={active ? "var(--gold)" : "none"} stroke="currentColor" strokeWidth="1.5">
      <path d="M12 21s-7-4.35-7-10a4 4 0 0 1 7-2.65A4 4 0 0 1 19 11c0 5.65-7 10-7 10z" />
    </svg>
  );
}

function Card({ item, i, onQuick }: { item: QuickItem; i: number; onQuick: (it: QuickItem) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const rx = useSpring(useTransform(my, [-1, 1], [10, -10]), { stiffness: 150, damping: 15 });
  const ry = useSpring(useTransform(mx, [-1, 1], [-12, 12]), { stiffness: 150, damping: 15 });
  // Dynamic shadow based on tilt
  const shadowX = useSpring(useTransform(mx, [-1, 1], [20, -20]), { stiffness: 100, damping: 20 });
  const shadowY = useSpring(useTransform(my, [-1, 1], [20, -20]), { stiffness: 100, damping: 20 });
  const { wishlist, toggleWish } = useCart();
  const wished = wishlist.includes(item.id);

  const onMove = (e: MouseEvent<HTMLDivElement>) => {
    const r = ref.current!.getBoundingClientRect();
    mx.set(((e.clientX - r.left) / r.width - 0.5) * 2);
    my.set(((e.clientY - r.top) / r.height - 0.5) * 2);
  };
  const reset = () => { mx.set(0); my.set(0); };

  return (
    <Reveal delay={i * 0.12} mode="scale-in">
      <motion.div
        ref={ref}
        onMouseMove={onMove}
        onMouseLeave={reset}
        style={{ rotateX: rx, rotateY: ry, transformPerspective: 1200 }}
        className="group relative card-3d"
        data-cursor="hover"
        data-cursor-label="View"
      >
        {/* Card with holographic shine */}
        <div className="relative overflow-hidden bg-[var(--champagne)]/20 holo-shine">
          <div className="aspect-[3/4] w-full overflow-hidden">
            <motion.img
              src={item.image}
              alt={item.title}
              loading="lazy"
              width={1024}
              height={1280}
              className="h-full w-full object-cover transition-transform duration-[1.4s] ease-[cubic-bezier(.2,.8,.2,1)] group-hover:scale-110"
            />
          </div>

          {/* Gradient overlay */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-[var(--ink)]/80 via-[var(--ink)]/20 to-transparent opacity-0 transition-opacity duration-700 group-hover:opacity-100" />

          {/* Edition number */}
          <div className="absolute left-5 top-5 eyebrow text-[var(--bone)] mix-blend-difference">
            № {String(i + 1).padStart(2, "0")}
          </div>

          {/* Wishlist */}
          <button
            onClick={(e) => { e.stopPropagation(); toggleWish(item.id); }}
            aria-label="Wishlist"
            data-cursor="hover"
            className="absolute right-5 top-5 flex h-10 w-10 items-center justify-center rounded-full border border-[var(--bone)]/30 bg-[var(--ink)]/40 text-[var(--bone)] backdrop-blur-md transition-all hover:scale-110 hover:border-[var(--gold)]/50 hover:shadow-[0_0_15px_var(--gold)/0.3]"
          >
            <Heart active={wished} />
          </button>

          {/* Quick view button */}
          <div className="absolute inset-x-5 bottom-5 flex translate-y-6 flex-col gap-2 opacity-0 transition-all duration-600 ease-[cubic-bezier(.2,.8,.2,1)] group-hover:translate-y-0 group-hover:opacity-100">
            <button
              onClick={() => onQuick(item)}
              data-cursor="hover"
              className="w-full bg-[var(--bone)] py-3.5 eyebrow text-[var(--ink)] transition-all hover:bg-[var(--gold)] hover:shadow-[var(--shadow-gold-glow)]"
            >
              Quick View
            </button>
          </div>

          {/* Edition badge with pulse */}
          <motion.div
            animate={{ boxShadow: ["0 0 0px oklch(0.78 0.12 80 / 0)", "0 0 15px oklch(0.78 0.12 80 / 0.3)", "0 0 0px oklch(0.78 0.12 80 / 0)"] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            className="absolute right-5 bottom-5 rounded-full border border-[var(--bone)]/30 bg-[var(--ink)]/60 px-3 py-1.5 text-[0.6rem] uppercase tracking-[0.25em] text-[var(--bone)] backdrop-blur-md transition-opacity duration-500 group-hover:opacity-0"
          >
            {item.edition}
          </motion.div>
        </div>

        {/* Card info */}
        <div className="mt-6 flex items-end justify-between">
          <div>
            <p className="eyebrow text-[var(--ink)]/45">{item.tone}</p>
            <h3 className="mt-2 font-display text-2xl text-[var(--ink)] md:text-3xl">{item.title}</h3>
          </div>
          <p className="font-display text-xl text-[var(--gold)]">{item.price}</p>
        </div>

        {/* Subtle reflection */}
        <div className="mt-2 h-8 w-full overflow-hidden opacity-[0.03]" style={{ transform: "scaleY(-1)" }}>
          <div className="aspect-[3/4] w-full bg-[var(--champagne)]/30" />
        </div>
      </motion.div>
    </Reveal>
  );
}

export function FeaturedCollections() {
  const [quick, setQuick] = useState<QuickItem | null>(null);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("All");
  const [sort, setSort] = useState("Recommended");
  const [catalogue, setCatalogue] = useState<QuickItem[]>(() =>
    getProducts()
      .filter((item) => item.status !== "Draft")
      .map((item) => ({ id: item.id, title: item.title, edition: item.edition, tone: item.tone, price: item.price, image: item.image })),
  );

  useEffect(() => {
    const sync = () =>
      setCatalogue(
        getProducts()
          .filter((item) => item.status !== "Draft")
          .map((item) => ({ id: item.id, title: item.title, edition: item.edition, tone: item.tone, price: item.price, image: item.image })),
      );
    window.addEventListener(COMMERCE_EVENT, sync);
    void syncCommerceFromBackend();
    return () => window.removeEventListener(COMMERCE_EVENT, sync);
  }, []);

  const visibleCatalogue = (catalogue.length ? catalogue : items)
    .filter((item) => {
      const haystack = `${item.title} ${item.edition} ${item.tone}`.toLowerCase();
      const matchesSearch = haystack.includes(query.trim().toLowerCase());
      const matchesStatus = status === "All" || (status === "Ready to ship" ? !item.edition.toLowerCase().includes("80") : item.edition.includes(status));
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      const priceA = Number(a.price.replace(/[^\d.]/g, "")) || 0;
      const priceB = Number(b.price.replace(/[^\d.]/g, "")) || 0;
      if (sort === "Price: Low to High") return priceA - priceB;
      if (sort === "Price: High to Low") return priceB - priceA;
      return a.title.localeCompare(b.title);
    });

  return (
    <section id="collections" className="relative bg-[var(--bone)] px-6 py-32 md:px-12 md:py-48">
      {/* Section decorative element */}
      <div className="absolute right-0 top-0 h-full w-px bg-gradient-to-b from-transparent via-[var(--gold)]/10 to-transparent" />

      <div className="mx-auto max-w-[1500px]">
        <Reveal mode="rotate-in">
          <div className="mb-20 flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
            <div>
              <div className="flex items-center gap-3">
                <div className="h-px w-6 bg-[var(--gold)]/50" />
                <p className="eyebrow text-[var(--ink)]/60">Edition MMXXV / III</p>
              </div>
              <h2 className="mt-4 font-display text-[clamp(2.5rem,6vw,5.5rem)] leading-[1] tracking-[-0.02em] text-[var(--ink)]">
                The Current <em className="italic text-[var(--gold)] gold-glow-text">Atelier</em>.
              </h2>
            </div>
            <a href="#/shop" className="eyebrow text-[var(--ink)] hover-underline" data-cursor="hover">
              View all editions →
            </a>
          </div>
        </Reveal>

        {/* Filters with glass effect */}
        <Reveal delay={0.1} mode="fade-up">
          <div className="mb-12 grid gap-3 border-y border-[var(--ink)]/8 py-5 md:grid-cols-[1fr_190px_190px]">
            <label className="grid gap-2 text-sm text-[var(--ink)]/50">
              Search catalogue
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search by edition, tone, product..."
                className="h-12 border border-[var(--ink)]/10 bg-white/60 px-4 text-[var(--ink)] outline-none transition-all duration-500 focus:border-[var(--gold)] focus:shadow-[0_0_20px_oklch(0.78_0.12_80/0.1)]"
              />
            </label>
            <label className="grid gap-2 text-sm text-[var(--ink)]/50">
              Filter
              <select value={status} onChange={(event) => setStatus(event.target.value)} className="h-12 border border-[var(--ink)]/10 bg-white/60 px-4 text-[var(--ink)] outline-none">
                {["All", "220", "180", "140", "Ready to ship"].map((item) => <option key={item}>{item}</option>)}
              </select>
            </label>
            <label className="grid gap-2 text-sm text-[var(--ink)]/50">
              Sort
              <select value={sort} onChange={(event) => setSort(event.target.value)} className="h-12 border border-[var(--ink)]/10 bg-white/60 px-4 text-[var(--ink)] outline-none">
                {["Recommended", "Price: Low to High", "Price: High to Low"].map((item) => <option key={item}>{item}</option>)}
              </select>
            </label>
          </div>
        </Reveal>

        <div className="grid grid-cols-1 gap-12 md:grid-cols-3 md:gap-10">
          {visibleCatalogue.map((item, i) => <Card key={item.id} item={item} i={i} onQuick={setQuick} />)}
        </div>
        {visibleCatalogue.length === 0 && (
          <Reveal>
            <div className="border border-[var(--ink)]/8 py-16 text-center">
              <p className="font-display text-3xl">No pieces match this search.</p>
              <button onClick={() => { setQuery(""); setStatus("All"); }} className="mt-5 magnetic-btn bg-[var(--ink)] px-6 py-3 eyebrow text-[var(--bone)]">Clear filters</button>
            </div>
          </Reveal>
        )}
      </div>

      <QuickView item={quick} onClose={() => setQuick(null)} />
    </section>
  );
}
