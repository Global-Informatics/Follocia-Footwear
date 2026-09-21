import c1 from "@/assets/collection-1.jpg";
import c2 from "@/assets/collection-2.jpg";
import c3 from "@/assets/collection-3.jpg";
import Footwear from "@/assets/Footwear.jpg";
import type { CartItem } from "@/components/cart/CartContext";
import { FOLLICIA_PRODUCTS, type ProductVariant } from "@/data/folliciaCatalogue";

export type { ProductVariant };

export const ALL_AVAILABLE_EU_SIZES = ["EU 35", "EU 36", "EU 37", "EU 38", "EU 39", "EU 40", "EU 41", "EU 42", "EU 43"] as const;
export const DEFAULT_PRODUCT_SIZES = ["EU 38", "EU 39", "EU 40", "EU 41"];

export type CommerceProduct = {
  id: string;
  designId?: string;
  title: string;
  edition: string;
  tone: string;
  color?: string;
  colors?: string;
  availableColors?: string[];
  availableSizes?: string[];
  heroColour?: string;
  colourName?: string;
  colourCode?: string;
  colourFamily?: string;
  colourVariantSku?: string;
  fullSkus?: Record<string, string>;
  sizeRange?: string;
  heelHeight?: string;
  price: string;
  image: string;
  images?: string[];
  variants?: ProductVariant[];
  status: string;
  produced: number;
  reserved: number;
  available: number;
  category?: string;
  material?: string;
  silhouette?: string;
  collection?: string;
  subCollection?: string;
  notes?: string;
  isNewArrival?: boolean;
  dropDate?: string;
};

export type CommerceOrder = {
  id: string;
  customerId: string;
  customer: string;
  email: string;
  product: string;
  size: string;
  amount: string;
  status: string;
  paymentStatus: string;
  deliveryStatus: string;
  deliveryEta: string;
  trackingCode: string;
  paymentMethod: string;
  deliveryAddress: string;
  date: string;
};

export type CommerceAddress = {
  id: string;
  firstName: string;
  lastName: string;
  company: string;
  address: string;
  address2: string;
  city: string;
  country: string;
  region: string;
  zip: string;
  phone: string;
  isDefault: boolean;
};

export type CustomerProfile = {
  id: string;
  name: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  tier: string;
  memberSince: string;
  addresses: CommerceAddress[];
  wishlist: string[];
  subscriptions: string[];
};

const PRODUCTS_KEY = "follocia_products_v12";
const ORDERS_KEY = "follocia_orders";
const CUSTOMERS_KEY = "follocia_customers";
export const COMMERCE_EVENT = "follocia-commerce-change";
const API_ROOT = "/api/commerce";

if (typeof window !== "undefined") {
  try {
    for (let i = 1; i <= 11; i++) {
      localStorage.removeItem(i === 1 ? "follocia_products" : `follocia_products_v${i}`);
    }
  } catch {
    // Ignore in SSR / restricted storage
  }
}

export function getHeroColorCode(heroColor?: string): string {
  if (!heroColor) return "WI";
  const upper = heroColor.trim().toUpperCase();
  if (upper.length === 2 && /^[A-Z]{2}$/.test(upper)) return upper;
  if (upper.includes("WARM IVORY") || upper.includes("IVORY")) return "WI";
  if (upper.includes("CHOCOLATE") || upper.includes("BROWN")) return "CB";
  if (upper.includes("CHAMPAGNE") || upper.includes("NUDE")) return "CN";
  if (upper.includes("JET BLACK") || upper.includes("BLACK") || upper.includes("NOIR") || upper.includes("ONYX")) return "BK";
  if (upper.includes("BURGUNDY") || upper.includes("WINE") || upper.includes("MAROON")) return "BG";
  if (upper.includes("GOLD") || upper.includes("AMBER")) return "GD";
  if (upper.includes("SILVER") || upper.includes("PLATINUM") || upper.includes("CHROME")) return "SV";
  if (upper.includes("ROSE") || upper.includes("BLUSH") || upper.includes("PINK")) return "RS";
  if (upper.includes("OLIVE") || upper.includes("SAGE") || upper.includes("GREEN")) return "OL";
  if (upper.includes("TAN") || upper.includes("COGNAC") || upper.includes("CAMEL")) return "TN";
  if (upper.includes("WHITE")) return "WH";
  const clean = heroColor.trim().replace(/[^a-zA-Z]/g, "");
  if (clean.length >= 2) {
    return clean.slice(0, 2).toUpperCase();
  }
  return clean.toUpperCase().padEnd(2, "X");
}

