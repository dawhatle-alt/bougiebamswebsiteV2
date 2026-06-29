---
name: Admin auth pattern
description: BougieBams admin auth uses Replit OIDC session cookies, not Bearer tokens
---

# Admin Auth Pattern

`requireAdmin` middleware (artifacts/api-server/src/middleware/auth.ts) checks `req.isAuthenticated()` — set by Passport.js Replit OIDC strategy — NOT a Bearer token.

Optional `ADMIN_USER_IDS` env var (comma-separated Replit user IDs) restricts access further.

**Frontend**: All admin fetch calls use `credentials: "include"` (no Authorization header). Admin page redirects unauthenticated users to `/api/login?returnTo=/admin`.

**Why:** HMAC Bearer tokens were removed after code review rejected the approach as insecure and non-standard for a Replit-hosted site.

**How to apply:** Any new admin route must use `requireAdmin` middleware. Any new admin fetch in the frontend must include `credentials: "include"`.
