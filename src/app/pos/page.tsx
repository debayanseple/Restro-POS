"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { PortalShellSkeleton } from "@/components/ui/skeleton"

export default function PosPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace("/restaurant-admin?tab=pos")
  }, [router])

  return <PortalShellSkeleton variant="pos" isDarkMode={true} />
}
