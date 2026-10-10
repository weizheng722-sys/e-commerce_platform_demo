import { NextResponse } from "next/server";
import { z } from "zod";
import { updateOrderStatus } from "@/lib/orders/store";

const actionSchema = z.object({ action: z.enum(["cancel", "fulfill"]) });

type RouteContext = { params: Promise<{ orderNumber: string }> };

export async function PATCH(request: Request, { params }: RouteContext) {
  if (process.env.NODE_ENV === "production") return NextResponse.json({ error: "Not found." }, { status: 404 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Choose a valid order action." }, { status: 400 });
  }

  const parsed = actionSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Choose a valid order action." }, { status: 400 });

  const { orderNumber } = await params;
  try {
    const result = await updateOrderStatus(orderNumber, parsed.data.action);
    if (result.kind === "not-found") return NextResponse.json({ error: "Order not found." }, { status: 404 });
    if (result.kind === "invalid-status") {
      return NextResponse.json({ error: `This order is already ${result.status}.` }, { status: 409 });
    }
    if (result.kind === "insufficient-stock") {
      return NextResponse.json({ error: "The reserved stock is no longer available." }, { status: 409 });
    }
    return NextResponse.json({ orderNumber: result.order.orderNumber, status: result.order.status });
  } catch {
    return NextResponse.json({ error: "The order status could not be saved." }, { status: 503 });
  }
}
