"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function RootPage() {
  const router = useRouter()

  useEffect(() => {
    // Single unified portal entry
    router.replace("/restaurant-admin")
  }, [router])

  return (
    <div className="min-h-screen bg-[#0e0f12] flex items-center justify-center text-slate-400 text-xs">
      Loading OrderRestro Portal...
    </div>
  )
}
