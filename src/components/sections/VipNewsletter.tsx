import { useState, useRef } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { Reveal } from "../Reveal";
import { GoldenParticles } from "../GoldenParticles";

export function VipNewsletter() {
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);
  const [focused, setFocused] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);

  // Mouse responsive orbs
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const orbX = useSpring(useTransform(mx, [-0.5, 0.5], [-30, 30]), { stiffness: 40, damping: 20 });
  const orbY = useSpring(useTransform(my, [-0.5, 0.5], [-20, 20]), { stiffness: 40, damping: 20 });
  const orb2X = useSpring(useTransform(mx, [-0.5, 0.5], [20, -20]), { stiffness: 30, damping: 18 });
  const orb2Y = useSpring(useTransform(my, [-0.5, 0.5], [15, -15]), { stiffness: 30, damping: 18 });

  const handleMouse = (e: React.MouseEvent) => {
    const rect = sectionRef.current?.getBoundingClientRect();
    if (!rect) return;
    mx.set((e.clientX - rect.left) / rect.width - 0.5);
    my.set((e.clientY - rect.top) / rect.height - 0.5);
  };

  return (
    <section
      id="vip"
      ref={sectionRef}
      onMouseMove={handleMouse}
      onMouseLeave={() => { mx.set(0); my.set(0); }}
      className="relative overflow-hidden bg-[var(--ink)] px-6 py-32 text-[var(--bone)] md:px-12 md:py-48"
    >
      {/* Grain */}
      <div className="absolute inset-0 luxe-grain z-[1]" />

      {/* Golden particles */}
      <GoldenParticles count={30} className="z-[1] opacity-40" />

      {/* Pulsating aurora glow */}
      <div className="absolute inset-0 animate-aurora opacity-20 z-0"
        style={{
          background: "linear-gradient(135deg, oklch(0.2 0.08 60), oklch(0.15 0.1 80), oklch(0.18 0.06 40), oklch(0.12 0.08 70))",
          backgroundSize: "300% 300%",
        }}
      />

      {/* Mouse-responsive golden orbs */}
      <motion.div
        style={{ x: orbX, y: orbY }}
        className="absolute left-1/3 top-1/3 h-[50vh] w-[50vh] rounded-full bg-[var(--gold)]/12 blur-[120px] animate-pulse-glow"
      />
      <motion.div
        style={{ x: orb2X, y: orb2Y }}
        className="absolute right-1/4 bottom-1/4 h-[35vh] w-[35vh] rounded-full bg-[oklch(0.7_0.1_40)]/8 blur-[100px] animate-pulse-glow"
        css={{ animationDelay: "2s" }}
      />

      {/* 3D Floating decorative shapes */}
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
        className="absolute left-[10%] top-[15%] z-[1] pointer-events-none opacity-10"
      >
        <div className="h-20 w-20 rounded-full border border-[var(--gold)]" />
      </motion.div>
      <motion.div
        animate={{ rotate: -360 }}
        transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
        className="absolute right-[15%] bottom-[20%] z-[1] pointer-events-none opacity-10"
      >
        <div className="h-14 w-14 border border-[var(--gold)] rotate-45" />
      </motion.div>

      {/* Content */}
      <div className="relative z-10 mx-auto max-w-3xl text-center">
        <Reveal mode="scale-in">
          <div className="flex items-center justify-center gap-3">
            <div className="h-px w-6 bg-[var(--gold)]/60" />
            <p className="eyebrow text-[var(--gold)]">VIP Access</p>
            <div className="h-px w-6 bg-[var(--gold)]/60" />
          </div>
          <h2 className="mt-6 font-display text-[clamp(2.5rem,6vw,5.5rem)] leading-[1] tracking-[-0.02em]">
            Be among the <em className="italic shimmer-text">first</em> to know.
          </h2>
          <p className="mx-auto mt-8 max-w-xl text-base leading-relaxed text-[var(--bone)]/60">
            Members of the Follocia Cercle receive private previews 72 hours before public release. Less than 1% of
            applicants are admitted each season.
          </p>
        </Reveal>

        <Reveal delay={0.2} mode="fade-up">
          <form
            onSubmit={(e) => { e.preventDefault(); if (email) setDone(true); }}
            className="mt-14 flex flex-col items-stretch gap-3 sm:flex-row"
          >
            {/* Input with animated glow border */}
            <div className="relative flex-1">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                placeholder="your@email.com"
                className="w-full border-b border-[var(--bone)]/20 bg-transparent px-2 py-4 text-center text-lg text-[var(--bone)] placeholder:text-[var(--bone)]/25 focus:outline-none sm:text-left transition-all duration-500"
                style={{
                  borderImage: focused ? "linear-gradient(90deg, transparent, var(--gold), transparent) 1" : undefined,
                }}
              />
              {/* Focus glow */}
              <motion.div
                animate={{ opacity: focused ? 1 : 0 }}
                transition={{ duration: 0.4 }}
                className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-[var(--gold)]/10 to-transparent pointer-events-none"
              />
            </div>

            <button
              type="submit"
              disabled={done}
              data-cursor="hover"
              className="magnetic-btn inline-flex items-center justify-center gap-3 border border-[var(--bone)]/30 bg-transparent px-10 py-4 eyebrow text-[var(--bone)] transition-colors hover:text-[var(--ink)] disabled:opacity-60"
            >
              {done ? (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 300 }}
                  className="flex items-center gap-2"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                  Welcome to the Cercle
                </motion.span>
              ) : (
                "Request Invitation"
              )}
            </button>
          </form>
        </Reveal>

        {/* Success confetti-like particles */}
        {done && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mt-8"
          >
            <div className="flex justify-center gap-2">
              {Array.from({ length: 7 }).map((_, i) => (
                <motion.div
                  key={i}
                  initial={{ y: 0, opacity: 0, scale: 0 }}
                  animate={{ y: [-20, 0], opacity: [0, 1, 0.6], scale: [0, 1.2, 1] }}
                  transition={{ delay: i * 0.08, duration: 0.6, ease: "easeOut" }}
                  className="h-1.5 w-1.5 rounded-full bg-[var(--gold)]"
                  style={{ opacity: 0.4 + i * 0.08 }}
                />
              ))}
            </div>
            <p className="mt-3 text-sm text-[var(--gold)]/60">Check your inbox for your private invitation.</p>
          </motion.div>
        )}
      </div>
    </section>
  );
}
