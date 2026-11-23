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
  Receipt,
  Store,
  Layers,
  Lock,
  Plus,
  Minus,
  Trash2,
  RotateCcw,
  QrCode,
} from "lucide-react"

interface PreviewMenuItem {
  id: string
  name: string
  price: number
  category: "mains" | "sides" | "drinks"
  icon: string
  station: "kitchen" | "bar"
  tag?: string
}

const PREVIEW_CATALOG: PreviewMenuItem[] = [
  { id: "p1", name: "Classic Wagyu Burger", price: 349, category: "mains", icon: "🍔", station: "kitchen", tag: "Popular" },
  { id: "p2", name: "Margherita Artisan Pizza", price: 299, category: "mains", icon: "🍕", station: "kitchen", tag: "Chef Special" },
  { id: "p3", name: "Truffle Mushroom Pasta", price: 379, category: "mains", icon: "🍝", station: "kitchen" },
  { id: "p4", name: "Crispy Truffle Fries", price: 179, category: "sides", icon: "🍟", station: "kitchen", tag: "Crispy" },
  { id: "p5", name: "Caesar Salad Bowl", price: 219, category: "sides", icon: "🥗", station: "kitchen", tag: "Fresh" },
  { id: "p6", name: "Grilled Chicken Wings", price: 289, category: "sides", icon: "🍗", station: "kitchen", tag: "Spicy" },
  { id: "p7", name: "Craft IPA Beer", price: 249, category: "drinks", icon: "🍺", station: "bar", tag: "Cold" },
  { id: "p8", name: "Sparkling Berry Fizz", price: 149, category: "drinks", icon: "🍹", station: "bar" },
  { id: "p9", name: "Iced Caramel Macchiato", price: 169, category: "drinks", icon: "☕", station: "bar" },
]

