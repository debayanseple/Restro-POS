"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { PortalShellSkeleton } from "@/components/ui/skeleton"

export default function AuthCallback() {
  const router = useRouter()
  const [onboarded, setOnboarded] = useState(false)
  const [checkingSession, setCheckingSession] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Exchange OAuth code for session
    const fetchSession = async () => {
      try {
        const { data, error } = await supabase.auth.getSession()
        if (error) {
          setError("Authentication failed. Please try again.")
          return
        }

        if (!data.session) {
          setError("No session found. Please login again.")
          return
        }

        // Get user metadata
        const { data: user } = await supabase.auth.getUser()

        if (user?.user?.app_metadata?.onboarded) {
          setOnboarded(true)
          router.push("/restaurant-admin")
          return
        }

        // Show onboarding for new users
        setOnboarded(false)
      } finally {
        setCheckingSession(false)
      }
    }

    fetchSession()
  }, [router])

  if (checkingSession || onboarded) {
    if (onboarded) router.push("/restaurant-admin")
    return <PortalShellSkeleton variant="dashboard" isDarkMode={true} />
  }

  if (error) {
    return <div className="p-8 text-center text-red-500">{error}</div>
  }

  return (
    <div className="min-h-screen bg-background p-6 flex items-center justify-center">
      <div className="max-w-md w-full space-y-4 p-8 rounded-lg border border-border bg-card">
        <h2 className="text-2xl font-bold">Welcome!</h2>

        {error && (
          <div className="bg-destructive/10 text-destructive p-3 rounded">
            {error}
          </div>
        )}

        {!error && (
          <>
            <p className="text-muted-foreground text-sm">
              You've been authenticated successfully. Please complete onboarding
              to set up your restaurant context.
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault()
                setOnboarded(true)
                router.push("/restaurant-admin")
              }}
              className="mt-4"
            >
              <Button type="submit" className="w-full">
                I've completed onboarding
              </Button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
