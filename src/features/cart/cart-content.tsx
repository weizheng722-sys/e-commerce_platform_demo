"use client";

import Link from "next/link";
import { useCart } from "@/features/cart/cart-context";

export function CartContent() {
  const { items, hydrated, subtotal, setQuantity, removeItem } = useCart();

  if (!hydrated) {
    return <section className="cart-page"><p className="cart-loading" role="status">Loading your box…</p></section>;
  }

  if (items.length === 0) {
    return (
      <section className="cart-page cart-empty">
        <p className="eyebrow"><span className="eyebrow-dot" /> Your box</p>
        <h1>Your box is<br /><em>waiting for good things.</em></h1>
        <p className="catalogue-intro">Take a look around and add a few fresh favourites.</p>
        <Link className="button button-dark" href="/products">Explore the shop <span aria-hidden="true">→</span></Link>
      </section>
    );
  }

  return (
    <section className="cart-page" aria-labelledby="cart-title">
      <p className="eyebrow"><span className="eyebrow-dot" /> Your box</p>
      <h1 id="cart-title">A good week<br /><em>starts here.</em></h1>
      <div className="cart-layout">
        <div className="cart-items">
          {items.map((item) => (
            <article className="cart-item" key={item.handle}>
              <div className={`product-art cart-item-art product-art-${item.color}`} aria-hidden="true"><span>{item.symbol}</span></div>
              <div className="cart-item-info">
                <h2><Link href={`/products/${item.handle}`}>{item.name}</Link></h2>
                <p>${item.price.toFixed(2)} {item.unit}</p>
                <div className="quantity-control" aria-label={`Quantity for ${item.name}`}>
                  <button aria-label={`Decrease ${item.name} quantity`} onClick={() => setQuantity(item.handle, item.quantity - 1)} type="button">−</button>
                  <span aria-live="polite">{item.quantity}</span>
                  <button aria-label={`Increase ${item.name} quantity`} disabled={item.quantity >= 99} onClick={() => setQuantity(item.handle, item.quantity + 1)} type="button">+</button>
                </div>
              </div>
              <div className="cart-item-total">
                <p>${(item.price * item.quantity).toFixed(2)}</p>
                <button className="remove-link" onClick={() => removeItem(item.handle)} type="button">Remove</button>
              </div>
            </article>
          ))}
        </div>
        <aside className="cart-summary" aria-label="Order summary">
          <h2>Order summary</h2>
          <p><span>Subtotal</span><strong>${subtotal.toFixed(2)}</strong></p>
          <p><span>Delivery</span><span>Calculated at checkout</span></p>
          <div className="summary-total"><span>Total</span><strong>${subtotal.toFixed(2)}</strong></div>
          <Link className="button button-dark checkout-button" href="/checkout">Continue to checkout <span aria-hidden="true">→</span></Link>
          <p className="demo-note">Mock checkout only. No payment will be collected.</p>
        </aside>
      </div>
      <Link className="back-link cart-continue" href="/products">← Continue shopping</Link>
    </section>
  );
}
