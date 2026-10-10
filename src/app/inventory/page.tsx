import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { InventoryDashboard } from "@/features/inventory/inventory-dashboard";
import { getInventory, listOrders } from "@/lib/orders/store";

export const metadata: Metadata = {
  title: "Mock inventory",
  description: "Review demo inventory and manage mock order reservations.",
};

export const dynamic = "force-dynamic";

export default async function InventoryPage() {
  if (process.env.NODE_ENV === "production") notFound();

  const [inventory, storedOrders] = await Promise.all([getInventory(), listOrders()]);
  const orders = storedOrders.map((order) => ({
    orderNumber: order.orderNumber,
    createdAt: order.createdAt,
    status: order.status,
    customerName: order.customer.name,
    items: order.items,
    subtotal: order.subtotal,
  }));

  return (
    <main className="shop-page">
      <SiteHeader />
      <section className="inventory-page" aria-labelledby="inventory-title">
        <p className="eyebrow"><span className="eyebrow-dot" /> Development tools</p>
        <h1 id="inventory-title">Inventory<br /><em>dashboard.</em></h1>
        <p className="catalogue-intro inventory-intro">Mock stock levels and order reservations for this local demo.</p>
        <InventoryDashboard inventory={inventory} orders={orders} />
      </section>
      <footer className="site-footer"><span>Grown with a little more care.</span><span>FreshBox · Goodness, delivered.</span></footer>
    </main>
  );
}
