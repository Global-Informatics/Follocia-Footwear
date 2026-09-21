import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/sections/Footer";
import { legalPageConfig, recordsForLegalPage, defaultLegalRecords, type LegalRecord, type LegalSlug } from "@/lib/legalPages";
import type { AuthSession } from "@/components/auth/AuthGateway";

function readCachedLegalRecords() {
  if (typeof window === "undefined") return defaultLegalRecords;
  try {
    const raw = localStorage.getItem("follocia_admin_legal");
    if (!raw) {
      localStorage.setItem("follocia_admin_legal", JSON.stringify(defaultLegalRecords));
      return defaultLegalRecords;
    }
    let parsed = JSON.parse(raw) as LegalRecord[];
    let changed = false;

    const hasLatestShipping = parsed.some((r) => r.id === "shipping-1-delivery" || r.title === "Shipping & Delivery");
    if (!hasLatestShipping) {
      parsed = [...parsed.filter((r) => !r.id.startsWith("shipping-")), ...defaultLegalRecords.filter((r) => r.id.startsWith("shipping-"))];
      changed = true;
    }

    const hasLatestFaq = parsed.some((r) => r.id === "faq-01-order" || r.title === "How can I place an order?");
    if (!hasLatestFaq) {
      parsed = [...parsed.filter((r) => !r.id.startsWith("faq-")), ...defaultLegalRecords.filter((r) => r.id.startsWith("faq-"))];
      changed = true;
    }

    if (changed) {
      localStorage.setItem("follocia_admin_legal", JSON.stringify(parsed));
    }
    return parsed;
  } catch {
    localStorage.setItem("follocia_admin_legal", JSON.stringify(defaultLegalRecords));
    return defaultLegalRecords;
  }
}

