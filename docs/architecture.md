# FreshBox architecture

## Runtime boundaries

The Next.js App Router owns page rendering and the server-side API boundary. Route handlers and server actions validate all input at the server boundary and call domain services rather than embedding provider-specific logic in UI components.

### Catalogue and commerce

`src/lib/commerce` exposes the initial mock catalogue used by the product listing and detail pages. Cart state currently lives in browser local storage and is intended only for this demo. A later server-side commerce adapter can supply products, collections, and Shopify cart/checkout operations when configured. The app will present Shopify checkout and Stripe checkout as distinct paths so an order has one clear payment owner.

The current `/api/checkout` endpoint validates delivery details and item quantities, recalculates prices from the server catalogue, reserves mock stock, and saves the order and inventory state together in `.local/orders.json` before returning a receipt. Existing order arrays are migrated when the next successful write occurs; existing orders are marked `placed` without consuming mock stock. Writes are serialized within one server process and committed with an atomic file replacement. This local store does not coordinate multiple server instances or provide hosted durable storage. The `/orders` and `/inventory` pages and the inventory action route are available only outside production. The order page omits email and delivery addresses. Canceling a reserved order releases its stock; fulfilling it reduces on-hand stock and updates order status. The checkout flow does not collect payment or schedule delivery.

### Payments and subscriptions

`src/lib/payments` will create Stripe Checkout Sessions using server-side product and price configuration. One-time items use payment mode; FreshBox Weekly uses subscription mode with weekly or monthly Stripe recurring prices. Signed webhook events update order/subscription state idempotently. Stripe secret and webhook keys are server-only; browser-submitted amounts are never authoritative.

All transactions use Stripe test mode. The project must never be configured with live credentials.

### Inventory and ERP

The local mock ERP behavior is backed by the shared order store. It starts with sample stock counts, reserves quantities at checkout, releases them when an order is canceled, and decrements on-hand quantities when fulfilled. `/inventory` provides a development dashboard for stock and order actions. A future ERP adapter can replace the local service; these state transitions need hosted durable storage and idempotency before multi-instance deployment.

Paid orders are synchronized to ERP with bounded retries and structured server logs. Failed payment/cancellation paths release reservations where an order reservation exists. Recurring subscription fulfillment needs an explicit per-renewal inventory policy rather than reserving only at signup.

## Proposed source layout

```text
src/app/                     App Router pages, metadata, and route handlers
src/components/              Shared accessible UI components
src/features/catalogue/      Product browsing and product detail UI
src/features/cart/            Cart UI, browser persistence, and client interaction
src/features/checkout/        Checkout states and order confirmation
src/features/inventory/       Demo dashboard
src/lib/commerce/             Shopify and mock commerce adapters
src/lib/payments/              Stripe session and webhook services
src/lib/erp/                   ERP interface and mock service
src/lib/validation/            Shared request schemas
src/lib/logging/               Structured server logging
tests/unit/                    Pricing, cart, and inventory tests
tests/api/                     Route and webhook tests
tests/e2e/                     Main purchase flow
docs/                          Architecture and operations notes
```

## Environment and secrets

See `.env.example`. Shopify and Stripe adapters remain disabled in mock mode. The Stripe publishable key may be exposed to the browser only when needed; secret keys and webhook secrets must never be imported by client components. `ORDER_STORE_PATH` can change the local mock order file location. `DATABASE_URL` is reserved for a future hosted persistence phase and is not required by local mock mode.

## Main risks and assumptions

- Shopify checkout and Stripe checkout are alternative payment owners, not one combined checkout.
- File-backed mock inventory cannot safely coordinate across serverless instances.
- Stripe and Shopify webhooks must verify signatures and handle duplicate delivery.
- A real customer account area requires an authentication provider and persisted customer data; the demo should not imply secure accounts before that work exists.
- Subscription renewals need an inventory allocation and fulfillment policy.
- Vercel deployment requires external environment variables and durable storage for meaningful order/inventory persistence.