export function parsePriceNumber(val: unknown): number {
  if (typeof val === "number") return isNaN(val) ? 0 : val;
  if (!val) return 0;
  const withoutPrefix = String(val).replace(/^[^0-9]*/, "").replace(/,/g, "").trim();
  const parsed = parseFloat(withoutPrefix);
  return isNaN(parsed) ? 0 : parsed;
}

export function computeFullSku(designId?: string, colourCodeOrHeroColor?: string, size?: string | number): string {
  const dId = (designId || "FA-01").toUpperCase().trim();
  let code = (colourCodeOrHeroColor || "").trim().toUpperCase();
  if (!code) {
    code = "WI";
  } else if (code.length !== 2) {
    code = getHeroColorCode(code);
  }
  const sz = String(size || "38").replace(/\D/g, "") || "38";
  return `${dId}-${code}-${sz}`;
}

export function computeAllFullSkus(designId?: string, colourCodeOrHeroColor?: string, sizes?: string[]): Record<string, string> {
  const effectiveSizes = (sizes && sizes.length > 0 ? sizes : ["38", "39", "40", "41"]).map((s) => s.replace(/\D/g, "")).filter(Boolean);
  const map: Record<string, string> = {};
  for (const sz of effectiveSizes) {
    map[sz] = computeFullSku(designId, colourCodeOrHeroColor, sz);
  }
  return map;
}

export function getProductVariants(product: CommerceProduct): ProductVariant[] {
  const pId = (product.designId || product.id || "").toLowerCase();
  const matched = FOLLICIA_PRODUCTS.find(
    (p) => p.id.toLowerCase() === pId || p.designId.toLowerCase() === pId
  );

  if (matched?.variants && matched.variants.length > 0) {
    if (product.variants && product.variants.length >= matched.variants.length) {
      return product.variants.map((pv, idx) => ({
        ...matched.variants![idx],
        ...pv,
        image: pv.image || matched.variants![idx]?.image || product.image,
        fullSkus: pv.fullSkus || matched.variants![idx]?.fullSkus || computeAllFullSkus(product.designId || product.id, pv.heroColour),
      }));
    }
    return matched.variants;
  }

  if (product.variants && product.variants.length > 0) {
    return product.variants;
  }

  const defaultHero = product.heroColour || product.tone || "Warm Ivory";
  const defaultCode = product.colourCode || getHeroColorCode(defaultHero);
  const defaultSku = product.colourVariantSku || `${(product.designId || product.id).toUpperCase()}-${defaultCode}`;
  const defaultFullSkus = product.fullSkus || computeAllFullSkus(product.designId || product.id, defaultHero);

  return [
    {
      heroColour: defaultHero,
      colourName: product.colourName || defaultHero,
      colourCode: defaultCode,
      colourVariantSku: defaultSku,
      image: product.image,
      fullSkus: defaultFullSkus,
    },
  ];
}

