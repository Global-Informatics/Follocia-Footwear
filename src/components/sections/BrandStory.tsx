import { Reveal } from "../Reveal";

export function Marquee() {
  const words = ["Rare", "Limited", "Sculpted in Italy", "MMXXV", "Six Releases", "Worn by the Few"];
  return (
    <div className="relative overflow-hidden border-y border-[var(--ink)]/10 bg-[var(--bone)] py-8">
      <div className="flex w-max animate-marquee gap-16 whitespace-nowrap">
        {[...Array(2)].map((_, j) => (
          <div key={j} className="flex shrink-0 items-center gap-16 pr-16">
            {words.map((w, i) => (
              <span key={`${j}-${i}`} className="flex items-center gap-16 font-display text-5xl italic text-[var(--ink)] md:text-7xl">
                {w}
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--gold)]" />
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function BrandStory() {
  return (
    <section className="relative overflow-hidden bg-[var(--bone)] px-6 py-32 md:px-12 md:py-48">
      <div className="mx-auto grid max-w-[1400px] grid-cols-1 gap-16 md:grid-cols-12">
        <Reveal className="md:col-span-4">
          <p className="eyebrow text-[var(--ink)]/60">— A House of Rarity</p>
        </Reveal>
        <div className="md:col-span-8">
          <Reveal>
            <h2 className="font-display text-[clamp(2.5rem,6vw,6rem)] leading-[1.02] tracking-[-0.02em] text-[var(--ink)]">
              We do not chase seasons.
              <br />
              We chase <em className="italic text-[var(--gold)]">moments</em>.
            </h2>
          </Reveal>
          <Reveal delay={0.15}>
            <div className="mt-12 grid grid-cols-1 gap-10 text-base leading-[1.9] text-[var(--ink)]/75 md:grid-cols-2">
              <p>
                Follocia exists for the woman who has stopped translating fashion and started writing it. Every silhouette
                is sculpted by hand in our Florentine atelier — drawn slowly, finished slower, signed only when perfect.
              </p>
              <p>
                We release six collections a year. No restocks. No repeats. When the last pair leaves the box, that
                edition becomes part of an archive, never a catalogue.
              </p>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
