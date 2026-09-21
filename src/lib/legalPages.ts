export type LegalSlug = "privacy" | "terms" | "cookies" | "shipping" | "faq" | "size-guide";

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
    intro: "How Follicia collects, protects and uses client information across the online boutique, concierge service and private consultations.",
    updated: "Updated May 2026",
  },
  terms: {
    label: "Terms",
    title: "Terms & Conditions",
    eyebrow: "Boutique Agreement",
    intro: "The terms that govern browsing, reservations, purchases, delivery, returns and use of Follicia ecommerce services.",
    updated: "Updated May 2026",
  },
  cookies: {
    label: "Cookies",
    title: "Cookie Policy",
    eyebrow: "Digital Preferences",
    intro: "How cookies and similar technologies support security, cart memory, analytics and a polished shopping experience.",
    updated: "Updated May 2026",
  },
  shipping: {
    label: "Shipping & Returns",
    title: "Shipping & Returns Policy",
    eyebrow: "White-Glove Delivery & Exchanges",
    intro: "Complete details on order processing, express shipping across India, transit insurance, and hassle-free 7-day returns.",
    updated: "Updated May 2026",
  },
  faq: {
    label: "FAQs",
    title: "Frequently Asked Questions",
    eyebrow: "Concierge Assistance",
    intro: "Clear answers to common questions about ordering, complimentary shipping, delivery, order tracking, returns, refunds, and concierge support.",
    updated: "Updated May 2026",
  },
  "size-guide": {
    label: "Size Guide",
    title: "Size & Fitting Guide",
    eyebrow: "Precision Fit Studio",
    intro: "Detailed size conversion tables (EU 38 to 41), foot measurement instructions, and silhouette-specific fit recommendations.",
    updated: "Updated May 2026",
  },
};

