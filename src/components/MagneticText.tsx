import { useRef, type ReactNode, type MouseEvent } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";

interface MagneticTextProps {
  children: ReactNode;
  className?: string;
  strength?: number;
  as?: "span" | "div" | "p" | "h1" | "h2" | "h3" | "h4";
}

export function MagneticText({ children, className = "", strength = 0.4, as: Tag = "span" }: MagneticTextProps) {
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 150, damping: 15, mass: 0.2 });
  const sy = useSpring(y, { stiffness: 150, damping: 15, mass: 0.2 });

  const onMove = (e: MouseEvent<HTMLDivElement>) => {
    const r = ref.current!.getBoundingClientRect();
    const cx = e.clientX - (r.left + r.width / 2);
    const cy = e.clientY - (r.top + r.height / 2);
    x.set(cx * strength);
    y.set(cy * strength);
  };

  const reset = () => {
    x.set(0);
    y.set(0);
  };

  const MotionTag = motion.create(Tag);

  return (
    <MotionTag
      ref={ref as any}
      onMouseMove={onMove as any}
      onMouseLeave={reset as any}
      style={{ x: sx, y: sy }}
      className={`inline-block ${className}`}
    >
      {children}
    </MotionTag>
  );
}
