Design luxury, high-end interfaces that communicate quality, exclusivity, and craftsmanship. Use this skill when building premium product pages, luxury brand sites, high-ticket SaaS, fashion/jewelry e-commerce, or any interface where the design itself must signal premium value.

## The Premium Aesthetic

Premium design is defined by restraint, precision, and intentional detail. It is never loud. It communicates value through:
- **Negative space** — what you leave out is as important as what you include
- **Material quality** — surfaces that feel like marble, brushed metal, or fine paper
- **Typographic authority** — type that commands attention without shouting
- **Controlled color** — near-monochromatic palettes with one precise accent
- **Micro-precision** — every pixel, every spacing value, every transition is deliberate

## Color Systems

### Obsidian & Gold (dark luxury)
```css
:root {
  --bg:        #0a0a0a;
  --surface:   #111111;
  --surface-2: #1a1a1a;
  --border:    #2a2a2a;
  --text:      #f5f5f0;
  --muted:     #666660;
  --gold:      #c9a84c;
  --gold-light: #e8c97a;
}
```

### Ivory & Charcoal (light luxury)
```css
:root {
  --bg:        #fafaf8;
  --surface:   #f5f5f2;
  --border:    #e8e8e4;
  --text:      #0f0f0e;
  --muted:     #888884;
  --accent:    #1a1a1a;
  --accent-2:  #8b7355;  /* warm bronze */
}
```

### Midnight Navy (refined dark)
```css
:root {
  --bg:        #080c14;
  --surface:   #0e1420;
  --border:    #1e2840;
  --text:      #e8eaf0;
  --muted:     #5a6080;
  --accent:    #c0a870;  /* champagne gold */
}
```

## Typography

Premium type is authoritative and refined:

```css
/* Primary: high-contrast serif with optical sizing */
font-family: 'Cormorant Garamond', 'EB Garamond', 'Freight Display', serif;
font-optical-sizing: auto;

/* Secondary: geometric sans, tight tracking */
font-family: 'Futura', 'Jost', 'Montserrat', sans-serif;
letter-spacing: 0.08em;
text-transform: uppercase;

/* Body: readable, elegant */
font-family: 'Libre Baskerville', 'Crimson Pro', serif;
```

Typography rules:
- Headlines: large (80–160px), light weight (300), generous tracking
- Labels/nav: small caps or uppercase, wide tracking (0.15–0.25em)
- Body: 16–18px, 1.8 line height, never compressed
- Never use more than 2 typefaces

## Spacing & Layout

```css
/* Premium uses a wider base unit */
--space-xs:  8px;
--space-sm:  16px;
--space-md:  32px;
--space-lg:  64px;
--space-xl:  120px;
--space-2xl: 200px;

/* Minimal radius — premium is sharp or very subtly rounded */
--radius-sm: 2px;
--radius-md: 4px;
--radius-lg: 8px;
/* Never pill-shaped buttons in luxury contexts */
```

## Material Effects

### Gold shimmer
```css
.gold-text {
  background: linear-gradient(135deg, #c9a84c 0%, #e8c97a 40%, #c9a84c 60%, #a07830 100%);
  background-size: 200% auto;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  animation: shimmer 4s linear infinite;
}
@keyframes shimmer {
  to { background-position: 200% center; }
}
```

### Frosted glass surface
```css
.glass-surface {
  background: rgba(255, 255, 255, 0.04);
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  border: 1px solid rgba(255, 255, 255, 0.08);
}
```

### Brushed metal
```css
.brushed-metal {
  background:
    repeating-linear-gradient(
      90deg,
      transparent,
      transparent 2px,
      rgba(255,255,255,0.015) 2px,
      rgba(255,255,255,0.015) 4px
    ),
    linear-gradient(180deg, #2a2a2a 0%, #1a1a1a 100%);
}
```

### Marble texture
```css
.marble {
  background-color: #f5f5f0;
  background-image:
    url("data:image/svg+xml,..."); /* SVG turbulence filter */
  filter: contrast(1.1) brightness(1.05);
}
```

## Component Patterns

### Premium button
```css
.btn-premium {
  background: transparent;
  color: var(--text);
  border: 1px solid var(--border);
  padding: 14px 40px;
  font-family: 'Jost', sans-serif;
  font-size: 11px;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  transition: all 0.4s ease;
  position: relative;
  overflow: hidden;
}
.btn-premium::after {
  content: '';
  position: absolute;
  inset: 0;
  background: var(--text);
  transform: scaleX(0);
  transform-origin: left;
  transition: transform 0.4s cubic-bezier(0.77, 0, 0.175, 1);
  z-index: -1;
}
.btn-premium:hover {
  color: var(--bg);
}
.btn-premium:hover::after {
  transform: scaleX(1);
}
```

### Product showcase card
```css
.product-card {
  position: relative;
  overflow: hidden;
  background: var(--surface);
  border: 1px solid var(--border);
}
.product-card img {
  transition: transform 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94);
}
.product-card:hover img {
  transform: scale(1.04);
}
.product-card .overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 50%);
  opacity: 0;
  transition: opacity 0.4s ease;
}
.product-card:hover .overlay {
  opacity: 1;
}
```

## Motion Language

Premium motion is slow, deliberate, and smooth:
- Duration: `0.6–1.2s` for major transitions
- Easing: `cubic-bezier(0.77, 0, 0.175, 1)` (sharp ease-in-out) or `cubic-bezier(0.25, 0.46, 0.45, 0.94)` (ease-out)
- Entrance: elements slide in from below (`translateY(30px) → 0`) with fade
- Hover: slow scale (`1.03–1.05`), never bouncy
- Never use spring physics — premium is controlled, not playful

## What to Avoid

- Bright, saturated colors (except as a single precise accent)
- Rounded pill buttons
- Drop shadows that look like Bootstrap defaults
- Stock photography with white backgrounds
- Gradient text on every heading
- Animations faster than 0.4s
- More than 2 fonts
- Cluttered layouts — if in doubt, remove it
