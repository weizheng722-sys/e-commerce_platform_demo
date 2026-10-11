import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getProducts } from "@/lib/commerce/catalogue";
import { reserveOrder } from "@/lib/orders/store";
import Stripe from "stripe";

const checkoutSchema = z.object({
  customer: z.object({
    name: z.string().trim().min(2).max(100),
    email: z.email().max(254),
    address1: z.string().trim().min(3).max(160),
    address2: z.string().trim().max(160).optional().default(""),
    city: z.string().trim().min(2).max(100),
    region: z.string().trim().max(100).optional().default(""),
    postalCode: z.string().trim().min(2).max(20),
    country: z.string().trim().min(2).max(80),
  }),
  items: z.array(z.object({
    handle: z.string().min(1).max(100),
    quantity: z.number().int().min(1).max(99),
  })).min(1).max(30),
});

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "The checkout details could not be read." }, { status: 400 });
  }

  const parsed = checkoutSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Please check your delivery details and try again." }, { status: 400 });
  }

  const catalogue = await getProducts();
  const productByHandle = new Map(catalogue.map((product) => [product.handle, product]));
  const quantities = new Map<string, number>();

  for (const item of parsed.data.items) {
    quantities.set(item.handle, (quantities.get(item.handle) ?? 0) + item.quantity);
  }

  const orderItems: { handle: string; name: string; quantity: number; unitPrice: number; lineTotal: number }[] = [];
  for (const [handle, quantity] of quantities) {
    const product = productByHandle.get(handle);
    if (!product) {
      return NextResponse.json({ error: "One of the items in your box is no longer available." }, { status: 409 });
    }
    if (!product.available) {
      return NextResponse.json({ error: `${product.name} is coming soon. Remove it from your box to continue.` }, { status: 409 });
    }
    if (quantity > 99) {
      return NextResponse.json({ error: "An item quantity is above the allowed limit." }, { status: 400 });
    }

    const unitPrice = Math.round(product.price * 100) / 100;
    orderItems.push({
      handle: product.handle,
      name: product.name,
      quantity,
      unitPrice,
      lineTotal: Math.round(unitPrice * quantity * 100) / 100,
    });
  }

  const subtotal = Math.round(orderItems.reduce((total, item) => total + item.lineTotal, 0) * 100) / 100;
  const order = {
    orderNumber: `FB-${Date.now().toString(36).toUpperCase()}-${randomUUID().slice(0, 5).toUpperCase()}`,
    createdAt: new Date().toISOString(),
    customer: parsed.data.customer,
    items: orderItems,
    subtotal,
  };

  let reservedOrder: Awaited<ReturnType<typeof reserveOrder>>;
  try {
    reservedOrder = await reserveOrder(order);
  } catch {
    return NextResponse.json({ error: "We could not save your order. Please try again." }, { status: 503 });
  }

  if ("unavailable" in reservedOrder) {
    const message = reservedOrder.unavailable
      .map((item) => `${item.name}: only ${item.available} available, ${item.requested} requested.`)
      .join(" ");
    return NextResponse.json({ error: `We could not reserve your box. ${message}` }, { status: 409 });
  }

  const receipt = {
      orderNumber: reservedOrder.order.orderNumber,
      createdAt: reservedOrder.order.createdAt,
      customerName: reservedOrder.order.customer.name,
      customerEmail: reservedOrder.order.customer.email,
      items: reservedOrder.order.items,
      subtotal: reservedOrder.order.subtotal,
    };

  if (process.env.PAYMENT_PROVIDER === "stripe") {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey?.startsWith("sk_test_")) {
      await import("@/lib/orders/store").then(({ updateOrderStatus }) => updateOrderStatus(receipt.orderNumber, "cancel"));
      return NextResponse.json({ error: "Stripe test mode is not configured with a test secret key." }, { status: 503 });
    }
    try {
      const stripe = new Stripe(secretKey);
      const appUrl = process.env.APP_URL ?? new URL(request.url).origin;
      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        customer_email: receipt.customerEmail,
        client_reference_id: receipt.orderNumber,
        metadata: { orderNumber: receipt.orderNumber },
        line_items: reservedOrder.order.items.map((item) => ({
          quantity: item.quantity,
          price_data: {
            currency: "usd",
            unit_amount: Math.round(item.unitPrice * 100),
            product_data: { name: item.name },
          },
        })),
        success_url: `${appUrl}/checkout/confirmation?payment=success`,
        cancel_url: `${appUrl}/checkout?payment=cancelled`,
      });
      if (!session.url) throw new Error("Stripe did not return a Checkout URL");
      return NextResponse.json({ receipt, checkoutUrl: session.url }, { status: 201 });
    } catch {
      await import("@/lib/orders/store").then(({ updateOrderStatus }) => updateOrderStatus(receipt.orderNumber, "cancel"));
      return NextResponse.json({ error: "We could not start secure test checkout. Please try again." }, { status: 502 });
    }
  }

  return NextResponse.json({ receipt }, { status: 201 });
}
