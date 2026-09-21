import { useState } from "react";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/sections/Footer";
import { CartDrawer } from "@/components/cart/CartDrawer";
import type { AuthSession } from "@/components/auth/AuthGateway";
import "@/components/home/follicia.css";

export function OurStoryPage({
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
        meta: `Subscribed on ${new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })} via Our Story Page`,
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

  return (
    <div className="follicia-home flex flex-col min-h-screen bg-[#fffaf0]">
      {/* Site Header */}
      <Navigation
        userName={session?.user.name}
        onLogout={session ? onLogout : undefined}
        onLogin={onLogin}
        solid
      />

      <main className="flex-1 bg-[#fffaf0] text-[var(--ink)]">
        {/* Hero Story */}
        <section className="story story-page" id="our-story">
          <div className="story-image">
            <img
              src="/campaigns/aura-motion.webp"
              alt="Follicia Aura footwear worn in motion"
            />
          </div>
          <div className="story-copy">
            <p className="eyebrow">The Follicia philosophy</p>
            <h2>A statement without compromise.</h2>
            <p>
              Follicia is created for women who want their footwear to express who they are—without choosing between distinctive design, everyday comfort and compassion.
            </p>
            <p>
              We began with a simple question: why should a woman have to choose between a striking design and a pair she can comfortably move in? That question became a world of flats, heels and mules designed around individuality, movement and thoughtful detail.
            </p>
            <a className="button outline" href="#/shop">
              Explore our collections
            </a>
          </div>
        </section>

        {/* Material Manifesto */}
        <section className="story-manifesto">
          <div>
            <p className="eyebrow">Our material philosophy</p>
            <h2>The leather-like experience, without the animal hide.</h2>
          </div>
          <div className="manifesto-copy">
            <p>
              We use thoughtfully selected vegan leather to create refined textures, expressive finishes and a soft, premium feel—without using animal leather.
            </p>
            <p>
              Our animal-print footwear is created using patterns printed on vegan materials. The visual character remains bold, but no animal skin is required to achieve it. This is central to Follicia's cruelty-free design direction: sophisticated footwear and compassionate choices can share one silhouette.
            </p>
          </div>
        </section>

        {/* Three Promises */}
        <section className="promise">
          <div>
            <h3>Vegan materials</h3>
            <p>Leather-like finishes selected without using animal hides.</p>
          </div>
          <div>
            <h3>Cruelty-free direction</h3>
            <p>Animal-print character, recreated through printed vegan leather.</p>
          </div>
          <div>
            <h3>Soft-sole comfort</h3>
            <p>Thoughtful cushioning and wearable proportions made for movement.</p>
          </div>
        </section>

        {/* Comfort Story */}
        <section className="comfort-story">
          <p className="eyebrow">Comfort in every step</p>
          <h2>Designed to make a statement. Considered for real movement.</h2>
          <p>
            Beauty begins with how a pair feels when it is worn. Across our silhouettes, we consider soft cushioned footbeds, wearable heel proportions, supportive straps and balanced shapes—details that help each design move as beautifully as it looks.
          </p>
        </section>

        {/* Four Expressions of Femininity */}
        <section className="story-worlds">
          <div className="worlds-heading">
            <p className="eyebrow">The Follicia worlds</p>
            <h2>Four expressions of femininity.</h2>
          </div>
          <div className="worlds-grid">
            <a href="#/collection/aura">
              <span>01</span>
              <h3>Aura</h3>
              <p>Fluid lines, refined structure and effortless everyday confidence.</p>
            </a>
            <a href="#/collection/bloom">
              <span>02</span>
              <h3>Bloom</h3>
              <p>Romantic details, soft colour and floral forms with a modern spirit.</p>
            </a>
            <a href="#/collection/muse">
              <span>03</span>
              <h3>Muse</h3>
              <p>Experimental silhouettes for women who inspire rather than imitate.</p>
            </a>
            <a href="#/collection/noire">
              <span>04</span>
              <h3>Noire</h3>
              <p>Evening confidence in crystal accents, metallics and dramatic form.</p>
            </a>
          </div>
        </section>

        {/* Story Closing */}
        <section className="story-closing">
          <p>
            The feel of leather. The comfort of a soft sole. The confidence of distinctive design—without requiring harm to animals.
          </p>
          <h2>Walk beautifully. Walk consciously. Walk as yourself.</h2>
          <a className="button light" href="#/shop">
            Find your Follicia
          </a>
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

      {/* Footer */}
      <Footer />

      {/* Shopping Bag Drawer */}
      <CartDrawer session={session} onLogin={onLogin} />

      {/* Toast */}
      {toastMessage && <div className="toast">{toastMessage}</div>}
    </div>
  );
}
