import c1 from "@/assets/collection-1.jpg";
import c2 from "@/assets/collection-2.jpg";
import c3 from "@/assets/collection-3.jpg";
import atelier from "@/assets/atelier.jpg";
import type { CartItem } from "@/components/cart/CartContext";

export type CommerceProduct = {
  id: string;
  title: string;
  edition: string;
  tone: string;
  price: string;
  image: string;
  status: string;
  produced: number;
  reserved: number;
  available: number;
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

const PRODUCTS_KEY = "follocia_products";
const ORDERS_KEY = "follocia_orders";
const CUSTOMERS_KEY = "follocia_customers";
export const COMMERCE_EVENT = "follocia-commerce-change";
const API_ROOT = "/api/commerce";

export const seedProducts: CommerceProduct[] = [
  { id: "atelier-01", title: "Atelier 01 - Lumiere", edition: "Edition of 220", price: "EUR 1,480", image: c1, tone: "Ivory Calfskin", status: "Live", produced: 220, reserved: 184, available: 36 },
  { id: "atelier-02", title: "Atelier 02 - Noir Suspendu", edition: "Edition of 180", price: "EUR 1,640", image: c2, tone: "Patent Obsidian", status: "Live", produced: 180, reserved: 168, available: 12 },
  { id: "atelier-03", title: "Atelier 03 - Or Liquide", edition: "Edition of 140", price: "EUR 1,820", image: c3, tone: "Brushed Champagne", status: "Private Preview", produced: 140, reserved: 121, available: 19 },
  { id: "atelier-04", title: "Atelier 04 - Rosso Vow", edition: "Edition of 80", price: "EUR 2,120", image: atelier, tone: "Rosso Patent", status: "Draft", produced: 80, reserved: 0, available: 80 },
];

const seedOrders: CommerceOrder[] = [
  { id: "RSV-1048", customerId: "vip-002", customer: "Camille R.", email: "camille@example.com", product: "Atelier 03 - Or Liquide", size: "38", amount: "EUR 1,820", status: "Concierge Review", paymentStatus: "Payment Pending", deliveryStatus: "Order Placed", deliveryEta: "Awaiting confirmation", trackingCode: "", paymentMethod: "Concierge Pay", deliveryAddress: "Paris private salon", date: "Today" },
  { id: "RSV-1047", customerId: "vip-001", customer: "Ananya Sharma", email: "client@follocia.com", product: "Atelier 02 - Noir Suspendu", size: "39", amount: "EUR 1,640", status: "Fitting Booked", paymentStatus: "Authorized", deliveryStatus: "Fitting Scheduled", deliveryEta: "May 18", trackingCode: "", paymentMethod: "Card Authorization", deliveryAddress: "Mumbai concierge address", date: "Today" },
  { id: "RSV-1031", customerId: "vip-001", customer: "Ananya Sharma", email: "client@follocia.com", product: "Atelier 01 - Lumiere", size: "38", amount: "EUR 1,480", status: "Certificate Ready", paymentStatus: "Paid", deliveryStatus: "Delivered", deliveryEta: "Delivered", trackingCode: "FL-1031-VIP", paymentMethod: "Card Authorization", deliveryAddress: "Mumbai concierge address", date: "Delivered" },
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
    wishlist: ["atelier-03", "atelier-01"],
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

export function getProducts() {
  return read<CommerceProduct[]>(PRODUCTS_KEY, seedProducts);
}

export function saveProducts(products: CommerceProduct[]) {
  write(PRODUCTS_KEY, products);
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
  localStorage.setItem(PRODUCTS_KEY, JSON.stringify(data.products));
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

export async function saveProductRemote(product: CommerceProduct) {
  await api(`/products/${encodeURIComponent(product.id)}`, {
    method: "PUT",
    body: JSON.stringify(product),
  });
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
    paymentStatus: checkout?.paymentMethod === "Cash on Delivery" ? "Due on Delivery" : "Payment Pending",
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
