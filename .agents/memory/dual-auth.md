---
name: Dual auth pattern
description: How Supabase shopper auth and Replit admin OIDC auth coexist in the API server and frontend
---

# Dual Auth Pattern

## The rule
Two auth systems run in parallel without conflict:
- **Shoppers**: Supabase email/password → `Authorization: Bearer <jwt>` header → `injectShopperUser` middleware sets `req.shopperUser`
- **Admins**: Replit OIDC → session cookie (`credentials:"include"`) → passport sets `req.user` / `req.isAuthenticated()`

`requireAnyAuth` passes if either is present. `requireAdmin` / `requireAuth` still guard admin-only routes.

**Why:** Admins use Replit SSO (no account creation needed), shoppers need self-service email/password signup. Keeping them separate avoids mixing identity providers and lets admin routes stay locked to Replit accounts.

**How to apply:**
- `injectShopperUser` runs globally in `app.ts` (after passport middleware), silently parses JWT, never throws
- Routes that accept both: use `requireAnyAuth`; extract userId as `req.shopperUser?.id ?? req.user?.id`
- Frontend: always send `Authorization: Bearer ${accessToken}` when `shopperAuthenticated && accessToken`; also send `credentials:"include"` so admin cookies still work
- IDOR guard: always check `userId === req.user?.id || req.isAdmin` — same pattern as before
- Secret: `SUPABASE_JWT_SECRET` must be set for JWT verification; `SUPABASE_URL` + `SUPABASE_ANON_KEY` injected into Vite build via `define` block → exposed as `import.meta.env.VITE_SUPABASE_*`

## Key files
- `artifacts/api-server/src/middleware/auth.ts` — `injectShopperUser`, `requireAnyAuth`, `requireShopperAuth`
- `artifacts/api-server/src/routes/account.ts` — shopper account GET/PUT
- `artifacts/bougiebams/src/context/SupabaseAuthContext.tsx` — `useSupabaseAuth()` hook
- `artifacts/bougiebams/src/pages/Login.tsx`, `Signup.tsx`, `Account.tsx`
- `artifacts/bougiebams/vite.config.ts` — `define` block for Supabase env injection
