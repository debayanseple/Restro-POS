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
    <html lang="en" className="h-full" suppressHydrationWarning>
      <body className="min-h-full bg-[#F7F5F0] text-[#20252B] antialiased selection:bg-[#C46B4E]/20 selection:text-[#C46B4E]">
        {children}
      </body>
    </html>
  )
}
