"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function PosPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace("/restaurant-admin?tab=pos")
  }, [router])

  return (
    <div className="min-h-screen bg-[#0e0f12] flex items-center justify-center text-slate-400 text-xs">
      Loading POS Terminal...
    </div>
  )
}
