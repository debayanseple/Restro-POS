"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function AuthLogin() {
  const router = useRouter()

  useEffect(() => {
    router.replace("/restaurant-admin/login")
  }, [router])

  return (
    <div className="min-h-screen bg-[#0e0f12] text-slate-200 flex items-center justify-center">
      <div className="flex items-center gap-3">
        <div className="w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-sm">Redirecting to Portal Login...</span>
      </div>
    </div>
  )
}
