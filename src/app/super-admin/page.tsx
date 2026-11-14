"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function SuperAdminPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace("/restaurant-admin?role=super-admin&tab=tenants")
  }, [router])

  return (
    <div className="min-h-screen bg-[#0e0f12] flex items-center justify-center text-slate-400 text-xs">
      Loading Super Admin Platform...
    </div>
  )
}
