import type React from 'react'
import '@/app/globals.css'
import { Inter } from 'next/font/google'
import { Providers } from '@/components/providers'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'GitHub Repo Analyzer',
  description: 'Analyze GitHub repositories and get detailed insights',
  generator: 'v0.dev',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning> {/* ✅ Prevent hydration mismatches */}
      <body className={inter.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
