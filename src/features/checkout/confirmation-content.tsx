"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useCart, type CheckoutReceipt } from "@/features/cart/cart-context";

const receiptKey = "freshbox-last-receipt-v1";

function isReceipt(value: unknown): value is CheckoutReceipt {
  if (!value || typeof value !== "object") return false;
  const receipt = value as Partial<CheckoutReceipt>;
  return typeof receipt.orderNumber === "string"
    && typeof receipt.createdAt === "string"
    && typeof receipt.customerName === "string"
    && typeof receipt.customerEmail === "string"
    && typeof receipt.subtotal === "number"
    && Array.isArray(receipt.items)
    && receipt.items.every((item) => item && typeof item.handle === "string"
      && typeof item.name === "string"
      && typeof item.quantity === "number"
      && typeof item.unitPrice === "number"
      && typeof item.lineTotal === "number");
}

export function ConfirmationContent() {
  const { receipt: currentReceipt } = useCart();
  const [receipt, setReceipt] = useState<CheckoutReceipt | null>(currentReceipt);

  useEffect(() => {
    if (currentReceipt) {
      setReceipt(currentReceipt);
      return;
    }
    try {
      const saved = window.sessionStorage.getItem(receiptKey);
      if (saved) {
        const parsed: unknown = JSON.parse(saved);
        if (isReceipt(parsed)) setReceipt(parsed);
      }
    } catch {
      window.sessionStorage.removeItem(receiptKey);
    }
  }, [currentReceipt]);

  if (!receipt) {
    return (
      <section className="confirmation-page confirmation-missing">
        <p className="eyebrow"><span className="eyebrow-dot" /> Confirmation</p>
        <h1>No recent order<br /><em>to show.</em></h1>
        <p className="catalogue-intro">Start with the shop to build a fresh box.</p>
        <Link className="button button-dark" href="/products">Explore the shop <span aria-hidden="true">→</span></Link>
      </section>
    );
  }

  return (
    <section className="confirmation-page" aria-labelledby="confirmation-title">
      <p className="eyebrow"><span className="eyebrow-dot" /> Mock order placed</p>
      <h1 id="confirmation-title">Thanks, {receipt.customerName.split(" ")[0]}.<br /><em>That’s a wrap.</em></h1>
      <p className="confirmation-intro">Your demo order is confirmed. No payment was taken and nothing will be shipped.</p>
      <div className="receipt-card">
        <div className="receipt-heading"><div><span>Order number</span><strong>{receipt.orderNumber}</strong></div><div><span>Confirmation sent to</span><strong>{receipt.customerEmail}</strong></div></div>
        <div className="receipt-lines">
          {receipt.items.map((item) => (
            <p key={item.handle}><span>{item.name} × {item.quantity}</span><strong>${item.lineTotal.toFixed(2)}</strong></p>
          ))}
        </div>
        <div className="summary-total"><span>Mock total</span><strong>${receipt.subtotal.toFixed(2)}</strong></div>
      </div>
      <Link className="button button-dark confirmation-button" href="/products">Back to the shop <span aria-hidden="true">→</span></Link>
      <p className="demo-note">This confirmation is stored only in this browser session. Order storage and payment are not connected.</p>
    </section>
  );
}
