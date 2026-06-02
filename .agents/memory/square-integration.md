---
name: Square commerce integration
description: How Square catalog/checkout is wired in this repo, and the auth + redirect gotchas
---

# Square integration (BougieBams)

## Auth
- The Square **OAuth connector flow failed repeatedly** in this environment (dismissed / "connection failed").
- **Working approach:** user supplies a `SQUARE_ACCESS_TOKEN` secret (a PRODUCTION token). Backend reads it from env. No connector.
- API base `https://connect.squareup.com`, header `Square-Version` pinned to a dated version.

## Source-of-truth split
- **Square owns** name, price, description, category, stock. Local code owns curated images/ratings/badges keyed by **SKU** (not by Square id, which is unstable across re-syncs).
- Product identity in the frontend = Square **variation id** (used directly as the checkout `catalog_object_id`).

## Checkout redirect — security rule
- **Never** build the Square `checkout_options.redirect_url` from request headers (`Host` / `req.protocol`). That is a Host-header injection / open-redirect hole.
- **Why:** a crafted `Host` makes Square redirect the paying customer to an attacker domain; behind proxies `req.protocol` can also yield non-HTTPS and break checkout.
- **How to apply:** derive the origin from a trusted source only — prefer `PUBLIC_WEB_ORIGIN`, then `https://${REPLIT_DEV_DOMAIN}`; if neither is set, omit `redirect_url` and let Square show its own confirmation page.

## Checkout validation
- Always validate submitted variation ids against the live catalog before creating a payment link — otherwise any known id in the same Square account is purchasable. Reject unknown ids.
- Let Square compute prices server-side from `catalog_object_id` + `quantity`; never trust client-sent prices.

## Testing
- The code_execution sandbox has **no** `process.env`, so Square API probes must run via bash `node -e` (where the secret is present), not in the JS sandbox.
