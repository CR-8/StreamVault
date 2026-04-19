import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { cn } from '@/lib/utils'
import { Nav } from '@/components/nav'
import { AppInitializer } from '@/components/app-initializer'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Toaster } from '@/components/ui/sonner'

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' })

export const metadata: Metadata = {
  title: {
    default: 'StreamVault — Browser IPTV Player',
    template: '%s | StreamVault',
  },
  description:
    'Watch 20,000+ live TV channels in your browser. No account, no payment, no setup. Powered by iptv-org.',
  keywords: ['IPTV', 'live TV', 'streaming', 'iptv-org', 'HLS player', 'browser TV'],
  authors: [{ name: 'StreamVault' }],
  robots: 'index, follow',
  openGraph: {
    title: 'StreamVault — Browser IPTV Player',
    description: 'Watch 20,000+ live TV channels in your browser. No account required.',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={cn('h-full dark', inter.variable)} suppressHydrationWarning>
      <body className={cn('min-h-full flex flex-col bg-background text-foreground antialiased')}>
        <TooltipProvider>
          <AppInitializer />
          <Nav />
          <main className="flex-1 flex flex-col">{children}</main>
          <Toaster richColors position="bottom-right" closeButton />
        </TooltipProvider>
      </body>
    </html>
  )
}
