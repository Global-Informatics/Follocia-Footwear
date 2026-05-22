import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/sections/Footer";
import { legalPageConfig, recordsForLegalPage, defaultLegalRecords, type LegalRecord, type LegalSlug } from "@/lib/legalPages";
import type { AuthSession } from "@/components/auth/AuthGateway";

function readCachedLegalRecords() {
  if (typeof window === "undefined") return defaultLegalRecords;
  try {
    return JSON.parse(localStorage.getItem("follocia_admin_legal") || "") as LegalRecord[];
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
          localStorage.setItem("follocia_admin_legal", JSON.stringify(legalRecords));
          setRecords(legalRecords);
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
          <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16 }} className="mt-10 grid gap-6 border-t border-[var(--bone)]/10 pt-8 lg:grid-cols-[1fr_360px]">
            <p className="max-w-3xl text-lg leading-relaxed text-[var(--bone)]/68">{config.intro}</p>
            <div className="border border-[var(--gold)]/25 bg-white/[0.04] p-5 text-sm text-[var(--bone)]/58">
              <span className="eyebrow block text-[var(--gold)]">{config.updated}</span>
              <span className="mt-3 block">Managed live through the Follocia admin panel.</span>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="relative px-6 py-16 md:px-12 md:py-24">
        <div className="mx-auto grid max-w-[1250px] gap-10 lg:grid-cols-[280px_1fr]">
          <aside className="h-fit border border-[var(--ink)]/10 bg-white p-6 lg:sticky lg:top-28">
            <p className="eyebrow text-[var(--ink)]/45">Legal pages</p>
            <nav className="mt-5 grid gap-2">
              {(Object.keys(legalPageConfig) as LegalSlug[]).map((item) => (
                <a key={item} href={`/${item}`} className={`border px-4 py-3 text-sm transition-colors ${item === slug ? "border-[var(--ink)] bg-[var(--ink)] text-[var(--bone)]" : "border-[var(--ink)]/10 hover:border-[var(--gold)] hover:text-[var(--gold)]"}`}>
                  {legalPageConfig[item].label}
                </a>
              ))}
            </nav>
          </aside>
          <div className="grid gap-5">
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
                  <div>
                    <h2 className="font-display text-3xl leading-tight md:text-4xl">{section.title}</h2>
                    <p className="mt-4 text-base leading-8 text-[var(--ink)]/62">{section.meta}</p>
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
