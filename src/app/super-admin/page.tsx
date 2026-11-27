"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { PortalShellSkeleton } from "@/components/ui/skeleton"

export default function SuperAdminPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace("/restaurant-admin?role=super-admin&tab=tenants")
  }, [router])

  return <PortalShellSkeleton variant="generic" isDarkMode={true} />
}
