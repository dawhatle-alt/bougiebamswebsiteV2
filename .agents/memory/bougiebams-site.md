---
name: BougieBams site integration patterns
description: Key lessons from wiring the bougiebams frontend to the API server and fixing image/context issues
---

# BougieBams Site Patterns

## @assets alias fix
`@assets` in `vite.config.ts` was broken (pointed to `../../attached_assets`). Fixed to `path.resolve(import.meta.dirname, "src", "assets")`. But the image files in `src/assets/images/` were 69-byte stubs — replaced with Unsplash URLs in `src/data/images.ts` (module-level string constants, not imports).

**Why:** Image imports of stub files cause silent broken-image icons with no console errors.

**How to apply:** When images show as broken with no 404 in console, check file size first.

## API proxy config
API server runs on port 8080. Vite dev server needed a proxy to forward `/api` requests:
```js
proxy: { "/api": { target: "http://localhost:8080", changeOrigin: true } }
```
Without this, `fetch('/api/products')` hits Vite and gets 404.

**Why:** Vite dev server intercepts all requests; without proxy it never reaches Express.

## CartContext / WishlistContext interfaces
Layout.tsx, Shop.tsx, ProductDetail.tsx expect specific interfaces:
- CartContext: `{ items, totalItems, subtotal, isOpen, setIsOpen, addItem, removeItem, updateQuantity, clearCart }`
- WishlistContext: `{ items, count, isOpen, setIsOpen, add, remove, toggle, has, isSaved, clearWishlist }`

**Why:** Stub contexts (addToCart/removeFromCart pattern) cause runtime type errors.

## API server dev script
`dev` script = `build && start` (NOT watch mode). Changes to route files require rebuilding. The compiled `dist/index.mjs` served from port 8080 doesn't update until workflow restart.

## localProducts fallback
When API returns empty array (`[]`), `useProducts` falls back to `localProducts` from `products.ts`. Import must be explicit: `import { ..., localProducts } from "@/data/products"`.

## Route naming
`/build-your-set` nav link required adding a second route alias in App.tsx — the original route was `/build`.
