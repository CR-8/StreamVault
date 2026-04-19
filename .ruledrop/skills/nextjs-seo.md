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