export function getActiveVariant(product: CommerceProduct, activeImageOrColor?: string): ProductVariant {
  const variants = getProductVariants(product);
  if (!variants || variants.length === 0) {
    const defaultHero = product.heroColour || product.tone || "Warm Ivory";
    return {
      heroColour: defaultHero,
      colourName: defaultHero,
      colourCode: product.colourCode || getHeroColorCode(defaultHero),
      colourVariantSku: product.colourVariantSku || `${(product.designId || product.id).toUpperCase()}-${getHeroColorCode(defaultHero)}`,
      image: product.image,
      fullSkus: product.fullSkus || computeAllFullSkus(product.designId || product.id, defaultHero),
    };
  }

  if (activeImageOrColor) {
    const clean = activeImageOrColor.trim().toLowerCase();
    const cleanFileName = clean.split("/").pop()?.split("?")[0] || clean;

    // 1. Direct or filename match with variant image
    const matchByImage = variants.find((v) => {
      if (!v.image) return false;
      const vClean = v.image.trim().toLowerCase();
      const vFileName = vClean.split("/").pop()?.split("?")[0] || vClean;
      return vClean === clean || vFileName === cleanFileName;
    });
    if (matchByImage) return matchByImage;

    // 2. Color name or code match
    const matchByColor = variants.find(
      (v) =>
        v.heroColour.toLowerCase() === clean ||
        (v.colourName && v.colourName.toLowerCase() === clean) ||
        (v.colourCode && v.colourCode.toLowerCase() === clean)
    );
    if (matchByColor) return matchByColor;

    // 3. Match by index in gallery
    const images = productImages(product);
    const imgIndex = images.findIndex((img) => {
      const iClean = img.trim().toLowerCase();
      const iFileName = iClean.split("/").pop()?.split("?")[0] || iClean;
      return iClean === clean || iFileName === cleanFileName;
    });
    if (imgIndex >= 0 && variants[imgIndex]) {
      return variants[imgIndex];
    }
  }

  return variants[0];
}

const catalogueCommerceProducts: CommerceProduct[] = FOLLICIA_PRODUCTS.map((p) => {
  const dId = p.designId || p.id.toUpperCase();
  const heroCol = p.heroColour || p.color || "Warm Ivory";
  const dynamicFullSkus = p.fullSkus || computeAllFullSkus(dId, heroCol);
  const rawImages = [
    p.image,
    ...(p.variants?.map((v) => v.image) || []),
    ...(p.variantImages ? Object.values(p.variantImages) : []),
  ];
  const uniqueImages = Array.from(new Set(rawImages.filter(Boolean)));

  return {
    id: p.id.toLowerCase(),
    designId: dId,
    title: p.name,
    edition: `${p.collection} Collection`,
    tone: p.color,
    color: p.color,
    colors: p.colors,
    availableColors: p.availableColors,
    heroColour: heroCol,
    colourName: p.colourName || p.color,
    colourCode: p.colourCode || getHeroColorCode(heroCol),
    colourFamily: p.colourFamily || "",
    colourVariantSku: p.colourVariantSku || `${dId}-${getHeroColorCode(heroCol)}`,
    fullSkus: dynamicFullSkus,
    sizeRange: p.sizeRange || "38–41",
    availableSizes: DEFAULT_PRODUCT_SIZES,
    heelHeight: p.heelHeight,
    price: `Rs. ${p.price.toLocaleString("en-IN")}`,
    image: p.image,
    images: uniqueImages,
    variants: p.variants,
    status: p.productStatus || "Live",
    produced: 120,
    reserved: 24,
    available: 96,
    category: p.category,
    material: p.material,
    silhouette: p.silhouette,
    collection: p.collection,
    subCollection: p.subCollection,
    notes: p.notes,
  };
});

export const seedProducts: CommerceProduct[] = [
  ...catalogueCommerceProducts,
];

const seedOrders: CommerceOrder[] = [
  { id: "RSV-1048", customerId: "vip-002", customer: "Camille R.", email: "camille@example.com", product: "Aura Wave", size: "38", amount: "Rs. 3,449", status: "Concierge Review", paymentStatus: "Payment Pending", deliveryStatus: "Order Placed", deliveryEta: "Awaiting confirmation", trackingCode: "", paymentMethod: "Concierge Pay", deliveryAddress: "Paris private salon", date: "Today" },
  { id: "RSV-1047", customerId: "vip-001", customer: "Ananya Sharma", email: "client@follicia.com", product: "Bloom Blush", size: "39", amount: "Rs. 9,900", status: "Fitting Booked", paymentStatus: "Authorized", deliveryStatus: "Fitting Scheduled", deliveryEta: "May 18", trackingCode: "", paymentMethod: "Card Authorization", deliveryAddress: "Mumbai concierge address", date: "Today" },
  { id: "RSV-1031", customerId: "vip-001", customer: "Ananya Sharma", email: "client@follicia.com", product: "Muse Cobra", size: "38", amount: "Rs. 25,000", status: "Certificate Ready", paymentStatus: "Paid", deliveryStatus: "Delivered", deliveryEta: "Delivered", trackingCode: "FL-1031-VIP", paymentMethod: "Card Authorization", deliveryAddress: "Mumbai concierge address", date: "Delivered" },
];

