---
name: Animated conic-gradient border (BorderRotate)
description: Rotating gradient border must use transform:rotate, not animated @property, in the BougieBams Vite/Tailwind build
---

# Rotating conic-gradient borders: use `transform: rotate()`, NOT an animated `@property`

The animated gradient border (component `components/ui/animated-gradient-border.tsx`,
exported as `BorderRotate`) wraps each tile (Home collections + bestsellers, Shop,
Blog, Events).

**Animating a registered `@property --gradient-angle` (used as the `from` angle of a
`conic-gradient`) silently fails in this app's Vite + Tailwind v4 build.** The angle
does not interpolate at runtime, so the border renders but never spins — multiple
"it's not animating" reports traced back to exactly this.

**Why:** even though the `@property` registration is technically correct CSS, the
value does not animate here (build pipeline / browser interaction). Tuning gradient
stops or widening the border does nothing because nothing is moving.

**How to apply / the working approach:**
- Render a non-interactive overlay ring on top of the children: an absolutely
  positioned `div.gb-ring` (`pointer-events:none`, `padding:borderWidth`,
  `overflow:hidden`, CSS `mask` with `mask-composite:exclude` to cut out the center
  so only the border band shows).
- Inside it, a `div.gb-spinner` square (`width:200%; aspect-ratio:1`, centered with
  `translate(-50%,-50%)`) carries a static `conic-gradient` and is rotated by a
  `@keyframes gb-spin { transform: translate(-50%,-50%) rotate(360deg) }` animation.
  `transform`-based rotation animates reliably everywhere.
- Mode classes on the spinner: `spin-auto` (always), `spin-on-hover`,
  `spin-stop-on-hover`; a `prefers-reduced-motion` guard sets `animation:none`.

**Verifying rotation from static screenshots:** make the conic gradient ASYMMETRIC
(one bright accent). A symmetric two-highlight gradient (bright spots 180° apart)
looks identical every half-turn, so two time-separated screenshots appear unchanged
even while spinning — a false negative.

Brand wiring: tiles use `animationMode="auto-rotate"`, `borderWidth={3}`,
`borderRadius={12}`, `backgroundColor="hsl(var(--card))"`; default gold palette
(primary `#584827`, secondary `#c7a03c`, accent `#f9de90`) matches the brand.
