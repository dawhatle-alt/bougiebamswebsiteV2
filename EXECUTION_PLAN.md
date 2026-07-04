# BougieBams — Master Execution Prompt for the Replit Agent

**How to use this document (for Darrell, not the agent):**
Paste everything below the line into the Replit Agent as a single prompt, or commit it to the repo and tell the agent "follow EXECUTION_PLAN.md." It is written for the agent to execute **phase by phase, in order**. Steps marked **[YOU — manual]** are things the agent *cannot* do (DNS, dashboards, deploys); the agent is instructed to pause and hand those to you. Do them when prompted, confirm, and let it continue.

Reminder on the workflow: the agent edits the repo in Replit → you push to GitHub → **Vercel** builds and hosts it. Supabase remains the database. So even though this plan moves the app *off* Replit's services, the Replit Agent is the tool doing the code work.

---

# AGENT INSTRUCTIONS — BougieBams build-out (Phases 0–5)

You are completing the BougieBams e-commerce app. Read this whole document first, then execute the phases **strictly in order**. Do not start a phase until the previous phase's "Done when" criteria are met and committed.

## Project context
- **Monorepo:** pnpm workspaces, Node 24, TypeScript 5.9.
- `artifacts/bougiebams` — React + Vite storefront (wouter routing, TanStack Query, framer-motion, Tailwind + shadcn/ui). Pages in `src/pages`; `CartContext` + `WishlistContext` in `src/context`; checkout call lives in `src/components/Layout.tsx`.
- `artifacts/api-server` — Express 5 API (port 5000). Routes in `src/routes/*`; libs in `src/lib/*` (`square.ts`, `objectStorage.ts`, `objectAcl.ts`, `rateLimit.ts`, `escapeHtml.ts`, `securityHeaders.ts`, `logger.ts`).
- `lib/db` — Drizzle schema (`subscribers`, `blogPosts`, `events`, `productImages`); DB is Supabase Postgres via `DATABASE_URL`.
- `lib/api-spec` — OpenAPI (currently a stub) + Orval codegen.
- `artifacts/bougiebams-mobile` — Expo app. **OUT OF SCOPE. Do not modify it.**

## Source-of-truth model (do not violate)
- **Square owns all commerce data**: catalog, SKUs, prices, categories (`TILES`, `MATS & RACKS`, `STORAGE`, `ACCESSORIES`), inventory/stock, and hosted checkout (payment links). `GET /api/products` reads live Square. **Never store price or stock locally.**
- **Supabase Postgres owns everything else**: subscribers, blog, events, per-SKU image overrides, and the new tables you will add (profiles, orders, order_items, reviews, event_registrations).
- Cart is client-side (`localStorage`). Existing welcome discount: code `BOUGIE15`, 15% off, single-use per subscriber.

## Global rules — follow these in EVERY phase
1. **Work phase by phase.** After each phase: run `pnpm run typecheck` and `pnpm run build`; confirm both pass and the app still runs and **checkout still completes end-to-end** before starting the next phase. Commit a checkpoint per phase with a clear message.
2. **Never hardcode secrets or API keys.** Read them from environment variables. If a required secret is missing, **stop and tell me exactly which secret to add** — do not invent a value or mock it silently.
3. **Extend, don't rewrite.** Preserve existing working routes, schema, and flows. Only replace code when a task explicitly says "replace."
4. **All new DB tables get Supabase Row-Level Security (RLS).** Users read only their own rows; writes that must bypass RLS use the service-role key on the server only.
5. **Schema changes** go through Drizzle in `lib/db/src/schema` + `pnpm --filter @workspace/db run push`. Note the repo's known quirks in `.agents/memory/` (drizzle-zod emits zod-v4 types — keep `lib/db` schemas refinement-free and validate in routes; `text().primaryKey()` breaks inference — use `serial` id + unique text; wouter `useLocation` omits query string — read `?param` via `useSearch`; public uploads must use the public namespace helper). Respect all of these.
6. **When a task requires a manual step from me** (DNS, a dashboard setting, a deploy), pause, print a clearly labeled **[YOU — manual]** checklist, and wait for my confirmation before continuing.
7. Keep `pnpm --filter @workspace/api-server run dev` working for local dev at every step.

---

## PHASE 0 — Re-platform off Replit onto Vercel + Supabase

**Goal:** the app runs on Vercel at `bougiebams.com`, with images on Supabase Storage and email sent directly through Resend — no Replit-specific dependencies left.

