import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { randomUUID } from "node:crypto";
import { getInventory, listOrders, reserveOrder, updateOrderStatus, type NewOrder } from "../../src/lib/orders/store";

let storePath: string;
let originalStorePath: string | undefined;

function order(orderNumber: string, quantity = 1): NewOrder {
  return {
    orderNumber,
    createdAt: new Date().toISOString(),
    customer: {
      name: "Test Shopper",
      email: "shopper@example.test",
      address1: "12 Market Street",
      address2: "",
      city: "Kuala Lumpur",
      region: "",
      postalCode: "50000",
      country: "Malaysia",
    },
    items: [{ handle: "garden-greens", name: "Garden greens", quantity, unitPrice: 18, lineTotal: 18 * quantity }],
    subtotal: 18 * quantity,
  };
}

describe("local order store", () => {
  beforeEach(() => {
    originalStorePath = process.env.ORDER_STORE_PATH;
    storePath = `.local/test-order-store-${randomUUID()}/orders.json`;
    process.env.ORDER_STORE_PATH = storePath;
  });

  afterEach(async () => {
    await rm(resolve(process.cwd(), dirname(storePath)), { recursive: true, force: true });
    if (originalStorePath === undefined) delete process.env.ORDER_STORE_PATH;
    else process.env.ORDER_STORE_PATH = originalStorePath;
  });

  it("serializes reservations and prevents overselling", async () => {
    const first = order("FB-ONE");
    const second = order("FB-TWO");
    first.items[0].quantity = 13;
    first.items[0].lineTotal = 234;
    first.subtotal = 234;
    second.items[0].quantity = 13;
    second.items[0].lineTotal = 234;
    second.subtotal = 234;

    const results = await Promise.all([reserveOrder(first), reserveOrder(second)]);
    const orders = await listOrders();
    const inventory = await getInventory();

    expect(results.filter((result) => "order" in result)).toHaveLength(1);
    expect(results.filter((result) => "unavailable" in result)).toHaveLength(1);
    expect(orders).toHaveLength(1);
    expect(orders[0].status).toBe("reserved");
    expect(inventory.find((item) => item.handle === "garden-greens")).toMatchObject({ onHand: 24, reserved: 13, available: 11 });
  });

  it("releases stock on cancellation and consumes it on fulfillment", async () => {
    await reserveOrder(order("FB-CANCEL", 4));
    const cancelled = await updateOrderStatus("FB-CANCEL", "cancel");
    expect(cancelled.kind).toBe("updated");
    expect((await getInventory()).find((item) => item.handle === "garden-greens")).toMatchObject({ onHand: 24, reserved: 0, available: 24 });

    await reserveOrder(order("FB-FULFILL", 3));
    const fulfilled = await updateOrderStatus("FB-FULFILL", "fulfill");
    expect(fulfilled.kind).toBe("updated");
    expect((await getInventory()).find((item) => item.handle === "garden-greens")).toMatchObject({ onHand: 21, reserved: 0, available: 21 });
    const savedOrders = await listOrders();
    expect(savedOrders.map(({ orderNumber, status }) => ({ orderNumber, status }))).toEqual(expect.arrayContaining([
      { orderNumber: "FB-FULFILL", status: "fulfilled" },
      { orderNumber: "FB-CANCEL", status: "cancelled" },
    ]));
  });

  it("does not allow a terminal order status to be changed again", async () => {
    await reserveOrder(order("FB-DONE"));
    await updateOrderStatus("FB-DONE", "cancel");

    await expect(updateOrderStatus("FB-DONE", "fulfill")).resolves.toMatchObject({ kind: "invalid-status", status: "cancelled" });
  });

  it("preserves pre-inventory order files and marks old orders as unreserved", async () => {
    const filePath = resolve(process.cwd(), storePath);
    await mkdir(dirname(filePath), { recursive: true });
    await writeFile(filePath, JSON.stringify([order("FB-OLD")]), "utf8");

    await expect(listOrders()).resolves.toMatchObject([{ orderNumber: "FB-OLD", status: "placed" }]);
    expect((await getInventory()).find((item) => item.handle === "garden-greens")).toMatchObject({ reserved: 0, available: 24 });

    await reserveOrder(order("FB-NEW"));
    const migrated = JSON.parse(await readFile(filePath, "utf8"));
    expect(migrated.orders).toHaveLength(2);
    expect(migrated.orders[0].status).toBe("placed");
  });
});
