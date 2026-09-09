import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

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

const OLD_PREFIXES = ["atelier-", "prod-"];

export const isOldCartItem = (item: CartItem | { id?: string; title?: string; price?: string }): boolean => {
  if (!item || !item.id) return true;
  const id = item.id.toLowerCase();
  const title = (item.title || "").toLowerCase();
  const price = (item.price || "").toLowerCase();
  return (
    OLD_PREFIXES.some((p) => id.startsWith(p)) ||
    title.includes("atelier") ||
    title.includes("noir suspendu") ||
    price.includes("eur") ||
    price.includes("€")
  );
};

function readStoredCart(): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(CART_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as CartItem[];
    if (!Array.isArray(parsed)) return [];
    const sanitized = parsed.filter((item) => !isOldCartItem(item));
    if (sanitized.length !== parsed.length) {
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
    setItems((prev) => {
      const existing = prev.find((p) => p.id === i.id);
      if (existing) return prev.map((p) => (p.id === i.id ? { ...p, qty: p.qty + qty } : p));
      return [...prev, { ...i, qty }];
    });
    setOpen(true);
  };

  const remove = (id: string) => setItems((prev) => prev.filter((p) => p.id !== id));
  const updateQty = (id: string, qty: number) =>
    setItems((prev) => prev.flatMap((p) => (p.id === id ? (qty <= 0 ? [] : [{ ...p, qty }]) : [p])));
  const clear = () => setItems([]);
  const toggleWish = (id: string) =>
    setWishlist((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

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
