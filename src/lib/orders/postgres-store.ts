import { Pool, type PoolClient } from "pg";
import { getProducts } from "@/lib/commerce/catalogue";
import type { InventoryItem, NewOrder, OrderStatus, StoredOrder } from "@/lib/orders/store";

let pool: Pool | undefined;
export function getDatabaseStore() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required when ORDER_STORAGE=postgres");
  pool ??= new Pool({ connectionString: process.env.DATABASE_URL, max: 5, ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: true } : undefined });
  return {
    listOrders,
    getInventory,
    reserveOrder,
    updateOrderStatus,
  };
}

function db() { if (!pool) throw new Error("Database pool is not initialized"); return pool; }
async function withTransaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await db().connect();
  try { await client.query("BEGIN"); const result = await fn(client); await client.query("COMMIT"); return result; }
  catch (error) { await client.query("ROLLBACK"); throw error; }
  finally { client.release(); }
}

type DbOrder = { order_number: string; created_at: Date; status: OrderStatus; status_updated_at: Date; customer_name: string; customer_email: string; address1: string; address2: string; city: string; region: string; postal_code: string; country: string; subtotal: string | number };
type DbItem = { product_handle: string; product_name: string; quantity: number; unit_price: string | number; line_total: string | number };
function mapOrder(row: DbOrder, items: DbItem[]): StoredOrder {
  return { orderNumber: row.order_number, createdAt: new Date(row.created_at).toISOString(), status: row.status, statusUpdatedAt: new Date(row.status_updated_at).toISOString(), customer: { name: row.customer_name, email: row.customer_email, address1: row.address1, address2: row.address2, city: row.city, region: row.region, postalCode: row.postal_code, country: row.country }, items: items.map((item) => ({ handle: item.product_handle, name: item.product_name, quantity: Number(item.quantity), unitPrice: Number(item.unit_price), lineTotal: Number(item.line_total) })), subtotal: Number(row.subtotal) };
}
async function listOrders(): Promise<StoredOrder[]> {
  const { rows } = await db().query<DbOrder>("SELECT * FROM orders ORDER BY created_at DESC");
  if (!rows.length) return [];
  const byOrder = await db().query<DbItem & { order_number: string }>("SELECT order_number, product_handle, product_name, quantity, unit_price, line_total FROM order_items WHERE order_number = ANY($1::text[]) ORDER BY id", [rows.map((row) => row.order_number)]);
  const groupedItems = new Map<string, DbItem[]>();
  for (const item of byOrder.rows) groupedItems.set(item.order_number, [...(groupedItems.get(item.order_number) ?? []), item]);
  return rows.map((row) => mapOrder(row, groupedItems.get(row.order_number) ?? []));
}
async function getInventory(): Promise<InventoryItem[]> {
  const [products, stock, reserved] = await Promise.all([
    getProducts(), db().query<{ product_handle: string; on_hand: number }>("SELECT product_handle, on_hand FROM inventory"),
    db().query<{ product_handle: string; quantity: string }>("SELECT i.product_handle, COALESCE(SUM(i.quantity),0) quantity FROM order_items i JOIN orders o USING(order_number) WHERE o.status='reserved' GROUP BY i.product_handle"),
  ]);
  const stockMap = new Map(stock.rows.map((r) => [r.product_handle, Number(r.on_hand)]));
  const reservedMap = new Map(reserved.rows.map((r) => [r.product_handle, Number(r.quantity)]));
  return products.map((product) => { const onHand = stockMap.get(product.handle) ?? 0; const reservedQty = reservedMap.get(product.handle) ?? 0; return { handle: product.handle, name: product.name, onHand, reserved: reservedQty, available: Math.max(0, onHand - reservedQty) }; });
}
async function reserveOrder(order: NewOrder): Promise<{ order: StoredOrder } | { unavailable: { name: string; available: number; requested: number }[] }> {
  return withTransaction(async (client) => {
    const handles = order.items.map((item) => item.handle).sort();
    const { rows } = await client.query<{ product_handle: string; on_hand: number }>("SELECT product_handle,on_hand FROM inventory WHERE product_handle = ANY($1::text[]) ORDER BY product_handle FOR UPDATE", [handles]);
    const stocks = new Map(rows.map((row) => [row.product_handle, Number(row.on_hand)]));
    const reserved = await client.query<{ product_handle: string; quantity: string }>("SELECT i.product_handle,SUM(i.quantity) quantity FROM order_items i JOIN orders o USING(order_number) WHERE o.status='reserved' AND i.product_handle=ANY($1::text[]) GROUP BY i.product_handle", [handles]);
    const reservedMap = new Map(reserved.rows.map((r) => [r.product_handle, Number(r.quantity)]));
    const unavailable = order.items.flatMap((item) => { const available = Math.max(0, (stocks.get(item.handle) ?? 0) - (reservedMap.get(item.handle) ?? 0)); return item.quantity > available ? [{ name: item.name, available, requested: item.quantity }] : []; });
    if (unavailable.length) return { unavailable };
    const created: StoredOrder = { ...order, status: "reserved", statusUpdatedAt: new Date().toISOString() };
    await client.query("INSERT INTO orders(order_number,created_at,status,status_updated_at,customer_name,customer_email,address1,address2,city,region,postal_code,country,subtotal) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)", [created.orderNumber,created.createdAt,created.status,created.statusUpdatedAt,created.customer.name,created.customer.email,created.customer.address1,created.customer.address2,created.customer.city,created.customer.region,created.customer.postalCode,created.customer.country,created.subtotal]);
    for (const item of created.items) await client.query("INSERT INTO order_items(order_number,product_handle,product_name,quantity,unit_price,line_total) VALUES($1,$2,$3,$4,$5,$6)", [created.orderNumber,item.handle,item.name,item.quantity,item.unitPrice,item.lineTotal]);
    return { order: created };
  });
}
async function updateOrderStatus(orderNumber: string, action: "cancel" | "fulfill") {
  return withTransaction(async (client) => {
    const found = await client.query<DbOrder>("SELECT * FROM orders WHERE order_number=$1 FOR UPDATE", [orderNumber]);
    const row = found.rows[0]; if (!row) return { kind: "not-found" as const };
    if (row.status !== "reserved") return { kind: "invalid-status" as const, status: row.status };
    const items = await client.query<DbItem>("SELECT product_handle,product_name,quantity,unit_price,line_total FROM order_items WHERE order_number=$1", [orderNumber]);
    if (action === "fulfill") {
      for (const item of items.rows) { const update = await client.query("UPDATE inventory SET on_hand=on_hand-$1,updated_at=NOW() WHERE product_handle=$2 AND on_hand >= $1", [item.quantity,item.product_handle]); if (!update.rowCount) return { kind: "insufficient-stock" as const }; }
    }
    const updatedAt = new Date().toISOString();
    const status = action === "fulfill" ? "fulfilled" : "cancelled";
    await client.query("UPDATE orders SET status=$1,status_updated_at=$2 WHERE order_number=$3", [status,updatedAt,orderNumber]);
    return { kind: "updated" as const, order: mapOrder({ ...row, status, status_updated_at: new Date(updatedAt) }, items.rows) };
  });
}
