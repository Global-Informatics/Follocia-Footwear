import { useState, useEffect } from "react";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/sections/Footer";
import { CartDrawer } from "@/components/cart/CartDrawer";
import type { AuthSession } from "@/components/auth/AuthGateway";
import { getProducts, COMMERCE_EVENT, type CommerceProduct } from "@/lib/commerceStore";
import { shareProduct } from "./ShopPages";
import "@/components/home/follicia.css";

export function NewArrivalsPage({
  session,
  onLogout,
  onLogin,
}: {
  session: AuthSession | null;
  onLogout: () => void;
  onLogin: () => void;
}) {
  const [newsletterEmail, setNewsletterEmail] = useState("");
  const [toastMessage, setToastMessage] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [products, setProducts] = useState<CommerceProduct[]>(() => getProducts());

  // Waitlist / Notify Modal State
  const [notifyModalProduct, setNotifyModalProduct] = useState<CommerceProduct | null>(null);
  const [notifyEmail, setNotifyEmail] = useState(session?.user?.email || "");
  const [notifyPhone, setNotifyPhone] = useState("");

  useEffect(() => {
    const sync = () => setProducts(getProducts());
    window.addEventListener(COMMERCE_EVENT, sync);
    return () => window.removeEventListener(COMMERCE_EVENT, sync);
  }, []);

  const handleNewsletterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const emailVal = newsletterEmail.trim();
    if (!emailVal) return;
    try {
      localStorage.setItem("follicia-newsletter-email", emailVal);
      const key = "follocia_admin_newsletter";
      const raw = localStorage.getItem(key);
      const existing = raw ? JSON.parse(raw) : [];
      const newEntry = {
        id: `sub-${Date.now()}`,
        title: emailVal,
        meta: `Subscribed on ${new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })} via New Arrivals Page`,
        status: "Subscribed",
      };
      const updated = [newEntry, ...existing.filter((item: any) => item.title?.toLowerCase() !== emailVal.toLowerCase())];
      localStorage.setItem(key, JSON.stringify(updated));

      void fetch("/api/commerce/admin-records/newsletter", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(updated.map((item) => ({ ...item, module: "newsletter" }))),
      }).catch(() => {});
    } catch {}
    setNewsletterEmail("");
    setToastMessage("You’re on the Follicia VIP list");
    setTimeout(() => setToastMessage(""), 2500);
  };

  const handleNotifySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!notifyModalProduct) return;
    const targetProduct = notifyModalProduct;
    const emailOrPhone = notifyEmail.trim() || notifyPhone.trim();
    if (!emailOrPhone) return;

    // Save to admin records / localStorage as high-intent waitlist notification request
    try {
      const key = "follocia_admin_newsletter";
      const raw = localStorage.getItem(key);
      const existing = raw ? JSON.parse(raw) : [];
      const newEntry = {
        id: `vip-drop-${Date.now()}`,
        title: `Drop VIP Alert: ${targetProduct.title}`,
        meta: `Customer ${emailOrPhone} registered for early access (${targetProduct.dropDate || "Upcoming Drop"})`,
        status: "Segmented",
      };
      const updated = [newEntry, ...existing];
      localStorage.setItem(key, JSON.stringify(updated));

      void fetch("/api/commerce/admin-records/newsletter", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(updated.map((item) => ({ ...item, module: "newsletter" }))),
      }).catch(() => {});
    } catch {}

    setNotifyModalProduct(null);
    setToastMessage(`Early access reserved for ${targetProduct.title}! We'll notify you first.`);
    setTimeout(() => setToastMessage(""), 3500);
  };

  // Filter products that are marked as new arrivals or have "Coming Soon" / "Private Preview" status
  const upcomingProducts = products.filter(
    (p) =>
      p.isNewArrival ||
      p.status === "Coming Soon" ||
      p.status === "Private Preview" ||
      p.category?.toLowerCase().includes("arrival")
  );

  return (
    <div className="follicia-home flex flex-col min-h-screen bg-white">
      {/* Site Header */}
      <Navigation
        userName={session?.user.name}
        onLogout={session ? onLogout : undefined}
        onLogin={onLogin}
        solid
      />

      <main className="flex-1 bg-white text-[var(--ink)]">
        {/* Walk Light Arrival Hero */}
        <section className="arrival-hero">
          <div className="arrival-copy">
            <p className="eyebrow">New arrival · The conscious comfort edit</p>
            <h1>Walk Light.</h1>
            <p className="arrival-lead">Naturally comfortable. Quietly considered.</p>
            <p>
              A lightweight open-toe slingback shaped around an anatomical cork-based footbed, soft cushioning and a flexible recycled-rubber outsole.
            </p>
            <a className="button dark" href="#/shop">
              Explore Follicia
            </a>
          </div>
          <div className="arrival-image">
            <img
              src="/products/follicia-walk-light.webp"
              alt="Follicia Walk Light natural-fibre comfort sandals"
            />
          </div>
        </section>

        {/* Arrival Details (3 Features) */}
        <section className="arrival-details">
          <div>
            <span>01</span>
            <h3>Natural-fibre texture</h3>
            <p>Warm ivory woven uppers bring an easy, tactile finish.</p>
          </div>
          <div>
            <span>02</span>
            <h3>Comfort-led form</h3>
            <p>Wide soft straps and a contoured cork-based footbed support everyday wear.</p>
          </div>
          <div>
            <span>03</span>
            <h3>Lighter choices</h3>
            <p>A recycled-rubber outsole complements Follicia's cruelty-free direction.</p>
          </div>
        </section>

        {/* Upcoming Drops & Pre-Release Section */}
        <section className="px-6 py-20 md:px-12 max-w-[1400px] mx-auto border-t border-[#4b261a15]">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-12">
            <div>
              <p className="eyebrow text-[var(--gold)]">Private Previews</p>
              <h2 className="font-display text-4xl md:text-5xl text-[#351c13]">
                Upcoming Follicia Drops
              </h2>
            </div>
            <p className="max-w-md text-xs uppercase tracking-widest text-[#7d6659]">
              Be the first to know when numbered pairs and new silhouettes leave our private studio.
            </p>
          </div>

          {upcomingProducts.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#4b261a25] bg-[#FAF8F5] p-12 text-center">
              <span className="text-3xl mb-3 block">✨</span>
              <h3 className="font-display text-2xl text-[#351c13]">New Editions in the Workshop</h3>
              <p className="mt-2 text-sm text-[#7d6659] max-w-lg mx-auto">
                Our artisans are currently shaping the next series. When new designs or coming-soon drops are announced, they will appear here.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {upcomingProducts.map((p) => {
                const isComingSoon = p.status === "Coming Soon" || p.status === "Private Preview";
                return (
                  <article
                    key={p.id}
                    className="group relative flex flex-col overflow-hidden rounded-2xl border border-[#4b261a18] bg-white shadow-sm transition-all hover:shadow-xl hover:border-[var(--gold)]/40"
                  >
                    <div className="relative aspect-square w-full overflow-hidden bg-white p-6">
                      <img
                        src={p.image}
                        alt={p.title}
                        className="h-full w-full object-contain brightness-[1.15] contrast-[1.05] saturate-[1.05] transition-transform duration-700 group-hover:scale-105"
                        style={{ backgroundColor: 'white' }}
                      />
                      <div className="absolute top-4 left-4 flex flex-col gap-1.5">
                        <span className="rounded-full bg-[#351c13] px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[#fffdf8] shadow-sm">
                          {p.status || "Coming Soon"}
                        </span>
                        {p.dropDate && (
                          <span className="rounded-full bg-[var(--gold)]/20 text-[#351c13] px-3 py-0.5 text-[9px] font-bold uppercase tracking-wider backdrop-blur-xs border border-[var(--gold)]/30">
                            Launch: {p.dropDate}
                          </span>
                        )}
                      </div>

                      {/* Share Button on Card Image */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          void shareProduct(p, () => {
                            setCopiedId(p.id);
                            setTimeout(() => setCopiedId(null), 2200);
                          });
                        }}
                        aria-label={`Share ${p.title}`}
                        title="Share piece"
                        className="absolute top-4 right-4 z-10 grid h-8 w-8 place-items-center rounded-full bg-white/95 border border-black/5 text-[#351c13] shadow-sm hover:scale-110 transition-all cursor-pointer hover:text-[var(--gold)]"
                      >
                        {copiedId === p.id ? (
                          <span className="text-[10px] font-bold text-emerald-600">✓</span>
                        ) : (
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="18" cy="5" r="3" />
                            <circle cx="6" cy="12" r="3" />
                            <circle cx="18" cy="19" r="3" />
                            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                            <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                          </svg>
                        )}
                      </button>
                    </div>

                    <div className="flex flex-1 flex-col justify-between p-6">
                      <div>
                        <p className="text-[10px] uppercase tracking-widest text-[#a87648] font-bold">
                          {p.edition || "Follicia Edition"} · {p.tone || "Fine Craft"}
                        </p>
                        <h3 className="mt-1 font-display text-2xl text-[#351c13]">{p.title}</h3>
                        <p className="mt-2 text-xs text-[#7d6659] line-clamp-2">
                          {p.notes || `Handcrafted sculptural silhouette shaped for elegant form and quiet distinction.`}
                        </p>
                      </div>

                      <div className="mt-6 flex items-center justify-between border-t border-[#4b261a12] pt-4">
                        <span className="font-semibold text-sm text-[#351c13] whitespace-nowrap shrink-0">{typeof p.price === "string" ? p.price.replace(/^Rs\.\s*/, "Rs.\u00A0") : p.price}</span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              void shareProduct(p, () => {
                                setCopiedId(p.id);
                                setTimeout(() => setCopiedId(null), 2200);
                              });
                            }}
                            className="inline-flex items-center gap-1 rounded-full border border-[#4b261a20] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-[#351c13] hover:border-[var(--gold)] hover:text-[var(--gold)] transition-colors cursor-pointer"
                            title="Share"
                          >
                            {copiedId === p.id ? (
                              <span className="text-emerald-600 font-bold">✓ Copied</span>
                            ) : (
                              <>
                                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <circle cx="18" cy="5" r="3" />
                                  <circle cx="6" cy="12" r="3" />
                                  <circle cx="18" cy="19" r="3" />
                                  <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                                  <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                                </svg>
                                <span>Share</span>
                              </>
                            )}
                          </button>
                          {isComingSoon ? (
                            <button
                              type="button"
                              onClick={() => {
                                setNotifyModalProduct(p);
                              }}
                              className="inline-flex items-center gap-1.5 rounded-full bg-[#351c13] px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-white hover:bg-[var(--gold)] transition-colors cursor-pointer shadow-xs"
                            >
                              <span>🔔 Notify Me</span>
                            </button>
                          ) : (
                            <a
                              href={`#/shop/${p.id.toLowerCase()}`}
                              className="inline-flex items-center gap-1.5 rounded-full bg-[#351c13] px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-white hover:bg-[var(--gold)] transition-colors"
                            >
                              <span>View Piece →</span>
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        {/* Newsletter */}
        <section className="newsletter">
          <p className="eyebrow">The Follicia Edit</p>
          <h2>Step into our world.</h2>
          <p>New arrivals, private previews and stories from Follicia.</p>
          <form onSubmit={handleNewsletterSubmit}>
            <input
              aria-label="Email address"
              type="email"
              placeholder="Your email address"
              required
              value={newsletterEmail}
              onChange={(e) => setNewsletterEmail(e.target.value)}
              name="email"
            />
            <button type="submit">Join us →</button>
          </form>
        </section>
      </main>

      {/* Notify / Early Access Modal */}
      {notifyModalProduct && (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) setNotifyModalProduct(null);
          }}
        >
          <div className="relative w-full max-w-md rounded-2xl border border-[#4b261a25] bg-[#fffdfa] p-8 text-[#351c13] shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => setNotifyModalProduct(null)}
              className="absolute top-4 right-4 h-8 w-8 rounded-full border border-[#4b261a20] text-lg hover:bg-[#4b261a10] cursor-pointer flex items-center justify-center"
              aria-label="Close"
            >
              ×
            </button>
            <p className="eyebrow text-[var(--gold)]">Priority Early Access</p>
            <h3 className="font-display text-2xl text-[#351c13]">
              Notify Me: {notifyModalProduct.title}
            </h3>
            <p className="mt-2 text-xs text-[#7d6659] leading-relaxed">
              Drop Date: <strong>{notifyModalProduct.dropDate || "Announcing soon"}</strong>. Enter your details below to get notified the exact moment reservations open.
            </p>

            <form onSubmit={handleNotifySubmit} className="mt-6 flex flex-col gap-3">
              <label className="text-[10px] uppercase font-bold tracking-wider text-[#6c3d2c]">
                Email Address
                <input
                  type="email"
                  required
                  placeholder="name@domain.com"
                  value={notifyEmail}
                  onChange={(e) => setNotifyEmail(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-[#4b261a25] bg-white px-3.5 py-2.5 text-xs text-[#351c13] outline-none focus:border-[#a87648]"
                />
              </label>

              <label className="text-[10px] uppercase font-bold tracking-wider text-[#6c3d2c]">
                Mobile Phone (Optional for SMS drop alert)
                <input
                  type="tel"
                  placeholder="+91 98765 43210"
                  value={notifyPhone}
                  onChange={(e) => setNotifyPhone(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-[#4b261a25] bg-white px-3.5 py-2.5 text-xs text-[#351c13] outline-none focus:border-[#a87648]"
                />
              </label>

              <button
                type="submit"
                className="mt-4 w-full rounded-lg bg-[#351c13] py-3 text-xs font-bold uppercase tracking-widest text-[#fffdf8] hover:bg-[var(--gold)] transition-colors cursor-pointer shadow-md"
              >
                Reserve My Early Access Alert
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Footer */}
      <Footer />

      {/* Shopping Bag Drawer */}
      <CartDrawer session={session} onLogin={onLogin} />

      {/* Toast */}
      {toastMessage && <div className="toast">{toastMessage}</div>}
    </div>
  );
}
