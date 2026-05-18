import { motion, useScroll, useTransform } from "framer-motion";
import { useRef, type ReactNode, type CSSProperties } from "react";

interface ParallaxLayerProps {
  children: ReactNode;
  speed?: number; // -1 to 1, negative = opposite direction
  direction?: "vertical" | "horizontal";
  className?: string;
  style?: CSSProperties;
  offset?: [string, string]; // scroll offset
}

export function ParallaxLayer({
  children,
  speed = 0.3,
  direction = "vertical",
  className = "",
  style,
  offset = ["start end", "end start"],
}: ParallaxLayerProps) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: offset as any });

  const range = 100 * speed;
  const transform = useTransform(scrollYProgress, [0, 1], [`${range}px`, `${-range}px`]);

  return (
    <motion.div
      ref={ref}
      style={{
        ...(direction === "vertical" ? { y: transform } : { x: transform }),
        ...style,
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
