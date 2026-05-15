import { createContext, useContext, useState, type ReactNode } from "react";

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

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [open, setOpen] = useState(false);
  const [wishlist, setWishlist] = useState<string[]>([]);

  const add: CartCtx["add"] = (i, qty = 1) => {
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
