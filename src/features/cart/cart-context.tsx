"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { Product } from "@/lib/commerce/catalogue";

export type CartItem = Pick<Product, "handle" | "name" | "price" | "unit" | "color" | "symbol"> & {
  quantity: number;
};

export type CheckoutReceipt = {
  orderNumber: string;
  createdAt: string;
  customerName: string;
  customerEmail: string;
  items: { handle: string; name: string; quantity: number; unitPrice: number; lineTotal: number }[];
  subtotal: number;
};

type CartContextValue = {
  items: CartItem[];
  hydrated: boolean;
  itemCount: number;
  subtotal: number;
  clearCart: () => void;
  receipt: CheckoutReceipt | null;
  setReceipt: (receipt: CheckoutReceipt | null) => void;
  addItem: (product: Product) => void;
  setQuantity: (handle: string, quantity: number) => void;
  removeItem: (handle: string) => void;
};

const storageKey = "freshbox-cart-v1";
const CartContext = createContext<CartContextValue | null>(null);

function isCartItem(value: unknown): value is CartItem {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<CartItem>;
  return typeof item.handle === "string"
    && typeof item.name === "string"
    && typeof item.price === "number"
    && Number.isFinite(item.price)
    && typeof item.unit === "string"
    && typeof item.color === "string"
    && typeof item.symbol === "string"
    && Number.isInteger(item.quantity)
    && (item.quantity ?? 0) > 0;
}

export function CartProvider({ children }: Readonly<{ children: React.ReactNode }>) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [receipt, setReceipt] = useState<CheckoutReceipt | null>(null);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(storageKey);
      if (saved) {
        const parsed: unknown = JSON.parse(saved);
        if (Array.isArray(parsed)) setItems(parsed.filter(isCartItem));
      }
    } catch {
      window.localStorage.removeItem(storageKey);
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (hydrated) window.localStorage.setItem(storageKey, JSON.stringify(items));
  }, [hydrated, items]);

  const value = useMemo<CartContextValue>(() => ({
    items,
    hydrated,
    itemCount: items.reduce((total, item) => total + item.quantity, 0),
    subtotal: items.reduce((total, item) => total + item.price * item.quantity, 0),
    clearCart: () => setItems([]),
    receipt,
    setReceipt,
    addItem: (product) => setItems((current) => {
      const existing = current.find((item) => item.handle === product.handle);
      if (existing) return current.map((item) => item.handle === product.handle
        ? { ...item, quantity: item.quantity + 1 }
        : item);
      const { handle, name, price, unit, color, symbol } = product;
      return [...current, { handle, name, price, unit, color, symbol, quantity: 1 }];
    }),
    setQuantity: (handle, quantity) => setItems((current) => quantity < 1
      ? current.filter((item) => item.handle !== handle)
      : current.map((item) => item.handle === handle ? { ...item, quantity: Math.min(quantity, 99) } : item)),
    removeItem: (handle) => setItems((current) => current.filter((item) => item.handle !== handle)),
  }), [hydrated, items, receipt]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used within CartProvider");
  return context;
}