**Agent tasks**
1. **Email → direct Resend.** Add the `resend` package. Rewrite `artifacts/api-server/src/routes/email.ts` to send via the Resend SDK using `RESEND_API_KEY`, removing `@replit/connectors-sdk`. Keep the same endpoints (`/email/contact`, `/email/event-registration`), HTML escaping, and rate limits. Make the sender configurable via `EMAIL_FROM` (default a `@bougiebams.com` address) and the owner inbox via `OWNER_EMAIL`.
2. **Storage → Supabase Storage.** Replace the Replit object-storage code (`src/lib/objectStorage.ts`, `src/lib/objectAcl.ts`, `src/routes/storage.ts`, and the image-upload path in `src/routes/productImages.ts`) with Supabase Storage: create/use a public bucket for product/blog/event images, generate signed upload URLs server-side, and store the resulting public path in the existing `imagePath` columns. Update the storefront `productImageUrl()` helper in `src/data/products.ts` to build Supabase public URLs. Remove references to `PRIVATE_OBJECT_DIR` / `PUBLIC_OBJECT_SEARCH_PATHS`.
3. **Redirect origin.** In `src/routes/products.ts` `getRedirectBase()`, use `PUBLIC_WEB_ORIGIN` only and remove the `REPLIT_DEV_DOMAIN` fallback.
4. **Vercel serverless entry.** Add a Vercel-compatible handler that exports the existing Express app (e.g. an `api/` entry) plus a `vercel.json` configured for this pnpm monorepo, so the API runs as a serverless function on Vercel. Do not rewrite routes into separate functions — wrap the whole app.
5. **Kill product-data drift.** Ensure every commerce surface reads `GET /api/products`. Remove hardcoded product arrays from `src/data/products.ts` (keep only the `Product`/`ApiProduct` types and the image helper), or clearly mark any remaining local data as dev-only fallback. Verify no page renders stale local products.
6. **Docs.** Replace the empty `replit.md` with a real README (project name, run commands, stack, repo map) and commit `PRD.md` if present.

**[YOU — manual] before/after this phase**
- Create a Vercel project and import the GitHub repo; set monorepo root/build settings.
- In **Resend**: add and verify the `bougiebams.com` domain; create an API key.
- In **GoDaddy DNS**: add Resend's DKIM/SPF/DMARC records; add the A/CNAME records Vercel gives you to point the domain.
- In **Supabase**: create the Storage bucket(s); copy `SUPABASE_URL`, anon key, and service-role key.
- Add these secrets to **Replit Secrets** (dev) and **Vercel env** (prod): `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, `EMAIL_FROM`, `OWNER_EMAIL`, `PUBLIC_WEB_ORIGIN`.

**Done when:** the site deploys on Vercel at `bougiebams.com`; a test contact email delivers from `@bougiebams.com`; an admin image upload lands in Supabase Storage and renders on the storefront; checkout still completes end-to-end; `pnpm run build` passes with no Replit-specific imports remaining.

---

## PHASE 1 — Accounts (Supabase Auth), orders, confirmation email, analytics

**Goal:** ordering requires an account; every paid order is recorded locally and confirmed by email; basic analytics are flowing.

**Agent tasks**
1. **Supabase Auth in the storefront.** Add a session/auth provider. Build `/signup` and `/login` (email + password), `/account` (profile + order history), and logout. Capture profile fields (first name, last name, phone, marketing-consent checkbox) at signup.
2. **Schema.** Add Drizzle tables and push:
   - `profiles` (keyed to the Supabase auth uid): firstName, lastName, phone, marketingConsent, createdAt.
   - `orders`: userId (auth uid), email, squareOrderId, squarePaymentId, status (`pending`/`paid`/`fulfilled`/`refunded`/`cancelled`), subtotalCents, discountCents, totalCents, discountCode (nullable), timestamps.
   - `order_items`: orderId (FK), squareVariationId, sku, name, quantity, unitPriceCents.
   Add RLS: a user reads only their own `profiles`/`orders`; the server writes via service role.
3. **Gate checkout behind auth.** Reject `POST /api/checkout` for unauthenticated requests; the storefront redirects to `/login` if the user isn't signed in. Pass the userId/email in the checkout request, and **before** creating the Square payment link, create a local `pending` order with the user and line items.
4. **Square webhook → order capture.** Add `POST /api/webhooks/square` that **verifies the Square signature** (`SQUARE_WEBHOOK_SIGNATURE_KEY`) and rejects invalid requests. On payment/order completion, mark the matching local order `paid`, persist `order_items`, and send an **order-confirmation email** via Resend.
5. **Order history APIs + UI.** Add `GET /api/account/orders` (auth) and `GET /api/admin/orders` (admin bearer). Show order history in `/account` and an orders view in the Admin panel.
6. **Analytics.** Add lightweight event tracking (page_view, add_to_cart, begin_checkout, purchase, signup) and surface the §1 PRD metrics.

**[YOU — manual]**
- In **Supabase → Auth**: enable email/password, set redirect URLs, and customize the confirmation/reset email templates.
- In **Square → Webhooks**: create a subscription to `https://bougiebams.com/api/webhooks/square`, subscribe to payment/order events, and copy the signature key into `SQUARE_WEBHOOK_SIGNATURE_KEY` (Replit Secrets + Vercel env).

