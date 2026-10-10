import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { getProducts } from "@/lib/commerce/catalogue";

export const metadata: Metadata = {
  title: "Shop all",
  description: "Browse FreshBox produce boxes and everyday pantry favourites.",
};

export default async function ProductsPage() {
  const products = await getProducts();

  return (
    <main className="shop-page">
      <SiteHeader />

      <section className="catalogue" aria-labelledby="catalogue-title">
        <p className="eyebrow"><span className="eyebrow-dot" /> Picked with care</p>
        <div className="catalogue-heading">
          <div>
            <h1 id="catalogue-title">Good things<br /><em>for your table.</em></h1>
            <p className="catalogue-intro">A few fresh favourites to make this week feel a little brighter.</p>
          </div>
          <p className="catalogue-count">{products.length} feel-good finds</p>
        </div>

        <div className="product-grid">
          {products.map((product) => (
            <article className="product-card" key={product.handle}>
              <Link className="product-art-link" href={`/products/${product.handle}`} aria-label={`View ${product.name}`}>
                <div className={`product-art product-art-${product.color}`} aria-hidden="true">
                  <span>{product.symbol}</span>
                  <small>FRESHBOX · GOODNESS, DELIVERED</small>
                </div>
              </Link>
              <div className="product-meta">
                <p>{product.category}</p>
                {!product.available && <span className="stock-label">Coming soon</span>}
              </div>
              <div className="product-title-row">
                <h2><Link href={`/products/${product.handle}`}>{product.name}</Link></h2>
                <p>${product.price.toFixed(2)}</p>
              </div>
              <p className="product-unit">{product.unit}</p>
            </article>
          ))}
        </div>
      </section>
      <footer className="site-footer"><span>Grown with a little more care.</span><span>FreshBox · Goodness, delivered.</span></footer>
    </main>
  );
}
