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

function Storefront() {
  return (
    <CartProvider>
      <Loader />
      <main className="relative bg-[var(--bone)] text-[var(--ink)]">
        <Cursor />
        <ScrollProgress />
        <Navigation />
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
  const base = import.meta.env.BASE_URL.toLowerCase().replace(/\/$/, "");
  const fullPath = window.location.pathname.toLowerCase();
  const routedPath = base && fullPath.startsWith(base) ? fullPath.slice(base.length) || "/" : fullPath;
  const hashPath = window.location.hash.replace(/^#/, "").toLowerCase();
  const path = hashPath.startsWith("/") ? hashPath : routedPath;

  if (path.startsWith("/admin")) return <AdminPanel />;

  return <Storefront />;
}