**Done when:** a new visitor must create an account before checking out; completing a Square payment creates a local `paid` order with items and sends a confirmation email; the customer sees the order in `/account`; Admin can look it up.

---

## PHASE 1B — Zone-based shipping + drop-ship fulfillment (mats from Atlanta)

**Goal:** customers pay product + shipping in one Square transaction using zone rates from the Atlanta origin; paid drop-ship orders automatically notify the manufacturer with the customer's shipping address. Depends on Phase 1 (accounts, orders, webhook).

**Context:** mahjong mats are drop-shipped by a manufacturer in Atlanta, GA directly to the customer. The manufacturer's exact shipping cost is not known at checkout, so the customer is charged a **zone-based rate** controlled by the business; the manufacturer settles separately by invoice. The current checkout creates the Square payment link before any address is known — this phase adds an address step before link creation.

**Agent tasks**
1. **Schema.** Add and push, with RLS where user data is involved:
   - `shipping_zones`: zoneName, states (array of 2-letter codes), customerRateCents, estimatedCostCents, active. Seed with placeholder zones (Southeast / Central / Northeast / West) to be tuned once real carrier rates are known.
   - `dropship_skus`: sku (unique), origin (default `ATL`), notes — flags which SKUs are drop-shipped (same pattern as `product_images`).
   - Extend `orders` with: shippingState, shippingAddress (JSON), shippingRateCents, shippingZone, fulfillmentType (`dropship`/`standard`/`mixed`).
