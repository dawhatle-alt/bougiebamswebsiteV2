---
name: Stripe registration flow
description: Event registration checkout via Stripe — auth requirements, raw body pattern, and IDOR prevention
---

# Stripe Event Registration Flow

## Auth requirement
`POST /api/registrations/checkout` requires session authentication (`requireAuth` middleware). Anonymous registration is not permitted. Frontend must detect 401 and show a sign-in prompt rather than silently succeeding.

**Why:** Code review rejected anonymous checkout as a security gap; registrations must be tied to an authenticated user identity.

## Raw body for webhook verification
`express.json()` in `app.ts` uses a `verify` callback to capture the raw Buffer on every request (`req.rawBody`). The Stripe webhook handler reads `req.rawBody` directly — no separate body-buffering middleware.

**Why:** Once `express.json()` parses the body, the stream is consumed. A separate middleware can't re-read it. The `verify` callback fires before parsing and is the correct interception point.

**How to apply:** Any webhook endpoint needing the raw body should read `req.rawBody`. Do not add a separate body-capture middleware.

## IDOR prevention on registration detail endpoint
Any route that fetches a registration by ID must check `reg.userId === req.user.id || isAdmin(req)`. Because `requireAuth` already guarantees the user is authenticated, never use `|| !req.isAuthenticated()` as the fallback — it is always false and creates an open IDOR.
