import Link from "next/link";
import { SiteHeader } from "@/components/site-header";

const highlights = ["Seasonal produce", "Thoughtful pantry staples", "Flexible subscriptions"];

export default function HomePage() {
  return (
    <main>
      <SiteHeader />

      <section className="hero" aria-labelledby="hero-title">
        <div className="hero-copy">
          <p className="eyebrow"><span className="eyebrow-dot" /> A brighter kind of grocery run</p>
          <h1 id="hero-title">Good food.<br />Good mood.<br /><em>Good to go.</em></h1>
          <p className="hero-description">
            Feel-good food boxes and everyday favourites, picked with care and delivered on your schedule.
          </p>
          <div className="hero-actions">
            <Link className="button button-dark" href="/products">Explore the shop <span aria-hidden="true">→</span></Link>
            <Link className="text-link" href="/subscriptions">How subscriptions work</Link>
          </div>
          <ul className="highlights" aria-label="FreshBox benefits">
            {highlights.map((highlight) => <li key={highlight}>{highlight}</li>)}
          </ul>
        </div>
        <div className="hero-art" role="img" aria-label="Illustration of a fresh produce box with fruit and vegetables">
          <div className="sun-disc" />
          <div className="art-label">A little goodness<br />goes a long way</div>
          <div className="produce produce-orange" />
          <div className="produce produce-lemon" />
          <div className="produce produce-pear" />
          <div className="leaf leaf-one" />
          <div className="leaf leaf-two" />
          <div className="box-front"><span>FRESH<br />PICKS</span><span className="box-stamp">F<br />B</span></div>
          <div className="art-caption">Picked for your kind of week <span>✳</span></div>
        </div>
      </section>
      <footer className="site-footer"><span>Grown with a little more care.</span><span>FreshBox · Goodness, delivered.</span></footer>
    </main>
  );
}
