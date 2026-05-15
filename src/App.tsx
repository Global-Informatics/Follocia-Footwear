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
import { AccountPanel, AdminPanel } from "@/components/panels/CommercePanels";
import { AuthGateway, clearAuthSession, readAuthSession } from "@/components/auth/AuthGateway";
import type { AuthSession } from "@/components/auth/AuthGateway";
import { syncCommerceFromBackend } from "@/lib/commerceStore";

function sectionFromPath(path: string) {
  if (path.includes("my-addresses")) return "My Addresses" as const;
  if (path.includes("my-wallet")) return "My Wallet" as const;
  if (path.includes("my-wishlist")) return "My Wishlist" as const;
  if (path.includes("my-coupons")) return "My Coupons" as const;
  if (path.includes("gift-cards")) return "Gift Cards" as const;
  if (path.includes("my-reviews")) return "My Reviews" as const;
  if (path.includes("notifications")) return "Notifications" as const;
  if (path.includes("my-subscriptions")) return "My Subscriptions" as const;
  if (path.includes("my-account")) return "My Account" as const;
  return "My Orders" as const;
}

function Storefront({ session, onLogout, onLogin }: { session: AuthSession | null; onLogout: () => void; onLogin: () => void }) {
  return (
    <CartProvider>
      <Loader />
      <main className="relative bg-[var(--bone)] text-[var(--ink)]">
        <Cursor />
        <ScrollProgress />
        <Navigation userName={session?.user.name} onLogout={session ? onLogout : undefined} onLogin={onLogin} />
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
        <CartDrawer session={session} onLogin={onLogin} />
      </main>
    </CartProvider>
  );
}

export function App() {
  const [hydrated, setHydrated] = useState(false);
  const [session, setSession] = useState<AuthSession | null>(null);
  const [path, setPath] = useState("/");
  const [loginOpen, setLoginOpen] = useState(false);
  const base = import.meta.env.BASE_URL.toLowerCase().replace(/\/$/, "");

  useEffect(() => {
    const resolvePath = () => {
      const fullPath = window.location.pathname.toLowerCase();
      const routedPath = base && fullPath.startsWith(base) ? fullPath.slice(base.length) || "/" : fullPath;
      const hashPath = window.location.hash.replace(/^#/, "").toLowerCase();
      return hashPath.startsWith("/") ? hashPath : routedPath;
    };

    setSession(readAuthSession());
    void syncCommerceFromBackend();
    setPath(resolvePath());
    setHydrated(true);

    const handleHashChange = () => setPath(resolvePath());
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, [base]);

  const wantsAdmin = path.startsWith("/admin");
  const wantsAccount = path.startsWith("/account");

  const logout = () => {
    clearAuthSession();
    setSession(null);
  };

  if (!hydrated) return null;

  if (wantsAdmin || session?.user.role === "admin") {
    if (!session || session.user.role !== "admin") return <AuthGateway intent="admin" onAuthenticated={setSession} />;
    return <AdminPanel onLogout={logout} />;
  }

  if (wantsAccount) {
    if (!session) {
      return (
        <>
          <Storefront session={session} onLogout={logout} onLogin={() => setLoginOpen(true)} />
          <LoginOverlay
            onClose={() => {
              setLoginOpen(false);
              window.location.hash = "/";
            }}
            onAuthenticated={setSession}
          />
        </>
      );
    }
    return (
      <CartProvider>
        <Navigation userName={session.user.name} onLogout={logout} onLogin={() => setLoginOpen(true)} solid />
        <AccountPanel session={session} initialSection={sectionFromPath(path)} />
        <CartDrawer session={session} onLogin={() => setLoginOpen(true)} />
      </CartProvider>
    );
  }

  return (
    <>
      <Storefront session={session} onLogout={logout} onLogin={() => setLoginOpen(true)} />
      {loginOpen && (
        <div className="fixed inset-0 z-[120] grid place-items-center bg-[var(--ink)]/70 px-4 py-8 backdrop-blur-md">
          <button onClick={() => setLoginOpen(false)} className="fixed right-6 top-6 z-[121] text-4xl text-[var(--bone)]">×</button>
          <AuthGateway
            intent="customer"
            compact
            onAuthenticated={(next) => {
              setSession(next);
              setLoginOpen(false);
            }}
          />
        </div>
      )}
    </>
  );
}

function LoginOverlay({ onClose, onAuthenticated }: { onClose: () => void; onAuthenticated: (session: AuthSession) => void }) {
  return (
    <div className="fixed inset-0 z-[120] grid place-items-center bg-[var(--ink)]/70 px-4 py-8 backdrop-blur-md">
      <button onClick={onClose} className="fixed right-6 top-6 z-[121] text-4xl leading-none text-[var(--bone)]" aria-label="Close login">x</button>
      <AuthGateway intent="customer" compact onAuthenticated={onAuthenticated} />
    </div>
  );
}
