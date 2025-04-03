import type React from 'react'
import '@/app/globals.css'
import { Inter } from 'next/font/google'
import { Providers } from '@/components/Providers'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'TechTalentTracker - GitHub Analysis for Placement Cells',
  description: 'Analyze student GitHub repositories and activity for placement evaluation',
  generator: 'TechTalentTracker',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
