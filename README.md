# FreshBox

FreshBox is a portfolio e-commerce application for healthy food boxes and pantry products. It is being built in phases, with mock integrations first so the project runs locally before Shopify or Stripe credentials are configured.

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

Mock modes require no external credentials. Never place secret keys in `NEXT_PUBLIC_*` variables. Configure Stripe with test keys only and use the Stripe CLI to forward test webhooks during local development.

## Project status

The project currently has a responsive homepage, a sample product catalogue with listing and detail pages, a browser-persisted cart, mock checkout with server-side validation and catalogue-based pricing, and local order and inventory pages at `/orders` and `/inventory`. Checkout reserves mock stock; inventory actions can cancel a reservation or fulfill an order. Orders and stock are saved together in `.local/orders.json` so they survive local server restarts. No payment is collected or delivery scheduled. The local file store and operations pages are for development only. Use a hosted database and access controls before deploying persistent order handling or relying on inventory state.

Managed PostgreSQL setup is documented in [docs/database-setup.md](docs/database-setup.md). `database/schema.sql` is preparatory only; the app continues to use its local JSON store until a database adapter and safe importer are implemented.

## Documentation

- [Architecture](docs/architecture.md)
- [Environment variables](.env.example)

## Deployment

Import the repository into Vercel, set `APP_URL` to the deployed origin, and configure only the integrations used by the selected deployment. Stripe settings must remain in test mode for this demo. The local JSON order store and mock ERP state are not suitable for Vercel's multi-instance runtime. Use a hosted database-backed implementation before relying on persistent orders, reservations, or webhook idempotency.