export default function LandingPage() {
  const [mounted, setMounted] = useState(false)
  const [activeSessionRole, setActiveSessionRole] = useState<string | null>(null)
  const [previewTab, setPreviewTab] = useState<"pos" | "kds" | "tables">("pos")

  // POS Preview Interactive State
  const [posCategory, setPosCategory] = useState<"all" | "mains" | "sides" | "drinks">("all")
  const [posOrderType, setPosOrderType] = useState<"dine-in" | "takeaway" | "delivery">("dine-in")
  const [selectedTable, setSelectedTable] = useState("Table 01")
  const [posNotification, setPosNotification] = useState<string | null>(null)
  const [posCart, setPosCart] = useState<Array<{ id: string; name: string; price: number; quantity: number; station: "kitchen" | "bar" }>>([
    { id: "p1", name: "Classic Wagyu Burger", price: 349, quantity: 1, station: "kitchen" },
    { id: "p7", name: "Craft IPA Beer", price: 249, quantity: 1, station: "bar" },
  ])

  // KDS Preview Interactive State
  const [kdsStationFilter, setKdsStationFilter] = useState<"all" | "kitchen" | "bar">("all")
  const [kdsTickets, setKdsTickets] = useState([
    {
      id: "9201-K",
      num: "#9201",
      table: "Table 02",
      time: "4m ago",
      station: "kitchen" as const,
      items: ["2x Classic Wagyu Burger", "1x Crispy Truffle Fries"],
      stage: "preparing" as "new" | "preparing" | "ready" | "completed",
    },
    {
      id: "9201-B",
      num: "#9201",
      table: "Table 02",
      time: "4m ago",
      station: "bar" as const,
      items: ["1x Craft IPA Beer", "1x Sparkling Berry Fizz"],
      stage: "ready" as "new" | "preparing" | "ready" | "completed",
    },
    {
      id: "9204-K",
      num: "#9204",
      table: "Takeaway",
      time: "1m ago",
      station: "kitchen" as const,
      items: ["1x Margherita Artisan Pizza"],
      stage: "new" as "new" | "preparing" | "ready" | "completed",
    },
  ])

  // Tables Preview Interactive State
  const [floorTables, setFloorTables] = useState([
    { id: 1, name: "Table 01", seats: 4, status: "available" as "available" | "occupied" | "reserved" },
    { id: 2, name: "Table 02", seats: 4, status: "occupied" as "available" | "occupied" | "reserved" },
    { id: 3, name: "Table 03", seats: 6, status: "reserved" as "available" | "occupied" | "reserved" },
    { id: 4, name: "Table 04", seats: 4, status: "available" as "available" | "occupied" | "reserved" },
    { id: 6, name: "Table 06", seats: 6, status: "available" as "available" | "occupied" | "reserved" },
    { id: 7, name: "Table 07", seats: 4, status: "occupied" as "available" | "occupied" | "reserved" },
    { id: 8, name: "Table 8", seats: 4, status: "available" as "available" | "occupied" | "reserved" },
  ])

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

  // POS Cart operations
  const filteredCatalog = posCategory === "all"
    ? PREVIEW_CATALOG
    : PREVIEW_CATALOG.filter((i) => i.category === posCategory)

  const cartSubtotal = posCart.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const cartTax = cartSubtotal * 0.05
  const cartTotal = cartSubtotal + cartTax

  const addToCart = (item: PreviewMenuItem) => {
    setPosCart((prev) => {
      const existing = prev.find((i) => i.id === item.id)
      if (existing) {
        return prev.map((i) => (i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i))
      }
      return [...prev, { id: item.id, name: item.name, price: item.price, quantity: 1, station: item.station }]
    })
  }

  const updateCartQty = (id: string, delta: number) => {
    setPosCart((prev) =>
      prev
        .map((i) => (i.id === id ? { ...i, quantity: i.quantity + delta } : i))
        .filter((i) => i.quantity > 0)
    )
  }

  const advanceKdsTicket = (id: string) => {
    setKdsTickets((prev) =>
      prev.map((t) => {
        if (t.id === id) {
          const nextStage =
            t.stage === "new"
              ? "preparing"
              : t.stage === "preparing"
              ? "ready"
              : t.stage === "ready"
              ? "completed"
              : "new"
          return { ...t, stage: nextStage }
        }
        return t
      })
    )
  }

  const toggleTableStatus = (id: number) => {
    setFloorTables((prev) =>
      prev.map((t) => {
        if (t.id === id) {
          const next = t.status === "available" ? "occupied" : "available"
          return { ...t, status: next }
        }
        return t
      })
    )
  }

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
            <a href="#stations" className="hover:text-purple-400 transition">
              Interactive POS & KDS
            </a>
            <a href="#portals" className="hover:text-purple-400 transition">
              Portals
            </a>
            <a href="#features" className="hover:text-purple-400 transition">
              Features
            </a>
          </nav>

          {/* Action CTAs */}
          <div className="flex items-center gap-2.5">
            <Link
              href="/menu?table=Table%2001"
              className="px-3.5 py-2 rounded-xl text-xs font-semibold text-purple-300 hover:text-white bg-purple-600/15 hover:bg-purple-600/25 border border-purple-500/30 transition flex items-center gap-1.5"
            >
              <QrCode className="w-3.5 h-3.5 text-purple-400" />
              <span>QR Menu</span>
            </Link>
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
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gradient-to-b from-purple-600/15 via-indigo-600/10 to-transparent blur-3xl pointer-events-none -z-10" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#1b1e2c] border border-purple-500/30 text-purple-300 text-xs font-medium shadow-inner shadow-purple-500/10">
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            <span>High-Speed Counter POS & Real-Time Kitchen Rails</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white max-w-4xl mx-auto leading-tight sm:leading-tight">
            Run Your Restaurant Operations.{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-indigo-400">
              Seamlessly from Counter to Kitchen.
            </span>
          </h1>

          <p className="text-base sm:text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Unify high-speed order taking, interactive table floor management,
            and decoupled Kitchen & Bar display systems with persistent sync and zero downtime.
          </p>

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

          {/* Metrics ticker */}
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
              Interactive Live Preview
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Test Drive the Stations Live
            </h2>
            <p className="text-xs sm:text-sm text-slate-400">
              Click through the tabs, add items to the cart, select tables, and test ticket progression.
            </p>
          </div>

          {/* Master View Switcher Tabs */}
          <div className="flex items-center justify-center gap-2 max-w-md mx-auto p-1 rounded-2xl bg-[#141620] border border-[#232738]">
            <button
              onClick={() => setPreviewTab("pos")}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center justify-center gap-2 ${
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
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center justify-center gap-2 ${
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
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center justify-center gap-2 ${
                previewTab === "tables"
                  ? "bg-purple-600 text-white shadow-md shadow-purple-900/30"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Table Floor</span>
            </button>
          </div>

          {/* Preview Canvas */}
          <div className="rounded-3xl bg-[#12141c] border border-[#232738] p-6 shadow-2xl relative overflow-hidden">
            {previewTab === "pos" ? (
              /* --- POINT OF SALE INTERACTIVE PREVIEW --- */
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-[#212433] pb-4">
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <ShoppingCart className="w-4 h-4 text-purple-400" />
                      Point of Sale Counter Terminal
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Touch-ready order creation with mandatory table picker for Dine-In orders.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {posNotification && (
                      <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-semibold animate-pulse">
                        {posNotification}
                      </span>
                    )}
                    <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-semibold">
                      Register Active
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Left Column: Category Tabs + Catalog */}
                  <div className="lg:col-span-2 space-y-4">
                    {/* Dynamic Category Tabs */}
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        onClick={() => setPosCategory("all")}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                          posCategory === "all"
                            ? "bg-purple-600 text-white shadow-md shadow-purple-900/30"
                            : "bg-[#181a24] text-slate-400 hover:text-white border border-[#252837]"
                        }`}
                      >
                        All Items ({PREVIEW_CATALOG.length})
                      </button>
                      <button
                        onClick={() => setPosCategory("mains")}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                          posCategory === "mains"
                            ? "bg-purple-600 text-white shadow-md shadow-purple-900/30"
                            : "bg-[#181a24] text-slate-400 hover:text-white border border-[#252837]"
                        }`}
                      >
                        Mains & Pizza
                      </button>
                      <button
                        onClick={() => setPosCategory("sides")}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                          posCategory === "sides"
                            ? "bg-purple-600 text-white shadow-md shadow-purple-900/30"
                            : "bg-[#181a24] text-slate-400 hover:text-white border border-[#252837]"
                        }`}
                      >
                        Sides
                      </button>
                      <button
                        onClick={() => setPosCategory("drinks")}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                          posCategory === "drinks"
                            ? "bg-purple-600 text-white shadow-md shadow-purple-900/30"
                            : "bg-[#181a24] text-slate-400 hover:text-white border border-[#252837]"
                        }`}
                      >
                        Drinks & Bar
                      </button>
                    </div>

                    {/* Menu Item Cards */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {filteredCatalog.map((item) => (
                        <div
                          key={item.id}
                          onClick={() => addToCart(item)}
                          className="p-3 rounded-2xl bg-[#161822] hover:bg-[#1c1f2e] border border-[#262a3b] hover:border-purple-500/40 transition cursor-pointer flex flex-col justify-between group shadow-sm"
                        >
                          <div>
                            <div className="flex items-start justify-between">
                              <span className="text-2xl mb-1 group-hover:scale-110 transition">{item.icon}</span>
                              {item.tag && (
                                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-purple-500/15 text-purple-300 border border-purple-500/20">
                                  {item.tag}
                                </span>
                              )}
                            </div>
                            <div className="text-xs font-bold text-white mt-1 group-hover:text-purple-300 transition">
                              {item.name}
                            </div>
                            <div className="text-[11px] text-purple-400 font-semibold mt-0.5">
                              ₹{item.price.toFixed(2)}
                            </div>
                          </div>

                          <div className="mt-3 flex items-center justify-between pt-2 border-t border-[#222535]">
                            <span
                              className={`text-[10px] font-medium ${
                                item.station === "bar" ? "text-amber-400" : "text-emerald-400"
                              }`}
                            >
                              {item.station === "bar" ? "Bar Station" : "Kitchen Item"}
                            </span>
                            <span className="w-5 h-5 rounded-md bg-purple-600/30 text-purple-300 flex items-center justify-center text-xs group-hover:bg-purple-600 group-hover:text-white transition">
                              <Plus className="w-3 h-3" />
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Right Column: Live Ticket & Order Controls */}
                  <div className="p-4 rounded-2xl bg-[#161822] border border-[#262a3b] flex flex-col justify-between space-y-4">
                    <div className="space-y-3">
                      {/* Cart Header */}
                      <div className="flex items-center justify-between border-b border-[#242838] pb-2">
                        <span className="text-xs font-bold text-white flex items-center gap-1.5">
                          <Receipt className="w-3.5 h-3.5 text-purple-400" />
                          Live Ticket #1048
                        </span>
                        {posCart.length > 0 && (
                          <button
                            onClick={() => setPosCart([])}
                            className="text-[11px] text-red-400 hover:text-red-300 flex items-center gap-1 cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3" /> Clear
                          </button>
                        )}
                      </div>

                      {/* Order Type Tabs: Dine In / Takeaway / Delivery */}
                      <div className="space-y-1.5">
                        <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">
                          Order Channel
                        </span>
                        <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-[#12141c] border border-[#242838]">
                          <button
                            onClick={() => setPosOrderType("dine-in")}
                            className={`py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer text-center ${
                              posOrderType === "dine-in"
                                ? "bg-purple-600 text-white shadow-xs"
                                : "text-slate-400 hover:text-white"
                            }`}
                          >
                            Dine In
                          </button>
                          <button
                            onClick={() => setPosOrderType("takeaway")}
                            className={`py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer text-center ${
                              posOrderType === "takeaway"
                                ? "bg-purple-600 text-white shadow-xs"
                                : "text-slate-400 hover:text-white"
                            }`}
                          >
                            Takeaway
                          </button>
                          <button
                            onClick={() => setPosOrderType("delivery")}
                            className={`py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer text-center ${
                              posOrderType === "delivery"
                                ? "bg-purple-600 text-white shadow-xs"
                                : "text-slate-400 hover:text-white"
                            }`}
                          >
                            Delivery
                          </button>
                        </div>
                      </div>

                      {/* Mandatory Table Selection Tabs (When Dine-In is active) */}
                      {posOrderType === "dine-in" && (
                        <div className="p-2.5 rounded-xl bg-[#12141c] border border-purple-500/25 space-y-2">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-purple-300 font-semibold flex items-center gap-1">
                              <LayoutGrid className="w-3.5 h-3.5 text-purple-400" /> Select Table (Mandatory):
                            </span>
                            <span className="text-white font-bold px-1.5 py-0.5 rounded-md bg-purple-600/30 text-[10px]">
                              {selectedTable}
                            </span>
                          </div>
                          <div className="grid grid-cols-4 gap-1.5">
                            {["Table 01", "Table 02", "Table 03", "Table 04"].map((tbl) => (
                              <button
                                key={tbl}
                                onClick={() => setSelectedTable(tbl)}
                                className={`py-1.5 rounded-lg text-[11px] font-semibold transition cursor-pointer text-center ${
                                  selectedTable === tbl
                                    ? "bg-purple-600 text-white shadow-xs"
                                    : "bg-[#181a24] text-slate-400 hover:text-white border border-[#282c3e]"
                                }`}
                              >
                                {tbl}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Dynamic Cart Items List */}
                      <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                        {posCart.length === 0 ? (
                          <div className="py-6 text-center text-xs text-slate-500">
                            Ticket is empty. Tap any menu item to add.
                          </div>
                        ) : (
                          posCart.map((item) => (
                            <div
                              key={item.id}
                              className="p-2 rounded-xl bg-[#12141c] border border-[#212433] flex items-center justify-between text-xs"
                            >
                              <div>
                                <div className="font-semibold text-slate-200">{item.name}</div>
                                <div className="text-[10px] text-purple-400">
                                  ₹{item.price.toFixed(2)} each · {item.station.toUpperCase()}
                                </div>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <button
                                  onClick={() => updateCartQty(item.id, -1)}
                                  className="w-5 h-5 rounded-md bg-[#232738] hover:bg-[#2e334a] text-slate-300 flex items-center justify-center cursor-pointer"
                                >
                                  <Minus className="w-2.5 h-2.5" />
                                </button>
                                <span className="font-bold text-white text-xs w-4 text-center">
                                  {item.quantity}
                                </span>
                                <button
                                  onClick={() => updateCartQty(item.id, 1)}
                                  className="w-5 h-5 rounded-md bg-[#232738] hover:bg-[#2e334a] text-slate-300 flex items-center justify-center cursor-pointer"
                                >
                                  <Plus className="w-2.5 h-2.5" />
                                </button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    {/* Subtotal & Actions */}
                    <div className="pt-3 border-t border-[#242838] space-y-2.5">
                      <div className="space-y-1 text-xs text-slate-400">
                        <div className="flex justify-between">
                          <span>Subtotal</span>
                          <span className="text-slate-200">₹{cartSubtotal.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>GST (5%)</span>
                          <span className="text-slate-200">₹{cartTax.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-sm font-bold text-white pt-1 border-t border-[#222535]">
                          <span>Total Due</span>
                          <span className="text-purple-400">₹{cartTotal.toFixed(2)}</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <button
                          disabled={posCart.length === 0}
                          onClick={() => {
                            setPosNotification(`Order sent to ${selectedTable} & Kitchen KDS!`)
                            setTimeout(() => setPosNotification(null), 3000)
                          }}
                          className="py-2.5 text-center rounded-xl bg-[#232738] hover:bg-[#2d3247] text-slate-200 text-xs font-semibold border border-[#2f344a] transition disabled:opacity-40 cursor-pointer"
                        >
                          Send to Kitchen
                        </button>
                        <button
                          disabled={posCart.length === 0}
                          onClick={() => {
                            setPosNotification(`Paid ₹${cartTotal.toFixed(2)}! Order Completed.`)
                            setTimeout(() => setPosNotification(null), 3000)
                          }}
                          className="py-2.5 text-center rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-xs disabled:opacity-40 cursor-pointer"
                        >
                          Checkout
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : previewTab === "kds" ? (
              /* --- KITCHEN & BAR KDS INTERACTIVE PREVIEW --- */
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-[#212433] pb-4">
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <ChefHat className="w-4 h-4 text-purple-400" />
                      Kitchen & Bar Display System (KDS)
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Decoupled station tracking: advancing kitchen tickets will never overwrite bar drinks.
                    </p>
                  </div>
                  {/* KDS Station Filter Tabs */}
                  <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[#141620] border border-[#242838]">
                    <button
                      onClick={() => setKdsStationFilter("all")}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                        kdsStationFilter === "all"
                          ? "bg-purple-600 text-white shadow-xs"
                          : "text-slate-400 hover:text-white"
                      }`}
                    >
                      All Stations
                    </button>
                    <button
                      onClick={() => setKdsStationFilter("kitchen")}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                        kdsStationFilter === "kitchen"
                          ? "bg-purple-600 text-white shadow-xs"
                          : "text-slate-400 hover:text-white"
                      }`}
                    >
                      Kitchen Station
                    </button>
                    <button
                      onClick={() => setKdsStationFilter("bar")}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                        kdsStationFilter === "bar"
                          ? "bg-amber-600 text-white shadow-xs"
                          : "text-slate-400 hover:text-white"
                      }`}
                    >
                      Bar Station
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {kdsTickets
                    .filter((t) => kdsStationFilter === "all" || t.station === kdsStationFilter)
                    .map((ticket) => (
                      <div
                        key={ticket.id}
                        className="p-4 rounded-2xl bg-[#161822] border border-[#2b2f42] space-y-3 flex flex-col justify-between"
                      >
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-xs text-white">
                              {ticket.num} · {ticket.table}
                            </span>
                            <span className="text-[10px] text-slate-400 flex items-center gap-1">
                              <Clock className="w-3 h-3 text-purple-400" /> {ticket.time}
                            </span>
                          </div>
                          <div className="p-2.5 rounded-xl bg-[#12141c] text-xs space-y-1">
                            {ticket.items.map((it, idx) => (
                              <div key={idx} className="font-semibold text-slate-200">
                                {ticket.station === "bar" ? "🍸" : "🍳"} {it}
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-[#212433]">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${
                              ticket.stage === "new"
                                ? "bg-purple-500/15 text-purple-400 border border-purple-500/30"
                                : ticket.stage === "preparing"
                                ? "bg-blue-500/15 text-blue-400 border border-blue-500/30"
                                : ticket.stage === "ready"
                                ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                                : "bg-slate-700 text-slate-300"
                            }`}
                          >
                            {ticket.stage}
                          </span>
                          <button
                            onClick={() => advanceKdsTicket(ticket.id)}
                            className="text-xs text-purple-400 hover:text-purple-300 font-semibold cursor-pointer"
                          >
                            {ticket.stage === "new"
                              ? "Start Prep →"
                              : ticket.stage === "preparing"
                              ? "Mark Ready →"
                              : ticket.stage === "ready"
                              ? "Mark Served →"
                              : "Reset ↺"}
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            ) : (
              /* --- TABLE FLOOR MANAGEMENT INTERACTIVE PREVIEW --- */
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-[#212433] pb-4">
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <LayoutGrid className="w-4 h-4 text-purple-400" />
                      Visual Floor Plan & Table Management
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Click any table to test toggling its occupancy. Tables remain occupied until manually freed by the manager.
                    </p>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 text-xs font-semibold">
                    Floor Synchronization Active
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {floorTables.map((tbl) => (
                    <div
                      key={tbl.id}
                      onClick={() => toggleTableStatus(tbl.id)}
                      className={`p-4 rounded-2xl text-center cursor-pointer transition border ${
                        tbl.status === "available"
                          ? "bg-[#0b2920] border-[#10b981]/40 hover:border-emerald-400"
                          : tbl.status === "occupied"
                          ? "bg-[#142340] border-[#3b82f6]/40 hover:border-blue-400"
                          : "bg-[#332014] border-[#f59e0b]/40 hover:border-amber-400"
                      }`}
                    >
                      <div
                        className={`text-xs font-bold ${
                          tbl.status === "available"
                            ? "text-emerald-300"
                            : tbl.status === "occupied"
                            ? "text-blue-300"
                            : "text-amber-300"
                        }`}
                      >
                        {tbl.name}
                      </div>
                      <div
                        className={`text-[11px] font-medium mt-1 ${
                          tbl.status === "available"
                            ? "text-emerald-400"
                            : tbl.status === "occupied"
                            ? "text-blue-400"
                            : "text-amber-400"
                        }`}
                      >
                        {tbl.status === "available"
                          ? "Available (Tap to Occupy)"
                          : tbl.status === "occupied"
                          ? "Occupied (Tap to Free)"
                          : "Reserved 19:30"}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">{tbl.seats} Seats</div>
                    </div>
                  ))}
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
