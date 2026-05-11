import { useState } from "react";
import { Reveal } from "../Reveal";

export function VipNewsletter() {
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);
  return (
    <section id="vip" className="relative overflow-hidden bg-[var(--ink)] luxe-grain px-6 py-32 text-[var(--bone)] md:px-12 md:py-48">
      <div className="absolute left-1/2 top-1/2 h-[60vh] w-[60vh] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--gold)]/15 blur-[140px]" />
      <div className="relative mx-auto max-w-3xl text-center">
        <Reveal>
          <p className="eyebrow text-[var(--gold)]">— VIP Access</p>
          <h2 className="mt-6 font-display text-[clamp(2.5rem,6vw,5.5rem)] leading-[1] tracking-[-0.02em]">
            Be among the <em className="italic gradient-gold-text">first</em> to know.
          </h2>
          <p className="mx-auto mt-8 max-w-xl text-base leading-relaxed text-[var(--bone)]/70">
            Members of the Follocia Cercle receive private previews 72 hours before public release. Less than 1% of
            applicants are admitted each season.
          </p>
        </Reveal>
        <Reveal delay={0.2}>
          <form
            onSubmit={(e) => { e.preventDefault(); if (email) setDone(true); }}
            className="mt-14 flex flex-col items-stretch gap-3 sm:flex-row"
          >
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              className="flex-1 border-b border-[var(--bone)]/30 bg-transparent px-2 py-4 text-center text-lg text-[var(--bone)] placeholder:text-[var(--bone)]/30 focus:border-[var(--gold)] focus:outline-none sm:text-left"
            />
            <button
              type="submit"
              disabled={done}
              className="magnetic-btn inline-flex items-center justify-center gap-3 border border-[var(--bone)]/40 bg-transparent px-10 py-4 eyebrow text-[var(--bone)] transition-colors hover:text-[var(--ink)] disabled:opacity-60"
            >
              {done ? "Welcome to the Cercle" : "Request Invitation"}
            </button>
          </form>
        </Reveal>
      </div>
    </section>
  );
}
