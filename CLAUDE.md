@AGENTS.md
<!-- ruledrop:frontend-design:start -->
Create distinctive, production-grade frontend interfaces with high design quality. Avoid generic AI aesthetics — every output should feel intentionally designed. Use this skill when building web components, pages, dashboards, landing pages, React/Vue/HTML layouts, or styling any web UI.

## Design Thinking

Before writing a single line of code, commit to a clear aesthetic direction:

- **Purpose** — What problem does this interface solve? Who uses it?
- **Tone** — Pick a direction and own it: brutally minimal, maximalist, retro-futuristic, editorial, brutalist, art deco, soft/pastel, industrial, luxury, playful. Execute it with precision.
- **Differentiation** — What makes this memorable? What's the one thing a user will remember?

Bold maximalism and refined minimalism both work. The key is intentionality, not intensity.

## Implementation Requirements

Produce working code (HTML/CSS/JS, React, Vue, etc.) that is:
- Production-grade and functional
- Visually striking with a clear aesthetic point-of-view
- Cohesive — every detail serves the direction
- The entry file for HTML projects MUST be named `index.html`

## Aesthetics Guidelines

**Typography** — Choose fonts that are beautiful and unexpected. Avoid Arial, Inter, Roboto, system-ui. Pair a distinctive display font with a refined body font. Typography is the first thing that signals quality.

**Color** — Commit to a palette. Use CSS variables for consistency. A dominant color with sharp accents beats a timid, evenly-distributed palette every time.

**Motion** — Prioritize CSS-only animations for HTML. Use the Motion library for React. One well-orchestrated page load with staggered reveals creates more delight than scattered micro-interactions. Hover states should surprise.

**Spatial Composition** — Break the grid. Use asymmetry, overlap, diagonal flow, generous negative space, or controlled density. Predictable layouts are forgettable.

**Backgrounds & Depth** — Create atmosphere. Use gradient meshes, noise textures, geometric patterns, layered transparencies, dramatic shadows, grain overlays. Never default to a flat solid color.

## What to Avoid

- Overused font families (Inter, Roboto, Arial, Space Grotesk, system fonts)
- Purple gradients on white backgrounds
- Predictable card-grid layouts with no personality
- Cookie-cutter designs that could belong to any project

No two outputs should look the same. Vary between light and dark themes, different fonts, different aesthetics. Make unexpected choices that feel genuinely designed for the context.

<!-- ruledrop:frontend-design:end -->
<!-- ruledrop:premium-ui:start -->
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

<!-- ruledrop:premium-ui:end -->
<!-- ruledrop:tailwind-shadcn:start -->
Build consistent, accessible UIs with Tailwind CSS and shadcn/ui. Use this skill when composing UI components, building design systems, handling dark mode, or styling React applications with utility-first CSS.

## Tailwind Fundamentals

**Utility-first means no custom CSS by default.** If you're writing a `.css` file for a component, stop and ask whether a utility class covers it.

**Class ordering convention** — use `prettier-plugin-tailwindcss` to auto-sort. Consistent order prevents merge conflicts and aids readability.

**Avoid arbitrary values unless necessary.** Prefer design tokens from your config:

```tsx
// ✗ arbitrary — breaks the design system
<div className="mt-[13px] text-[#1a1a2e]" />

// ✓ token-based
<div className="mt-3 text-foreground" />
```

