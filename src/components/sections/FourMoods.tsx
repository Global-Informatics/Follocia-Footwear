import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import auraImg from "@/assets/home/mood-aura-full.webp";
import bloomImg from "@/assets/home/mood-bloom-full.webp";
import museImg from "@/assets/home/mood-muse-full.webp";
import noireImg from "@/assets/home/mood-noire-full.webp";

const MOODS = [
  {
    id: "aura",
    title: "AURA",
    tagline: "RADIANT LIGHT & TIMELESS CHIC",
    copy: "Sunlit Tuscan marble, sculpted metallic straps and contoured elegance designed to capture the golden hour.",
    image: auraImg,
    href: "#/collections?mood=aura",
    accent: "#D9B487",
  },
  {
    id: "bloom",
    title: "BLOOM",
    tagline: "DELICATE FLORALS & EFFORTLESS GRACE",
    copy: "Romantic Italian garden loggias, delicate hand-crafted silk rose petals and botanical sculpted heels.",
    image: bloomImg,
    href: "#/collections?mood=bloom",
    accent: "#E5A99B",
  },
  {
    id: "muse",
    title: "MUSE",
    tagline: "SCULPTURAL LINES & BOLD CONFIDENCE",
    copy: "Architectural modern silhouettes, exotic textural leathers and daring contours for the modern icon.",
    image: museImg,
    href: "#/collections?mood=muse",
    accent: "#C48F53",
  },
  {
    id: "noire",
    title: "NOIRE",
    tagline: "EVENING MYSTIQUE & UNAPOLOGETIC LUXURY",
    copy: "Midnight galas, crystal-encrusted stilettos and deep black obsidian velvet for unforgettable evenings.",
    image: noireImg,
    href: "#/collections?mood=noire",
    accent: "#E2D3B8",
  },
];

