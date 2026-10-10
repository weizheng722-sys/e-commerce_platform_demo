import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { randomUUID } from "node:crypto";
import { POST } from "../../src/app/api/checkout/route";
import { listOrders } from "../../src/lib/orders/store";

const customer = {
  name: "Test Shopper",
  email: "shopper@example.test",
  address1: "12 Market Street",
  address2: "",
  city: "Kuala Lumpur",
  region: "",
  postalCode: "50000",
  country: "Malaysia",
};

let storePath: string;
let originalStorePath: string | undefined;

function checkoutRequest(body: unknown) {
  return new Request("http://localhost/api/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function validCheckout(items: unknown = [{ handle: "garden-greens", quantity: 1 }]) {
  return { customer, items };
}

describe("POST /api/checkout", () => {
  beforeEach(() => {
    originalStorePath = process.env.ORDER_STORE_PATH;
    storePath = `.local/test-orders-${randomUUID()}/orders.json`;
    process.env.ORDER_STORE_PATH = storePath;
  });

  afterEach(async () => {
    await rm(resolve(process.cwd(), dirname(storePath)), { recursive: true, force: true });
    if (originalStorePath === undefined) delete process.env.ORDER_STORE_PATH;
    else process.env.ORDER_STORE_PATH = originalStorePath;
  });

  it("uses catalogue prices and saves the complete order before returning a receipt", async () => {
    const response = await POST(checkoutRequest({
      customer,
      items: [{ handle: "garden-greens", quantity: 2, price: 0 }],
    }));
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.receipt.subtotal).toBe(36);
    expect(body.receipt.items[0]).toMatchObject({ unitPrice: 18, quantity: 2, lineTotal: 36 });

    const orders = await listOrders();
    expect(orders).toHaveLength(1);
    expect(orders[0]).toMatchObject({ subtotal: 36, customer: { address1: customer.address1 } });
    const savedState = JSON.parse(await readFile(resolve(process.cwd(), storePath), "utf8"));
    expect(savedState.orders).toHaveLength(1);
    expect(savedState.orders[0].status).toBe("reserved");
  });

  it("rejects malformed checkout details without saving an order", async () => {
    const response = await POST(checkoutRequest({ customer, items: [{ handle: "garden-greens", quantity: 0 }] }));

    expect(response.status).toBe(400);
    await expect(listOrders()).resolves.toEqual([]);
  });

  it.each([
    ["unknown-product", "not-a-product"],
    ["unavailable-product", "market-mix-box"],
  ])("rejects %s without creating an order", async (_caseName, handle) => {
    const response = await POST(checkoutRequest(validCheckout([{ handle, quantity: 1 }])));

    expect(response.status).toBe(409);
    await expect(listOrders()).resolves.toEqual([]);
  });

  it("returns a save error and does not report success when the order file is invalid", async () => {
    const filePath = resolve(process.cwd(), storePath);
    await mkdir(dirname(filePath), { recursive: true });
    await writeFile(filePath, "not valid JSON", "utf8");

    const response = await POST(checkoutRequest(validCheckout()));
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.error).toMatch(/could not save/i);
    expect(await readFile(filePath, "utf8")).toBe("not valid JSON");
  });

  it("rejects orders that exceed available stock", async () => {
    const response = await POST(checkoutRequest(validCheckout([{ handle: "garden-greens", quantity: 25 }])));
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body.error).toMatch(/only 24 available/i);
    await expect(listOrders()).resolves.toEqual([]);
  });

  it("prevents concurrent checkouts from reserving more than available stock", async () => {
    const request = () => POST(checkoutRequest(validCheckout([{ handle: "garden-greens", quantity: 13 }])));
    const responses = await Promise.all([request(), request()]);

    expect(responses.map((response) => response.status).sort()).toEqual([201, 409]);
    const orders = await listOrders();
    expect(orders).toHaveLength(1);
    expect(orders[0].items[0].quantity).toBe(13);
  });
});
