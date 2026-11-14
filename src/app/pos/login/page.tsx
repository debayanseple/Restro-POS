"use client"

import { useState } from "react"
import {
  Utensils,
  ArrowRight,
  Lock,
  Mail,
  ShieldCheck,
  ShoppingCart,
  CalendarCheck,
  ChefHat,
  Database,
  CheckCircle2,
  AlertCircle,
  LogIn,
  UserPlus,
  Eye,
  EyeOff,
} from "lucide-react"
import { supabase, isSupabaseConfigured } from "@/lib/supabase"

export default function PosLogin() {
  const [email, setEmail] = useState("orders@pos.com")
  const [password, setPassword] = useState("password123")
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
      window.location.href = "/restaurant-admin?role=restaurant-admin&tab=tables"
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
    // Clear old pos_role first
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

          if (signUpErr) {
            setError(signUpErr.message)
            setLoading(false)
            return
          }

          if (data.session) {
            setSuccess("Supabase staff account created and signed in!")
            const userRole = determineRole(email, roleSelection)
            const posRole = userRole.startsWith("pos-") ? userRole.replace("pos-", "") : null
            setCookiesAndRedirect(userRole, posRole)
            return
          } else {
            setSuccess("Account registered in Supabase! Please check your email to confirm.")
            setLoading(false)
            return
          }
        } else {
          const { data, error: signInErr } = await supabase.auth.signInWithPassword({
            email,
            password,
          })

          if (signInErr) {
            setError(signInErr.message)
            setLoading(false)
            return
          }

          if (data.user) {
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
        const message = err instanceof Error ? err.message : "Supabase connection error"
        setError(message)
        setLoading(false)
        return
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

  const quickLogin = (userEmail: string, roleParam: string, tabParam: string) => {
    setEmail(userEmail)
    setPassword("password123")
    fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: userEmail, password: "password123", role: roleParam }),
    })
      .then((res) => res.json())
      .then((data) => {
        document.cookie = "pos_role=; path=/; max-age=0"
        document.cookie = `restaurant_id=${data.restaurantId}; path=/; max-age=86400`
        document.cookie = `outlet_id=${data.outletId || ""}; path=/; max-age=86400`
        document.cookie = `user_role=${data.role}; path=/; max-age=86400`
        if (data.posRole) {
          document.cookie = `pos_role=${data.posRole}; path=/; max-age=86400`
        }
        window.location.href = `/restaurant-admin?role=${roleParam}&tab=${tabParam}`
      })
      .catch(() => setError("Quick login failed"))
  }

  return (
    <div className="min-h-screen bg-[#0e0f12] text-slate-100 flex flex-col font-sans select-none antialiased">
      {/* Top Production Brand Banner */}
      <div className="bg-[#181a24] border-b border-[#242738] text-slate-300 px-4 py-2 text-xs font-medium flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShoppingCart className="w-4 h-4 text-purple-400" />
          <span className="font-bold text-white tracking-wide">POS Staff Terminal Access</span>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-slate-400">
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          <span>Terminal Online</span>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-[#14161f] rounded-2xl border border-[#202330] p-8 space-y-6 shadow-2xl">
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="inline-flex w-12 h-12 rounded-2xl bg-[#2d224d] text-[#c4b5fd] items-center justify-center border border-[#3f2e6b] mb-1">
              <ShoppingCart className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white">POS Terminal Login</h1>
            <p className="text-xs text-slate-400">
              Sign in with your assigned staff profile or credentials
            </p>
          </div>

          {/* Supabase Status Chip */}
          <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-[#181a24] border border-[#252837] text-[11px]">
            <div className="flex items-center gap-2 truncate">
              <Database className="w-3.5 h-3.5 text-purple-400 shrink-0" />
              <span className="text-slate-300 truncate">
                Supabase Auth: <span className="text-slate-400 font-mono text-[10px]">yumaxzevfkcctxwdbcni</span>
              </span>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              {isConfigured ? (
                <span className="flex items-center gap-1 text-emerald-400 font-medium">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  Live Auth
                </span>
              ) : (
                <span className="flex items-center gap-1 text-purple-400 font-medium">
                  <span className="w-2 h-2 rounded-full bg-purple-400" />
                  Ready (Demo Mode)
                </span>
              )}
            </div>
          </div>

          {/* Mode Switcher */}
          <div className="grid grid-cols-2 p-1 rounded-xl bg-[#0e0f12] border border-[#202330]">
            <button
              type="button"
              onClick={() => {
                setMode("signin")
                setError(null)
                setSuccess(null)
              }}
              className={`py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                mode === "signin"
                  ? "bg-[#202330] text-white shadow-xs"
                  : "text-slate-400 hover:text-slate-200"
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
              className={`py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                mode === "signup"
                  ? "bg-[#202330] text-white shadow-xs"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Register</span>
            </button>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-xs p-3 rounded-xl flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs p-3 rounded-xl flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{success}</span>
            </div>
          )}

          <form onSubmit={handleAuth} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Staff Email</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="orders@pos.com"
                  required
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#0e0f12] border border-[#242738] text-white text-xs focus:outline-hidden focus:border-purple-500 transition"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-[#0e0f12] border border-[#242738] text-white text-xs focus:outline-hidden focus:border-purple-500 transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition p-0.5 cursor-pointer"
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
                <label className="text-xs font-semibold text-slate-300">Staff Station</label>
                <select
                  value={roleSelection}
                  onChange={(e) => setRoleSelection(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-[#0e0f12] border border-[#242738] text-white text-xs focus:outline-hidden focus:border-purple-500 transition"
                >
                  <option value="pos-orders">POS Staff — Orders (Point of Sale)</option>
                  <option value="pos-reception">POS Staff — Reception (Floor & Waitlist)</option>
                  <option value="pos-kitchen">POS Staff — Kitchen (KDS Queue)</option>
                  <option value="restaurant-admin">Restaurant Admin</option>
                  <option value="super-admin">Super Admin</option>
                </select>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-xl bg-[#8b5cf6] hover:bg-[#7c3aed] text-white font-semibold text-xs flex items-center justify-center gap-2 transition shadow-xs cursor-pointer disabled:opacity-50"
            >
              <span>
                {loading
                  ? mode === "signup"
                    ? "Registering..."
                    : "Signing in..."
                  : mode === "signup"
                  ? "Create Staff Account"
                  : "Sign In"}
              </span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Quick 1-Click Role Logins */}
          <div className="pt-4 border-t border-[#202330] space-y-2.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block text-center">
              1-Click Staff Stations
            </span>

            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => quickLogin("orders@pos.com", "pos-orders", "pos")}
                className="p-2.5 rounded-xl bg-blue-950/30 hover:bg-blue-900/40 border border-blue-800/40 text-center transition hover:border-blue-500"
              >
                <ShoppingCart className="w-4 h-4 text-blue-400 mx-auto mb-1" />
                <div className="text-xs font-semibold text-blue-300">Orders</div>
                <div className="text-[10px] text-slate-400">POS & Feed</div>
              </button>

              <button
                type="button"
                onClick={() => quickLogin("reception@pos.com", "pos-reception", "tables")}
                className="p-2.5 rounded-xl bg-emerald-950/30 hover:bg-emerald-900/40 border border-emerald-800/40 text-center transition hover:border-emerald-500"
              >
                <CalendarCheck className="w-4 h-4 text-emerald-400 mx-auto mb-1" />
                <div className="text-xs font-semibold text-emerald-300">Reception</div>
                <div className="text-[10px] text-slate-400">Floor & Wait</div>
              </button>

              <button
                type="button"
                onClick={() => quickLogin("kitchen@pos.com", "pos-kitchen", "kds")}
                className="p-2.5 rounded-xl bg-amber-950/30 hover:bg-amber-900/40 border border-amber-800/40 text-center transition hover:border-amber-500"
              >
                <ChefHat className="w-4 h-4 text-amber-400 mx-auto mb-1" />
                <div className="text-xs font-semibold text-amber-300">Kitchen</div>
                <div className="text-[10px] text-slate-400">Bar & Cook</div>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => quickLogin("admin@restaurant.com", "restaurant-admin", "tables")}
                className="p-2 rounded-xl bg-[#1a1c26] hover:bg-[#222534] border border-[#282c3c] text-left transition hover:border-purple-500/50"
              >
                <div className="text-xs font-semibold text-white flex items-center gap-1.5">
                  <Utensils className="w-3.5 h-3.5 text-purple-400" />
                  <span>Restaurant Admin</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => quickLogin("superadmin@platform.com", "super-admin", "tenants")}
                className="p-2 rounded-xl bg-[#1a1c26] hover:bg-[#222534] border border-[#282c3c] text-left transition hover:border-red-500/50"
              >
                <div className="text-xs font-semibold text-white flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-red-400" />
                  <span>Super Admin</span>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
