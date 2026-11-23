"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import {
  Utensils,
  ShoppingCart,
  ChefHat,
  LayoutGrid,
  ShieldCheck,
  ArrowRight,
  Sparkles,
  Zap,
  Clock,
  Users,
  CheckCircle2,
  ChevronRight,
  TrendingUp,
  Receipt,
  Wine,
  Store,
  Layers,
  Activity,
  Smartphone,
  Lock,
} from "lucide-react"

export default function LandingPage() {
  const [mounted, setMounted] = useState(false)
  const [activeSessionRole, setActiveSessionRole] = useState<string | null>(null)
  const [previewTab, setPreviewTab] = useState<"pos" | "kds" | "tables">("pos")

  useEffect(() => {
    setMounted(true)
    const roleCookie = document.cookie.replace(
      /(?:(?:^|.*)\s*user_role\s*=\s*([^;]*).*$)|^.*$/,
      "$1"
    )
    if (roleCookie) {
      setActiveSessionRole(roleCookie)
    }
  }, [])

  return (
    <div className="min-h-screen bg-[#0e0f12] text-slate-100 selection:bg-purple-500/20 selection:text-purple-300 font-sans">
      {/* Top Notification / Session Bar */}
      {mounted && activeSessionRole ? (
        <div className="bg-gradient-to-r from-purple-900/60 via-indigo-900/50 to-purple-900/60 border-b border-purple-500/30 px-4 py-2 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2 max-w-7xl mx-auto w-full">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-purple-200">
              Active session detected: <strong className="text-white capitalize">{activeSessionRole.replace("pos-", "POS ")}</strong>
            </span>
            <div className="ml-auto flex items-center gap-3">
              <Link
                href="/restaurant-admin"
                className="inline-flex items-center gap-1 font-semibold text-purple-300 hover:text-white transition"
              >
                Go to Workspace <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      ) : null}

      {/* Main Navbar */}
      <header className="sticky top-0 z-50 bg-[#0e0f12]/80 backdrop-blur-md border-b border-[#1f222e]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          {/* Brand Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 to-indigo-700 flex items-center justify-center text-white shadow-lg shadow-purple-900/30 border border-purple-400/20 group-hover:scale-105 transition">
              <Utensils className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-base tracking-tight text-white">
                  Restro POS
                </span>
                <span className="text-[10px] font-semibold tracking-wider uppercase px-1.5 py-0.5 rounded-md bg-purple-500/10 text-purple-400 border border-purple-500/20">
                  Enterprise
                </span>
              </div>
              <span className="text-[11px] text-slate-400 font-medium block">
                Restaurant Operating System
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-7 text-xs font-medium text-slate-300">
            <a href="#features" className="hover:text-purple-400 transition">
              Features
            </a>
            <a href="#stations" className="hover:text-purple-400 transition">
              Stations & KDS
            </a>
            <a href="#portals" className="hover:text-purple-400 transition">
              Portals
            </a>
            <a href="#architecture" className="hover:text-purple-400 transition">
              Architecture
            </a>
          </nav>

          {/* Action CTAs */}
          <div className="flex items-center gap-2.5">
            <Link
              href="/pos/login"
              className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-[#181a24] hover:bg-[#202330] border border-[#2b2f42] transition flex items-center gap-1.5"
            >
              <ShoppingCart className="w-3.5 h-3.5 text-purple-400" />
              <span>POS Login</span>
            </Link>
            <Link
              href="/restaurant-admin/login"
              className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 shadow-lg shadow-purple-900/30 border border-purple-400/30 transition flex items-center gap-1.5"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Admin Portal</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-20 pb-16 overflow-hidden">
        {/* Glow Gradients */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gradient-to-b from-purple-600/15 via-indigo-600/10 to-transparent blur-3xl pointer-events-none -z-10" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
          {/* Pill Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#1b1e2c] border border-purple-500/30 text-purple-300 text-xs font-medium shadow-inner shadow-purple-500/10">
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            <span>High-Speed Counter POS & Real-Time Kitchen Rails</span>
          </div>

          {/* Main Title */}
          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white max-w-4xl mx-auto leading-tight sm:leading-tight">
            Run Your Restaurant Operations.{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-indigo-400">
              Seamlessly from Counter to Kitchen.
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-base sm:text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Unify high-speed order taking, interactive table floor management,
            and decoupled Kitchen & Bar display systems with persistent sync and zero downtime.
          </p>

          {/* CTA Group */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3.5">
            <Link
              href="/restaurant-admin/login"
              className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold text-sm shadow-xl shadow-purple-900/40 border border-purple-400/30 transition flex items-center justify-center gap-2 group"
            >
              <span>Launch Restaurant Portal</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition" />
            </Link>
            <Link
              href="/pos/login"
              className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-[#151722] hover:bg-[#1c1f2e] text-slate-200 hover:text-white font-semibold text-sm border border-[#272b3c] transition flex items-center justify-center gap-2"
            >
              <ShoppingCart className="w-4 h-4 text-purple-400" />
              <span>Counter & Waiter Terminal</span>
            </Link>
          </div>

          {/* Live Feature Counters */}
          <div className="pt-10 grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-4xl mx-auto">
            <div className="p-4 rounded-2xl bg-[#141620] border border-[#212433] text-center">
              <div className="text-2xl font-bold text-white tracking-tight">&lt; 100ms</div>
              <div className="text-xs text-slate-400 font-medium mt-0.5">Ticket Dispatch Speed</div>
            </div>
            <div className="p-4 rounded-2xl bg-[#141620] border border-[#212433] text-center">
              <div className="text-2xl font-bold text-purple-400 tracking-tight">100% Split</div>
              <div className="text-xs text-slate-400 font-medium mt-0.5">Kitchen & Bar Independence</div>
            </div>
            <div className="p-4 rounded-2xl bg-[#141620] border border-[#212433] text-center">
              <div className="text-2xl font-bold text-emerald-400 tracking-tight">Zero-Reset</div>
              <div className="text-xs text-slate-400 font-medium mt-0.5">Admin-Controlled Tables</div>
            </div>
            <div className="p-4 rounded-2xl bg-[#141620] border border-[#212433] text-center">
              <div className="text-2xl font-bold text-indigo-400 tracking-tight">Multi-Station</div>
              <div className="text-xs text-slate-400 font-medium mt-0.5">Realtime Cross-Tab Sync</div>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive Live Station Showcase */}
      <section id="stations" className="py-16 bg-[#0a0b0e] border-y border-[#181a24]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <span className="text-xs font-bold tracking-wider uppercase text-purple-400">
              Interactive Preview
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Three Dedicated Environments in One Platform
            </h2>
            <p className="text-xs sm:text-sm text-slate-400">
              Select a station below to explore how counter staff, kitchen chefs, and floor managers interact.
            </p>
          </div>

          {/* Switcher Buttons */}
          <div className="flex items-center justify-center gap-2 max-w-md mx-auto p-1 rounded-2xl bg-[#141620] border border-[#232738]">
            <button
              onClick={() => setPreviewTab("pos")}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold transition flex items-center justify-center gap-2 ${
                previewTab === "pos"
                  ? "bg-purple-600 text-white shadow-md shadow-purple-900/30"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <ShoppingCart className="w-3.5 h-3.5" />
              <span>Point of Sale</span>
            </button>
            <button
              onClick={() => setPreviewTab("kds")}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold transition flex items-center justify-center gap-2 ${
                previewTab === "kds"
                  ? "bg-purple-600 text-white shadow-md shadow-purple-900/30"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <ChefHat className="w-3.5 h-3.5" />
              <span>Kitchen / Bar KDS</span>
            </button>
            <button
              onClick={() => setPreviewTab("tables")}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold transition flex items-center justify-center gap-2 ${
                previewTab === "tables"
                  ? "bg-purple-600 text-white shadow-md shadow-purple-900/30"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Table Floor</span>
            </button>
          </div>

          {/* Preview Canvas Container */}
          <div className="rounded-3xl bg-[#12141c] border border-[#232738] p-6 shadow-2xl relative overflow-hidden">
            {previewTab === "pos" ? (
              <div className="space-y-6">
                <div className="flex items-center justify-between border-b border-[#212433] pb-4">
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <ShoppingCart className="w-4 h-4 text-purple-400" />
                      Point of Sale Counter Terminal
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Touch-ready order creation with mandatory table picker for Dine-In orders.
                    </p>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-semibold">
                    Register Active
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Catalog Column */}
                  <div className="md:col-span-2 space-y-4">
                    <div className="flex gap-2">
                      <span className="px-3 py-1.5 rounded-lg bg-purple-600 text-white text-xs font-semibold">
                        All Items
                      </span>
                      <span className="px-3 py-1.5 rounded-lg bg-[#181a24] text-slate-400 text-xs font-medium border border-[#252837]">
                        Mains & Pizza
                      </span>
                      <span className="px-3 py-1.5 rounded-lg bg-[#181a24] text-slate-400 text-xs font-medium border border-[#252837]">
                        Sides
                      </span>
                      <span className="px-3 py-1.5 rounded-lg bg-[#181a24] text-slate-400 text-xs font-medium border border-[#252837]">
                        Drinks & Bar
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      <div className="p-3 rounded-xl bg-[#181a24] border border-[#272b3c] flex flex-col justify-between">
                        <div>
                          <div className="text-2xl mb-1">🍔</div>
                          <div className="text-xs font-bold text-white">Classic Wagyu Burger</div>
                          <div className="text-[11px] text-purple-400 font-semibold mt-1">$16.50</div>
                        </div>
                        <span className="mt-2 text-[10px] text-emerald-400 font-medium">Kitchen Item</span>
                      </div>
                      <div className="p-3 rounded-xl bg-[#181a24] border border-[#272b3c] flex flex-col justify-between">
                        <div>
                          <div className="text-2xl mb-1">🍕</div>
                          <div className="text-xs font-bold text-white">Margherita Artisan Pizza</div>
                          <div className="text-[11px] text-purple-400 font-semibold mt-1">$14.50</div>
                        </div>
                        <span className="mt-2 text-[10px] text-emerald-400 font-medium">Kitchen Item</span>
                      </div>
                      <div className="p-3 rounded-xl bg-[#181a24] border border-[#272b3c] flex flex-col justify-between">
                        <div>
                          <div className="text-2xl mb-1">🍺</div>
                          <div className="text-xs font-bold text-white">Craft IPA Beer</div>
                          <div className="text-[11px] text-purple-400 font-semibold mt-1">$7.50</div>
                        </div>
                        <span className="mt-2 text-[10px] text-amber-400 font-medium">Bar Station</span>
                      </div>
                    </div>
                  </div>

                  {/* Cart Ticket Column */}
                  <div className="p-4 rounded-2xl bg-[#181a24] border border-[#292d3e] flex flex-col justify-between space-y-4">
                    <div>
                      <div className="flex items-center justify-between border-b border-[#242838] pb-2">
                        <span className="text-xs font-bold text-white flex items-center gap-1.5">
                          <Receipt className="w-3.5 h-3.5 text-purple-400" />
                          Live Ticket #1048
                        </span>
                        <span className="text-[10px] text-slate-400">Dine In (Table 01)</span>
                      </div>

                      <div className="mt-3 space-y-2 text-xs">
                        <div className="flex justify-between items-center text-slate-200">
                          <span>1x Classic Wagyu Burger</span>
                          <span className="font-semibold">$16.50</span>
                        </div>
                        <div className="flex justify-between items-center text-slate-200">
                          <span>1x Craft IPA Beer</span>
                          <span className="font-semibold">$7.50</span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-[#242838] space-y-2">
                      <div className="flex justify-between text-xs text-slate-400">
                        <span>Tax (8%)</span>
                        <span>$1.92</span>
                      </div>
                      <div className="flex justify-between text-sm font-bold text-white">
                        <span>Total Due</span>
                        <span className="text-purple-400">$25.92</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <div className="py-2 text-center rounded-xl bg-[#232738] text-slate-300 text-xs font-semibold">
                          Send to Kitchen
                        </div>
                        <div className="py-2 text-center rounded-xl bg-emerald-600 text-white text-xs font-bold shadow-xs">
                          Checkout
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : previewTab === "kds" ? (
              <div className="space-y-6">
                <div className="flex items-center justify-between border-b border-[#212433] pb-4">
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <ChefHat className="w-4 h-4 text-purple-400" />
                      Kitchen & Bar Display System (KDS)
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Decoupled station tracking: advancing kitchen tickets will never overwrite bar drinks.
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <span className="px-2.5 py-0.5 rounded-md bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[11px] font-semibold">
                      Kitchen Station
                    </span>
                    <span className="px-2.5 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[11px] font-semibold">
                      Bar Station
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Ticket 1: Kitchen */}
                  <div className="p-4 rounded-2xl bg-[#161822] border border-[#2b2f42] space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-white">#9201 · Table 02</span>
                      <span className="text-[10px] text-slate-400 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-purple-400" /> 4m ago
                      </span>
                    </div>
                    <div className="p-2 rounded-xl bg-[#1d202e] text-xs space-y-1">
                      <div className="font-semibold text-slate-200">🍳 2x Classic Wagyu Burger</div>
                      <div className="text-[11px] text-slate-400">1x Crispy Truffle Fries</div>
                    </div>
                    <div className="flex items-center justify-between pt-1">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-500/15 text-blue-400 border border-blue-500/30">
                        Preparing
                      </span>
                      <span className="text-xs text-purple-400 font-semibold cursor-pointer">
                        Mark Ready →
                      </span>
                    </div>
                  </div>

                  {/* Ticket 2: Bar */}
                  <div className="p-4 rounded-2xl bg-[#161822] border border-[#2b2f42] space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-white">#9201 · Table 02</span>
                      <span className="text-[10px] text-slate-400 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-amber-400" /> 4m ago
                      </span>
                    </div>
                    <div className="p-2 rounded-xl bg-[#1d202e] text-xs space-y-1">
                      <div className="font-semibold text-slate-200">🍸 1x Craft IPA Beer</div>
                      <div className="text-[11px] text-slate-400">1x Sparkling Berry Fizz</div>
                    </div>
                    <div className="flex items-center justify-between pt-1">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                        Ready
                      </span>
                      <span className="text-xs text-emerald-400 font-semibold cursor-pointer">
                        Serve Drink →
                      </span>
                    </div>
                  </div>

                  {/* Ticket 3: Takeaway */}
                  <div className="p-4 rounded-2xl bg-[#161822] border border-[#2b2f42] space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-white">#9204 · Takeaway</span>
                      <span className="text-[10px] text-slate-400 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-purple-400" /> 1m ago
                      </span>
                    </div>
                    <div className="p-2 rounded-xl bg-[#1d202e] text-xs space-y-1">
                      <div className="font-semibold text-slate-200">🍕 1x Margherita Artisan Pizza</div>
                    </div>
                    <div className="flex items-center justify-between pt-1">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-500/15 text-purple-400 border border-purple-500/30">
                        New
                      </span>
                      <span className="text-xs text-purple-400 font-semibold cursor-pointer">
                        Start Prep →
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex items-center justify-between border-b border-[#212433] pb-4">
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <LayoutGrid className="w-4 h-4 text-purple-400" />
                      Visual Floor Plan & Table Management
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Tables stay occupied during guest meals. Availability is strictly released by the restaurant manager.
                    </p>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 text-xs font-semibold">
                    Floor Synchronization Active
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="p-4 rounded-2xl bg-[#0b2920] border border-[#10b981]/40 text-center">
                    <div className="text-xs font-bold text-emerald-300">Table 01</div>
                    <div className="text-[11px] text-emerald-400 font-medium mt-1">Available · 4 Seats</div>
                  </div>
                  <div className="p-4 rounded-2xl bg-[#142340] border border-[#3b82f6]/40 text-center">
                    <div className="text-xs font-bold text-blue-300">Table 02</div>
                    <div className="text-[11px] text-blue-400 font-medium mt-1">Occupied (Eating) · 4 Seats</div>
                  </div>
                  <div className="p-4 rounded-2xl bg-[#332014] border border-[#f59e0b]/40 text-center">
                    <div className="text-xs font-bold text-amber-300">Table 03</div>
                    <div className="text-[11px] text-amber-400 font-medium mt-1">Reserved 19:30 · 6 Seats</div>
                  </div>
                  <div className="p-4 rounded-2xl bg-[#0b2920] border border-[#10b981]/40 text-center">
                    <div className="text-xs font-bold text-emerald-300">Table 04</div>
                    <div className="text-[11px] text-emerald-400 font-medium mt-1">Available · 4 Seats</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Role-Based Portals Section */}
      <section id="portals" className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <span className="text-xs font-bold tracking-wider uppercase text-purple-400">
              Role-Based Access
            </span>
            <h2 className="text-3xl font-bold text-white tracking-tight">
              Tailored Screens for Every Restaurant Role
            </h2>
            <p className="text-sm text-slate-400">
              Staff only access their authorized workspace, ensuring operational focus and data integrity.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Card 1: Restaurant Admin */}
            <div className="p-6 rounded-3xl bg-[#13151f] border border-[#232738] flex flex-col justify-between hover:border-purple-500/40 transition group">
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-purple-500/10 text-purple-400 flex items-center justify-center border border-purple-500/20 group-hover:scale-105 transition">
                  <Store className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Restaurant Admin</h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Complete management of tables, live orders feed, reservations, inventory, team members, and business settings.
                  </p>
                </div>
                <ul className="space-y-2 text-xs text-slate-300 pt-2">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                    <span>Table availability & code toggling</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                    <span>Full orders progression & manual pay toggle</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                    <span>Menu catalog & pricing control</span>
                  </li>
                </ul>
              </div>

              <div className="pt-6">
                <Link
                  href="/restaurant-admin/login"
                  className="w-full py-3 px-4 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition flex items-center justify-center gap-2"
                >
                  <span>Admin Sign In</span>
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            </div>

            {/* Card 2: POS Orders Terminal */}
            <div className="p-6 rounded-3xl bg-[#13151f] border border-[#232738] flex flex-col justify-between hover:border-purple-500/40 transition group">
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20 group-hover:scale-105 transition">
                  <ShoppingCart className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Counter & Waiter POS</h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Lightning-fast order entry for cashiers and floor staff. Supports Dine-In with table validation, Takeaway, and Delivery.
                  </p>
                </div>
                <ul className="space-y-2 text-xs text-slate-300 pt-2">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>Mandatory table picker on Dine-In</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>Instant automatic station routing</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>Clean empty ticket on new order</span>
                  </li>
                </ul>
              </div>

              <div className="pt-6">
                <Link
                  href="/pos/login"
                  className="w-full py-3 px-4 rounded-xl bg-[#1b1f2e] hover:bg-[#252a3f] text-slate-100 text-xs font-bold border border-[#2e344d] transition flex items-center justify-center gap-2"
                >
                  <span>Staff POS Terminal</span>
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            </div>

            {/* Card 3: Kitchen & Bar Display */}
            <div className="p-6 rounded-3xl bg-[#13151f] border border-[#232738] flex flex-col justify-between hover:border-purple-500/40 transition group">
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center border border-amber-500/20 group-hover:scale-105 transition">
                  <ChefHat className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Kitchen & Bar KDS</h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Visual paperless ticket rails for chefs and bartenders with elapsed prep timers and station filter toggles.
                  </p>
                </div>
                <ul className="space-y-2 text-xs text-slate-300 pt-2">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span>Independent station advancement</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span>Individual item preparation checkboxes</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span>Dedicated bar and kitchen filters</span>
                  </li>
                </ul>
              </div>

              <div className="pt-6">
                <Link
                  href="/restaurant-admin/login"
                  className="w-full py-3 px-4 rounded-xl bg-[#1b1f2e] hover:bg-[#252a3f] text-slate-100 text-xs font-bold border border-[#2e344d] transition flex items-center justify-center gap-2"
                >
                  <span>Kitchen KDS Access</span>
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Enterprise Platform Features */}
      <section id="features" className="py-20 bg-[#0a0b0e] border-t border-[#181a24]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <span className="text-xs font-bold tracking-wider uppercase text-purple-400">
              Core Architecture
            </span>
            <h2 className="text-3xl font-bold text-white tracking-tight">
              Engineered for Speed, Reliability, & Zero Data Loss
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="p-5 rounded-2xl bg-[#12141c] border border-[#212433] space-y-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center border border-purple-500/20">
                <Zap className="w-5 h-5" />
              </div>
              <h4 className="text-base font-bold text-white">Cross-Tab Realtime Broadcast</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Tickets, table occupied states, and payment updates broadcast instantaneously across all connected POS terminals and kitchen screens.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-[#12141c] border border-[#212433] space-y-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center border border-indigo-500/20">
                <Layers className="w-5 h-5" />
              </div>
              <h4 className="text-base font-bold text-white">Dual-Layer Persistence</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Orders and table occupancy are safely backed to persistent local storage and disk so refreshing or network blips never wipe order feeds.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-[#12141c] border border-[#212433] space-y-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h4 className="text-base font-bold text-white">Strict Role Protection</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                No unauthenticated access via direct URL manipulation. Cookie-anchored middleware blocks unauthorized entry and protects administrative settings.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Footer Banner */}
      <section className="py-20 relative overflow-hidden">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="p-10 sm:p-14 rounded-3xl bg-gradient-to-br from-purple-900/40 via-[#181a26] to-indigo-900/30 border border-purple-500/30 text-center space-y-6 shadow-2xl relative">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              Ready to Upgrade Your Restaurant Operations?
            </h2>
            <p className="text-sm text-slate-300 max-w-xl mx-auto">
              Open your POS terminal or access management controls now.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <Link
                href="/restaurant-admin/login"
                className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition shadow-lg shadow-purple-950/50"
              >
                Sign In to Restaurant Portal
              </Link>
              <Link
                href="/pos/login"
                className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-[#232738] hover:bg-[#2c3147] text-white text-xs font-bold border border-[#373c56] transition"
              >
                Open POS Cashier Screen
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#1a1c26] bg-[#090a0d] py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-lg bg-purple-600 flex items-center justify-center text-white">
              <Utensils className="w-3.5 h-3.5" />
            </div>
            <span className="font-semibold text-slate-300">Restro POS Enterprise</span>
            <span>· All Rights Reserved © 2026</span>
          </div>

          <div className="flex items-center gap-6">
            <Link href="/restaurant-admin/login" className="hover:text-purple-400 transition">
              Admin Login
            </Link>
            <Link href="/pos/login" className="hover:text-purple-400 transition">
              POS Staff Login
            </Link>
            <span className="flex items-center gap-1.5 text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              All Systems Operational
            </span>
          </div>
        </div>
      </footer>
    </div>
  )
}
