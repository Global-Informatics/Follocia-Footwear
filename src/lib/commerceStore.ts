import c1 from "@/assets/collection-1.jpg";
import c2 from "@/assets/collection-2.jpg";
import c3 from "@/assets/collection-3.jpg";
import atelier from "@/assets/atelier.jpg";
import type { CartItem } from "@/components/cart/CartContext";
import { FOLLICIA_PRODUCTS, type ProductVariant } from "@/data/folliciaCatalogue";

export type { ProductVariant };

export type CommerceProduct = {
  id: string;
  designId?: string;
  title: string;
  edition: string;
  tone: string;
  color?: string;
  colors?: string;
  availableColors?: string[];
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

const PRODUCTS_KEY = "follocia_products_v7";
const ORDERS_KEY = "follocia_orders";
const CUSTOMERS_KEY = "follocia_customers";
export const COMMERCE_EVENT = "follocia-commerce-change";
const API_ROOT = "/api/commerce";

if (typeof window !== "undefined") {
  try {
    localStorage.removeItem("follocia_products");
    localStorage.removeItem("follocia_products_v2");
    localStorage.removeItem("follocia_products_v3");
    localStorage.removeItem("follocia_products_v4");
    localStorage.removeItem("follocia_products_v5");
    localStorage.removeItem("follocia_products_v6");
  } catch {
    // Ignore in SSR / restricted storage
  }
}

export function getHeroColorCode(heroColor?: string): string {
  if (!heroColor) return "WA";
  const clean = heroColor.trim().replace(/[^a-zA-Z]/g, "");
  if (clean.length >= 2) {
    return clean.slice(0, 2).toUpperCase();
  }
  return clean.toUpperCase().padEnd(2, "X");
}

export function computeFullSku(designId?: string, heroColor?: string, size?: string | number): string {
  const dId = (designId || "FA-01").toUpperCase().trim();
  const colorPrefix = getHeroColorCode(heroColor);
  const sz = String(size || "38").replace(/\D/g, "") || "38";
  return `${dId}-${colorPrefix}-${sz}`;
}

export function computeAllFullSkus(designId?: string, heroColor?: string): Record<string, string> {
  const sizes = ["38", "39", "40", "41"];
  const map: Record<string, string> = {};
  for (const sz of sizes) {
    map[sz] = computeFullSku(designId, heroColor, sz);
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
    heelHeight: p.heelHeight,
    price: `₹ ${p.price.toLocaleString("en-IN")}`,
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
  { id: "RSV-1048", customerId: "vip-002", customer: "Camille R.", email: "camille@example.com", product: "Aura - Sunrise Flat", size: "38", amount: "₹ 12,490", status: "Concierge Review", paymentStatus: "Payment Pending", deliveryStatus: "Order Placed", deliveryEta: "Awaiting confirmation", trackingCode: "", paymentMethod: "Concierge Pay", deliveryAddress: "Paris private salon", date: "Today" },
  { id: "RSV-1047", customerId: "vip-001", customer: "Ananya Sharma", email: "client@follocia.com", product: "Bloom - Petal Mule", size: "39", amount: "₹ 14,990", status: "Fitting Booked", paymentStatus: "Authorized", deliveryStatus: "Fitting Scheduled", deliveryEta: "May 18", trackingCode: "", paymentMethod: "Card Authorization", deliveryAddress: "Mumbai concierge address", date: "Today" },
  { id: "RSV-1031", customerId: "vip-001", customer: "Ananya Sharma", email: "client@follocia.com", product: "Muse - Ivory Stiletto", size: "38", amount: "₹ 16,800", status: "Certificate Ready", paymentStatus: "Paid", deliveryStatus: "Delivered", deliveryEta: "Delivered", trackingCode: "FL-1031-VIP", paymentMethod: "Card Authorization", deliveryAddress: "Mumbai concierge address", date: "Delivered" },
];

const seedCustomers: CustomerProfile[] = [
  {
    id: "vip-001",
    name: "Ananya Sharma",
    email: "client@follocia.com",
    firstName: "Ananya",
    lastName: "Sharma",
    phone: "",
    tier: "Private Atelier",
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

  const gallery = [
    product.image,
    matched?.image,
    ...(product.images ?? []),
    ...prodVariantImgs,
    ...variantImgs,
    ...matchedVariantDict,
  ].filter(Boolean);

  return Array.from(new Set(gallery)).slice(0, 5);
}

export function productPrimaryImage(product: CommerceProduct) {
  return productImages(product)[0] || "";
}

const OLD_PRODUCT_IDS = new Set([
  "atelier-01", "atelier-02", "atelier-03", "prod-atelier-01", "prod-atelier-02", "prod-atelier-03",
  "prod-01", "prod-02", "prod-03"
]);

export function isOldProduct(product: CommerceProduct): boolean {
  if (!product || !product.id) return true;
  const id = product.id.toLowerCase();
  const title = (product.title || "").toLowerCase();
  const price = (product.price || "").toLowerCase();
  return OLD_PRODUCT_IDS.has(id) || id.startsWith("atelier-") || id.startsWith("prod-") || title.includes("atelier") || title.includes("noir suspendu") || price.includes("eur") || price.includes("€");
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

  return {
    ...product,
    designId: dId,
    image: images[0] || product.image || "",
    images,
    variants,
    availableColors: matched?.availableColors || product.availableColors,
    colors: matched?.colors || product.colors,
    category: matched?.category || product.category || "Heel",
    material: matched?.material || product.material || "Vegan Leather",
    silhouette: matched?.silhouette || product.silhouette || "",
    collection: matched?.collection || product.collection || product.edition.replace(/ Collection$/i, ""),
    subCollection: matched?.subCollection || product.subCollection,
    heroColour: heroCol,
    colourName: product.colourName || matched?.colourName || heroCol,
    colourCode: colorCode,
    colourFamily: product.colourFamily || matched?.colourFamily || "",
    colourVariantSku: product.colourVariantSku || matched?.colourVariantSku || `${dId}-${colorCode}`,
    fullSkus: computeAllFullSkus(dId, heroCol),
    sizeRange: matched?.sizeRange || product.sizeRange || "38–41",
    heelHeight: matched?.heelHeight || product.heelHeight,
    notes: matched?.notes || product.notes,
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
  return read<CustomerProfile[]>(CUSTOMERS_KEY, seedCustomers);
}

export function saveCustomers(customers: CustomerProfile[]) {
  write(CUSTOMERS_KEY, customers);
}

export function ensureCustomer(user: { id: string; name: string; email: string; tier: string }) {
  const customers = getCustomers();
  const existing = customers.find((customer) => customer.id === user.id || customer.email.toLowerCase() === user.email.toLowerCase());
  if (existing) return existing;
  const [firstName, ...rest] = user.name.split(" ");
  const customer: CustomerProfile = {
    id: user.id,
    name: user.name,
    email: user.email,
    firstName: firstName || user.name,
    lastName: rest.join(" "),
    phone: "",
    tier: user.tier,
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
  const filteredProducts = (data.products || []).filter((p) => !isOldProduct(p)).map(normalizeProduct);
  const productsToStore = filteredProducts.length > 0 ? filteredProducts : seedProducts.map(normalizeProduct);
  localStorage.setItem(PRODUCTS_KEY, JSON.stringify(productsToStore));
  localStorage.setItem(ORDERS_KEY, JSON.stringify(data.orders));
  localStorage.setItem(CUSTOMERS_KEY, JSON.stringify(data.customers));
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

export async function saveCustomerRemote(profile: CustomerProfile) {
  await api(`/customers/${encodeURIComponent(profile.id)}`, {
    method: "PUT",
    body: JSON.stringify(profile),
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
