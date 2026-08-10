import { motion, type Variants } from "framer-motion";

const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.1 } },
};
const word: Variants = {
  hidden: { y: "110%", opacity: 0, rotateX: -40 },
  show: {
    y: "0%",
    opacity: 1,
    rotateX: 0,
    transition: { duration: 1.1, ease: [0.2, 0.8, 0.2, 1] },
  },
};

export function SplitText({ text, className }: { text: string; className?: string }) {
  return (
    <motion.span
      variants={container}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.4 }}
      className={className}
      style={{ display: "inline-block", perspective: 800 }}
    >
      {text.split(" ").map((w, i) => (
        <span key={i} style={{ display: "inline-block", overflow: "hidden", paddingBottom: "0.1em" }}>
          <motion.span variants={word} style={{ display: "inline-block", willChange: "transform" }}>
            {w}&nbsp;
          </motion.span>
        </span>
      ))}
    </motion.span>
  );
}
