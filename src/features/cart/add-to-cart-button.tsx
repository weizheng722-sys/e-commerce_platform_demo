"use client";

import { useState } from "react";
import type { Product } from "@/lib/commerce/catalogue";
import { useCart } from "@/features/cart/cart-context";

export function AddToCartButton({ product }: { product: Product }) {
  const { addItem } = useCart();
  const [added, setAdded] = useState(false);

  function handleAdd() {
    addItem(product);
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1800);
  }

  return (
    <button className="button button-dark detail-button" disabled={!product.available} onClick={handleAdd} type="button">
      {!product.available ? "Coming soon" : added ? "Added to your box ✓" : "Add to your box"}
      {!added && product.available && <span aria-hidden="true">→</span>}
    </button>
  );
}
