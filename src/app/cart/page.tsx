import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { CartContent } from "@/features/cart/cart-content";

export const metadata: Metadata = {
  title: "Your box",
  description: "Review the FreshBox items in your box.",
};

export default function CartPage() {
  return (
    <main className="shop-page">
      <SiteHeader />
      <CartContent />
      <footer className="site-footer"><span>Grown with a little more care.</span><span>FreshBox · Goodness, delivered.</span></footer>
    </main>
  );
}
