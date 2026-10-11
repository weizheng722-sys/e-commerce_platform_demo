import Stripe from "stripe";
import { updateOrderStatus } from "@/lib/orders/store";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const signature = request.headers.get("stripe-signature");
  if (!secretKey?.startsWith("sk_test_") || !webhookSecret || !signature) {
    return new Response("Webhook is not configured", { status: 400 });
  }
  const stripe = new Stripe(secretKey);
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(await request.text(), signature, webhookSecret);
  } catch {
    return new Response("Invalid signature", { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const orderNumber = session.metadata?.orderNumber ?? session.client_reference_id;
    if (!orderNumber) return new Response("Missing order reference", { status: 400 });
    if (session.payment_status === "paid") {
      const result = await updateOrderStatus(orderNumber, "fulfill");
      if (result.kind === "not-found") return new Response("Order not found", { status: 404 });
      // Duplicate webhook deliveries are safe: the first delivery changes status;
      // later deliveries observe the terminal status and acknowledge the event.
    }
  }
  if (event.type === "checkout.session.expired") {
    const session = event.data.object as Stripe.Checkout.Session;
    const orderNumber = session.metadata?.orderNumber ?? session.client_reference_id;
    if (orderNumber) await updateOrderStatus(orderNumber, "cancel");
  }
  return Response.json({ received: true });
}
