---
name: BougieBams site integration patterns
description: Durable lessons from wiring the bougiebams frontend to the API server
---

# BougieBams Site Patterns

## Broken images with no 404 in console
Image imports of stub/placeholder files fail silently (no console error). When images show broken with no network error, check file size first. Use external URLs (Unsplash etc.) or real image files rather than empty stubs.

## API proxy
The Vite dev server proxies `/api` to port 8080 (the Express API server). This is already configured — do not change the target port or remove the proxy.

## API server build cycle
The api-server dev script runs `build && start` (not watch mode). After any route change, the workflow must be restarted for changes to take effect.

## OAuth sign-in flow — known failure modes
- `/api/auth/me` must have `Cache-Control: no-store` — without it, the browser returns a stale 304 `{user:null}` response after login, making the app think auth failed and auto-triggering another login.
- `login()` should use `window.location.pathname` as `returnTo`, not `BASE_URL` — otherwise the user always lands on `/` after OAuth instead of the page they came from.
- `getOrigin(req)` must handle comma-separated or array `x-forwarded-proto`/`x-forwarded-host` headers — multi-proxy chains produce e.g. `"https, https"` which breaks the PKCE `callbackUrl` match and causes a silent catch → redirect to `/api/login` loop.
- Callback failure branches must redirect to `/?auth_error=<type>` NOT back to `/api/login` — the latter creates an infinite OAuth redirect loop (blank screen). Log the error before redirecting.

**Why:** All four of these issues combine to produce a "blank screen after sign-in" symptom. Root cause is always either stale cache, callbackUrl mismatch, or infinite redirect loop.

## Checkout flow pattern
Frontend event registration uses `POST /api/registrations/checkout` with `credentials: "include"`. On 401, show a sign-in prompt. On success with a `url`, redirect via `window.location.href`. Never show success on a non-OK HTTP response.

**Why:** Earlier code always set success state even on fetch failure — code review rejected this as deceptive UX and a sign that the API contract wasn't being followed.
