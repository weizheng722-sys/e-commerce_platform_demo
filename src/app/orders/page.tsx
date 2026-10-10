import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { listOrders } from "@/lib/orders/store";

export const metadata: Metadata = {
  title: "Local order history",
  description: "Review mock orders created in this local demo.",
};

export const dynamic = "force-dynamic";

export default async function OrdersPage() {
  if (process.env.NODE_ENV === "production") notFound();

  const orders = await listOrders();

  return (
    <main className="shop-page">
      <SiteHeader />
      <section className="orders-page" aria-labelledby="orders-title">
        <p className="eyebrow"><span className="eyebrow-dot" /> Local demo only</p>
        <div className="orders-heading">
          <div>
            <h1 id="orders-title">Order<br /><em>history.</em></h1>
            <p className="catalogue-intro">Mock orders saved on this development machine.</p>
          </div>
          <Link className="back-link" href="/products">Back to the shop →</Link>
        </div>

        {orders.length === 0 ? (
          <div className="orders-empty">
            <p>No mock orders yet.</p>
            <Link className="button button-dark" href="/products">Explore the shop <span aria-hidden="true">→</span></Link>
          </div>
        ) : (
          <div className="order-list">
            {orders.map((order) => (
              <article className="order-card" key={order.orderNumber}>
                <div className="order-card-heading">
                  <div><span>Order number</span><strong>{order.orderNumber}</strong></div>
                  <div><span>Placed</span><strong>{new Date(order.createdAt).toLocaleString("en-MY", { timeZone: "Asia/Kuala_Lumpur" })}</strong></div>
                  <div><span>Customer</span><strong>{order.customer.name}</strong></div>
                  <div><span>Status</span><strong className={`order-status status-${order.status}`}>{order.status}</strong></div>
                  <div className="order-total"><span>Mock total</span><strong>${order.subtotal.toFixed(2)}</strong></div>
                </div>
                <ul className="order-items">
                  {order.items.map((item) => (
                    <li key={item.handle}><span>{item.name} × {item.quantity}</span><strong>${item.lineTotal.toFixed(2)}</strong></li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        )}
        <p className="demo-note orders-note">This page is disabled in production. It omits delivery addresses and email addresses.</p>
      </section>
      <footer className="site-footer"><span>Grown with a little more care.</span><span>FreshBox · Goodness, delivered.</span></footer>
    </main>
  );
}
