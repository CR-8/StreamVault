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
