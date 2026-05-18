import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence, useInView } from "framer-motion";
import { Reveal } from "../Reveal";

const quotes = [
  {
    q: "Follocia is the only house that still makes me wait — and I love them for it.",
    a: "Vogue Italia",
    role: "Fashion Editor",
  },
  {
    q: "There is a quiet defiance in every silhouette. These are not shoes; they are sentences.",
    a: "AnOther Magazine",
    role: "Art Director",
  },
  {
    q: "I own one pair. I will own one more this year. That is the point.",
    a: "Camille R., Paris",
    role: "Private Collector",
  },
];

function TypewriterText({ text, isActive }: { text: string; isActive: boolean }) {
  const [displayText, setDisplayText] = useState("");
  const [showCursor, setShowCursor] = useState(true);

  useEffect(() => {
    if (!isActive) {
      setDisplayText(text);
      setShowCursor(false);
      return;
    }
    setDisplayText("");
    setShowCursor(true);
    let i = 0;
    const timer = setInterval(() => {
      i++;
      setDisplayText(text.slice(0, i));
      if (i >= text.length) {
        clearInterval(timer);
        setTimeout(() => setShowCursor(false), 500);
      }
    }, 30);
    return () => clearInterval(timer);
  }, [text, isActive]);

  return (
    <span>
      {displayText}
      {showCursor && <span className="animate-pulse text-[var(--gold)]">|</span>}
    </span>
  );
}

export function Testimonials() {
  const [active, setActive] = useState(0);
  const [hasTyped, setHasTyped] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(sectionRef, { once: true, amount: 0.3 });

  // Auto-advance
  useEffect(() => {
    const timer = setInterval(() => {
      setActive((prev) => (prev + 1) % quotes.length);
    }, 8000);
    return () => clearInterval(timer);
  }, []);

  // Trigger typewriter only once
  useEffect(() => {
    if (isInView && !hasTyped) setHasTyped(true);
  }, [isInView, hasTyped]);

  return (
    <section ref={sectionRef} className="relative overflow-hidden bg-[var(--bone)] px-6 py-32 md:px-12 md:py-44">
      {/* Background gradient that shifts per testimonial */}
      <motion.div
        animate={{
          background: [
            "radial-gradient(ellipse at 30% 50%, oklch(0.78 0.12 80 / 0.04), transparent 60%)",
            "radial-gradient(ellipse at 50% 50%, oklch(0.78 0.12 80 / 0.06), transparent 60%)",
            "radial-gradient(ellipse at 70% 50%, oklch(0.78 0.12 80 / 0.04), transparent 60%)",
          ][active],
        }}
        transition={{ duration: 1.5 }}
        className="absolute inset-0"
      />

      <div className="relative mx-auto max-w-[1500px]">
        <Reveal mode="clip-left">
          <div className="flex items-center gap-3">
            <div className="h-px w-6 bg-[var(--gold)]/50" />
            <p className="eyebrow text-[var(--ink)]/55">Said of the House</p>
          </div>
        </Reveal>

        {/* 3D Carousel */}
        <div className="mt-16 relative" style={{ perspective: 1200 }}>
          <AnimatePresence mode="wait">
            <motion.div
              key={active}
              initial={{ opacity: 0, rotateY: 15, x: 80, filter: "blur(8px)" }}
              animate={{ opacity: 1, rotateY: 0, x: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, rotateY: -15, x: -80, filter: "blur(8px)" }}
              transition={{ duration: 0.8, ease: [0.2, 0.8, 0.2, 1] }}
              className="min-h-[200px]"
            >
              <figure className="flex flex-col">
                {/* Large animated quotation marks */}
                <motion.span
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 0.15, scale: 1 }}
                  transition={{ duration: 0.6 }}
                  className="font-display text-[10rem] leading-none text-[var(--gold)] -mb-24 select-none"
                >
                  "
                </motion.span>

                <blockquote className="font-display text-[clamp(1.8rem,4vw,3.5rem)] leading-[1.2] tracking-[-0.01em] text-[var(--ink)] max-w-4xl">
                  <TypewriterText
                    text={quotes[active].q}
                    isActive={hasTyped && active === quotes.findIndex(q => q.q === quotes[active].q)}
                  />
                </blockquote>

                <div className="mt-10 flex items-center gap-4">
                  {/* Avatar placeholder */}
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.3, type: "spring" }}
                    className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-[var(--gold)]/30 to-[var(--champagne)]/50 text-sm font-semibold text-[var(--ink)]"
                  >
                    {quotes[active].a.charAt(0)}
                  </motion.div>
                  <div>
                    <figcaption className="eyebrow text-[var(--ink)]/70">— {quotes[active].a}</figcaption>
                    <p className="text-xs text-[var(--ink)]/40 mt-1">{quotes[active].role}</p>
                  </div>
                </div>
              </figure>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Navigation dots */}
        <div className="mt-12 flex items-center gap-3">
          {quotes.map((_, i) => (
            <button
              key={i}
              onClick={() => setActive(i)}
              data-cursor="hover"
              className="group relative"
              aria-label={`Testimonial ${i + 1}`}
            >
              <div className={`h-2 w-8 rounded-full transition-all duration-500 ${
                i === active
                  ? "bg-[var(--gold)] shadow-[0_0_10px_var(--gold)/0.3]"
                  : "bg-[var(--ink)]/15 group-hover:bg-[var(--ink)]/30"
              }`} />
              {/* Progress fill for active */}
              {i === active && (
                <motion.div
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ duration: 8, ease: "linear" }}
                  className="absolute inset-0 h-2 rounded-full bg-[var(--gold)]/50 origin-left"
                />
              )}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