const seedCustomers: CustomerProfile[] = [
  {
    id: "vip-001",
    name: "Ananya Sharma",
    email: "client@follicia.com",
    firstName: "Ananya",
    lastName: "Sharma",
    phone: "",
    tier: "Follicia Member",
    memberSince: "MMXXIV",
    wishlist: ["fl-aura-01", "fl-bloom-01"],
    subscriptions: [],
    addresses: [],
  },
];

function parseJson<T>(value: string | null, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function read<T>(key: string, seed: T): T {
  if (typeof window === "undefined") return seed;
  const existing = localStorage.getItem(key);
  if (existing) return parseJson(existing, seed);
  localStorage.setItem(key, JSON.stringify(seed));
  return seed;
}

function write<T>(key: string, value: T) {
  localStorage.setItem(key, JSON.stringify(value));
  window.dispatchEvent(new CustomEvent(COMMERCE_EVENT));
}

export function productImages(product: CommerceProduct) {
  const pId = (product.designId || product.id || "").toLowerCase();
  const matched = FOLLICIA_PRODUCTS.find(
    (p) => p.id.toLowerCase() === pId || p.designId.toLowerCase() === pId
  );
  const variantImgs = (matched?.variants?.map((v) => v.image) || []).filter(Boolean);
  const matchedVariantDict = matched?.variantImages ? Object.values(matched.variantImages) : [];
  const prodVariantImgs = (product.variants?.map((v) => v.image) || []).filter(Boolean);
  const fallbackCatalogImg = `/products/${(matched?.designId || product.designId || product.id).toLowerCase()}.webp`;

  const gallery = [
    matched?.image,
    fallbackCatalogImg,
    product.image,
    ...variantImgs,
    ...matchedVariantDict,
    ...(product.images ?? []),
    ...prodVariantImgs,
  ].filter(Boolean);

  return Array.from(new Set(gallery)).slice(0, 5);
}

export function productPrimaryImage(product: CommerceProduct) {
  const pId = (product.designId || product.id || "").toLowerCase();
  const matched = FOLLICIA_PRODUCTS.find(
    (p) => p.id.toLowerCase() === pId || p.designId.toLowerCase() === pId
  );
  return matched?.image || `/products/${(matched?.designId || product.designId || product.id).toLowerCase()}.webp` || productImages(product)[0] || "/products/fa-01.webp";
}

const OLD_PRODUCT_IDS = new Set([
  "Footwear-01", "Footwear-02", "Footwear-03", "Footwear-04",
  "prod-Footwear-01", "prod-Footwear-02", "prod-Footwear-03",
  "prod-01", "prod-02", "prod-03"
]);

export function isOldProduct(product: CommerceProduct): boolean {
  if (!product || !product.id) return true;
  const id = product.id.toLowerCase();
  return OLD_PRODUCT_IDS.has(id) || id.startsWith("Footwear-") || id.startsWith("prod-Footwear-");
}

function normalizeProduct(product: CommerceProduct): CommerceProduct {
  const pId = (product.designId || product.id || "").toLowerCase();
  const matched = FOLLICIA_PRODUCTS.find(
    (p) => p.id.toLowerCase() === pId || p.designId.toLowerCase() === pId
  );
  const images = productImages(product);
  const dId = matched?.designId || product.designId || product.id.toUpperCase();
  const heroCol = product.heroColour || matched?.heroColour || product.tone || "Warm Ivory";
  const colorCode = product.colourCode || matched?.colourCode || getHeroColorCode(heroCol);

  const variants = (product.variants && product.variants.length > 1)
    ? product.variants
    : (matched?.variants || product.variants || [
        {
          heroColour: heroCol,
          colourName: product.colourName || heroCol,
          colourCode: colorCode,
          colourVariantSku: product.colourVariantSku || `${dId}-${colorCode}`,
          image: images[0] || product.image || "",
          fullSkus: computeAllFullSkus(dId, heroCol),
        }
      ]);

  const rawPrice = parsePriceNumber(product.price);
  const priceNum = rawPrice > 0 ? rawPrice : (matched?.price ?? 0);
  const formattedPrice = `Rs. ${priceNum.toLocaleString("en-IN")}`;

  return {
    ...product,
    designId: dId,
    price: formattedPrice,
    image: matched?.image || images[0] || product.image || "/products/fa-01.webp",
    images: images.length > 0 ? images : [matched?.image || "/products/fa-01.webp"],
    variants,
    availableColors: product.availableColors || matched?.availableColors,
    colors: product.colors || matched?.colors,
    category: product.category || matched?.category || "Heel",
    material: product.material || matched?.material || "Vegan Leather",
    silhouette: product.silhouette || matched?.silhouette || "",
    collection: product.collection || matched?.collection || (product.edition ? product.edition.replace(/ Collection$/i, "") : "Aura"),
    subCollection: product.subCollection || matched?.subCollection,
    heroColour: heroCol,
    colourName: product.colourName || matched?.colourName || heroCol,
    colourCode: colorCode,
    colourFamily: product.colourFamily || matched?.colourFamily || "",
    colourVariantSku: product.colourVariantSku || matched?.colourVariantSku || `${dId}-${colorCode}`,
    availableSizes: (product.availableSizes && product.availableSizes.length > 0)
      ? product.availableSizes
      : DEFAULT_PRODUCT_SIZES,
    fullSkus: computeAllFullSkus(dId, heroCol, product.availableSizes),
    sizeRange: product.sizeRange || matched?.sizeRange || "38–41",
    heelHeight: product.heelHeight || matched?.heelHeight,
    notes: product.notes || matched?.notes,
  };
}

export function getProducts() {
  const raw = read<CommerceProduct[]>(PRODUCTS_KEY, seedProducts);
  let products = raw.filter((p) => !isOldProduct(p)).map(normalizeProduct);
  
  const existingIds = new Set(products.map((p) => p.id.toLowerCase()));
  const missingSeedProducts = seedProducts
    .filter((sp) => !existingIds.has(sp.id.toLowerCase()))
    .map(normalizeProduct);

  if (missingSeedProducts.length > 0) {
    products = [...products, ...missingSeedProducts];
    write(PRODUCTS_KEY, products);
  } else if (products.length < raw.length) {
    write(PRODUCTS_KEY, products);
  }
  return products;
}

export function saveProducts(products: CommerceProduct[]) {
  write(PRODUCTS_KEY, products.filter((p) => !isOldProduct(p)).map(normalizeProduct));
}

export function resetToMasterCatalog() {
  const master = seedProducts.map(normalizeProduct);
  write(PRODUCTS_KEY, master);
  return master;
}

export function getOrders() {
  return read<CommerceOrder[]>(ORDERS_KEY, seedOrders).map((order) => ({
    ...order,
    paymentStatus: order.paymentStatus || "Payment Pending",
    deliveryStatus: order.deliveryStatus || "Order Placed",
    deliveryEta: order.deliveryEta || "Awaiting confirmation",
    trackingCode: order.trackingCode || "",
    paymentMethod: order.paymentMethod || "Concierge Pay",
    deliveryAddress: order.deliveryAddress || "",
  }));
}

export function saveOrders(orders: CommerceOrder[]) {
  write(ORDERS_KEY, orders);
}

export function getCustomers() {
  const list = read<CustomerProfile[]>(CUSTOMERS_KEY, seedCustomers);
  let changed = false;
  const sanitized = list.map((c) => {
    if (c.tier === "Private Footwear") {
      changed = true;
      return { ...c, tier: "Follicia Member" };
    }
    return c;
  });
  if (changed) {
    write(CUSTOMERS_KEY, sanitized);
  }
  return sanitized;
}

export function saveCustomers(customers: CustomerProfile[]) {
  write(CUSTOMERS_KEY, customers);
}

export function ensureCustomer(user: { id: string; name: string; email: string; tier: string }) {
  const customers = getCustomers();
  const existing = customers.find((customer) => customer.id === user.id || customer.email.toLowerCase() === user.email.toLowerCase());
  if (existing) {
    if (existing.tier === "Private Footwear") {
      existing.tier = "Follicia Member";
      saveCustomers(customers);
    }
    return existing;
  }
  const [firstName, ...rest] = user.name.split(" ");
  const cleanTier = user.tier === "Private Footwear" ? "Follicia Member" : (user.tier || "Follicia Member");
  const customer: CustomerProfile = {
    id: user.id,
    name: user.name,
    email: user.email,
    firstName: firstName || user.name,
    lastName: rest.join(" "),
    phone: "",
    tier: cleanTier,
    memberSince: "MMXXVI",
    addresses: [],
    wishlist: [],
    subscriptions: [],
  };
  saveCustomers([...customers, customer]);
  return customer;
}

export function upsertCustomer(profile: CustomerProfile) {
  const customers = getCustomers();
  saveCustomers(customers.some((customer) => customer.id === profile.id) ? customers.map((customer) => (customer.id === profile.id ? profile : customer)) : [...customers, profile]);
}

async function api<T>(path: string, init?: RequestInit): Promise<T | null> {
  try {
    const response = await fetch(`${API_ROOT}${path}`, {
      ...init,
      headers: {
        "content-type": "application/json",
        ...(init?.headers ?? {}),
      },
    });
    if (!response.ok) return null;
    if (response.status === 204) return null;
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

export async function syncCommerceFromBackend() {
  const data = await api<{ products: CommerceProduct[]; orders: CommerceOrder[]; customers: CustomerProfile[] }>("/bootstrap");
  if (!data) return false;

  // 1. Read existing local products from localStorage
  const currentLocalProducts = read<CommerceProduct[]>(PRODUCTS_KEY, seedProducts)
    .filter((p) => !isOldProduct(p))
    .map(normalizeProduct);

  const incomingProducts = (data.products || []).filter((p) => !isOldProduct(p)).map(normalizeProduct);

  // 2. Build merged map keyed by lowercased product ID
  const productMap = new Map<string, CommerceProduct>();

  // A. Start with seed products
  seedProducts.forEach((p) => productMap.set(p.id.toLowerCase(), normalizeProduct(p)));

  // B. Overlay incoming products from backend DB
  incomingProducts.forEach((p) => {
    productMap.set(p.id.toLowerCase(), p);
  });

  // C. PRESERVE ALL local products!
  // Any product created locally (such as new pieces added in Admin Panel)
  // MUST NEVER be wiped out if backend hasn't synced it yet or returned stale data.
  currentLocalProducts.forEach((p) => {
    const existing = productMap.get(p.id.toLowerCase());
    if (!existing) {
      productMap.set(p.id.toLowerCase(), p);
      // Proactively sync this new product to the backend
      void saveProductRemote(p);
    } else {
      productMap.set(p.id.toLowerCase(), {
        ...existing,
        ...p,
        price: p.price || existing.price,
        status: p.status || existing.status,
      });
    }
  });

  const mergedProducts = Array.from(productMap.values()).filter((p) => !isOldProduct(p));
  write(PRODUCTS_KEY, mergedProducts);

  if (data.orders && Array.isArray(data.orders) && data.orders.length > 0) {
    localStorage.setItem(ORDERS_KEY, JSON.stringify(data.orders));
  }
  if (data.customers && Array.isArray(data.customers) && data.customers.length > 0) {
    localStorage.setItem(CUSTOMERS_KEY, JSON.stringify(data.customers));
  }

  window.dispatchEvent(new CustomEvent(COMMERCE_EVENT));
  return true;
}

export async function ensureCustomerRemote(user: { id: string; name: string; email: string; tier: string }) {
  const customer = await api<CustomerProfile>("/customers/ensure", {
    method: "POST",
    body: JSON.stringify(user),
  });
  if (!customer) return ensureCustomer(user);
  const customers = getCustomers();
  saveCustomers(customers.some((item) => item.id === customer.id) ? customers.map((item) => (item.id === customer.id ? customer : item)) : [...customers, customer]);
  return customer;
}

const pendingCustomerSaves = new Map<string, ReturnType<typeof setTimeout>>();

export async function saveCustomerRemote(profile: CustomerProfile): Promise<void> {
  const customerId = profile?.id;
  if (!customerId) return;

  return new Promise<void>((resolve) => {
    const existing = pendingCustomerSaves.get(customerId);
    if (existing) clearTimeout(existing);

    const timer = setTimeout(async () => {
      pendingCustomerSaves.delete(customerId);
      try {
        await api(`/customers/${encodeURIComponent(customerId)}`, {
          method: "PUT",
          body: JSON.stringify(profile),
        });
      } catch (err) {
        console.warn("Silent remote customer sync warning:", err);
      }
      resolve();
    }, 200);

    pendingCustomerSaves.set(customerId, timer);
  });
}

export async function deleteCustomerRemote(id: string) {
  await api(`/customers/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

export async function saveProductRemote(product: CommerceProduct) {
  await api(`/products/${encodeURIComponent(product.id)}`, {
    method: "PUT",
    body: JSON.stringify(normalizeProduct(product)),
  });
}

export async function deleteProductRemote(id: string) {
  await api(`/products/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

export async function uploadProductImages(files: File[]) {
  if (!files.length) return [];
  const form = new FormData();
  files.slice(0, 5).forEach((file) => form.append("files", file));
  try {
    const response = await fetch(`${API_ROOT}/product-images`, {
      method: "POST",
      body: form,
    });
    if (!response.ok) return [];
    const data = (await response.json()) as { images?: string[] };
    return data.images ?? [];
  } catch {
    return [];
  }
}

export async function saveOrderRemote(order: CommerceOrder) {
  await api(`/orders/${encodeURIComponent(order.id)}`, {
    method: "PUT",
    body: JSON.stringify(order),
  });
}

export type CheckoutDetails = {
  deliveryAddress: string;
  paymentMethod: string;
};

export function createOrdersFromCart(items: CartItem[], customer: CustomerProfile, checkout?: CheckoutDetails) {
  const orders = getOrders();
  const products = getProducts();
  const newOrders = items.map((item, index) => ({
    id: `RSV-${Date.now().toString().slice(-6)}-${index + 1}`,
    customerId: customer.id,
    customer: customer.name,
    email: customer.email,
    product: item.title,
    size: item.size || "38",
    amount: item.price,
    status: "Concierge Review",
    paymentStatus: checkout?.paymentMethod?.includes("Cash on Delivery") ? "Due on Delivery" : "Payment Captured",
    deliveryStatus: "Order Placed",
    deliveryEta: "Concierge will confirm within 24h",
    trackingCode: "",
    paymentMethod: checkout?.paymentMethod || "Concierge Pay",
    deliveryAddress: checkout?.deliveryAddress || "",
    date: "Today",
  }));
  const updatedProducts = products.map((product) => {
    const sold = items.filter((item) => item.id.startsWith(product.id)).reduce((sum, item) => sum + item.qty, 0);
    return sold > 0 ? { ...product, reserved: product.reserved + sold, available: Math.max(product.available - sold, 0) } : product;
  });
  saveProducts(updatedProducts);
  saveOrders([...newOrders, ...orders]);
  newOrders.forEach((order) => {
    void fetch("/api/commerce/notify-order", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        orderId: order.id,
        customer: order.customer,
        email: order.email,
        product: order.product,
        size: order.size,
        amount: order.amount,
        paymentMethod: order.paymentMethod,
        deliveryAddress: order.deliveryAddress,
      }),
    }).catch(() => {});
  });
  return newOrders;
}

export async function createOrdersFromCartRemote(items: CartItem[], customer: CustomerProfile, checkout: CheckoutDetails) {
  const remoteOrders = await api<CommerceOrder[]>("/orders", {
    method: "POST",
    body: JSON.stringify(
      items.map((item) => ({
        customerId: customer.id,
        customer: customer.name,
        email: customer.email,
        productId: item.id.split("-").slice(0, 2).join("-"),
        product: item.title,
        size: item.size || "38",
        amount: item.price,
        quantity: item.qty,
        deliveryAddress: checkout.deliveryAddress,
        paymentMethod: checkout.paymentMethod,
      })),
    ),
  });
  if (!remoteOrders) return createOrdersFromCart(items, customer, checkout);
  await syncCommerceFromBackend();
  return remoteOrders;
}
