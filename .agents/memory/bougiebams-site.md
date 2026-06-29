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

## Checkout flow pattern
Frontend event registration uses `POST /api/registrations/checkout` with `credentials: "include"`. On 401, show a sign-in prompt. On success with a `url`, redirect via `window.location.href`. Never show success on a non-OK HTTP response.

**Why:** Earlier code always set success state even on fetch failure — code review rejected this as deceptive UX and a sign that the API contract wasn't being followed.
