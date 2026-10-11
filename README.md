# FreshBox

FreshBox is a portfolio e-commerce application for healthy food boxes and pantry products. It runs locally with mock integrations, with optional Stripe Checkout in test mode.

## Stack

- Next.js App Router, React, TypeScript (strict)
- Shopify Storefront API adapter for catalogue and commerce data
- Stripe Checkout and Billing in test mode only
- Mock ERP REST API for stock, reservations, and order synchronization
- Vitest and Playwright for unit, API, and end-to-end coverage
- Vercel-compatible deployment

## Local setup

Requirements: Node.js 20.9 or later and pnpm 9 or later.

1. Copy `.env.example` to `.env.local`.
2. Install dependencies with `pnpm install`.
3. Start the app with `pnpm dev` and open `http://localhost:3000`.
4. Run checks with `pnpm lint`, `pnpm typecheck`, and `pnpm test`.

Mock modes require no external credentials. Never place secret keys in `NEXT_PUBLIC_*` variables. For the repeatable Stripe test checkout setup, follow the steps below. Never use live Stripe keys with this demo.

## Local demo with Neon and Stripe test mode

The app can use the local JSON store and mock checkout, or the Neon database and Stripe test checkout. To repeat the verified local demo:

1. In `.env.local`, set `ORDER_STORAGE=postgres`, `DATABASE_URL` to your Neon pooled connection string, and `PAYMENT_PROVIDER=stripe`.
2. Add your Stripe test secret key as `STRIPE_SECRET_KEY=sk_test_...`. Keep it private and never prefix it with `NEXT_PUBLIC_`.
3. Start the app with `pnpm dev`.
4. In a second PowerShell window, sign in to the Stripe CLI once with `stripe login`, then run:

   ```powershell
   stripe listen --events checkout.session.completed,checkout.session.expired --forward-to localhost:3000/api/stripe/webhook
   ```

5. Copy the listener's `whsec_...` signing secret to `.env.local` as `STRIPE_WEBHOOK_SECRET=...`, then restart `pnpm dev`. Keep the listener running while you test.
6. Place an order and use Stripe's test card `4242 4242 4242 4242`, a future expiry date, and any CVC. The signed webhook updates the demo order and inventory after payment.

Stripe test payments do not charge a real card. For mock checkout without Stripe, set `PAYMENT_PROVIDER=mock`. For mock order storage, set `ORDER_STORAGE=file` or remove that setting. See [Stripe test cards](https://docs.stripe.com/testing).

## Project status

The project includes a responsive homepage, sample catalogue, browser-persisted cart, server-validated checkout, Stripe test checkout, and order and inventory pages at `/orders` and `/inventory`. Orders and inventory can use either the local JSON store or the PostgreSQL adapter. Stripe test payments are confirmed by a signed webhook; inventory operations remain a local demo and do not schedule real delivery. The local store and operations pages are for development only.

Managed PostgreSQL setup and safe JSON import steps are documented in [docs/database-setup.md](docs/database-setup.md). `database/schema.sql` creates the tables used by the adapter.

## Documentation

- [Architecture](docs/architecture.md)
- [Environment variables](.env.example)

## Deployment

Import the repository into Vercel, set `APP_URL` to the deployed origin, and configure only the integrations used by the selected deployment. Stripe settings must remain in test mode for this demo. The local JSON order store and mock ERP state are not suitable for Vercel's multi-instance runtime. Use a hosted database-backed implementation before relying on persistent orders, reservations, or webhook idempotency.
