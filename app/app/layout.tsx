import type { Metadata } from 'next'
import '@/styles/fonts.css'
import '@/styles/tokens.css'
import './globals.css'
import '@/styles/app.css'

export const metadata: Metadata = {
  title: 'dEWSentinel — Deliverability Early-Warning Console',
  description:
    'We see the dip before your reply rates do. A client-side, deterministic console that computes per-ESP deliverability health from synthetic data.',
  icons: {
    icon: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='7' fill='%23818cf8'/%3E%3Ccircle cx='16' cy='16' r='5' fill='%230c0e14'/%3E%3C/svg%3E",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
