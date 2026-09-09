import { motion } from "framer-motion";

const PILLARS = [
  {
    title: "Distinct models",
    copy: "Every piece is an edition, sculpted in few units and never mass produced.",
  },
  {
    title: "Comfort in every scene",
    copy: "Thoughtfully designed for continuous ease from your arrival to sunrise.",
  },
  {
    title: "Made to be remembered",
    copy: "Unforgettable presence created with the finest Italian leathers and couture finishing.",
  },
];

export function ValuePillars() {
  return (
    <section className="relative w-full bg-[#FEFAEF] py-14 px-6 md:px-12 border-t border-b border-[#231815]/10">
      <div className="mx-auto max-w-[1500px]">
        <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-[#231815]/10">
          {PILLARS.map((pillar, idx) => (
            <motion.div
              key={pillar.title}
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: idx * 0.1 }}
              className="py-6 md:py-4 px-4 md:px-8 text-left first:pl-0 last:pr-0"
            >
              <h3 className="font-display text-2xl md:text-3xl text-[#231815] font-light">
                {pillar.title}
              </h3>
              <p className="mt-2 text-xs md:text-sm text-[#231815]/65 leading-relaxed font-sans max-w-sm">
                {pillar.copy}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
