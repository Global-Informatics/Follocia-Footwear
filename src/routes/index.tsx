import { createFileRoute } from "@tanstack/react-router";
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

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Follocia — Limited Edition Footwear for Women Who Refuse Ordinary" },
      {
        name: "description",
        content:
          "Maison Follocia releases six rare collections of women's footwear per year, hand-sculpted in Florence. Numbered, never reissued.",
      },
      { property: "og:title", content: "Follocia — Limited Edition Footwear" },
      {
        property: "og:description",
        content: "Six rare editions per year. Sculpted in Florence. Worn by the few.",
      },
    ],
  }),
  component: Index,
});

function Index() {
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
