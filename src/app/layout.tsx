import type { Metadata, Viewport } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "Restro POS — Enterprise Restaurant Management & POS Platform",
  description: "Modern Restaurant POS, Table Management, Orders, Kitchen Display, and Platform Administration",
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
}

export default function RootLayout({
  children,
}: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark h-full" suppressHydrationWarning>
      <body className="min-h-full bg-[#0e0f12] text-slate-100 antialiased selection:bg-purple-500/20 selection:text-purple-300">
        {children}
      </body>
    </html>
  )
}
