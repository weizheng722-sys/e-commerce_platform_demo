-- Initial managed-database schema for FreshBox.
-- Run this once in a new, empty PostgreSQL database before enabling the DB adapter.

CREATE TABLE IF NOT EXISTS inventory (
  product_handle TEXT PRIMARY KEY,
  on_hand INTEGER NOT NULL DEFAULT 0 CHECK (on_hand >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS orders (
  order_number TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('placed', 'reserved', 'fulfilled', 'cancelled')),
  status_updated_at TIMESTAMPTZ NOT NULL,
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  address1 TEXT NOT NULL,
  address2 TEXT NOT NULL DEFAULT '',
  city TEXT NOT NULL,
  region TEXT NOT NULL DEFAULT '',
  postal_code TEXT NOT NULL,
  country TEXT NOT NULL,
  subtotal NUMERIC(10, 2) NOT NULL CHECK (subtotal >= 0)
);

CREATE INDEX IF NOT EXISTS orders_created_at_idx ON orders (created_at DESC);
CREATE INDEX IF NOT EXISTS orders_status_idx ON orders (status);

CREATE TABLE IF NOT EXISTS order_items (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  order_number TEXT NOT NULL REFERENCES orders (order_number) ON DELETE CASCADE,
  product_handle TEXT NOT NULL,
  product_name TEXT NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price NUMERIC(10, 2) NOT NULL CHECK (unit_price >= 0),
  line_total NUMERIC(10, 2) NOT NULL CHECK (line_total >= 0)
);

CREATE INDEX IF NOT EXISTS order_items_order_number_idx ON order_items (order_number);
CREATE INDEX IF NOT EXISTS order_items_product_handle_idx ON order_items (product_handle);

-- Starting stock matches src/lib/orders/store.ts. Existing product rows are not overwritten.
INSERT INTO inventory (product_handle, on_hand) VALUES
  ('sunshine-fruit-box', 18),
  ('garden-greens', 24),
  ('everyday-pantry', 16),
  ('market-mix-box', 0)
ON CONFLICT (product_handle) DO NOTHING;
