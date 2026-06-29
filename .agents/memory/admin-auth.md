---
name: Admin auth pattern
description: BougieBams admin auth uses Replit OIDC session cookies, not Bearer tokens
---

# Admin Auth Pattern

Admin routes use `requireAdmin` middleware (session cookie, not Bearer token). The middleware checks `req.isAuthenticated()` — set by the Replit OIDC auth flow — then optionally validates against `ADMIN_USER_IDS` env var (comma-separated Replit user IDs).

There is also a lower-privilege `requireAuth` for routes that just need authentication (e.g. registration checkout) without requiring admin status.

**Frontend**: All admin fetch calls use `credentials: "include"`. Admin page shows a "Sign in with Replit" button for unauthenticated users.

**Why:** HMAC Bearer tokens were rejected by code review as insecure and non-standard for a Replit-hosted site. Cookie-session OIDC is the correct pattern.

**How to apply:** New admin routes use `requireAuth` + `requireAdmin`. New auth-only routes use `requireAuth`. All frontend admin fetches include `credentials: "include"`.
