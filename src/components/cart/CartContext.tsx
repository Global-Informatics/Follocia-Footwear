import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { FOLLICIA_PRODUCTS } from "@/data/folliciaCatalogue";

export type CartItem = {
  id: string;
  title: string;
  price: string;
  image: string;
  tone?: string;
  size?: string;
  qty: number;
};

type CartCtx = {
  items: CartItem[];
  open: boolean;
  setOpen: (v: boolean) => void;
  add: (i: Omit<CartItem, "qty">, qty?: number) => void;
  remove: (id: string) => void;
  updateQty: (id: string, qty: number) => void;
  clear: () => void;
  count: number;
  wishlist: string[];
  toggleWish: (id: string) => void;
};

const Ctx = createContext<CartCtx | null>(null);
const CART_KEY = "follocia_cart_items";
const WISHLIST_KEY = "follocia_wishlist_items";

const OLD_PREFIXES = ["Footwear-", "prod-"];

export const isOldCartItem = (item: CartItem | { id?: string; title?: string; price?: string }): boolean => {
  if (!item || !item.id) return true;
  const id = item.id.toLowerCase();
  const title = (item.title || "").toLowerCase();
  const price = (item.price || "").toLowerCase();
  return (
    OLD_PREFIXES.some((p) => id.startsWith(p)) ||
    title.includes("Footwear") ||
    title.includes("noir suspendu") ||
    price.includes("eur") ||
    price.includes("€")
  );
};

export function parsePriceNumber(val: string | number | undefined | null): number {
  if (val === undefined || val === null) return 0;
  if (typeof val === "number") return isNaN(val) ? 0 : Math.round(val);
  const digits = String(val).match(/\d+/g);
  if (!digits || digits.length === 0) return 0;
  return parseInt(digits.join(""), 10) || 0;
}

export function cleanPrice(price: string | number | undefined | null): string {
  const num = parsePriceNumber(price);
  return `Rs. ${num.toLocaleString("en-IN")}`;
}

import { getProducts } from "@/lib/commerceStore";

export function getLatestProductPrice(item: { id?: string; title?: string; price?: string }): string {
  if (!item) return "Rs. 0";
  const itemTitle = (item.title || "").trim().toLowerCase();
  const itemId = (item.id || "").trim().toLowerCase();

  // 1. Try matching from live dynamic products (managed via admin panel)
  try {
    const liveList = getProducts();
    const dynamicMatch = liveList.find(
      (p) =>
        p.title.trim().toLowerCase() === itemTitle ||
        p.id.toLowerCase() === itemId ||
        (p.designId && p.designId.toLowerCase() === itemId) ||
        (itemId && p.id && itemId.startsWith(`${p.id.toLowerCase()}-`))
    );
    if (dynamicMatch && dynamicMatch.price) {
      return cleanPrice(dynamicMatch.price);
    }
  } catch {}

  // 2. Try matching by catalogue product title
  let matched = FOLLICIA_PRODUCTS.find(
    (p) => p.name.trim().toLowerCase() === itemTitle
  );

  // 3. If not matched by title, try matching by ID / SKU prefix
  if (!matched && itemId) {
    matched = FOLLICIA_PRODUCTS.find((p) => {
      const pId = p.id.toLowerCase();
      const dId = (p.designId || "").toLowerCase();
      return (
        itemId === pId ||
        itemId === dId ||
        itemId.startsWith(`${pId}-`) ||
        itemId.startsWith(`${dId}-`) ||
        (p.fullSkus && Object.values(p.fullSkus).some((sku) => sku.toLowerCase() === itemId)) ||
        (p.variants && p.variants.some((v) => v.fullSkus && Object.values(v.fullSkus).some((sku) => sku.toLowerCase() === itemId)))
      );
    });
  }

  // 4. Return catalogue price
  if (matched && typeof matched.price === "number") {
    return `Rs. ${matched.price.toLocaleString("en-IN")}`;
  }

  return cleanPrice(item.price);
}

function readStoredCart(): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(CART_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as CartItem[];
    if (!Array.isArray(parsed)) return [];
    const sanitized = parsed
      .filter((item) => !isOldCartItem(item))
      .map((item) => {
        const upToDatePrice = getLatestProductPrice(item);
        return { ...item, price: upToDatePrice };
      });
    if (sanitized.length !== parsed.length || sanitized.some((it, idx) => it.price !== parsed[idx]?.price)) {
      localStorage.setItem(CART_KEY, JSON.stringify(sanitized));
    }
    return sanitized;
  } catch {
    return [];
  }
}

function readStoredWishlist(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(WISHLIST_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as string[];
    if (!Array.isArray(parsed)) return [];
    const sanitized = parsed.filter(
      (id) => typeof id === "string" && !OLD_PREFIXES.some((p) => id.toLowerCase().startsWith(p))
    );
    if (sanitized.length !== parsed.length) {
      localStorage.setItem(WISHLIST_KEY, JSON.stringify(sanitized));
    }
    return sanitized;
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => readStoredCart());
  const [open, setOpen] = useState(false);
  const [wishlist, setWishlist] = useState<string[]>(() => readStoredWishlist());

  useEffect(() => {
    localStorage.setItem(CART_KEY, JSON.stringify(items.filter((item) => !isOldCartItem(item))));
  }, [items]);

  useEffect(() => {
    localStorage.setItem(WISHLIST_KEY, JSON.stringify(wishlist));
  }, [wishlist]);

  const add: CartCtx["add"] = (i, qty = 1) => {
    if (isOldCartItem(i)) return;
    const upToDatePrice = getLatestProductPrice(i);
    const normalizedItem = { ...i, price: upToDatePrice };
    setItems((prev) => {
      const existing = prev.find((p) => p.id === normalizedItem.id);
      if (existing) return prev.map((p) => (p.id === normalizedItem.id ? { ...p, qty: p.qty + qty, price: upToDatePrice } : p));
      return [...prev, { ...normalizedItem, qty }];
    });
    setOpen(true);
  };

  const remove = (id: string) => setItems((prev) => prev.filter((p) => p.id !== id));
  const updateQty = (id: string, qty: number) =>
    setItems((prev) => prev.flatMap((p) => (p.id === id ? (qty <= 0 ? [] : [{ ...p, qty }]) : [p])));
  const clear = () => setItems([]);
  const toggleWish = (id: string) =>
    setWishlist((p) => {
      const lower = id.toLowerCase();
      const exists = p.some((x) => x.toLowerCase() === lower);
      return exists ? p.filter((x) => x.toLowerCase() !== lower) : [...p, id];
    });

  const count = items.reduce((s, i) => s + i.qty, 0);

  return (
    <Ctx.Provider value={{ items, open, setOpen, add, remove, updateQty, clear, count, wishlist, toggleWish }}>
      {children}
    </Ctx.Provider>
  );
}

export function useCart() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useCart must be inside CartProvider");
  return c;
}
