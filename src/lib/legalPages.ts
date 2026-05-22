export type LegalSlug = "privacy" | "terms" | "cookies";

export type LegalRecord = {
  id: string;
  title: string;
  meta: string;
  status: string;
};

export const legalPageConfig: Record<LegalSlug, { label: string; title: string; eyebrow: string; intro: string; updated: string }> = {
  privacy: {
    label: "Privacy",
    title: "Privacy Policy",
    eyebrow: "Client Data Charter",
    intro: "How Maison Follocia collects, protects and uses client information across the online boutique, concierge service and private atelier appointments.",
    updated: "Updated May 2026",
  },
  terms: {
    label: "Terms",
    title: "Terms & Conditions",
    eyebrow: "Boutique Agreement",
    intro: "The terms that govern browsing, reservations, purchases, delivery, returns and use of Follocia ecommerce services.",
    updated: "Updated May 2026",
  },
  cookies: {
    label: "Cookies",
    title: "Cookie Policy",
    eyebrow: "Digital Preferences",
    intro: "How cookies and similar technologies support security, cart memory, analytics and a polished shopping experience.",
    updated: "Updated May 2026",
  },
};

export const defaultLegalRecords: LegalRecord[] = [
  {
    id: "privacy-information-we-collect",
    title: "Information we collect",
    meta: "We collect the details needed to run a premium ecommerce experience, including name, email, phone number, delivery address, order history, wishlist activity, concierge messages and account preferences.",
    status: "Published",
  },
  {
    id: "privacy-how-we-use-data",
    title: "How we use your information",
    meta: "Client information is used to process reservations, manage secure checkout, arrange delivery, provide sizing support, send order updates, improve the boutique experience and personalize private drop communications.",
    status: "Published",
  },
  {
    id: "privacy-sharing-and-security",
    title: "Sharing and security",
    meta: "We share data only with trusted service providers required for payment, delivery, fraud prevention, hosting and client support. We apply reasonable technical and organizational safeguards to protect client records.",
    status: "Published",
  },
  {
    id: "privacy-client-rights",
    title: "Your choices and rights",
    meta: "You may request access, correction or deletion of personal information, unsubscribe from marketing communications, or contact the atelier for privacy questions at any time.",
    status: "Published",
  },
  {
    id: "terms-orders-and-availability",
    title: "Orders and availability",
    meta: "Products are limited edition and subject to availability. Placing an order or reservation confirms that the information supplied is accurate and that the selected size, address and payment method may be verified.",
    status: "Published",
  },
  {
    id: "terms-pricing-and-payment",
    title: "Pricing and payment",
    meta: "Prices, taxes, duties, shipping offers and payment methods may vary by region. Payment authorization, capture and cancellation are handled according to checkout status and concierge confirmation.",
    status: "Published",
  },
  {
    id: "terms-shipping-returns",
    title: "Shipping, returns and exchanges",
    meta: "Delivery timelines are estimates and may change for atelier finishing, address verification or courier conditions. Returns, exchanges and repairs are reviewed according to product condition, eligibility and local law.",
    status: "Published",
  },
  {
    id: "terms-site-use",
    title: "Site use",
    meta: "All content, imagery, marks, product names and design assets belong to Maison Follocia or its licensors. The site may not be copied, scraped, misused or used for fraudulent activity.",
    status: "Published",
  },
  {
    id: "cookies-essential-cookies",
    title: "Essential cookies",
    meta: "Essential cookies keep the site secure and functional. They support login, cart state, checkout, fraud prevention, load balancing and core storefront behavior.",
    status: "Published",
  },
  {
    id: "cookies-analytics-preferences",
    title: "Analytics and preferences",
    meta: "Analytics and preference cookies help us understand store performance, remember choices and refine product discovery, while avoiding unnecessary collection wherever possible.",
    status: "Published",
  },
  {
    id: "cookies-marketing",
    title: "Marketing cookies",
    meta: "Where enabled, marketing cookies may help measure campaigns, control frequency and show relevant private drop communications across approved channels.",
    status: "Published",
  },
  {
    id: "cookies-control",
    title: "Managing cookies",
    meta: "You can control cookies through browser settings. Blocking some cookies may affect account login, cart memory, checkout reliability or concierge forms.",
    status: "Published",
  },
];

export function legalSlugFromPath(path: string): LegalSlug | null {
  if (path.startsWith("/privacy")) return "privacy";
  if (path.startsWith("/terms")) return "terms";
  if (path.startsWith("/cookies")) return "cookies";
  return null;
}

export function recordsForLegalPage(records: LegalRecord[], slug: LegalSlug) {
  const source = records.length ? records : defaultLegalRecords;
  return source
    .filter((record) => record.id.startsWith(`${slug}-`) && record.status !== "Draft" && record.status !== "Paused")
    .sort((a, b) => a.id.localeCompare(b.id));
}
