import { useEffect, useState } from "react";
import { Navigation } from "@/components/Navigation";
import { Cursor } from "@/components/Cursor";
import { ScrollProgress } from "@/components/ScrollProgress";
import { Loader } from "@/components/Loader";
import { CartProvider } from "@/components/cart/CartContext";
import { CartDrawer } from "@/components/cart/CartDrawer";
import { Hero } from "@/components/sections/Hero";
import { BrandStory, Marquee } from "@/components/sections/BrandStory";
import { FeaturedCollections } from "@/components/sections/FeaturedCollections";
import { Lookbook } from "@/components/sections/Lookbook";
import { Atelier } from "@/components/sections/Atelier";
import { Benefits } from "@/components/sections/Benefits";
import { Testimonials } from "@/components/sections/Testimonials";
import { VipNewsletter } from "@/components/sections/VipNewsletter";
import { Footer } from "@/components/sections/Footer";
import { AdminPanel } from "@/components/panels/CommercePanels";
import { AuthGateway, clearAuthSession, readAuthSession } from "@/components/auth/AuthGateway";
import type { AuthSession } from "@/components/auth/AuthGateway";

function Storefront({ session, onLogout }: { session: AuthSession; onLogout: () => void }) {
  return (
    <CartProvider>
      <Loader />
      <main className="relative bg-[var(--bone)] text-[var(--ink)]">
        <Cursor />
        <ScrollProgress />
        <Navigation userName={session.user.name} onLogout={onLogout} />
        <Hero />
        <Marquee />
        <BrandStory />
        <FeaturedCollections />
        <Lookbook />
        <Atelier />
        <Benefits />
        <Testimonials />
        <VipNewsletter />
        <Footer />
        <CartDrawer />
      </main>
    </CartProvider>
  );
}

export function App() {
  const [hydrated, setHydrated] = useState(false);
  const [session, setSession] = useState<AuthSession | null>(null);
  const [path, setPath] = useState("/");
  const base = import.meta.env.BASE_URL.toLowerCase().replace(/\/$/, "");

  useEffect(() => {
    const resolvePath = () => {
      const fullPath = window.location.pathname.toLowerCase();
      const routedPath = base && fullPath.startsWith(base) ? fullPath.slice(base.length) || "/" : fullPath;
      const hashPath = window.location.hash.replace(/^#/, "").toLowerCase();
      return hashPath.startsWith("/") ? hashPath : routedPath;
    };

    setSession(readAuthSession());
    setPath(resolvePath());
    setHydrated(true);

    const handleHashChange = () => setPath(resolvePath());
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, [base]);

  const wantsAdmin = path.startsWith("/admin");

  const logout = () => {
    clearAuthSession();
    setSession(null);
  };

  if (!hydrated) return null;

  if (!session) return <AuthGateway intent={wantsAdmin ? "admin" : "customer"} onAuthenticated={setSession} />;

  if (wantsAdmin || session.user.role === "admin") {
    if (session.user.role !== "admin") return <AuthGateway intent="admin" onAuthenticated={setSession} />;
    return <AdminPanel onLogout={logout} />;
  }

  return <Storefront session={session} onLogout={logout} />;
}
