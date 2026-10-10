"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { InventoryItem, OrderStatus } from "@/lib/orders/store";

type InventoryOrder = {
  orderNumber: string;
  createdAt: string;
  status: OrderStatus;
  customerName: string;
  items: { handle: string; name: string; quantity: number; unitPrice: number; lineTotal: number }[];
  subtotal: number;
};

export function InventoryDashboard({ inventory, orders }: { inventory: InventoryItem[]; orders: InventoryOrder[] }) {
  const router = useRouter();
  const [pendingOrder, setPendingOrder] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function updateOrder(orderNumber: string, action: "cancel" | "fulfill") {
    setPendingOrder(orderNumber);
    setError("");
    try {
      const response = await fetch(`/api/inventory/orders/${encodeURIComponent(orderNumber)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const result = await response.json() as { error?: string };
      if (!response.ok) {
        setError(result.error ?? "The order could not be updated.");
        return;
      }
      router.refresh();
    } catch {
      setError("The inventory service could not be reached. Please try again.");
    } finally {
      setPendingOrder(null);
    }
  }

  return (
    <div className="inventory-content">
      <section aria-labelledby="stock-title">
        <div className="inventory-section-heading">
          <div><p className="eyebrow"><span className="eyebrow-dot" /> Mock ERP</p><h2 id="stock-title">Stock on hand</h2></div>
          <p className="inventory-help">Available = on hand − reserved</p>
        </div>
        <div className="stock-grid">
          {inventory.map((item) => (
            <article className="stock-card" key={item.handle}>
              <h3>{item.name}</h3>
              <div className="stock-numbers">
                <div><span>On hand</span><strong>{item.onHand}</strong></div>
                <div><span>Reserved</span><strong>{item.reserved}</strong></div>
                <div><span>Available</span><strong>{item.available}</strong></div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="inventory-orders" aria-labelledby="inventory-orders-title">
        <div className="inventory-section-heading">
          <div><p className="eyebrow"><span className="eyebrow-dot" /> Order operations</p><h2 id="inventory-orders-title">Reservations &amp; status</h2></div>
        </div>
        {error && <p className="checkout-error" role="alert">{error}</p>}
        {orders.length === 0 ? (
          <p className="inventory-empty">Place a mock order to see its stock reservation here.</p>
        ) : (
          <div className="inventory-order-list">
            {orders.map((order) => (
              <article className="inventory-order-card" key={order.orderNumber}>
                <div className="inventory-order-top">
                  <div><span>Order</span><strong>{order.orderNumber}</strong></div>
                  <span className={`order-status status-${order.status}`}>{order.status}</span>
                  <div className="inventory-order-total"><span>{order.customerName} · ${order.subtotal.toFixed(2)}</span></div>
                </div>
                <ul className="order-items">
                  {order.items.map((item) => (
                    <li key={item.handle}><span>{item.name} × {item.quantity}</span><span>{item.lineTotal.toFixed(2)}</span></li>
                  ))}
                </ul>
                {order.status === "reserved" && (
                  <div className="inventory-actions">
                    <button disabled={pendingOrder !== null} onClick={() => updateOrder(order.orderNumber, "fulfill")} type="button">
                      {pendingOrder === order.orderNumber ? "Saving…" : "Fulfill order"}
                    </button>
                    <button disabled={pendingOrder !== null} onClick={() => updateOrder(order.orderNumber, "cancel")} type="button">
                      Cancel reservation
                    </button>
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </section>
      <p className="demo-note inventory-note">Development-only inventory. Reservations are stored with orders in the local JSON file.</p>
    </div>
  );
}
