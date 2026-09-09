import { motion } from "framer-motion";
import noireImg from "@/assets/home/noire-banner.jpg";

export function NoireFeaturedBanner() {
  return (
    <section className="relative w-full bg-[#FEFAEF] px-4 md:px-12 py-8 overflow-hidden">
      <div className="mx-auto max-w-[1500px]">
        {/* Main Chocolate Card with Asymmetric Curved Top-Right */}
        <div className="relative overflow-hidden rounded-2xl md:rounded-3xl bg-[#331B17] text-[#FEFAEF] shadow-2xl min-h-[460px] md:min-h-[540px] flex flex-col justify-between p-8 md:p-14">
          
          {/* Background image positioned right, blending smoothly */}
          <div className="absolute inset-0 z-0">
            <img
              src={noireImg}
              alt="Noire Collection"
              className="w-full h-full object-cover object-right md:object-center opacity-70 md:opacity-85 mix-blend-luminosity brightness-95"
            />
            {/* Gradient overlay to ensure text on left is always ultra readable */}
            <div className="absolute inset-0 bg-gradient-to-r from-[#331B17] via-[#331B17]/85 to-transparent z-10 w-full md:w-[70%]" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#331B17] via-transparent to-transparent z-10" />
          </div>

          {/* Top Decorative Cutout Accent in Top Right */}
          <div className="hidden lg:block absolute top-0 right-0 z-20 w-48 h-16 bg-[#FEFAEF] rounded-bl-[40px] shadow-inner" />

          {/* Content Overlays */}
          <div className="relative z-20 max-w-xl flex flex-col justify-center flex-1 my-auto">
            <p className="text-[10px] md:text-[11px] uppercase tracking-[0.3em] text-[#D9B487] font-medium">
              COLLECTION 01 / AUTUMN WINTER
            </p>

            <h2 className="mt-3 font-display text-5xl md:text-7xl lg:text-8xl tracking-[0.02em] font-light text-[#FEFAEF]">
              Noire
            </h2>

            <p className="mt-2 font-display italic text-xl md:text-2xl lg:text-3xl text-[#EDE3D4]/90">
              Midnight glamour for every path you choose.
            </p>

            {/* Feature Pills */}
            <div className="mt-6 flex flex-wrap items-center gap-3">
              {["HEEL 105MM", "BLACK VELVET", "LIMITED EDITION"].map((pill) => (
                <span
                  key={pill}
                  className="border border-[#FEFAEF]/25 bg-[#FEFAEF]/5 backdrop-blur-xs px-3.5 py-1.5 rounded-full text-[10px] tracking-[0.18em] uppercase text-[#FEFAEF]/90"
                >
                  {pill}
                </span>
              ))}
            </div>

            {/* Action button */}
            <div className="mt-8">
              <a
                href="#/shop?collection=noire"
                className="inline-flex items-center justify-center bg-[#FEFAEF] hover:bg-white text-[#331B17] px-8 py-3.5 rounded-full text-xs font-semibold tracking-[0.2em] uppercase transition-all duration-300 shadow-md hover:scale-[1.02]"
                data-cursor="hover"
              >
                EXPLORE NOIRE
              </a>
            </div>
          </div>

          {/* Bottom Row: Navigation Tabs and Right CTA */}
          <div className="relative z-20 mt-8 pt-6 border-t border-[#FEFAEF]/15 flex flex-wrap items-center justify-between gap-4">
            {/* Moods quick links */}
            <div className="flex items-center gap-6 md:gap-10 text-[10px] md:text-xs tracking-[0.22em] uppercase">
              {["AURA", "BLOOM", "MUSE", "NOIRE"].map((mood) => (
                <a
                  key={mood}
                  href={`#/collections?mood=${mood.toLowerCase()}`}
                  className={`transition-colors hover:text-[#D9B487] ${mood === "NOIRE" ? "text-[#D9B487] font-semibold border-b border-[#D9B487] pb-0.5" : "text-[#FEFAEF]/65"}`}
                >
                  {mood}
                </a>
              ))}
            </div>

            {/* Bottom Right CTA */}
            <a
              href="#/shop?collection=noire"
              className="inline-flex items-center gap-2 bg-[#FEFAEF]/10 hover:bg-[#FEFAEF]/20 border border-[#FEFAEF]/30 text-[#FEFAEF] px-5 py-2 rounded-full text-[10px] md:text-xs tracking-[0.18em] uppercase transition-colors"
              data-cursor="hover"
            >
              <span>VIEW ALL NOIRE</span>
              <span>→</span>
            </a>
          </div>

        </div>
      </div>
    </section>
  );
}
