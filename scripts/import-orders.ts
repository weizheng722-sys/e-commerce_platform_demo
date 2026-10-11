import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { Pool } from "pg";
import type { StoredOrder, OrderStatus } from "../src/lib/orders/store";

type LegacyOrder = Omit<StoredOrder, "status" | "statusUpdatedAt"> & Partial<Pick<StoredOrder, "status" | "statusUpdatedAt">>;
function parseOrders(value: unknown): StoredOrder[] {
  const raw = Array.isArray(value) ? value : value && typeof value === "object" && Array.isArray((value as { orders?: unknown }).orders) ? (value as { orders: unknown[] }).orders : null;
  if (!raw) throw new Error("Unsupported order file: expected an array or a { orders } object");
  return raw.map((value, index) => {
    if (!value || typeof value !== "object") throw new Error(`Order ${index + 1} is not an object`);
    const order = value as LegacyOrder;
    if (!order.orderNumber || !order.createdAt || !order.customer || !Array.isArray(order.items) || !Number.isFinite(order.subtotal)) throw new Error(`Order ${index + 1} is missing required fields`);
    const status: OrderStatus = order.status ?? "placed";
    if (!["placed", "reserved", "fulfilled", "cancelled"].includes(status)) throw new Error(`Order ${order.orderNumber} has an invalid status`);
    return { ...order, status, statusUpdatedAt: order.statusUpdatedAt ?? order.createdAt };
  });
}

async function main() {
  try {
    const envFile = await readFile(resolve(process.cwd(), ".env.local"), "utf8");
    for (const line of envFile.split(/\r?\n/)) {
      const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
      if (!match || (process.env[match[1]] !== undefined && process.env[match[1]] !== "")) continue;
      let value = match[2];
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
      process.env[match[1]] = value;
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  if (!process.env.DATABASE_URL) throw new Error("Set DATABASE_URL in the environment before importing");
  const apply = process.argv.includes("--apply");
  const fileArg = process.argv.find((arg) => arg.startsWith("--file="))?.slice("--file=".length);
  const file = resolve(process.cwd(), fileArg ?? process.env.ORDER_STORE_PATH ?? ".local/orders.json");
  const orders = parseOrders(JSON.parse(await readFile(file, "utf8")) as unknown);
  const duplicates = new Set<string>();
  for (const order of orders) {
    if (duplicates.has(order.orderNumber)) throw new Error(`Duplicate order number in source file: ${order.orderNumber}`);
    duplicates.add(order.orderNumber);
  }
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 1 });
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const existing = await client.query<{ order_number: string }>("SELECT order_number FROM orders WHERE order_number = ANY($1::text[])", [orders.map((order) => order.orderNumber)]);
    if (existing.rows.length) throw new Error(`Import stopped: database already contains ${existing.rows.length} source order number(s), including ${existing.rows[0].order_number}`);
    if (!apply) {
      await client.query("ROLLBACK");
      console.log(`Dry run OK: ${orders.length} order(s) from ${file}; no data written. Re-run with --apply to import.`);
      return;
    }
    for (const order of orders) {
      await client.query("INSERT INTO orders(order_number,created_at,status,status_updated_at,customer_name,customer_email,address1,address2,city,region,postal_code,country,subtotal) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)", [order.orderNumber,order.createdAt,order.status,order.statusUpdatedAt,order.customer.name,order.customer.email,order.customer.address1,order.customer.address2,order.customer.city,order.customer.region,order.customer.postalCode,order.customer.country,order.subtotal]);
      for (const item of order.items) await client.query("INSERT INTO order_items(order_number,product_handle,product_name,quantity,unit_price,line_total) VALUES($1,$2,$3,$4,$5,$6)", [order.orderNumber,item.handle,item.name,item.quantity,item.unitPrice,item.lineTotal]);
    }
    // Preserve the local inventory snapshot, including any operator adjustments.
    const state = JSON.parse(await readFile(file, "utf8")) as { inventory?: Record<string, number> };
    for (const [handle, onHand] of Object.entries(state.inventory ?? {})) {
      if (!Number.isInteger(onHand) || onHand < 0) throw new Error(`Invalid on-hand stock for ${handle}`);
      await client.query("INSERT INTO inventory(product_handle,on_hand) VALUES($1,$2) ON CONFLICT(product_handle) DO UPDATE SET on_hand=EXCLUDED.on_hand,updated_at=NOW()", [handle,onHand]);
    }
    await client.query("COMMIT");
    console.log(`Imported ${orders.length} order(s) from ${file}. Keep the source file as a backup until verified.`);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally { client.release(); await pool.end(); }
}

main().catch((error: unknown) => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; });