**Conditional classes** — use `clsx` or `cn` (shadcn's utility), never string concatenation:

```tsx
import { cn } from '@/lib/utils'

<button className={cn(
  'rounded-md px-4 py-2 text-sm font-medium transition-colors',
  isActive && 'bg-primary text-primary-foreground',
  isDisabled && 'opacity-50 cursor-not-allowed',
)}>
```

## shadcn/ui Patterns

shadcn/ui components are copied into your repo — you own them. Modify them freely.

**Install components via CLI:**

```bash
npx shadcn@latest add button
npx shadcn@latest add dialog
npx shadcn@latest add form
```

**Compose, don't wrap.** Use the primitive parts directly rather than wrapping in another component:

```tsx
// ✗ unnecessary wrapper
function MyDialog({ children }) {
  return <Dialog><DialogContent>{children}</DialogContent></Dialog>
}

// ✓ compose at the call site
<Dialog>
  <DialogTrigger asChild>
    <Button variant="outline">Open</Button>
  </DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Edit profile</DialogTitle>
    </DialogHeader>
    {/* content */}
  </DialogContent>
</Dialog>
```

**`asChild` prop** — delegates rendering to the child element. Use it to avoid extra DOM nodes:

```tsx
<DialogTrigger asChild>
  <Button>Open</Button>   {/* renders as <button>, not <button><button> */}
</DialogTrigger>
```

## Design Tokens (CSS Variables)

shadcn/ui uses CSS variables for theming. Extend them in `globals.css`:

```css
:root {
  --background: 0 0% 100%;
  --foreground: 222.2 84% 4.9%;
  --primary: 221.2 83.2% 53.3%;
  --primary-foreground: 210 40% 98%;
  --muted: 210 40% 96.1%;
  --muted-foreground: 215.4 16.3% 46.9%;
  --border: 214.3 31.8% 91.4%;
  --radius: 0.5rem;
}

.dark {
  --background: 222.2 84% 4.9%;
  --foreground: 210 40% 98%;
  /* ... */
}
```

Reference tokens in Tailwind classes: `bg-background`, `text-foreground`, `border-border`.

## Dark Mode

Use `next-themes` with the `class` strategy:

```tsx
// app/layout.tsx
import { ThemeProvider } from 'next-themes'

export default function RootLayout({ children }) {
  return (
    <html suppressHydrationWarning>
      <body>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
```

```tsx
// Theme toggle
import { useTheme } from 'next-themes'

function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  return (
    <Button variant="ghost" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
      Toggle
    </Button>
  )
}
```

## Responsive Design

Mobile-first. Add breakpoint prefixes to scale up, not down:

```tsx
<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
```

Common breakpoints: `sm` (640px), `md` (768px), `lg` (1024px), `xl` (1280px).

## Forms with shadcn/ui + React Hook Form

```tsx
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form'

const schema = z.object({
  email: z.string().email(),
  name: z.string().min(2),
})

function ProfileForm() {
  const form = useForm({ resolver: zodResolver(schema) })

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl><Input {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit">Save</Button>
      </form>
    </Form>
  )
}
```

## Key Rules

- Use `cn()` for all conditional class merging — never template literals
- Keep Tailwind classes on the element, not abstracted into CSS variables
- Prefer shadcn/ui primitives over building from scratch — they handle accessibility
- Use `variant` and `size` props on shadcn components before reaching for custom classes
- Never use `!important` — if you need it, your specificity is wrong
- Run `prettier-plugin-tailwindcss` in your formatter to keep class order consistent
- For any more context refer to `https://tailwindcss.com/docs`

<!-- ruledrop:tailwind-shadcn:end -->
<!-- ruledrop:context-provider:start -->
# Context Provider

Before implementing any feature, fixing any bug, or using any API — refer to the official documentation for the relevant framework or library. Do not rely on training data alone for API signatures, configuration options, or version-specific behavior. Always verify against the source.

## Official Documentation References

### Frontend Frameworks
- **React** → https://react.dev
- **Next.js** → https://nextjs.org/docs
- **Vue 3** → https://vuejs.org/guide
- **Nuxt 3** → https://nuxt.com/docs
- **SvelteKit** → https://kit.svelte.dev/docs
- **Astro** → https://docs.astro.build
- **Remix** → https://remix.run/docs
- **Angular** → https://angular.dev/overview

### UI & Styling
- **Tailwind CSS** → https://tailwindcss.com/docs
- **shadcn/ui** → https://ui.shadcn.com/docs
- **Radix UI** → https://www.radix-ui.com/primitives/docs
- **Chakra UI** → https://chakra-ui.com/docs
- **Mantine** → https://mantine.dev/getting-started
- **Headless UI** → https://headlessui.com
- **Framer Motion** → https://www.framer.com/motion
- **GSAP** → https://gsap.com/docs/v3
- **styled-components** → https://styled-components.com/docs
- **CSS Modules** → https://github.com/css-modules/css-modules

### State Management
- **Zustand** → https://zustand.docs.pmnd.rs
- **Redux Toolkit** → https://redux-toolkit.js.org/introduction/getting-started
- **Jotai** → https://jotai.org/docs/introduction
- **Recoil** → https://recoiljs.org/docs/introduction/getting-started
- **XState** → https://stately.ai/docs

### Data Fetching & Server State
- **TanStack Query** → https://tanstack.com/query/latest/docs
- **SWR** → https://swr.vercel.app/docs
- **tRPC** → https://trpc.io/docs
- **Apollo Client** → https://www.apollographql.com/docs/react
- **Axios** → https://axios-http.com/docs/intro

### Forms & Validation
- **React Hook Form** → https://react-hook-form.com/docs
- **Zod** → https://zod.dev
- **Valibot** → https://valibot.dev/guides/introduction
- **Formik** → https://formik.org/docs/overview

### Backend & Runtime
- **Node.js** → https://nodejs.org/en/docs
- **Express** → https://expressjs.com/en/api.html
- **Fastify** → https://fastify.dev/docs/latest
- **Hono** → https://hono.dev/docs
- **Bun** → https://bun.sh/docs
- **Deno** → https://docs.deno.com

### Databases & ORMs
- **Prisma** → https://www.prisma.io/docs
- **Drizzle ORM** → https://orm.drizzle.team/docs/overview
- **Mongoose** → https://mongoosejs.com/docs
- **Supabase** → https://supabase.com/docs
- **PlanetScale** → https://planetscale.com/docs
- **Turso** → https://docs.turso.tech
- **Redis** → https://redis.io/docs

### Auth
- **NextAuth.js / Auth.js** → https://authjs.dev/getting-started
- **Clerk** → https://clerk.com/docs
- **Lucia** → https://lucia-auth.com/getting-started
- **Better Auth** → https://www.better-auth.com/docs

### Testing
- **Vitest** → https://vitest.dev/guide
- **Jest** → https://jestjs.io/docs/getting-started
- **Playwright** → https://playwright.dev/docs/intro
- **Cypress** → https://docs.cypress.io
- **Testing Library** → https://testing-library.com/docs

### Build Tools & Bundlers
- **Vite** → https://vite.dev/guide
- **Webpack** → https://webpack.js.org/concepts
- **Turbopack** → https://turbo.build/pack/docs
- **esbuild** → https://esbuild.github.io/api
- **Rollup** → https://rollupjs.org/introduction

### TypeScript & Language
- **TypeScript** → https://www.typescriptlang.org/docs
- **TypeScript Handbook** → https://www.typescriptlang.org/docs/handbook/intro.html
- **MDN Web Docs** → https://developer.mozilla.org/en-US/docs/Web

### Package Managers & Monorepos
- **npm** → https://docs.npmjs.com
- **pnpm** → https://pnpm.io/motivation
- **Yarn** → https://yarnpkg.com/getting-started
- **Turborepo** → https://turbo.build/repo/docs
- **Nx** → https://nx.dev/getting-started/intro

### Deployment & Infrastructure
- **Vercel** → https://vercel.com/docs
- **Netlify** → https://docs.netlify.com
- **Cloudflare Workers** → https://developers.cloudflare.com/workers
- **Railway** → https://docs.railway.app
- **Fly.io** → https://fly.io/docs
- **Docker** → https://docs.docker.com

### AI & LLM SDKs
- **Vercel AI SDK** → https://sdk.vercel.ai/docs
- **LangChain.js** → https://js.langchain.com/docs
- **OpenAI Node SDK** → https://platform.openai.com/docs/libraries
- **Anthropic SDK** → https://docs.anthropic.com/en/api/getting-started

## Usage Rule

When asked to implement something using any of the above, state which documentation URL you are referencing and ensure your implementation matches the current API. If the version in the project differs from the latest docs, note the discrepancy and use the version-appropriate API.

If a library is not listed here, search for its official documentation before implementing. Prefer official docs over blog posts, Stack Overflow answers, or training data.

<!-- ruledrop:context-provider:end -->
<!-- ruledrop:nextjs-seo:start -->
Implement technical SEO in Next.js applications. Use this skill when adding metadata, Open Graph tags, structured data, sitemaps, or optimizing Core Web Vitals for search ranking.

## Metadata API (App Router)

Use the `metadata` export for static pages and `generateMetadata` for dynamic ones. Never use `<head>` tags directly.

```tsx
// app/layout.tsx — base metadata inherited by all pages
export const metadata = {
  metadataBase: new URL('https://yoursite.com'),
  title: {
    default: 'Your Site',
    template: '%s | Your Site',  // page titles become "Page Name | Your Site"
  },
  description: 'Default site description — 150–160 characters.',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://yoursite.com',
    siteName: 'Your Site',
  },
  twitter: {
    card: 'summary_large_image',
    creator: '@yourhandle',
  },
  robots: {
    index: true,
    follow: true,
  },
}
```

```tsx
// app/blog/[slug]/page.tsx — dynamic metadata
export async function generateMetadata({ params }: { params: { slug: string } }) {
  const post = await getPost(params.slug)
  if (!post) return { title: 'Not Found' }

  return {
    title: post.title,
    description: post.excerpt,
    openGraph: {
      title: post.title,
      description: post.excerpt,
      type: 'article',
      publishedTime: post.publishedAt,
      authors: [post.author.name],
      images: [{ url: post.coverImage, width: 1200, height: 630, alt: post.title }],
    },
    alternates: {
      canonical: `https://yoursite.com/blog/${params.slug}`,
    },
  }
}
```

## Canonical URLs

Always set canonical URLs to prevent duplicate content penalties:

```tsx
export const metadata = {
  alternates: {
    canonical: 'https://yoursite.com/about',
    languages: {
      'en-US': 'https://yoursite.com/en/about',
      'fr-FR': 'https://yoursite.com/fr/about',
    },
  },
}
```

## Sitemap

```ts
// app/sitemap.ts
import { MetadataRoute } from 'next'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const posts = await getAllPosts()

  const postEntries = posts.map(post => ({
    url: `https://yoursite.com/blog/${post.slug}`,
    lastModified: new Date(post.updatedAt),
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }))

  return [
    { url: 'https://yoursite.com', lastModified: new Date(), changeFrequency: 'daily', priority: 1 },
    { url: 'https://yoursite.com/about', lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    ...postEntries,
  ]
}
```

## robots.txt

```ts
// app/robots.ts
import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: '*', allow: '/', disallow: ['/api/', '/admin/', '/_next/'] },
    ],
    sitemap: 'https://yoursite.com/sitemap.xml',
  }
}
```

## Structured Data (JSON-LD)

Inject structured data as a script tag in the page component — not in metadata:

```tsx
// app/blog/[slug]/page.tsx
export default async function BlogPost({ params }: { params: { slug: string } }) {
  const post = await getPost(params.slug)

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.excerpt,
    image: post.coverImage,
    datePublished: post.publishedAt,
    dateModified: post.updatedAt,
    author: { '@type': 'Person', name: post.author.name },
    publisher: {
      '@type': 'Organization',
      name: 'Your Site',
      logo: { '@type': 'ImageObject', url: 'https://yoursite.com/logo.png' },
    },
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <article>{/* content */}</article>
    </>
  )
}
```

## Core Web Vitals

**LCP (Largest Contentful Paint)** — target < 2.5s
- Use `next/image` with `priority` on above-the-fold images
- Preload critical fonts with `<link rel="preload">`
- Avoid render-blocking resources

```tsx
import Image from 'next/image'