export function FourMoods() {
  const [viewMode, setViewMode] = useState<"grid" | "cinema">("grid");
  const [activeCinemaIndex, setActiveCinemaIndex] = useState(0);

  return (
    <section id="in-motion" className="relative w-full bg-[#FAF5ED] py-16 md:py-24 text-[#231815] overflow-hidden">
      <span id="four-moods" className="absolute -top-24 left-0" />

      {/* Section Header */}
      <div className="mx-auto max-w-[1500px] px-6 md:px-12 mb-12">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-[#3B2019]/15 pb-8">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-[#B5824C] font-semibold">
              SIGNATURE EDITIONS
            </p>
            <h2 className="mt-3 font-display text-4xl sm:text-6xl tracking-[0.02em] font-light text-[#3B2019]">
              Four Moods, Infinite Stories.
            </h2>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <p className="max-w-md text-xs sm:text-sm text-[#3B2019]/70 leading-relaxed font-sans">
              From daylight colonnades to midnight galas — explore the complete aesthetic universe of Follicia.
            </p>

            {/* View Switcher: 2x2 Showcase vs Widescreen Cinema */}
            <div className="flex items-center bg-[#EDE3D4] p-1 rounded-full border border-[#3B2019]/10 shrink-0">
              <button
                onClick={() => setViewMode("grid")}
                className={`px-4 py-1.5 rounded-full text-[10px] tracking-[0.16em] uppercase font-semibold transition-all ${
                  viewMode === "grid"
                    ? "bg-[#3B2019] text-[#FAF5ED] shadow-sm"
                    : "text-[#3B2019]/70 hover:text-[#3B2019]"
                }`}
              >
                2×2 Showcase
              </button>
              <button
                onClick={() => setViewMode("cinema")}
                className={`px-4 py-1.5 rounded-full text-[10px] tracking-[0.16em] uppercase font-semibold transition-all ${
                  viewMode === "cinema"
                    ? "bg-[#3B2019] text-[#FAF5ED] shadow-sm"
                    : "text-[#3B2019]/70 hover:text-[#3B2019]"
                }`}
              >
                Cinema
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* MODE 1: Full-Width 2x2 Grid */}
      {viewMode === "grid" && (
        <div className="w-full px-4 md:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            {MOODS.map((mood, idx) => (
              <motion.div
                key={mood.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.6, delay: idx * 0.1 }}
                className="group relative block aspect-[16/10] sm:aspect-[16/10] lg:aspect-[16/9] overflow-hidden rounded-xl bg-[#231815] shadow-xl"
              >
                {/* Full-bleed High-Res Image completely visible in background */}
                <img
                  src={mood.image}
                  alt={mood.title}
                  className="w-full h-full object-cover object-center transition-transform duration-700 ease-out group-hover:scale-105"
                />

                {/* Gentle translucent vignette so photo is fully visible while text is clear */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent transition-opacity duration-500 group-hover:from-black/90" />

                {/* Text Overlays at Bottom Left */}
                <div className="absolute inset-0 p-6 sm:p-8 lg:p-12 flex flex-col justify-end text-[#FAF5ED]">
                  <p className="text-[10px] md:text-xs tracking-[0.24em] uppercase text-[#D9B487] font-semibold mb-1 drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]">
                    COLLECTION 0{idx + 1}
                  </p>
                  <h3 className="font-display text-4xl sm:text-5xl lg:text-6xl tracking-[0.06em] font-light text-[#FAF5ED] drop-shadow-[0_2px_8px_rgba(0,0,0,0.85)]">
                    {mood.title}
                  </h3>
                  <p className="mt-2 text-xs md:text-sm tracking-[0.16em] uppercase text-[#EDE3D4] font-medium drop-shadow-[0_1px_4px_rgba(0,0,0,0.8)]">
                    {mood.tagline}
                  </p>
                  <p className="mt-2 text-xs text-[#FAF5ED]/80 font-sans max-w-md hidden sm:block drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]">
                    {mood.copy}
                  </p>
                  
                  {/* Action row */}
                  <div className="mt-5 flex items-center gap-6">
                    <a
                      href={mood.href}
                      className="inline-flex items-center gap-2 text-xs font-semibold tracking-[0.18em] uppercase text-[#D9B487] hover:text-white transition-colors"
                      data-cursor="hover"
                    >
                      <span>EXPLORE {mood.title}</span>
                      <span>→</span>
                    </a>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* MODE 2: Widescreen Full-Bleed Cinema Showcase */}
      {viewMode === "cinema" && (
        <div className="w-full px-4 md:px-8">
          {/* Cinema Tab Selector */}
          <div className="flex items-center justify-center gap-3 sm:gap-6 mb-6">
            {MOODS.map((m, idx) => (
              <button
                key={m.id}
                onClick={() => setActiveCinemaIndex(idx)}
                className={`px-6 py-2.5 rounded-full text-xs tracking-[0.2em] uppercase font-semibold transition-all ${
                  activeCinemaIndex === idx
                    ? "bg-[#3B2019] text-[#FAF5ED] shadow-md scale-105"
                    : "bg-white/80 text-[#3B2019]/70 hover:text-[#3B2019] border border-[#3B2019]/15"
                }`}
              >
                {m.title}
              </button>
            ))}
          </div>

          {/* Full Widescreen Screen Container with entire photo visible */}
          <div className="relative w-full aspect-[16/9] min-h-[500px] max-h-[80vh] overflow-hidden rounded-2xl shadow-2xl bg-[#1F140E]">
            <AnimatePresence mode="wait">
              <motion.div
                key={MOODS[activeCinemaIndex].id}
                initial={{ opacity: 0, scale: 1.03 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.6 }}
                className="absolute inset-0"
              >
                <img
                  src={MOODS[activeCinemaIndex].image}
                  alt={MOODS[activeCinemaIndex].title}
                  className="w-full h-full object-cover object-center select-none"
                />
                {/* Subtle scrim so the entire photo is clearly visible */}
                <div className="absolute inset-0 bg-gradient-to-r from-black/65 via-black/30 to-transparent w-full md:w-[60%]" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent" />

                {/* Overlaid Content */}
                <div className="absolute inset-0 p-8 sm:p-12 lg:p-20 flex flex-col justify-end max-w-2xl text-[#FAF5ED]">
                  <p className="text-xs uppercase tracking-[0.3em] text-[#D9B487] font-semibold drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]">
                    EDITION 0{activeCinemaIndex + 1}
                  </p>
                  <h3 className="mt-2 font-display text-5xl sm:text-7xl lg:text-8xl tracking-[0.04em] font-light text-[#FAF5ED] drop-shadow-[0_3px_12px_rgba(0,0,0,0.85)]">
                    {MOODS[activeCinemaIndex].title}
                  </h3>
                  <p className="mt-3 font-display italic text-xl sm:text-2xl text-[#EDE3D4] drop-shadow-[0_2px_8px_rgba(0,0,0,0.85)]">
                    {MOODS[activeCinemaIndex].tagline}
                  </p>
                  <p className="mt-4 text-xs sm:text-sm text-[#FAF5ED]/90 font-sans leading-relaxed max-w-lg drop-shadow-[0_1px_4px_rgba(0,0,0,0.8)]">
                    {MOODS[activeCinemaIndex].copy}
                  </p>

                  <div className="mt-6">
                    <a
                      href={MOODS[activeCinemaIndex].href}
                      className="inline-flex items-center gap-3 bg-[#FAF5ED] hover:bg-white text-[#3B2019] px-8 py-3.5 rounded-full text-xs font-semibold tracking-[0.2em] uppercase transition-all shadow-xl hover:scale-105"
                    >
                      <span>EXPLORE {MOODS[activeCinemaIndex].title}</span>
                      <span>→</span>
                    </a>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>

            {/* Prev / Next controls */}
            <div className="absolute bottom-6 right-6 z-20 flex items-center gap-2">
              <button
                onClick={() => setActiveCinemaIndex((prev) => (prev - 1 + MOODS.length) % MOODS.length)}
                className="w-10 h-10 rounded-full bg-black/40 hover:bg-black/70 text-white border border-white/20 grid place-items-center transition-all backdrop-blur-sm shadow-md"
                aria-label="Previous Mood"
              >
                ‹
              </button>
              <button
                onClick={() => setActiveCinemaIndex((prev) => (prev + 1) % MOODS.length)}
                className="w-10 h-10 rounded-full bg-black/40 hover:bg-black/70 text-white border border-white/20 grid place-items-center transition-all backdrop-blur-sm shadow-md"
                aria-label="Next Mood"
              >
                ›
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
