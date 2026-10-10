import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getProductByHandle } from "@/lib/commerce/catalogue";
import { SiteHeader } from "@/components/site-header";
import { AddToCartButton } from "@/features/cart/add-to-cart-button";

type ProductPageProps = {
  params: Promise<{ handle: string }>;
};

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { handle } = await params;
  const product = await getProductByHandle(handle);

  return product
    ? { title: product.name, description: product.description }
    : { title: "Product not found" };
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { handle } = await params;
  const product = await getProductByHandle(handle);

  if (!product) notFound();

  return (
    <main className="shop-page">
      <SiteHeader />

      <section className="product-detail" aria-labelledby="product-title">
        <div className={`product-art product-detail-art product-art-${product.color}`} aria-hidden="true">
          <span>{product.symbol}</span>
          <small>FRESHBOX · GOODNESS, DELIVERED</small>
        </div>
        <div className="product-detail-copy">
          <Link className="back-link" href="/products">← Back to the shop</Link>
          <p className="eyebrow"><span className="eyebrow-dot" /> {product.category}</p>
          <h1 id="product-title">{product.name}</h1>
          <p className="detail-price">${product.price.toFixed(2)} <span>{product.unit}</span></p>
          <p className="detail-description">{product.description}</p>
          <p className={`availability ${product.available ? "is-available" : "is-unavailable"}`}>
            <span aria-hidden="true">●</span> {product.available ? "Available for your next delivery" : "A fresh batch is coming soon"}
          </p>
          <AddToCartButton product={product} />
          <p className="demo-note">This catalogue uses sample products. Checkout is not connected yet.</p>
        </div>
      </section>
      <footer className="site-footer"><span>Grown with a little more care.</span><span>FreshBox · Goodness, delivered.</span></footer>
    </main>
  );
}
