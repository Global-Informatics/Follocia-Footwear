import { motion, type Variants } from "framer-motion";
import type { ReactNode } from "react";

type RevealMode = "fade-up" | "clip-left" | "scale-in" | "rotate-in" | "fade-blur";

const variantMap: Record<RevealMode, Variants> = {
  "fade-up": {
    hidden: { opacity: 0, y: 50, filter: "blur(8px)" },
    show: {
      opacity: 1,
      y: 0,
      filter: "blur(0px)",
      transition: { duration: 1.1, ease: [0.2, 0.8, 0.2, 1] },
    },
  },
  "clip-left": {
    hidden: { opacity: 0, clipPath: "inset(0 100% 0 0)" },
    show: {
      opacity: 1,
      clipPath: "inset(0 0% 0 0)",
      transition: { duration: 1.2, ease: [0.76, 0, 0.24, 1] },
    },
  },
  "scale-in": {
    hidden: { opacity: 0, scale: 0.85, filter: "blur(12px)" },
    show: {
      opacity: 1,
      scale: 1,
      filter: "blur(0px)",
      transition: { duration: 1.0, ease: [0.2, 0.8, 0.2, 1] },
    },
  },
  "rotate-in": {
    hidden: { opacity: 0, rotateX: -15, y: 60, filter: "blur(6px)" },
    show: {
      opacity: 1,
      rotateX: 0,
      y: 0,
      filter: "blur(0px)",
      transition: { duration: 1.2, ease: [0.2, 0.8, 0.2, 1] },
    },
  },
  "fade-blur": {
    hidden: { opacity: 0, filter: "blur(20px)" },
    show: {
      opacity: 1,
      filter: "blur(0px)",
      transition: { duration: 1.4, ease: [0.2, 0.8, 0.2, 1] },
    },
  },
};

export function Reveal({
  children,
  delay = 0,
  className,
  mode = "fade-up",
  once = true,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
  mode?: RevealMode;
  once?: boolean;
}) {
  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="show"
      viewport={{ once, amount: 0.2 }}
      transition={{ delay }}
      variants={variantMap[mode]}
      style={mode === "rotate-in" ? { perspective: 1200 } : undefined}
    >
      {children}
    </motion.div>
  );
}
