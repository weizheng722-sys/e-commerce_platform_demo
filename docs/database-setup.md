# Managed database setup

The app defaults to `.local/orders.json`. To use the PostgreSQL adapter, set `ORDER_STORAGE=postgres` and `DATABASE_URL` in the server environment. The adapter uses transactions and locks inventory rows during reservations. Keep `ORDER_STORAGE` unset or set it to `file` to continue using the local store.

## Recommended provider

For this Next.js demo, I recommend Neon, a managed PostgreSQL service. It provides pooled connection strings for serverless deployments; keep the connection string private and use the pooled URL when we wire up the app. See [Neon's connection pooling documentation](https://neon.tech/docs/connect/connection-pooling) and [Supabase's explanation of serverless connection pooling](https://supabase.com/docs/guides/database/connecting-to-postgres/pooling-and-limits) for the general idea.

You do not need to administer a PostgreSQL server. The one-time setup is to create a Neon project, choose a region close to your app's eventual host, and copy its pooled connection string. Do not send the connection string in chat or commit it to Git.

## Schema

`database/schema.sql` defines order headers, item snapshots, inventory, and the initial stock levels. It is intended to be run once in a new, empty database. The application adapter is a separate next step: it must use database transactions and row locks when reserving or fulfilling stock so concurrent checkouts cannot oversell.

## Before switching the app

1. Keep `.local/orders.json` as-is and make a separate backup before any migration.
2. Create the managed database and run `database/schema.sql` in its SQL editor.
3. Add the pooled connection string to `.env.local` as `DATABASE_URL=...` (that file is ignored by Git).
4. Back up `.local/orders.json`. Run `pnpm import:orders` for a dry run. It checks source validity and refuses order-number collisions. Run `pnpm import:orders -- --apply` only after reviewing the dry-run result. The importer uses one database transaction and preserves inventory from a versioned JSON snapshot. Legacy array files contain no inventory snapshot, so seeded database stock is retained.
5. Verify imported orders and inventory in the Neon SQL Editor. Then set `ORDER_STORAGE=postgres` locally and verify checkout, cancellation, and fulfillment against a disposable Neon branch before enabling it on production.

Do not use the database for real customer orders until access controls, backups, and deployment environment are configured and tested. The importer intentionally refuses any collision rather than attempting a merge. `--apply` overwrites matching inventory rows from the source snapshot; review those quantities first.