2. **Checkout address step.** Before creating the Square payment link, collect the shipping address in-app (pre-fill from the user's profile; save it back for next time). Look up the zone by state and add a **"Shipping" line item** (ad-hoc line item with `base_price_money`) to the Square payment link so one transaction covers product + shipping. Block checkout with a clear message if the state maps to no active zone.
3. **Persist shipping on the order.** Store the address, zone, and shipping charge on the local `pending` order created in Phase 1.
4. **Manufacturer drop-ship notification.** Extend the Square webhook: when an order flips to `paid` and contains any `dropship_skus`, send the manufacturer a fulfillment email via Resend (`MANUFACTURER_EMAIL` env var) containing order number, drop-ship line items, and the customer's name + shipping address. CC `OWNER_EMAIL`.
5. **Admin.** CRUD for `shipping_zones` and `dropship_skus`; show shipping charge, zone, and margin (customerRateCents − estimatedCostCents) on the Admin order view.

**[YOU — manual]**
- Get from the manufacturer: package dimensions + weight for each mat SKU, and their rough shipping cost per zone/region; enter real rates into the zone table via Admin.
- Add `MANUFACTURER_EMAIL` to Replit Secrets + Vercel env.

**Done when:** a customer entering a shippable state sees the correct zone rate, pays product + shipping in one Square checkout, the local order records address/zone/charge, and a paid order containing mats automatically emails the manufacturer the fulfillment details.

---

## PHASE 2 — Reviews (verified purchase), SEO, CRO

**Goal:** real, moderated, verified-purchase reviews replace hardcoded ratings; the site is SEO-ready.

**Agent tasks**
1. **Schema.** Add `reviews` (productSku, userId, orderId FK, rating 1–5, title, body, status `pending`/`approved`/`rejected`, createdAt) + RLS; push.
2. **APIs.** `POST /api/reviews` (auth; **verified purchase** — the reviewer must have a `paid` order containing that product); `GET /api/products/:sku/reviews` (approved only); `GET`/`PUT /api/admin/reviews` for moderation.
3. **Storefront.** On the product detail page, show approved reviews + aggregate rating, and show a review form only to users who purchased the item. **Replace the hardcoded `rating`/`reviewCount`** in `src/data/products.ts` with real aggregates.
4. **Admin.** Add a review moderation queue (approve/reject).
5. **SEO.** Per-page `<title>`/meta/Open-Graph tags; `Product` and `Article` JSON-LD structured data; `sitemap.xml`; canonical URLs.
6. **Abandoned cart.** For logged-in users with a non-empty cart, send a reminder email via Resend after a defined delay.

**Done when:** a verified buyer can submit a review that appears after admin approval; product pages show real aggregate ratings; pages carry correct meta + structured data; `sitemap.xml` resolves.

---

## PHASE 3 — Events: free RSVP + paid via Square

**Goal:** events can be free or paid; registrations are tracked and never oversell.

**Agent tasks**
1. **Schema.** Add `event_registrations` (eventId FK, userId, email, status `registered`/`cancelled`, paid bool, squarePaymentId nullable) + RLS; push.
2. **Registration endpoint.** `POST /api/events/:id/register` (auth): free events (no `priceCents`) → create the registration, **decrement `events.spotsLeft`**, send a confirmation email; paid events (`priceCents` set) → create a Square payment link and register **only after** webhook-confirmed payment.
3. **Webhook.** Extend the Phase-1 Square webhook to finalize paid event registrations.
4. **Storefront.** Events page RSVP/registration gated behind auth; show spots-left; handle sold-out gracefully.
5. **Admin.** Per-event registration roster.

**Done when:** a free RSVP decrements spots and emails a confirmation; a paid event only registers after successful Square payment; Admin sees the roster.

---

## PHASE 4 — Marketing & admin maturity

**Goal:** flexible promos, role-based admin, and a real API contract.

**Agent tasks**
1. **Coupon engine.** Add a `coupons` table (code, type `percent`/`fixed`, value, expiresAt, maxRedemptions, timesRedeemed, active). At checkout, replace the hardcoded `BOUGIE15` special-case with a coupon lookup (seed `BOUGIE15` as a coupon so nothing breaks). Add Admin CRUD for coupons.
2. **Harden admin.** Move admin access to Supabase Auth with a role/claim (or an explicit allowlist), replacing the shared-password bearer token. Add an `admin_audit_log` table recording admin mutations.
3. **Real API contract.** Regenerate `lib/api-spec/openapi.yaml` to cover all live endpoints, run `pnpm --filter @workspace/api-spec run codegen`, and adopt the generated typed client in the storefront where practical.

**Done when:** coupons are managed in Admin and enforced at checkout; admin access is role-based with an audit trail; the OpenAPI spec matches the live API and the typed client builds.

---

## PHASE 5 — Quality: tests + CI

**Goal:** the critical paths are protected against regressions.

**Agent tasks**
1. **Tests.** Add API-level tests for: checkout, webhook→order creation, verified-purchase review submission, and event registration (free + paid). Add a few storefront flow tests (signup→checkout, review submission).
2. **CI.** Add a GitHub Actions workflow that runs install → `pnpm run typecheck` → `pnpm run build` → tests on every pull request.

**Done when:** `pnpm run typecheck`, `pnpm run build`, and the test suite all pass in CI on every PR.

---

## Consolidated secrets / env checklist
Existing: `DATABASE_URL`, `SQUARE_ACCESS_TOKEN`, `ADMIN_PASSWORD`, `PUBLIC_WEB_ORIGIN`, `NODE_ENV`, `LOG_LEVEL`.
Add during build: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, `EMAIL_FROM`, `OWNER_EMAIL`, `SQUARE_WEBHOOK_SIGNATURE_KEY`.
Remove: `REPLIT_DEV_DOMAIN`, `PRIVATE_OBJECT_DIR`, `PUBLIC_OBJECT_SEARCH_PATHS`.

## Final acceptance (whole project)
A signed-in customer can browse live Square products, check out and pay via Square, receive a confirmation email, see the order in their account, and leave a verified review; the owner can manage content, coupons, events, and moderation in a role-based admin; free and paid events work; the app runs on Vercel with Supabase (DB + Auth + Storage) and Resend; and CI is green.
