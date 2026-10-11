import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { getProducts } from "@/lib/commerce/catalogue";
import { getDatabaseStore } from "@/lib/orders/postgres-store";

export type OrderStatus = "placed" | "reserved" | "fulfilled" | "cancelled";

export type StoredOrder = {
  orderNumber: string;
  createdAt: string;
  status: OrderStatus;
  statusUpdatedAt: string;
  customer: {
    name: string;
    email: string;
    address1: string;
    address2: string;
    city: string;
    region: string;
    postalCode: string;
    country: string;
  };
  items: { handle: string; name: string; quantity: number; unitPrice: number; lineTotal: number }[];
  subtotal: number;
};

export type NewOrder = Omit<StoredOrder, "status" | "statusUpdatedAt">;

export type InventoryItem = {
  handle: string;
  name: string;
  onHand: number;
  reserved: number;
  available: number;
};

type StoreState = {
  version: 1;
  inventory: Record<string, number>;
  orders: StoredOrder[];
};

const startingStock: Record<string, number> = {
  "sunshine-fruit-box": 18,
  "garden-greens": 24,
  "everyday-pantry": 16,
  "market-mix-box": 0,
};

let writeQueue: Promise<void> = Promise.resolve();

function getStorePath() {
  return resolve(process.cwd(), process.env.ORDER_STORE_PATH ?? ".local/orders.json");
}

function runExclusive<T>(operation: () => Promise<T>): Promise<T> {
  const result = writeQueue.then(operation);
  writeQueue = result.then(() => undefined, () => undefined);
  return result;
}

async function readState(storePath = getStorePath()): Promise<StoreState> {
  const products = await getProducts();
  const inventory = { ...startingStock };
  for (const product of products) {
    if (!(product.handle in inventory)) inventory[product.handle] = 0;
  }

  try {
    const contents = await readFile(storePath, "utf8");
    const parsed: unknown = JSON.parse(contents);
    if (Array.isArray(parsed)) {
      const migratedOrders = parsed.map((order) => {
        const legacyOrder = order as Omit<StoredOrder, "status" | "statusUpdatedAt"> & Partial<Pick<StoredOrder, "status" | "statusUpdatedAt">>;
        return {
          ...legacyOrder,
          status: legacyOrder.status ?? "placed",
          statusUpdatedAt: legacyOrder.statusUpdatedAt ?? legacyOrder.createdAt,
        };
      });
      return { version: 1, inventory, orders: migratedOrders };
    }

    if (!parsed || typeof parsed !== "object" || !Array.isArray((parsed as StoreState).orders)) {
      throw new Error("Order store has an unsupported format");
    }
    const saved = parsed as StoreState;
    return {
      version: 1,
      inventory: { ...inventory, ...saved.inventory },
      orders: saved.orders,
    };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return { version: 1, inventory, orders: [] };
    }
    throw error;
  }
}

async function writeState(state: StoreState) {
  const storePath = getStorePath();
  await mkdir(dirname(storePath), { recursive: true });
  const temporaryPath = `${storePath}.${randomUUID()}.tmp`;
  await writeFile(temporaryPath, JSON.stringify(state, null, 2), { encoding: "utf8", mode: 0o600 });
  await rename(temporaryPath, storePath);
}

function reservedQuantity(orders: StoredOrder[], handle: string) {
  return orders
    .filter((order) => order.status === "reserved")
    .reduce((total, order) => total + order.items
      .filter((item) => item.handle === handle)
      .reduce((sum, item) => sum + item.quantity, 0), 0);
}

export async function listOrders(): Promise<StoredOrder[]> {
  if (process.env.ORDER_STORAGE === "postgres") return getDatabaseStore().listOrders();
  const state = await readState();
  return state.orders.sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

export async function getInventory(): Promise<InventoryItem[]> {
  if (process.env.ORDER_STORAGE === "postgres") return getDatabaseStore().getInventory();
  const [state, products] = await Promise.all([readState(), getProducts()]);
  return products.map((product) => {
    const onHand = state.inventory[product.handle] ?? 0;
    const reserved = reservedQuantity(state.orders, product.handle);
    return { handle: product.handle, name: product.name, onHand, reserved, available: Math.max(0, onHand - reserved) };
  });
}

export async function reserveOrder(order: NewOrder): Promise<{ order: StoredOrder } | { unavailable: { name: string; available: number; requested: number }[] }> {
  if (process.env.ORDER_STORAGE === "postgres") return getDatabaseStore().reserveOrder(order);
  return runExclusive(async () => {
    const state = await readState();
    const unavailable = order.items.flatMap((item) => {
      const productStock = state.inventory[item.handle] ?? 0;
      const available = Math.max(0, productStock - reservedQuantity(state.orders, item.handle));
      return item.quantity > available ? [{ name: item.name, available, requested: item.quantity }] : [];
    });

    if (unavailable.length > 0) return { unavailable };

    const reservedOrder: StoredOrder = {
      ...order,
      status: "reserved",
      statusUpdatedAt: new Date().toISOString(),
    };
    state.orders.push(reservedOrder);
    await writeState(state);
    return { order: reservedOrder };
  });
}

export async function updateOrderStatus(orderNumber: string, action: "cancel" | "fulfill") {
  if (process.env.ORDER_STORAGE === "postgres") return getDatabaseStore().updateOrderStatus(orderNumber, action);
  return runExclusive(async () => {
    const state = await readState();
    const order = state.orders.find((entry) => entry.orderNumber === orderNumber);
    if (!order) return { kind: "not-found" as const };
    if (order.status !== "reserved") return { kind: "invalid-status" as const, status: order.status };

    if (action === "fulfill") {
      for (const item of order.items) {
        const stock = state.inventory[item.handle] ?? 0;
        if (stock < item.quantity) return { kind: "insufficient-stock" as const };
      }
      for (const item of order.items) state.inventory[item.handle] -= item.quantity;
      order.status = "fulfilled";
    } else {
      order.status = "cancelled";
    }
    order.statusUpdatedAt = new Date().toISOString();
    await writeState(state);
    return { kind: "updated" as const, order };
  });
}
