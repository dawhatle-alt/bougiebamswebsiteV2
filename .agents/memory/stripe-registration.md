---
name: Stripe registration flow
description: Event registration checkout via Stripe for BougieBams
---

# Stripe Event Registration Flow

Routes in `artifacts/api-server/src/routes/stripe.ts`, registered at `/api` prefix.

**POST /api/registrations/checkout**
- Body: `{ eventId, name, email, notes? }`
- Creates pending registration row (status="pending")
- If priceCents > 0: creates Stripe checkout session, updates registration with paymentSessionId, returns `{ url: session.url }`
- If free: immediately marks status="confirmed", decrements spotsLeft, returns success URL

**POST /api/webhooks/stripe**
- Verifies Stripe signature against `STRIPE_WEBHOOK_SECRET`
- On `checkout.session.completed`: finds registration by metadata.registrationId, sets status="confirmed", decrements event.spotsLeft using `sql\`GREATEST(0, ...)\``
- Uses inline `captureRawBody` middleware to buffer request body before JSON parsing

**DB**: registrations table has status (default "confirmed"), paymentSessionId, referralCode, userId columns added. waitlist table added separately.

**Why:** Proper payment-gated event registration with atomic spot decrement.
