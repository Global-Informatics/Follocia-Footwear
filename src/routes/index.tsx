import { createFileRoute } from "@tanstack/react-router";
import { App } from "@/App";

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
  component: App,
});
