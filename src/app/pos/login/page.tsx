"use client"

import { useState } from "react"
import {
  ArrowRight,
  Lock,
  Mail,
  ShoppingCart,
  CheckCircle2,
  AlertCircle,
  LogIn,
  UserPlus,
  Eye,
  EyeOff,
} from "lucide-react"
import { supabase, isSupabaseConfigured } from "@/lib/supabase"

export default function PosLogin() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [mode, setMode] = useState<"signin" | "signup">("signin")
  const [roleSelection, setRoleSelection] = useState("pos-orders")
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const isConfigured = isSupabaseConfigured()

  const determineRole = (userEmail: string, metaRole?: string) => {
    if (metaRole) return metaRole
    const lower = userEmail.toLowerCase()
    if (lower.includes("superadmin") || lower.includes("super-admin")) return "super-admin"
    if (lower.includes("kitchen") || lower.includes("chef") || lower.includes("cook")) return "pos-kitchen"
    if (lower.includes("reception") || lower.includes("frontdesk") || lower.includes("host")) return "pos-reception"
    if (lower.includes("orders") || lower.includes("cashier") || lower.includes("waiter")) return "pos-orders"
    if (lower.includes("admin") || lower.includes("owner") || lower.includes("manager")) return "restaurant-admin"
    return "pos-orders"
  }

  const navigateByRole = (role: string, posRole?: string | null) => {
    if (role === "super-admin") {
      window.location.href = "/restaurant-admin?role=super-admin&tab=tenants"
    } else if (role === "restaurant-admin") {
      window.location.href = "/restaurant-admin?role=restaurant-admin&tab=dashboard"
    } else if (role === "pos-kitchen" || posRole === "kitchen") {
      window.location.href = "/restaurant-admin?role=pos-kitchen&tab=kds"
    } else if (role === "pos-reception" || posRole === "reception") {
      window.location.href = "/restaurant-admin?role=pos-reception&tab=tables"
    } else if (role === "pos-orders" || posRole === "orders" || role === "pos-staff") {
      window.location.href = "/restaurant-admin?role=pos-orders&tab=pos"
    } else {
      window.location.href = "/restaurant-admin?role=pos-orders&tab=pos"
    }
  }

  const setCookiesAndRedirect = (
    role: string,
    posRole: string | null | undefined,
    restaurantId = "demo-restaurant-1",
    outletId = "demo-outlet-1"
  ) => {
    document.cookie = "pos_role=; path=/; max-age=0"
    document.cookie = `restaurant_id=${restaurantId}; path=/; max-age=86400`
    document.cookie = `outlet_id=${outletId}; path=/; max-age=86400`
    document.cookie = `user_role=${role}; path=/; max-age=86400`
    if (posRole) {
      document.cookie = `pos_role=${posRole}; path=/; max-age=86400`
    }
    navigateByRole(role, posRole)
  }

  const handleAuth = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(null)

    if (isConfigured) {
      try {
        if (mode === "signup") {
          const { data, error: signUpErr } = await supabase.auth.signUp({
            email,
            password,
            options: {
              data: {
                role: roleSelection,
                restaurant_id: "demo-restaurant-1",
              },
            },
          })

          if (data?.session) {
            setSuccess("Staff account created successfully!")
            const userRole = determineRole(email, roleSelection)
            const posRole = userRole.startsWith("pos-") ? userRole.replace("pos-", "") : null
            setCookiesAndRedirect(userRole, posRole)
            return
          } else if (!signUpErr) {
            setSuccess("Staff account registered! Please check your email to verify if required.")
            setLoading(false)
            return
          }
        } else {
          const { data, error: signInErr } = await supabase.auth.signInWithPassword({
            email,
            password,
          })

          if (!signInErr && data.user) {
            const metaRole =
              (data.user.user_metadata?.role as string) ||
              (data.user.app_metadata?.role as string)
            const userRole = determineRole(email, metaRole)
            const posRole = userRole.startsWith("pos-") ? userRole.replace("pos-", "") : null
            setCookiesAndRedirect(userRole, posRole)
            return
          }
        }
      } catch (err: unknown) {
        // Fallback
      }
    }

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, role: roleSelection }),
      })

      if (response.ok) {
        const data = await response.json()
        setCookiesAndRedirect(data.role, data.posRole, data.restaurantId, data.outletId)
      } else {
        setError("Invalid email or password")
        setLoading(false)
      }
    } catch {
      setError("Login failed. Please check connection.")
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#F7F5F0] text-[#20252B] flex flex-col font-sans select-none antialiased">
      {/* Top Production Brand Banner */}
      <div className="bg-[#E9E3D8] border-b border-[#E5E1D9] text-[#20252B] px-4 py-2.5 text-xs font-medium flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShoppingCart className="w-4 h-4 text-[#C46B4E]" />
          <span className="font-bold tracking-tight">Staff POS Terminal Login</span>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-[#64748B]">
          <span className="w-2 h-2 rounded-full bg-[#C46B4E]" />
          <span>Terminal Online</span>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl border border-[#E5E1D9] p-8 space-y-6 shadow-xs">
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="inline-flex w-12 h-12 rounded-xl bg-[#E9E3D8] text-[#C46B4E] items-center justify-center border border-[#E5E1D9] mb-1">
              <ShoppingCart className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-[#20252B]">Staff POS Login</h1>
            <p className="text-xs text-[#64748B]">
              Authenticate cashier, reception, or kitchen screen
            </p>
          </div>

          {/* Mode Switcher */}
          <div className="grid grid-cols-2 p-1 rounded-xl bg-[#E9E3D8] border border-[#E5E1D9]">
            <button
              type="button"
              onClick={() => {
                setMode("signin")
                setError(null)
                setSuccess(null)
              }}
              className={`py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                mode === "signin"
                  ? "bg-white text-[#20252B] shadow-2xs"
                  : "text-[#64748B] hover:text-[#20252B]"
              }`}
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Sign In</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("signup")
                setError(null)
                setSuccess(null)
              }}
              className={`py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                mode === "signup"
                  ? "bg-white text-[#20252B] shadow-2xs"
                  : "text-[#64748B] hover:text-[#20252B]"
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Register</span>
            </button>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-xs p-3 rounded-xl flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="bg-blue-50 border border-blue-200 text-blue-900 text-xs p-3 rounded-xl flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-blue-700" />
              <span>{success}</span>
            </div>
          )}

          <form onSubmit={handleAuth} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#20252B]">Staff Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#64748B] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. staff@restaurant.com"
                  required
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white border border-[#E5E1D9] text-[#20252B] placeholder-[#64748B] text-xs focus:outline-none focus:border-[#C46B4E] transition"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#20252B]">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#64748B] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-white border border-[#E5E1D9] text-[#20252B] placeholder-[#64748B] text-xs focus:outline-none focus:border-[#C46B4E] transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#64748B] hover:text-[#20252B] transition p-0.5 cursor-pointer"
                  title={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {mode === "signup" && (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#20252B]">Staff Role Assignment</label>
                <select
                  value={roleSelection}
                  onChange={(e) => setRoleSelection(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-white border border-[#E5E1D9] text-[#20252B] text-xs focus:outline-none focus:border-[#C46B4E] transition cursor-pointer"
                >
                  <option value="pos-orders">POS Cashier / Waiter (Orders & Billing)</option>
                  <option value="pos-reception">Reception / Host (Table Floor & Waitlist)</option>
                  <option value="pos-kitchen">Kitchen Chef / Cook (KDS Ticket Rails)</option>
                </select>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-xl bg-[#C46B4E] hover:bg-[#B25C40] text-white font-semibold text-xs flex items-center justify-center gap-2 transition shadow-xs cursor-pointer disabled:opacity-50"
            >
              <span>
                {loading
                  ? mode === "signup"
                    ? "Creating Account..."
                    : "Signing in..."
                  : mode === "signup"
                  ? "Create Staff Account"
                  : "Sign In to Terminal"}
              </span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
