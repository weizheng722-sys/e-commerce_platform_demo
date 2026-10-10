import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { ConfirmationContent } from "@/features/checkout/confirmation-content";

export const metadata: Metadata = {
  title: "Order confirmation",
  description: "Confirmation for your FreshBox demo order.",
};

export default function ConfirmationPage() {
  return (
    <main className="shop-page">
      <SiteHeader />
      <ConfirmationContent />
      <footer className="site-footer"><span>Grown with a little more care.</span><span>FreshBox · Goodness, delivered.</span></footer>
    </main>
  );
}
