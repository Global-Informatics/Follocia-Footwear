import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { SplitText } from "../SplitText";

const assetUrl = (path: string) => `${import.meta.env.BASE_URL}${path}`.replace(/\/{2,}/g, "/");

const SLIDES = [
  {
    url: assetUrl("images/hero/hero_slide_1.png"),
    title: "The Signature Pump",
    subtitle: "Edition III · Milan"
  },
  {
    url: assetUrl("images/hero/hero_slide_2.png"),
    title: "Summer Collection",
    subtitle: "Edition IV · Paris"
  },
  {
    url: assetUrl("images/hero/hero_slide_3.png"),
    title: "Atelier Gold",
    subtitle: "Private Reserve"
  }
];

export function Hero() {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % SLIDES.length);
    }, 7000); // 7 seconds per slide
    return () => clearInterval(timer);
  }, []);

  return (
    <section className="relative h-[100svh] min-h-[700px] w-full overflow-hidden bg-[var(--ink)]">
      {/* Background Images Carousel with Ken Burns Effect */}
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.5, ease: "easeInOut" }}
          className="absolute inset-0"
        >
          <motion.img
            src={SLIDES[currentIndex].url}
            alt={SLIDES[currentIndex].title}
            initial={{ scale: 1.0 }}
            animate={{ scale: 1.1, x: "-1%", y: "-1%" }}
            transition={{ duration: 10, ease: "linear" }}
            className="h-full w-full object-cover opacity-60"
          />
        </motion.div>
      </AnimatePresence>

      {/* Cinematic Overlays */}
      <div className="absolute inset-0 bg-gradient-to-t from-[var(--ink)] via-[var(--ink)]/40 to-[var(--ink)]/80 z-10" />
      <div className="absolute inset-0 luxe-grain z-10" />

      {/* Content */}
      <div className="absolute inset-0 z-20 mx-auto flex max-w-[1500px] flex-col justify-end px-6 pb-24 md:px-12 md:pb-32">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-12">
          {/* Left Column: Headlines */}
          <div className="max-w-2xl">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 1 }}
              className="flex items-center gap-3 mb-6"
            >
              <div className="h-px w-6 bg-[var(--gold)]/60" />
              <p className="eyebrow text-[var(--gold)]">Maison Follocia · MMXXV</p>
            </motion.div>

            <h1 className="font-display text-[clamp(2.5rem,7vw,6.5rem)] leading-[0.9] tracking-[-0.02em] text-[var(--bone)]">
              <SplitText text="Limited" className="font-display" />
              <br />
              <span className="text-[var(--bone)]/60">for the </span>
              <em className="font-light italic gradient-gold-text">Few.</em>
            </h1>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.2, duration: 1 }}
              className="mt-6 text-xs md:text-sm leading-relaxed text-[var(--bone)]/60 max-w-sm"
            >
              Footwear sculpted in Italian ateliers. Released only six times a year. Once gone, never reissued.
            </motion.p>
          </div>

          {/* Right Column: Active Video Details & CTAs */}
          <div className="flex flex-col items-start md:items-end gap-8">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentIndex}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                transition={{ duration: 0.6 }}
                className="text-left md:text-right"
              >
                <p className="eyebrow text-[var(--gold)]">{SLIDES[currentIndex].subtitle}</p>
                <p className="mt-2 font-display text-2xl text-[var(--bone)]">{SLIDES[currentIndex].title}</p>
              </motion.div>
            </AnimatePresence>

            <div className="flex flex-wrap items-center gap-3">
              <a
                href="#collections"
                data-cursor="hover"
                className="magnetic-btn border border-[var(--bone)]/20 px-6 py-3 text-[10px] uppercase tracking-[0.2em] text-[var(--bone)] transition-colors hover:border-[var(--gold)] hover:bg-[var(--gold)] hover:text-[var(--ink)]"
              >
                Explore Collection
              </a>
              <a
                href="#vip"
                data-cursor="hover"
                className="magnetic-btn bg-[var(--bone)] px-6 py-3 text-[10px] uppercase tracking-[0.2em] text-[var(--ink)] shadow-[var(--shadow-soft)] hover:shadow-[var(--shadow-gold-glow)]"
              >
                VIP Access
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Sleek Progress Indicator */}
      <div className="absolute bottom-10 left-6 right-6 md:left-12 md:right-12 z-20 flex items-center justify-between">
        <div className="flex gap-2">
          {SLIDES.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentIndex(i)}
              className="group py-2 relative"
              aria-label={`Go to slide ${i + 1}`}
            >
              <div className={`h-0.5 transition-all duration-500 ease-out ${i === currentIndex ? "w-12 bg-[var(--gold)]" : "w-6 bg-[var(--bone)]/20 group-hover:bg-[var(--bone)]/40"}`} />
            </button>
          ))}
        </div>
        
        <div className="eyebrow text-[0.6rem] text-[var(--bone)]/50 tracking-[0.4em]">
          0{currentIndex + 1} / 0{SLIDES.length}
        </div>
      </div>
    </section>
  );
}