// Hero image — mark as priority to preload
<Image src="/hero.jpg" alt="Hero" width={1200} height={600} priority />
```

**CLS (Cumulative Layout Shift)** — target < 0.1
- Always set `width` and `height` on images — `next/image` handles this
- Reserve space for dynamic content (ads, embeds) with fixed dimensions
- Avoid inserting content above existing content after load

**FID / INP (Interaction to Next Paint)** — target < 200ms
- Break up long tasks with `setTimeout` or `scheduler.yield()`
- Defer non-critical JS with `next/dynamic` and `{ ssr: false }`
- Avoid heavy synchronous work in event handlers

```tsx
const HeavyWidget = dynamic(() => import('./HeavyWidget'), {
  ssr: false,
  loading: () => <WidgetSkeleton />,
})
```

## Image Optimization

```tsx
// Always use next/image
import Image from 'next/image'

<Image
  src="/photo.jpg"
  alt="Descriptive alt text"   // never empty for content images
  width={800}
  height={600}
  sizes="(max-width: 768px) 100vw, 50vw"  // helps browser pick right size
  placeholder="blur"           // prevents layout shift
  blurDataURL={post.blurHash}
/>
```

## Key Rules

- Set `metadataBase` in root layout — required for absolute Open Graph URLs
- Every page needs a unique `title` and `description` — no duplicates
- Canonical URLs on every page — especially paginated and filtered routes
- Use `generateMetadata` for dynamic routes — never hardcode slugs
- Structured data for articles, products, FAQs — use schema.org types
- Test with Google's Rich Results Test and PageSpeed Insights before shipping

<!-- ruledrop:nextjs-seo:end -->