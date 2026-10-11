"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCart, type CheckoutReceipt } from "@/features/cart/cart-context";

const receiptKey = "freshbox-last-receipt-v1";

export function CheckoutForm() {
  const router = useRouter();
  const { items, subtotal, hydrated, clearCart, setReceipt } = useCart();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    window.sessionStorage.removeItem(receiptKey);
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setPending(true);

    const formData = new FormData(event.currentTarget);
    const customer = {
      name: String(formData.get("name") ?? ""),
      email: String(formData.get("email") ?? ""),
      address1: String(formData.get("address1") ?? ""),
      address2: String(formData.get("address2") ?? ""),
      city: String(formData.get("city") ?? ""),
      region: String(formData.get("region") ?? ""),
      postalCode: String(formData.get("postalCode") ?? ""),
      country: String(formData.get("country") ?? ""),
    };

    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer,
          items: items.map(({ handle, quantity }) => ({ handle, quantity })),
        }),
      });
      const result = await response.json() as { receipt?: CheckoutReceipt; checkoutUrl?: string; error?: string };
      if (!response.ok || !result.receipt) {
        setError(result.error ?? "Checkout could not be completed. Please try again.");
        return;
      }

      setReceipt(result.receipt);
      try {
        window.sessionStorage.setItem(receiptKey, JSON.stringify(result.receipt));
      } catch {
        // The in-memory receipt still supports the confirmation page for this navigation.
      }
      clearCart();
      if (result.checkoutUrl) {
        window.location.assign(result.checkoutUrl);
        return;
      }
      router.push("/checkout/confirmation");
    } catch {
      setError("We could not reach checkout. Please check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  if (!hydrated) {
    return <section className="checkout-page"><p className="cart-loading" role="status">Loading your box…</p></section>;
  }

  if (items.length === 0) {
    return (
      <section className="checkout-page checkout-empty">
        <p className="eyebrow"><span className="eyebrow-dot" /> Checkout</p>
        <h1>Your box is empty.</h1>
        <p className="catalogue-intro">Add something fresh before continuing to checkout.</p>
        <Link className="button button-dark" href="/products">Explore the shop <span aria-hidden="true">→</span></Link>
      </section>
    );
  }

  return (
    <section className="checkout-page" aria-labelledby="checkout-title">
      <Link className="back-link" href="/cart">← Back to your box</Link>
      <div className="checkout-heading">
        <div>
          <p className="eyebrow"><span className="eyebrow-dot" /> Demo checkout</p>
          <h1 id="checkout-title">Where should<br /><em>we deliver?</em></h1>
        </div>
        <p className="checkout-notice">Demo only. When Stripe test mode is enabled, use test card details; no real payment will be collected.</p>
      </div>

      <div className="checkout-layout">
        <form className="delivery-form" onSubmit={handleSubmit}>
          <h2>Delivery details</h2>
          <label>Full name<input autoComplete="name" maxLength={100} minLength={2} name="name" required /></label>
          <label>Email address<input autoComplete="email" maxLength={254} name="email" required type="email" /></label>
          <label>Address line 1<input autoComplete="address-line1" maxLength={160} minLength={3} name="address1" required /></label>
          <label>Address line 2 <span>(optional)</span><input autoComplete="address-line2" maxLength={160} name="address2" /></label>
          <div className="form-row">
            <label>City<input autoComplete="address-level2" maxLength={100} minLength={2} name="city" required /></label>
            <label>State / region <span>(optional)</span><input autoComplete="address-level1" maxLength={100} name="region" /></label>
          </div>
          <div className="form-row">
            <label>Postal code<input autoComplete="postal-code" maxLength={20} minLength={2} name="postalCode" required /></label>
            <label>Country<input autoComplete="country-name" maxLength={80} minLength={2} name="country" required /></label>
          </div>
          {error && <p className="checkout-error" role="alert">{error}</p>}
          <button className="button button-dark checkout-submit" disabled={pending} type="submit">
            {pending ? "Placing mock order…" : "Place mock order"} {!pending && <span aria-hidden="true">→</span>}
          </button>
          <p className="demo-note">The server checks your details and recalculates prices from the catalogue.</p>
        </form>

        <aside className="cart-summary checkout-summary" aria-label="Order summary">
          <h2>Your box</h2>
          {items.map((item) => (
            <p className="checkout-line" key={item.handle}>
              <span>{item.name} × {item.quantity}</span>
              <strong>${(item.price * item.quantity).toFixed(2)}</strong>
            </p>
          ))}
          <div className="summary-total"><span>Mock total</span><strong>${subtotal.toFixed(2)}</strong></div>
          <p className="demo-note">Delivery fees are not included in this demo.</p>
        </aside>
      </div>
    </section>
  );
}
