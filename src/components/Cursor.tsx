import { useEffect, useRef, useState } from "react";
import { motion, useMotionValue, useSpring, AnimatePresence } from "framer-motion";

const TRAIL_COUNT = 5;

export function Cursor() {
  const x = useMotionValue(-100);
  const y = useMotionValue(-100);
  const sx = useSpring(x, { stiffness: 350, damping: 28, mass: 0.4 });
  const sy = useSpring(y, { stiffness: 350, damping: 28, mass: 0.4 });
  const [hover, setHover] = useState(false);
  const [label, setLabel] = useState("");
  const [enabled, setEnabled] = useState(false);
  const trails = useRef(
    Array.from({ length: TRAIL_COUNT }, () => ({
      x: useMotionValue(-100),
      y: useMotionValue(-100),
      sx: null as ReturnType<typeof useSpring> | null,
      sy: null as ReturnType<typeof useSpring> | null,
    }))
  );

  // Create springs for trails with increasing delay
  const trail0sx = useSpring(trails.current[0].x, { stiffness: 250, damping: 28, mass: 0.5 });
  const trail0sy = useSpring(trails.current[0].y, { stiffness: 250, damping: 28, mass: 0.5 });
  const trail1sx = useSpring(trails.current[1].x, { stiffness: 200, damping: 28, mass: 0.6 });
  const trail1sy = useSpring(trails.current[1].y, { stiffness: 200, damping: 28, mass: 0.6 });
  const trail2sx = useSpring(trails.current[2].x, { stiffness: 160, damping: 28, mass: 0.7 });
  const trail2sy = useSpring(trails.current[2].y, { stiffness: 160, damping: 28, mass: 0.7 });
  const trail3sx = useSpring(trails.current[3].x, { stiffness: 130, damping: 28, mass: 0.8 });
  const trail3sy = useSpring(trails.current[3].y, { stiffness: 130, damping: 28, mass: 0.8 });
  const trail4sx = useSpring(trails.current[4].x, { stiffness: 100, damping: 28, mass: 0.9 });
  const trail4sy = useSpring(trails.current[4].y, { stiffness: 100, damping: 28, mass: 0.9 });

  const trailSprings = [
    { sx: trail0sx, sy: trail0sy },
    { sx: trail1sx, sy: trail1sy },
    { sx: trail2sx, sy: trail2sy },
    { sx: trail3sx, sy: trail3sy },
    { sx: trail4sx, sy: trail4sy },
  ];

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(pointer: coarse)").matches) return;
    setEnabled(true);

    const move = (e: MouseEvent) => {
      x.set(e.clientX);
      y.set(e.clientY);

      // Update trails
      for (const t of trails.current) {
        t.x.set(e.clientX);
        t.y.set(e.clientY);
      }

      const t = e.target as HTMLElement;
      const isHover = !!t.closest("a, button, [data-cursor='hover']");
      setHover(isHover);

      // Get cursor label
      const labelEl = t.closest("[data-cursor-label]") as HTMLElement | null;
      setLabel(labelEl?.dataset.cursorLabel || "");
    };

    window.addEventListener("mousemove", move);
    return () => window.removeEventListener("mousemove", move);
  }, [x, y]);

  if (!enabled) return null;

  return (
    <>
      {/* Trailing dots */}
      {trailSprings.map((spring, i) => (
        <motion.div
          key={i}
          style={{ x: spring.sx, y: spring.sy }}
          className="pointer-events-none fixed left-0 top-0 z-[98] -translate-x-1/2 -translate-y-1/2"
        >
          <div
            className="rounded-full bg-[var(--gold)]"
            style={{
              width: `${3 - i * 0.4}px`,
              height: `${3 - i * 0.4}px`,
              opacity: 0.3 - i * 0.05,
            }}
          />
        </motion.div>
      ))}

      {/* Main dot */}
      <motion.div
        style={{ x: sx, y: sy }}
        className="pointer-events-none fixed left-0 top-0 z-[100] -translate-x-1/2 -translate-y-1/2 mix-blend-difference"
      >
        <motion.div
          animate={{
            scale: hover ? 2.8 : 1,
            opacity: hover ? 0.5 : 1,
          }}
          transition={{ type: "spring", stiffness: 250, damping: 20 }}
          className="h-2.5 w-2.5 rounded-full bg-[var(--gold)]"
        />
      </motion.div>

      {/* Outer ring */}
      <motion.div
        style={{ x, y }}
        className="pointer-events-none fixed left-0 top-0 z-[99] -translate-x-1/2 -translate-y-1/2"
      >
        <motion.div
          animate={{
            scale: hover ? 1.8 : 1,
            borderColor: hover ? "var(--gold)" : "oklch(0.78 0.12 80 / 0.3)",
            borderRadius: hover ? "30%" : "50%",
          }}
          transition={{ type: "spring", stiffness: 120, damping: 14 }}
          className="h-10 w-10 border opacity-60"
          style={{ borderWidth: "1px" }}
        />
      </motion.div>

      {/* Cursor label */}
      <AnimatePresence>
        {label && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            style={{ x, y }}
            className="pointer-events-none fixed left-5 top-5 z-[101]"
          >
            <span className="eyebrow text-[0.55rem] text-[var(--gold)] bg-[var(--ink)]/80 backdrop-blur-sm px-2 py-1 rounded-sm">
              {label}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
