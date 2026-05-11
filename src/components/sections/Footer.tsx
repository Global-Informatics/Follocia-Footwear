export function Footer() {
  const cols = [
    { t: "Maison", l: ["The House", "Atelier", "Sustainability", "Press"] },
    { t: "Editions", l: ["Current Drop", "Archive", "Lookbook", "Lookafter"] },
    { t: "Service", l: ["Concierge", "Restoration", "Sizing", "Contact"] },
  ];
  return (
    <footer className="relative bg-[var(--ink)] px-6 pb-12 pt-24 text-[var(--bone)] md:px-12">
      <div className="mx-auto max-w-[1500px]">
        <div className="grid grid-cols-2 gap-12 border-b border-[var(--bone)]/10 pb-16 md:grid-cols-12">
          <div className="col-span-2 md:col-span-5">
            <div className="font-display text-5xl tracking-[0.25em]">FOLLOCIA</div>
            <p className="mt-6 max-w-xs text-sm leading-relaxed text-[var(--bone)]/60">
              Limited edition women's footwear. Sculpted in Florence. Worn by the few.
            </p>
          </div>
          {cols.map((c) => (
            <div key={c.t} className="md:col-span-2">
              <div className="eyebrow text-[var(--bone)]/40">{c.t}</div>
              <ul className="mt-6 space-y-3">
                {c.l.map((x) => (
                  <li key={x}>
                    <a href="#" className="text-sm text-[var(--bone)]/85 transition-colors hover:text-[var(--gold)]">{x}</a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <div className="col-span-2 md:col-span-1">
            <div className="eyebrow text-[var(--bone)]/40">Follow</div>
            <ul className="mt-6 space-y-3">
              {["Instagram", "Pinterest", "TikTok"].map((x) => (
                <li key={x}><a href="#" className="text-sm text-[var(--bone)]/85 hover:text-[var(--gold)]">{x}</a></li>
              ))}
            </ul>
          </div>
        </div>
        <div className="mt-10 flex flex-col items-start justify-between gap-4 text-xs uppercase tracking-[0.25em] text-[var(--bone)]/40 md:flex-row md:items-center">
          <div>© MMXXV Maison Follocia · Firenze</div>
          <div className="flex gap-8">
            <a href="#" className="hover:text-[var(--gold)]">Privacy</a>
            <a href="#" className="hover:text-[var(--gold)]">Terms</a>
            <a href="#" className="hover:text-[var(--gold)]">Cookies</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
