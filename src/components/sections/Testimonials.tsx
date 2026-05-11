import { Reveal } from "../Reveal";

const quotes = [
  {
    q: "Follocia is the only house that still makes me wait — and I love them for it.",
    a: "Vogue Italia",
  },
  {
    q: "There is a quiet defiance in every silhouette. These are not shoes; they are sentences.",
    a: "AnOther Magazine",
  },
  {
    q: "I own one pair. I will own one more this year. That is the point.",
    a: "Camille R., Paris",
  },
];

export function Testimonials() {
  return (
    <section className="relative bg-[var(--bone)] px-6 py-32 md:px-12 md:py-44">
      <div className="mx-auto max-w-[1500px]">
        <Reveal>
          <p className="eyebrow text-[var(--ink)]/60">— Said of the House</p>
        </Reveal>
        <div className="mt-16 grid grid-cols-1 gap-10 md:grid-cols-3">
          {quotes.map((q, i) => (
            <Reveal key={q.a} delay={i * 0.1}>
              <figure className="flex h-full flex-col justify-between border-l border-[var(--ink)]/15 pl-8">
                <blockquote className="font-display text-2xl leading-[1.3] tracking-[-0.01em] text-[var(--ink)] md:text-3xl">
                  <span className="text-[var(--gold)]">“</span>
                  {q.q}
                  <span className="text-[var(--gold)]">”</span>
                </blockquote>
                <figcaption className="mt-10 eyebrow text-[var(--ink)]/60">— {q.a}</figcaption>
              </figure>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
