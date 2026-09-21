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
import { Benefits } from "@/components/sections/Benefits";
import { Testimonials } from "@/components/sections/Testimonials";
import { VipNewsletter } from "@/components/sections/VipNewsletter";
import { Footer } from "@/components/sections/Footer";
import { AccountPanel, AdminPanel } from "@/components/panels/CommercePanels";
import { AuthGateway, clearAuthSession, readAuthSession } from "@/components/auth/AuthGateway";
import type { AuthSession } from "@/components/auth/AuthGateway";
import { CollectionsPage, ContactPage, NewArrivalsPage, OurStoryPage, ProductDetailPage, SecureCheckoutPage, ShopPage } from "@/components/pages/ShopPages";
import { LegalPage } from "@/components/pages/LegalPage";
import { legalSlugFromPath } from "@/lib/legalPages";
import { syncCommerceFromBackend } from "@/lib/commerceStore";
import { FolliciaConciergeChat } from "@/components/chat/FolliciaConciergeChat";
import { MobileBottomNav } from "@/components/navigation/MobileBottomNav";
import { FolliciaHomePage } from "@/components/home/FolliciaHomePage";

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
    <>
      <FolliciaHomePage session={session} onLogout={onLogout} onLogin={onLogin} />
      <CartDrawer session={session} onLogin={onLogin} />
    </>
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
    const hash = window.location.hash.toLowerCase();
    if (
      hash === "#shop" ||
      hash === "#motion" ||
      hash === "#top" ||
      hash.startsWith("#/account") ||
      hash.startsWith("#account")
    ) {
      return;
    }
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [path]);

  const adminSections = [
    "/admin", "/dashboard", "/orders", "/inventory", "/customers", "/drops", "/vip", "/stories", "/seo", "/coupons", "/reviews", "/banners", "/cms", "/legal", "/analytics", "/newsletter", "/audit"
  ];
  const wantsAdmin = path.startsWith("/admin") || (session?.user?.role === "admin" && adminSections.some((s) => path === s || path.startsWith(s + "/")));
  const wantsAccount = path.startsWith("/account");
  const wantsLogin = path === "/login" || path.startsWith("/login");
  const cleanPath = path.split("?")[0].split("#")[0];
  const wantsSpecificCollection =
    cleanPath.startsWith("/collection/") ||
    (cleanPath.startsWith("/collections/") && cleanPath !== "/collections");
  const wantsCollections = cleanPath === "/collections" || wantsSpecificCollection;
  const wantsShop = (cleanPath === "/shop" || cleanPath.startsWith("/shop/")) && !wantsSpecificCollection;
  const wantsNewArrivals = cleanPath === "/new-arrivals" || cleanPath.startsWith("/new-arrivals");
  const wantsStory = cleanPath === "/our-story" || cleanPath.startsWith("/our-story");
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

  const renderWithConcierge = (content: React.ReactNode) => (
    <CartProvider>
      <div className="pb-16 md:pb-0 min-h-screen flex flex-col">
        {content}
      </div>
      <FolliciaConciergeChat session={session} />
      <MobileBottomNav session={session} onLogin={() => setLoginOpen(true)} />
    </CartProvider>
  );

  if (wantsLogin) {
    return renderWithConcierge(
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

  if (wantsAdmin) {
    if (!session || session.user.role !== "admin") {
      return renderWithConcierge(
        <>
          <Storefront session={session} onLogout={logout} onLogin={() => setLoginOpen(true)} />
          <LoginOverlay
            onClose={() => {
              window.location.hash = "/";
            }}
            onAuthenticated={handleAuthenticated}
          />
        </>
      );
    }
    return <AdminPanel onLogout={logout} />;
  }

  if (wantsAccount) {
    if (!session) {
      return renderWithConcierge(
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
    return renderWithConcierge(
      <>
        <Navigation userName={session.user.name} onLogout={logout} onLogin={() => setLoginOpen(true)} solid />
        <AccountPanel session={session} initialSection={sectionFromPath(path)} />
        <CartDrawer session={session} onLogin={() => setLoginOpen(true)} />
      </>
    );
  }

  if (wantsCheckout) {
    return renderWithConcierge(
      <>
        <SecureCheckoutPage session={session} onLogout={logout} onLogin={() => setLoginOpen(true)} />
        {loginOpen && <LoginOverlay onClose={() => setLoginOpen(false)} onAuthenticated={handleAuthenticated} />}
      </>
    );
  }

  if (wantsShop) {
    const rawParam = path.startsWith("/shop/") ? decodeURIComponent(path.replace("/shop/", "")).split("?")[0] : "";
    const categorySubpaths = ["flats", "flat", "heels", "heel", "mules", "mule", "boots", "boot"];
    const isCategoryFilter = categorySubpaths.includes(rawParam.toLowerCase());
    const productId = isCategoryFilter ? "" : rawParam;
    return renderWithConcierge(
      <>
        {productId ? (
          <ProductDetailPage productId={productId} session={session} onLogout={logout} onLogin={() => setLoginOpen(true)} />
        ) : (
          <ShopPage session={session} onLogout={logout} onLogin={() => setLoginOpen(true)} />
        )}
        {loginOpen && <LoginOverlay onClose={() => setLoginOpen(false)} onAuthenticated={handleAuthenticated} />}
      </>
    );
  }

  if (legalSlug) {
    return renderWithConcierge(
      <>
        <LegalPage slug={legalSlug} session={session} onLogout={logout} onLogin={() => setLoginOpen(true)} />
        <CartDrawer session={session} onLogin={() => setLoginOpen(true)} />
        {loginOpen && <LoginOverlay onClose={() => setLoginOpen(false)} onAuthenticated={handleAuthenticated} />}
      </>
    );
  }

  if (wantsContact) {
    return renderWithConcierge(
      <>
        <ContactPage session={session} onLogout={logout} onLogin={() => setLoginOpen(true)} />
        {loginOpen && <LoginOverlay onClose={() => setLoginOpen(false)} onAuthenticated={handleAuthenticated} />}
      </>
    );
  }

  if (wantsCollections) {
    return renderWithConcierge(
      <>
        <CollectionsPage session={session} onLogout={logout} onLogin={() => setLoginOpen(true)} />
        {loginOpen && <LoginOverlay onClose={() => setLoginOpen(false)} onAuthenticated={handleAuthenticated} />}
      </>
    );
  }

  if (wantsNewArrivals) {
    return renderWithConcierge(
      <>
        <NewArrivalsPage session={session} onLogout={logout} onLogin={() => setLoginOpen(true)} />
        {loginOpen && <LoginOverlay onClose={() => setLoginOpen(false)} onAuthenticated={handleAuthenticated} />}
      </>
    );
  }

  if (wantsStory) {
    return renderWithConcierge(
      <>
        <OurStoryPage session={session} onLogout={logout} onLogin={() => setLoginOpen(true)} />
        {loginOpen && <LoginOverlay onClose={() => setLoginOpen(false)} onAuthenticated={handleAuthenticated} />}
      </>
    );
  }

  return renderWithConcierge(
    <>
      <Storefront session={session} onLogout={logout} onLogin={() => setLoginOpen(true)} />
      {loginOpen && <LoginOverlay onClose={() => setLoginOpen(false)} onAuthenticated={handleAuthenticated} />}
    </>
  );
}

function LoginOverlay({ onClose, onAuthenticated }: { onClose: () => void; onAuthenticated: (session: AuthSession) => void }) {
  return (
    <div
      className="fixed inset-0 z-[120] overflow-y-auto bg-black/80 backdrop-blur-md"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="flex min-h-full items-center justify-center p-3 sm:p-6 text-center">
        <div
          className="w-full max-w-[460px] text-left"
          onClick={(e) => e.stopPropagation()}
        >
          <AuthGateway intent="customer" compact onClose={onClose} onAuthenticated={onAuthenticated} />
        </div>
      </div>
    </div>
  );
}
