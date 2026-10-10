import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { CheckoutForm } from "@/features/checkout/checkout-form";

export const metadata: Metadata = {
  title: "Checkout",
  description: "Enter delivery details for your FreshBox demo order.",
};

export default function CheckoutPage() {
  return (
    <main className="shop-page">
      <SiteHeader />
      <CheckoutForm />
      <footer className="site-footer"><span>Grown with a little more care.</span><span>FreshBox · Goodness, delivered.</span></footer>
    </main>
  );
}