export const defaultLegalRecords: LegalRecord[] = [
  // Privacy Policy (From Follicia Confidentiality & Client Vows)
  {
    id: "privacy-1-client-confidentiality",
    title: "1. Private Client Confidentiality",
    meta: "All client information, size profiles, reservation records, and delivery locations are treated with absolute discretion. Follicia does not sell, exchange, or share private patron data with third-party tracking networks or advertisers.",
    status: "Published",
  },
  {
    id: "privacy-2-certificate-authenticity",
    title: "2. Certificate & Authenticity Tracking",
    meta: "Each edition is bound to a physical numbered parchment certificate. Ownership transfers and limited reservations are securely cataloged upon private concierge verification to protect limited-edition provenance.",
    status: "Published",
  },
  {
    id: "privacy-3-white-glove-courier",
    title: "3. White-Glove Courier Data",
    meta: "Delivery parameters are transmitted exclusively to our insured private courier partners for the sole purpose of hand-executing your reservation shipment with white-glove security.",
    status: "Published",
  },
  {
    id: "privacy-4-information-collected",
    title: "4. Information We Collect",
    meta: "We collect only the details needed for an exquisite boutique experience: patron name, email, contact telephone, delivery address, sizing history, wishlist activity, and concierge correspondence.",
    status: "Published",
  },
  {
    id: "privacy-5-client-rights",
    title: "5. Client Rights & Data Discretion",
    meta: "You may request access, correction, export, or deletion of personal information at any time, unsubscribe from drop notifications, or contact our private concierge at concierge@follicia.com.",
    status: "Published",
  },

  // Terms & Conditions (Boutique Agreement)
  {
    id: "terms-1-eligibility",
    title: "1. Client Eligibility & Age Requirement",
    meta: "By accessing Follicia, creating an account, or requesting an edition reservation, you confirm that you are at least 18 years of age and legally competent to enter into binding agreements.",
    status: "Published",
  },
  {
    id: "terms-2-orders-and-availability",
    title: "2. Orders & Numbered Edition Availability",
    meta: "Products are limited edition and subject to edition availability. Placing an order or reservation confirms that the information supplied is accurate and that selected size, address, and payment credentials may be verified by our concierge.",
    status: "Published",
  },
  {
    id: "terms-3-pricing-and-payment",
    title: "3. Pricing, Duties & Payment Authorization",
    meta: "Prices, regional duties, luxury taxes, and payment methods are displayed clearly at checkout. Payment authorization, capture, and cancellation are handled strictly according to verified payment gateway protocols.",
    status: "Published",
  },
  {
    id: "terms-4-shipping-returns",
    title: "4. White-Glove Shipping, Returns & Exchanges",
    meta: "Delivery timelines are estimates subject to handcrafted finishing, address verification, and courier conditions. Unworn footwear in original luxury packaging with seals and authenticity certificates intact may be returned or exchanged within 14 days.",
    status: "Published",
  },
  {
    id: "terms-5-site-use",
    title: "5. Intellectual Property & Site Integrity",
    meta: "All footwear silhouettes, imagery, registered marks, typography, and design assets belong exclusively to Follicia. The boutique platform may not be copied, scraped, reverse-engineered, or used for unauthorized purposes.",
    status: "Published",
  },

  // Cookies
  {
    id: "cookies-1-essential",
    title: "1. Essential Session Cookies",
    meta: "Essential cookies keep the site secure and functional. They support account authentication, shopping bag persistence, checkout protection, and core storefront behavior.",
    status: "Published",
  },
  // Shipping & Returns
  {
    id: "shipping-1-delivery",
    title: "Shipping & Delivery",
    meta: "We are committed to making your shopping experience smooth from the moment you place your order until it arrives at your doorstep. Every order is carefully inspected, securely packed, and dispatched through trusted delivery partners. We offer reliable shipping across India, with estimated delivery timelines shared during checkout or after order confirmation.\n\nFor selected products, special handling or white-glove delivery may be available to ensure your purchase reaches you safely and in perfect condition. Delivery timelines may vary depending on your location, product availability, and the nature of the item.",
    status: "Published",
  },
  {
    id: "shipping-2-returns",
    title: "Returns & Exchanges",
    meta: "We want you to be completely satisfied with your purchase. If an eligible item does not meet your expectations, you may request a return or exchange within the applicable return period. Items must be returned in their original condition, unused, and with all packaging, tags, and accessories intact.\n\nCertain customized, made-to-order, clearance, or final-sale products may not be eligible for return or exchange. Once your returned item has been received and inspected, our team will process the applicable exchange or refund according to our policy.",
    status: "Published",
  },

  // FAQs
  {
    id: "faq-01-order",
    title: "How can I place an order?",
    meta: "Browse our collections, select your preferred product and size, and add it to your bag. Once you proceed to checkout, enter your delivery details and complete the payment securely.",
    status: "Published",
  },
  {
    id: "faq-02-delivery",
    title: "How long does delivery take?",
    meta: "Orders are carefully prepared and dispatched through our trusted delivery partners. Delivery timelines may vary depending on your location and product availability. Estimated delivery details will be shared once your order is confirmed.",
    status: "Published",
  },
  {
    id: "faq-03-shipping",
    title: "Do you offer complimentary shipping?",
    meta: "Yes. We offer complimentary shipping across India on orders above ₹9,999. Any applicable shipping charges for orders below this value will be displayed at checkout.",
    status: "Published",
  },
  {
    id: "faq-04-tracking",
    title: "Can I track my order?",
    meta: "Yes. Once your order has been dispatched, tracking details will be shared with you so you can follow your package until it reaches your doorstep.",
    status: "Published",
  },
  {
    id: "faq-05-returns",
    title: "Can I return or exchange my purchase?",
    meta: "Eligible products can be returned or exchanged within the applicable return period. Items should be unused, unworn, and returned with their original packaging and tags intact.",
    status: "Published",
  },
  {
    id: "faq-06-damaged",
    title: "What if I receive a damaged or incorrect item?",
    meta: "If your order arrives damaged or you receive an incorrect product, please contact our customer care team as soon as possible. We will review the issue and assist you with the appropriate resolution.",
    status: "Published",
  },
  {
    id: "faq-07-cancellation",
    title: "Can I change or cancel my order?",
    meta: "If you need to modify or cancel an order, please contact us at the earliest. Once an order has been processed or dispatched, changes or cancellations may no longer be possible.",
    status: "Published",
  },
  {
    id: "faq-08-eligibility",
    title: "Are all products eligible for returns?",
    meta: "Certain customized, made-to-order, personalized, clearance, or final-sale products may not be eligible for returns or exchanges. Product-specific conditions will be mentioned wherever applicable.",
    status: "Published",
  },
  {
    id: "faq-09-refund",
    title: "How will I receive my refund?",
    meta: "Once your returned product is received and successfully inspected, eligible refunds will be processed to the original payment method. Processing times may vary depending on your payment provider.",
    status: "Published",
  },
  {
    id: "faq-10-assistance",
    title: "Need Personal Assistance?",
    meta: "Our Concierge Assistance team is here to make your Follicia experience effortless. Whether you need help choosing a product, understanding sizing, tracking an order, or arranging a return or exchange, our team will be happy to assist you.",
    status: "Published",
  },

  // Size Guide
  {
    id: "size-guide-1-chart",
    title: "1. European Size Conversion Chart",
    meta: "EU 38 (24.0 cm / UK 5) | EU 39 (24.7 cm / UK 6) | EU 40 (25.3 cm / UK 7) | EU 41 (26.0 cm / UK 8). Measured heel-to-toe length.",
    status: "Published",
  },
  {
    id: "size-guide-2-measurement",
    title: "2. How to Measure Your Foot at Home",
    meta: "Place your foot flat on a sheet of paper against a wall. Mark the longest tip of your toes and measure distance to the wall in centimeters.",
    status: "Published",
  },
  {
    id: "size-guide-3-fit-tips",
    title: "3. Silhouette Fit Recommendations",
    meta: "For pointed toe flats, if you have wider feet, we recommend opting for one size larger (e.g. EU 39 instead of EU 38) for optimal comfort.",
    status: "Published",
  },
];

export function legalSlugFromPath(path: string): LegalSlug | null {
  const clean = path.replace(/^#?\/?/, "").toLowerCase().split("?")[0].split("#")[0];
  if (clean === "privacy" || clean.startsWith("privacy/") || clean === "legal/privacy" || clean.startsWith("legal/privacy/")) return "privacy";
  if (clean === "terms" || clean.startsWith("terms/") || clean === "legal/terms" || clean.startsWith("legal/terms/")) return "terms";
  if (clean === "cookies" || clean.startsWith("cookies/") || clean === "legal/cookies" || clean.startsWith("legal/cookies/")) return "cookies";
  if (clean === "shipping" || clean.startsWith("shipping/") || clean === "legal/shipping" || clean.startsWith("legal/shipping/")) return "shipping";
  if (clean === "faq" || clean.startsWith("faq/") || clean === "faqs" || clean.startsWith("faqs/") || clean === "legal/faq") return "faq";
  if (clean === "size-guide" || clean === "sizeguide" || clean === "size" || clean === "legal/size-guide") return "size-guide";
  return null;
}

export function recordsForLegalPage(records: LegalRecord[], slug: LegalSlug) {
  const source = records.length ? records : defaultLegalRecords;
  return source
    .filter((record) => record.id.startsWith(`${slug}-`) && record.status !== "Draft" && record.status !== "Paused")
    .sort((a, b) => a.id.localeCompare(b.id));
}