export function LegalPage({ slug, session, onLogout, onLogin }: { slug: LegalSlug; session: AuthSession | null; onLogout: () => void; onLogin: () => void }) {
  const [records, setRecords] = useState<LegalRecord[]>(readCachedLegalRecords);
  const config = legalPageConfig[slug];
  const sections = useMemo(() => recordsForLegalPage(records, slug), [records, slug]);

  useEffect(() => {
    let mounted = true;
    fetch("/api/commerce/admin-records")
      .then((response) => (response.ok ? response.json() : null))
      .then((data: Array<LegalRecord & { module: string }> | null) => {
        if (!mounted || !data) return;
        const legalRecords = data.filter((record) => record.module === "legal").map(({ id, title, meta, status }) => ({ id, title, meta, status }));
        if (legalRecords.length) {
          let merged = [...legalRecords];
          const hasLatestShipping = merged.some((r) => r.id === "shipping-1-delivery" || r.title === "Shipping & Delivery");
          if (!hasLatestShipping) {
            merged = [...merged.filter((r) => !r.id.startsWith("shipping-")), ...defaultLegalRecords.filter((r) => r.id.startsWith("shipping-"))];
          }
          const hasLatestFaq = merged.some((r) => r.id === "faq-01-order" || r.title === "How can I place an order?");
          if (!hasLatestFaq) {
            merged = [...merged.filter((r) => !r.id.startsWith("faq-")), ...defaultLegalRecords.filter((r) => r.id.startsWith("faq-"))];
          }
          localStorage.setItem("follocia_admin_legal", JSON.stringify(merged));
          setRecords(merged);
        }
      })
      .catch(() => undefined);
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <main className="min-h-screen bg-[var(--bone)] text-[var(--ink)]">
      <Navigation userName={session?.user.name} onLogout={session ? onLogout : undefined} onLogin={onLogin} solid />
      <section className="relative overflow-hidden bg-[var(--ink)] px-6 pb-16 pt-36 text-[var(--bone)] md:px-12">
        <div className="absolute inset-0 luxe-grain opacity-70" />
        <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-[var(--gold)]/70 to-transparent" />
        <div className="relative z-10 mx-auto max-w-[1250px]">
          <motion.p initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="eyebrow text-[var(--gold)]">
            {config.eyebrow}
          </motion.p>
          <motion.h1 initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }} className="mt-5 max-w-4xl font-display text-[clamp(4rem,10vw,9rem)] leading-[0.84]">
            {config.title}
          </motion.h1>
          <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16 }} className="mt-10 border-t border-[var(--bone)]/10 pt-8">
            <p className="max-w-3xl text-lg leading-relaxed text-[var(--bone)]/68">{config.intro}</p>
          </motion.div>
        </div>
      </section>

      <section className="relative px-6 py-16 md:px-12 md:py-24">
        <div className="mx-auto grid max-w-[1250px] gap-10 lg:grid-cols-[280px_1fr]">
          <aside className="h-fit border border-[var(--ink)]/10 bg-white p-6 lg:sticky lg:top-28">
            <p className="eyebrow text-[var(--ink)]/45">Legal pages</p>
            <nav className="mt-5 grid gap-2">
              {(Object.keys(legalPageConfig) as LegalSlug[]).map((item) => (
                <a key={item} href={`#/${item}`} className={`border px-4 py-3 text-sm transition-colors ${item === slug ? "border-[var(--ink)] bg-[var(--ink)] text-[var(--bone)]" : "border-[var(--ink)]/10 hover:border-[var(--gold)] hover:text-[var(--gold)]"}`}>
                  {legalPageConfig[item].label}
                </a>
              ))}
            </nav>
          </aside>
          <div className="grid gap-5">
            {slug === "size-guide" && (
              <motion.article
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                className="border border-[var(--gold)]/40 bg-white p-6 shadow-[var(--shadow-soft)] md:p-8 rounded-xl"
              >
                <div className="flex items-center justify-between border-b border-[var(--ink)]/10 pb-4 mb-6">
                  <div>
                    <span className="eyebrow text-[var(--gold)]">Official Sizing Chart</span>
                    <h2 className="font-display text-2xl md:text-3xl text-[var(--ink)] mt-1">Follicia Footwear Size Conversion</h2>
                  </div>
                  <span className="rounded-full bg-[var(--gold)]/10 border border-[var(--gold)]/30 px-3 py-1 text-xs font-bold text-[var(--gold)] uppercase tracking-wider">
                    EU Standard Fit
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm border-collapse">
                    <thead>
                      <tr className="border-b border-[var(--ink)]/15 bg-[var(--champagne)]/40 text-xs uppercase tracking-widest text-[var(--ink)]">
                        <th className="p-3.5 font-bold">EU Size</th>
                        <th className="p-3.5 font-bold">UK / India Size</th>
                        <th className="p-3.5 font-bold">Foot Length (cm)</th>
                        <th className="p-3.5 font-bold">Foot Length (in)</th>
                        <th className="p-3.5 font-bold">Fit Advice</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--ink)]/10 text-sm">
                      <tr className="hover:bg-[var(--gold)]/5 transition-colors">
                        <td className="p-3.5 font-bold text-[var(--gold)] text-base">EU 38</td>
                        <td className="p-3.5 font-semibold">UK 5 / IND 5</td>
                        <td className="p-3.5 font-mono">24.0 cm</td>
                        <td className="p-3.5 font-mono text-[var(--ink)]/70">9.45 in</td>
                        <td className="p-3.5 text-xs text-[var(--ink)]/75">Standard true to size</td>
                      </tr>
                      <tr className="hover:bg-[var(--gold)]/5 transition-colors">
                        <td className="p-3.5 font-bold text-[var(--gold)] text-base">EU 39</td>
                        <td className="p-3.5 font-semibold">UK 6 / IND 6</td>
                        <td className="p-3.5 font-mono">24.7 cm</td>
                        <td className="p-3.5 font-mono text-[var(--ink)]/70">9.72 in</td>
                        <td className="p-3.5 text-xs text-[var(--ink)]/75">Standard true to size</td>
                      </tr>
                      <tr className="hover:bg-[var(--gold)]/5 transition-colors">
                        <td className="p-3.5 font-bold text-[var(--gold)] text-base">EU 40</td>
                        <td className="p-3.5 font-semibold">UK 7 / IND 7</td>
                        <td className="p-3.5 font-mono">25.3 cm</td>
                        <td className="p-3.5 font-mono text-[var(--ink)]/70">9.96 in</td>
                        <td className="p-3.5 text-xs text-[var(--ink)]/75">Standard true to size</td>
                      </tr>
                      <tr className="hover:bg-[var(--gold)]/5 transition-colors">
                        <td className="p-3.5 font-bold text-[var(--gold)] text-base">EU 41</td>
                        <td className="p-3.5 font-semibold">UK 8 / IND 8</td>
                        <td className="p-3.5 font-mono">26.0 cm</td>
                        <td className="p-3.5 font-mono text-[var(--ink)]/70">10.23 in</td>
                        <td className="p-3.5 text-xs text-[var(--ink)]/75">Standard true to size</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="mt-5 rounded-lg bg-[var(--ink)]/5 p-4 border border-[var(--ink)]/10 text-xs text-[var(--ink)]/70 leading-relaxed">
                  💡 <strong>Tip for Pointed Toe &amp; Heeled Styles:</strong> If you fall between sizes or have wider feet, we recommend choosing one size up (e.g. EU 39 instead of EU 38) for extra toe box comfort.
                </div>
              </motion.article>
            )}

            {sections.map((section, index) => (
              <motion.article
                key={section.id}
                initial={{ opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ delay: index * 0.04 }}
                className="border border-[var(--ink)]/10 bg-white p-6 shadow-[var(--shadow-soft)] md:p-8"
              >
                <div className="flex items-start gap-5">
                  <span className="grid h-10 w-10 shrink-0 place-items-center border border-[var(--gold)]/35 text-xs uppercase tracking-[0.16em] text-[var(--gold)]">{String(index + 1).padStart(2, "0")}</span>
                  <div className="flex-1">
                    <h2 className="font-display text-3xl leading-tight md:text-4xl text-[#24130d]">{section.title}</h2>
                    <div className="mt-4 space-y-4 text-base leading-relaxed text-[var(--ink)]/75">
                      {section.meta.split("\n\n").map((para, pIdx) => (
                        <p key={pIdx}>{para}</p>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.article>
            ))}
          </div>
        </div>
      </section>
      <Footer />
    </main>
  );
}
