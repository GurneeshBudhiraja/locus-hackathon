import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Locus Dashboard',
  description: 'Dashboard for tracking GitHub PRs and managing contractor payments',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}

