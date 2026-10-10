# Managed database setup (preparation)

The current app saves orders and inventory to `.local/orders.json`. This is only suitable for local development. It does not become a hosted database by setting `DATABASE_URL`; the application still needs a database adapter and migration before it can read or write PostgreSQL.

## Recommended provider

For this Next.js demo, I recommend Neon, a managed PostgreSQL service. It provides pooled connection strings for serverless deployments; keep the connection string private and use the pooled URL when we wire up the app. See [Neon's connection pooling documentation](https://neon.tech/docs/connect/connection-pooling) and [Supabase's explanation of serverless connection pooling](https://supabase.com/docs/guides/database/connecting-to-postgres/pooling-and-limits) for the general idea.

You do not need to administer a PostgreSQL server. The one-time setup is to create a Neon project, choose a region close to your app's eventual host, and copy its pooled connection string. Do not send the connection string in chat or commit it to Git.

## Schema

`database/schema.sql` defines order headers, item snapshots, inventory, and the initial stock levels. It is intended to be run once in a new, empty database. The application adapter is a separate next step: it must use database transactions and row locks when reserving or fulfilling stock so concurrent checkouts cannot oversell.

## Before switching the app

1. Keep `.local/orders.json` as-is and make a separate backup before any migration.
2. Create the managed database and run `database/schema.sql` in its SQL editor.
3. Add the pooled connection string to `.env.local` as `DATABASE_URL=...` (that file is ignored by Git).
4. Implement and verify the database adapter and a one-time importer before changing the app's storage mode. Existing orders and stock must be imported without duplicating orders, and the JSON file should remain available as a backup until that is verified.

Do not use the database for real customer orders until the adapter, access controls, backups, and deployment environment are configured and tested.
