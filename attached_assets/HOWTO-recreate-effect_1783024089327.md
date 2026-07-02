# Little Curios — how to recreate the “floating product” effect

There are **two independent parts**:

1. **The image** — each object floats in a soft oval “pool” of its own
   original photo background (the vignette). This is baked into the PNGs I
   already gave you, so you can just upload those. If you want your app to do
   it to *new* photos, see “Image prep” at the bottom.
2. **The stage + motion** — the tinted background, soft shadow, gentle float,
   mouse-tilt, and cursor spotlight. This is pure CSS + a few lines of JS,
   below.

---

## Option A — tell the Replit AI agent

Paste this prompt:

> Build a responsive product grid of cards. Each card:
> - has `overflow: hidden`, `border-radius: 26px`, and a **radial-gradient
>   background** (light center at 50% 32% fading to a slightly deeper tint of
>   the same hue at the edges).
> - centers a transparent product PNG that **gently floats** up and down
>   (CSS keyframe, ~6s ease-in-out, infinite).
> - has a **soft elliptical shadow** blurred underneath the object.
> - **tilts in 3D toward the mouse** (rotateX/rotateY via CSS variables set on
>   mousemove) and shows a **soft radial “spotlight”** that follows the cursor
>   (a `mix-blend-mode: soft-light` white radial-gradient overlay positioned
>   at the cursor).
> - resets tilt/spotlight smoothly on mouseleave.
> Use per-product accent colors for the background gradient. Product name in a
> serif font, material in small uppercase letter-spaced text, centered below.

---

## Option B — drop-in code

### HTML (one card)
```html
<div class="stage" data-tilt>
  <div class="spotlight"></div>
  <div class="pedestal">
    <div class="floor-shadow"></div>
    <img class="product" src="/images/elephant.png" alt="Baby Elephant">
  </div>
  <div class="label">
    <h3>Baby Elephant</h3>
    <span>Hand-Painted Resin</span>
  </div>
</div>
```

### CSS
```css
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 26px;
}

.stage {
  position: relative;
  border-radius: 26px;
  overflow: hidden;
  perspective: 1000px;
  /* per-item: light center -> deeper tint at edge (see palette below) */
  background: radial-gradient(125% 120% at 50% 32%,
              #fdeef4 0%, #f1d6e2 62%, #e6c1d2 100%);
  box-shadow: 0 22px 55px -22px rgba(60,20,45,.45),
              inset 0 0 0 1px rgba(255,255,255,.5);
  transition: transform .3s ease, box-shadow .3s ease;
}
.stage:hover { transform: translateY(-5px); }

/* cursor spotlight */
.spotlight {
  position: absolute; inset: 0 0 88px 0;
  pointer-events: none; z-index: 3;
  mix-blend-mode: soft-light;
  background: radial-gradient(circle at var(--mx,50%) var(--my,30%),
              rgba(255,255,255,.6), transparent 55%);
}

/* the object + its tilt */
.pedestal {
  position: relative; z-index: 2;
  height: 302px;
  display: flex; align-items: center; justify-content: center;
  transform-style: preserve-3d;
  transform: rotateX(var(--rx,0deg)) rotateY(var(--ry,0deg));
  transition: transform .3s ease-out;
}
.product {
  max-height: 236px; max-width: 264px; object-fit: contain;
  transform: translateZ(46px);
  filter: drop-shadow(0 22px 18px rgba(120,70,95,.24));
  animation: floatY 6s ease-in-out infinite;
}
@keyframes floatY {
  0%,100% { transform: translateZ(46px) translateY(0); }
  50%     { transform: translateZ(46px) translateY(-13px); }
}

/* grounding shadow */
.floor-shadow {
  position: absolute; bottom: 50px; left: 50%;
  transform: translateX(-50%);
  width: 150px; height: 24px; border-radius: 50%;
  background: radial-gradient(ellipse, rgba(90,50,70,.20), transparent 70%);
  filter: blur(4px);
}

.label { position: relative; z-index: 4; text-align: center; padding: 0 26px 28px; }
.label h3   { font-family: 'Cormorant Garamond', serif; font-size: 27px; margin: 0; color:#4a2f3d; }
.label span { font-size: 11px; text-transform: uppercase; letter-spacing: .22em; color:#9a7186; }
```

### JS (tilt + spotlight)
```js
document.querySelectorAll('[data-tilt]').forEach(card => {
  card.addEventListener('mousemove', e => {
    const r = card.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    card.style.setProperty('--ry', ((px - .5) * 15).toFixed(2) + 'deg');
    card.style.setProperty('--rx', ((.5 - py) * 12).toFixed(2) + 'deg');
    card.style.setProperty('--mx', (px * 100).toFixed(1) + '%');
    card.style.setProperty('--my', (py * 100).toFixed(1) + '%');
  });
  card.addEventListener('mouseleave', () => {
    card.style.setProperty('--ry', '0deg');
    card.style.setProperty('--rx', '0deg');
    card.style.setProperty('--mx', '50%');
    card.style.setProperty('--my', '30%');
  });
});
```
Load the serif font once: add to your `<head>`
`<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@600&display=swap" rel="stylesheet">`

---

## Per-item color palette

Each stage uses `radial-gradient(125% 120% at 50% 32%, C0 0%, C1 62%, C2 100%)`
and a matching shadow color.

| item      | C0 (center) | C1 (mid) | C2 (edge) | shadow            |
|-----------|-------------|----------|-----------|-------------------|
| elephant  | #fdeef4 | #f1d6e2 | #e6c1d2 | rgba(90,50,70,.20)   |
| dragon    | #fdf6e6 | #f3e2b6 | #e9d199 | rgba(110,85,30,.20)  |
| purses    | #f6f2fb | #e6ddf2 | #d8cfe9 | rgba(70,60,110,.18)  |
| octopus   | #ecf8fb | #d2ebf1 | #bfe2ec | rgba(30,90,105,.18)  |
| butterfly | #f5f3e8 | #e6e1ca | #dad3b4 | rgba(90,85,40,.18)   |
| flamingo  | #ffeff5 | #ffd6e4 | #ffc2d6 | rgba(150,50,90,.18)  |
| hearts    | #fbf0e8 | #f3ddc9 | #ecd0b8 | rgba(130,80,40,.18)  |
| ducks     | #fdf8ee | #f2e7d0 | #e9dcc0 | rgba(110,90,40,.20)  |
| vases     | #f4f2f9 | #e3e2ef | #d6d7e8 | rgba(70,60,110,.16)  |
| gnomes    | #eff7fc | #d8ebf5 | #c6dfee | rgba(30,70,100,.18)  |

---

## Image prep (only if you want the app to process NEW photos)

The “pool” look = keep the photo, fade it to transparent in a soft oval:

1. Draw the photo to a `<canvas>`.
2. For each pixel, compute distance from the oval center (normalized by the
   oval’s radii). Keep alpha 255 inside ~72% of the radius, then ease it to 0
   at the edge (smoothstep). This leaves the object sitting in a soft halo of
   its own background.
3. Auto-crop to the non-transparent bounds and export a PNG.

If your product photos are shot on a plain, evenly-lit backdrop, this oval
fade is all you need — no true background removal. For busy backgrounds you’d
want a real cutout (e.g. a `remove.bg`-style API) instead.
