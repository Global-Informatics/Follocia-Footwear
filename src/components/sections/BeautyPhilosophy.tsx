import { motion } from "framer-motion";
import arcadeImg from "@/assets/home/philosophy-arcade.jpg";

export function BeautyPhilosophy() {
  return (
    <section id="about-story" className="relative w-full bg-[#FEFAEF] py-16 md:py-24 px-6 md:px-12 border-t border-[#231815]/10 overflow-hidden">
      <div className="mx-auto max-w-[1500px]">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-center">
          
          {/* Left Column: Arcade Editorial Image */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.8 }}
            className="lg:col-span-6 relative"
          >
            <div className="relative w-full aspect-[4/3] md:aspect-[14/11] overflow-hidden rounded-xl shadow-xl bg-[#231815]">
              <img
                src={arcadeImg}
                alt="Craftsmanship and Comfort in Motion"
                className="w-full h-full object-cover object-center"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#231815]/20 via-transparent to-transparent pointer-events-none" />
            </div>
          </motion.div>

          {/* Right Column: Copy & Philosophy */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.8 }}
            className="lg:col-span-6 flex flex-col justify-center max-w-xl"
          >
            <p className="text-[10px] md:text-[11px] uppercase tracking-[0.3em] text-[#B26E40] font-medium mb-3">
              CRAFTSMANSHIP & PHILOSOPHY
            </p>

            <h2 className="font-display text-4xl md:text-5xl lg:text-6xl text-[#231815] font-light leading-[1.05]">
              Beauty begins with how it feels.
            </h2>

            <p className="mt-6 text-xs md:text-sm text-[#231815]/70 leading-relaxed font-sans">
              True luxury doesn't ask you to sacrifice comfort for elegance. Every Follicia pair is sculpted with anatomical arch support, cushioned Italian memory insoles, and butter-soft leather linings designed for all-night grace.
            </p>

            <p className="mt-4 text-xs md:text-sm text-[#231815]/70 leading-relaxed font-sans">
              Hand-lasted by third-generation artisans in Tuscany, our creations unite runway-ready silhouettes with sublime wearable ease.
            </p>

            <div className="mt-8">
              <a
                href="#/shop"
                className="inline-flex items-center justify-center border border-[#331B17] hover:bg-[#331B17] text-[#331B17] hover:text-[#FEFAEF] px-8 py-3.5 rounded-full text-xs font-medium tracking-[0.2em] uppercase transition-all duration-300"
                data-cursor="hover"
              >
                DISCOVER OUR PHILOSOPHY
              </a>
            </div>
          </motion.div>

        </div>
      </div>
    </section>
  );
}
