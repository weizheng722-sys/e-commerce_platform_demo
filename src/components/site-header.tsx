"use client";

import Link from "next/link";
import { useCart } from "@/features/cart/cart-context";

export function SiteHeader() {
  const { itemCount } = useCart();

  return (
    <header className="site-header">
      <Link className="wordmark" href="/" aria-label="FreshBox home">
        <span className="wordmark-mark" aria-hidden="true">f</span> freshbox
      </Link>
      <nav aria-label="Main navigation">
        <Link href="/products">Shop all</Link>
        <Link href="/subscriptions">Subscriptions</Link>
        {process.env.NODE_ENV === "development" && <Link href="/orders">Orders</Link>}
        {process.env.NODE_ENV === "development" && <Link href="/inventory">Inventory</Link>}
      </nav>
      <Link className="cart-link" href="/cart" aria-label={`Your box, ${itemCount} ${itemCount === 1 ? "item" : "items"}`}>
        Your box{itemCount > 0 && <span className="cart-count">{itemCount}</span>} <span aria-hidden="true">↗</span>
      </Link>
    </header>
  );
}
