import { Reveal } from "../Reveal";

const benefits = [
  { n: "01", t: "Rare", d: "Released six times a year, never reissued." },
  { n: "02", t: "Sculpted", d: "Hand-lasted in our Florentine atelier." },
  { n: "03", t: "Numbered", d: "Each pair signed and registered to its owner." },
  { n: "04", t: "Eternal", d: "Lifetime restoration by the original artisan." },
];

export function Benefits() {
  return (
    <section className="relative bg-[var(--champagne)]/40 px-6 py-32 md:px-12 md:py-44">
      <div className="mx-auto max-w-[1500px]">
        <Reveal>
          <div className="mb-20 max-w-3xl">
            <p className="eyebrow text-[var(--ink)]/60">— The Promise</p>
            <h2 className="mt-4 font-display text-[clamp(2.25rem,5vw,4.5rem)] leading-[1.05] tracking-[-0.02em] text-[var(--ink)]">
              A philosophy of <em className="italic text-[var(--gold)]">restraint</em>.
            </h2>
          </div>
        </Reveal>
        <div className="grid grid-cols-1 gap-x-8 gap-y-16 md:grid-cols-4">
          {benefits.map((b, i) => (
            <Reveal key={b.t} delay={i * 0.08}>
              <div className="group relative border-t border-[var(--ink)]/20 pt-8">
                <div className="absolute left-0 top-0 h-px bg-[var(--gold)] transition-all duration-700 w-0 group-hover:w-full" />
                <div className="font-display text-sm text-[var(--ink)]/40">{b.n}</div>
                <h3 className="mt-6 font-display text-3xl text-[var(--ink)] md:text-4xl">{b.t}</h3>
                <p className="mt-4 text-sm leading-relaxed text-[var(--ink)]/70">{b.d}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
