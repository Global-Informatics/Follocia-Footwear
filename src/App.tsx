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
import { CollectionsPage, ContactPage, ProductDetailPage, SecureCheckoutPage, ShopPage } from "@/components/pages/ShopPages";
import { LegalPage } from "@/components/pages/LegalPage";
import { legalSlugFromPath } from "@/lib/legalPages";

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

import { FolliciaHomePage } from "@/components/home/FolliciaHomePage";

function Storefront({ session, onLogout, onLogin }: { session: AuthSession | null; onLogout: () => void; onLogin: () => void }) {
  return <FolliciaHomePage session={session} onLogout={onLogout} onLogin={onLogin} />;
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
      let hashPath = window.location.hash.replace(/^#/, "").toLowerCase();
      if (hashPath && !hashPath.startsWith("/")) {
        hashPath = "/" + hashPath;
      }
      return hashPath || routedPath;
    };

    setSession(readAuthSession());
    void syncCommerceFromBackend();
    setPath(resolvePath());
    setHydrated(true);

    const handleHashChange = () => setPath(resolvePath());
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, [base]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [path]);

  const adminSections = [
    "/admin", "/dashboard", "/orders", "/inventory", "/customers", "/drops", "/vip", "/stories", "/seo", "/coupons", "/reviews", "/banners", "/cms", "/legal", "/analytics", "/newsletter", "/contact", "/audit"
  ];
  const wantsAdmin = path.startsWith("/admin") || (session?.user?.role === "admin" && adminSections.some((s) => path === s || path.startsWith(s + "/")));
  const wantsAccount = path.startsWith("/account");
  const wantsShop = path === "/shop" || path.startsWith("/shop/");
  const wantsCollections = path.startsWith("/collections");
  const wantsContact = path.startsWith("/contact");
  const wantsCheckout = path.startsWith("/checkout");
  const legalSlug = legalSlugFromPath(path);

  const logout = () => {
    clearAuthSession();
    setSession(null);
  };

  const handleAuthenticated = (next: AuthSession) => {
    setSession(next);
    setLoginOpen(false);
    if (next.user.role === "admin") {
      window.location.hash = "/admin";
    } else {
      window.location.hash = "/account/my-orders";
    }
  };

  if (!hydrated) return null;

  if (wantsAdmin) {
    if (!session || session.user.role !== "admin") {
      return (
        <>
          <Storefront session={session} onLogout={logout} onLogin={() => setLoginOpen(true)} />
          <div className="fixed inset-0 z-[120] grid place-items-center bg-[var(--ink)]/70 px-4 py-8 backdrop-blur-md">
            <button
              onClick={() => {
                window.location.hash = "/";
              }}
              className="fixed right-6 top-6 z-[121] text-3xl leading-none text-[var(--bone)] hover:text-[var(--gold)] cursor-pointer"
              aria-label="Close"
            >
              ✕
            </button>
            <AuthGateway
              intent="admin"
              compact
              onAuthenticated={handleAuthenticated}
            />
          </div>
        </>
      );
    }
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
            onAuthenticated={handleAuthenticated}
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

  if (wantsCheckout) {
    return (
      <CartProvider>
        <SecureCheckoutPage session={session} onLogout={logout} onLogin={() => setLoginOpen(true)} />
        {loginOpen && <LoginOverlay onClose={() => setLoginOpen(false)} onAuthenticated={handleAuthenticated} />}
      </CartProvider>
    );
  }

  if (wantsShop) {
    const productId = path.startsWith("/shop/") ? decodeURIComponent(path.replace("/shop/", "")) : "";
    return (
      <CartProvider>
        {productId ? (
          <ProductDetailPage productId={productId} session={session} onLogout={logout} onLogin={() => setLoginOpen(true)} />
        ) : (
          <ShopPage session={session} onLogout={logout} onLogin={() => setLoginOpen(true)} />
        )}
        {loginOpen && <LoginOverlay onClose={() => setLoginOpen(false)} onAuthenticated={handleAuthenticated} />}
      </CartProvider>
    );
  }

  if (legalSlug) {
    return (
      <CartProvider>
        <LegalPage slug={legalSlug} session={session} onLogout={logout} onLogin={() => setLoginOpen(true)} />
        <CartDrawer session={session} onLogin={() => setLoginOpen(true)} />
        {loginOpen && <LoginOverlay onClose={() => setLoginOpen(false)} onAuthenticated={handleAuthenticated} />}
      </CartProvider>
    );
  }

  if (wantsCollections || wantsContact) {
    return (
      <CartProvider>
        {wantsCollections ? (
          <CollectionsPage session={session} onLogout={logout} onLogin={() => setLoginOpen(true)} />
        ) : (
          <ContactPage session={session} onLogout={logout} onLogin={() => setLoginOpen(true)} />
        )}
        {loginOpen && <LoginOverlay onClose={() => setLoginOpen(false)} onAuthenticated={handleAuthenticated} />}
      </CartProvider>
    );
  }

  return (
    <>
      <Storefront session={session} onLogout={logout} onLogin={() => setLoginOpen(true)} />
      {loginOpen && <LoginOverlay onClose={() => setLoginOpen(false)} onAuthenticated={handleAuthenticated} />}
    </>
  );
}

function LoginOverlay({ onClose, onAuthenticated }: { onClose: () => void; onAuthenticated: (session: AuthSession) => void }) {
  return (
    <div className="fixed inset-0 z-[120] grid place-items-center bg-[var(--ink)]/70 px-4 py-8 backdrop-blur-md">
      <button
        onClick={onClose}
        className="fixed right-6 top-6 z-[121] text-3xl leading-none text-[var(--bone)] hover:text-[var(--gold)] cursor-pointer"
        aria-label="Close login"
      >
        ✕
      </button>
      <AuthGateway intent="customer" compact onAuthenticated={onAuthenticated} />
    </div>
  );
}
