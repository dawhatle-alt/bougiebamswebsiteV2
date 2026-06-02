---
name: wouter query reactivity
description: How to read URL query params reactively in wouter (v3) so same-path navigation updates state
---

In wouter v3, `useLocation()` returns only the pathname — the query string is NOT part of it. Reading `window.location.search` once at render is also non-reactive: navigating from `/shop?category=A` to `/shop?category=B` keeps the same pathname, so neither approach re-renders or re-syncs derived state.

**Rule:** to react to query-string changes, use `useSearch()` (raw search string) or `useSearchParams()` from `wouter`, then parse with `URLSearchParams`. Sync local state in a `useEffect` keyed on the derived param.

**Why:** the BougieBams header SearchDialog links popular terms to `/shop?category=...`. Shop initialised `activeCategory` from `window.location.search` only on mount, so picking a category while already on `/shop` changed the URL but not the grid.

**How to apply:** any wouter page that filters/branches on a query param must derive it from `useSearch`/`useSearchParams`, not from `useLocation` or a one-time `window.location.search` read.
