---
name: Animated conic-gradient border (BorderRotate)
description: Why a rotating gradient border needs @property, and how it's wired into BougieBams tiles
---

# Rotating conic-gradient borders need `@property`

The animated gradient border (component `components/ui/animated-gradient-border.tsx`,
exported as `BorderRotate`) rotates by animating a CSS custom property
`--gradient-angle` used as the `from` angle of a `conic-gradient`.

**A keyframe that animates a bare custom property does NOT interpolate** — the
value snaps at 0%/100% and the border won't spin. You must register the property
so the browser knows it's an angle:

```css
@property --gradient-angle { syntax: "<angle>"; initial-value: 0deg; inherits: false; }
```

**Why:** unregistered custom properties are treated as plain strings, which are
not animatable. Registering with `syntax: "<angle>"` makes it interpolatable.

**How to apply:** the full animation CSS (the `@property`, `gradient-rotate`
keyframe, the `gradient-border-auto|hover|stop-hover` classes with
`animation-play-state` toggles, and a `prefers-reduced-motion` guard) lives in
`artifacts/bougiebams/src/index.css`. Snippets shared online often ship only the
keyframe and omit `@property` — add it or the effect silently fails.

Brand wiring: tiles use `animationMode="rotate-on-hover"` (static gold frame,
spins on hover) with `backgroundColor="hsl(var(--card))"` so the inner surface
follows the light/dark theme; the component's default gold palette matches the
BougieBams brand.
