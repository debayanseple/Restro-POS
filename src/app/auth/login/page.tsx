"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function AuthLogin() {
  const router = useRouter()

  useEffect(() => {
    router.replace("/restaurant-admin/login")
  }, [router])

  return (
    <div className="min-h-screen bg-[#F7F5F0] text-[#20252B] flex items-center justify-center">
      <div className="flex items-center gap-3">
        <div className="w-5 h-5 border-2 border-[#C46B4E] border-t-transparent rounded-full animate-spin" />
        <span className="text-sm font-medium">Redirecting to Portal Login...</span>
      </div>
    </div>
  )
}
