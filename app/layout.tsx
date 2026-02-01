import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'JobPulse - Job Aggregator',
  description: 'Find jobs from multiple sources in one place',
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
