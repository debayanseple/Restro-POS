"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import QRCode from "qrcode"
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
  CheckCircle2,
  ChevronRight,
  Receipt,
  Store,
  Layers,
  Lock,
  Plus,
  Minus,
  Trash2,
  QrCode,
  Check,
  Smartphone,
  ExternalLink,
  Copy,
  Bell,
  Search,
  BellRing,
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
  { id: "p7", name: "Craft IPA Beer", price: 249, category: "drinks", icon: "🍺", station: "bar", tag: "Chilled" },
  { id: "p8", name: "Sparkling Berry Fizz", price: 149, category: "drinks", icon: "🍹", station: "bar" },
  { id: "p9", name: "Iced Caramel Macchiato", price: 169, category: "drinks", icon: "☕", station: "bar" },
]

export default function LandingPage() {
  const [mounted, setMounted] = useState(false)
  const [activeSessionRole, setActiveSessionRole] = useState<string | null>(null)
  const [previewTab, setPreviewTab] = useState<"pos" | "kds" | "tables" | "qr-menu">("pos")
  const [isScrolled, setIsScrolled] = useState(false)
  const [origin, setOrigin] = useState("")
  const [demoQrUrl, setDemoQrUrl] = useState("")
  const [copiedDemoLink, setCopiedDemoLink] = useState(false)

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
    if (typeof window !== "undefined") {
      const currOrigin = window.location.origin
      setOrigin(currOrigin)
      const demoUrl = `${currOrigin}/menu?demo=true&table=Demo%20Table%2001`
      QRCode.toDataURL(demoUrl, {
        width: 320,
        margin: 2,
        color: {
          dark: "#20252B",
          light: "#ffffff",
        },
      })
        .then((url) => setDemoQrUrl(url))
        .catch(() => {})
    }

    const roleCookie = document.cookie.replace(
      /(?:(?:^|.*)\s*user_role\s*=\s*([^;]*).*$)|^.*$/,
      "$1"
    )
    if (roleCookie) {
      setActiveSessionRole(roleCookie)
    }

    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10)
    }
    window.addEventListener("scroll", handleScroll, { passive: true })
    handleScroll()

    return () => window.removeEventListener("scroll", handleScroll)
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
    <div className="min-h-screen bg-[#F7F5F0] text-[#20252B] selection:bg-[#C46B4E]/20 selection:text-[#C46B4E] font-sans">
      {/* Sticky Top Navigation Bar */}
      <div
        className={`sticky top-0 z-50 transition-all duration-300 ${
          isScrolled
            ? "bg-[#F7F5F0]/95 backdrop-blur-md shadow-md shadow-[#20252B]/5 border-b border-[#E5E1D9]"
            : "bg-[#F7F5F0] border-b border-[#E5E1D9]"
        }`}
      >
        {/* Top Session Bar (if logged in) */}
        {mounted && activeSessionRole ? (
          <div className="bg-[#E9E3D8] border-b border-[#E5E1D9]/70 px-4 py-1.5 text-xs flex items-center justify-between text-[#20252B]">
            <div className="flex items-center gap-2 max-w-7xl mx-auto w-full">
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-600 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600"></span>
              </span>
              <span className="text-[#20252B]">
                Active session: <strong className="font-semibold capitalize">{activeSessionRole.replace("pos-", "POS ")}</strong>
              </span>
              <div className="ml-auto flex items-center gap-3">
                <Link
                  href="/restaurant-admin"
                  className="inline-flex items-center gap-1 font-semibold text-[#C46B4E] hover:text-[#B25C40] transition"
                >
                  Go to Workspace <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </div>
        ) : null}

        {/* Main Navigation Bar */}
        <header className="transition-all duration-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between gap-4">
          {/* Brand Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-[#C46B4E] flex items-center justify-center text-white shadow-xs group-hover:bg-[#B25C40] transition">
              <Utensils className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-base tracking-tight text-[#20252B]">
                  Restro POS
                </span>
                <span className="text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded-md bg-[#E9E3D8] text-[#20252B] border border-[#E5E1D9]">
                  Enterprise
                </span>
              </div>
              <span className="text-[11px] text-[#64748B] font-medium block">
                Restaurant Operating System
              </span>
            </div>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-8 text-xs font-medium text-[#64748B]">
            <a href="#stations" className="hover:text-[#20252B] transition">
              Interactive POS & KDS
            </a>
            <a href="#portals" className="hover:text-[#20252B] transition">
              Portals
            </a>
            <a href="#features" className="hover:text-[#20252B] transition">
              Architecture
            </a>
          </nav>

          {/* Action CTAs */}
          <div className="flex items-center gap-2.5">
            <Link
              href="/menu?table=Table%2001"
              className="px-3.5 py-2 rounded-lg text-xs font-medium text-[#20252B] bg-white hover:bg-[#F7F5F0] border border-[#E5E1D9] transition flex items-center gap-1.5 shadow-2xs"
            >
              <QrCode className="w-3.5 h-3.5 text-[#C46B4E]" />
              <span>QR Menu</span>
            </Link>
            <Link
              href="/pos/login"
              className="px-3.5 py-2 rounded-lg text-xs font-medium text-[#20252B] bg-white hover:bg-[#F7F5F0] border border-[#20252B] transition flex items-center gap-1.5"
            >
              <ShoppingCart className="w-3.5 h-3.5 text-[#64748B]" />
              <span>POS Login</span>
            </Link>
            <Link
              href="/restaurant-admin/login"
              className="px-4 py-2 rounded-lg text-xs font-semibold text-white bg-[#C46B4E] hover:bg-[#B25C40] transition flex items-center gap-1.5 shadow-xs"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Admin Portal</span>
            </Link>
          </div>
        </div>
      </header>
    </div>

      {/* Hero Section */}
      <section className="relative pt-20 pb-20 overflow-hidden bg-[#F7F5F0]">
        {/* Animated line artwork + warm drifting glows */}
        <div aria-hidden className="pointer-events-none absolute inset-0 hero-lines" />
        <div
          aria-hidden
          className="pointer-events-none absolute -top-28 left-1/2 -translate-x-1/2 w-[34rem] h-[34rem] rounded-full bg-[#C46B4E]/10 blur-3xl hero-glow"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-24 -right-20 w-72 h-72 rounded-full bg-[#E9E3D8] blur-3xl hero-glow"
          style={{ animationDelay: "-4s" }}
        />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
          <div className="hero-rise inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#E9E3D8] border border-[#E5E1D9] text-[#20252B] text-xs font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-[#C46B4E]" />
            <span>High-Speed Counter POS & Real-Time Kitchen Rails</span>
          </div>

          <h1 className="hero-rise text-4xl sm:text-6xl font-bold tracking-tight text-[#20252B] max-w-4xl mx-auto leading-tight sm:leading-tight" style={{ animationDelay: "0.08s" }}>
            Run Your Restaurant Operations.{" "}
            <span className="text-[#C46B4E]">
              Seamlessly from Counter to Kitchen.
            </span>
          </h1>

          <p className="hero-rise text-base sm:text-lg text-[#64748B] max-w-2xl mx-auto leading-relaxed" style={{ animationDelay: "0.16s" }}>
            Unify high-speed order taking, interactive table floor management,
            and decoupled Kitchen & Bar display systems with persistent sync and zero downtime.
          </p>

          <div className="hero-rise pt-3 flex flex-col sm:flex-row items-center justify-center gap-3.5" style={{ animationDelay: "0.24s" }}>
            <Link
              href="/restaurant-admin/login"
              className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-[#C46B4E] hover:bg-[#B25C40] text-white font-semibold text-sm transition flex items-center justify-center gap-2 group shadow-xs"
            >
              <span>Book Your Free Demo</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition" />
            </Link>
            <Link
              href="/pos/login"
              className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-white hover:bg-[#F7F5F0] text-[#20252B] font-semibold text-sm border border-[#20252B] transition flex items-center justify-center gap-2"
            >
              <ShoppingCart className="w-4 h-4 text-[#C46B4E]" />
              <span>Counter & Waiter Terminal</span>
            </Link>
          </div>

          {/* Metrics Row */}
          <div className="hero-rise pt-12 grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-4xl mx-auto" style={{ animationDelay: "0.32s" }}>
            <div className="p-4 rounded-xl bg-white border border-[#E5E1D9] text-center shadow-2xs">
              <div className="text-2xl font-bold text-[#20252B] tracking-tight">&lt; 100ms</div>
              <div className="text-xs text-[#64748B] font-medium mt-0.5">Ticket Dispatch Speed</div>
            </div>
            <div className="p-4 rounded-xl bg-white border border-[#E5E1D9] text-center shadow-2xs">
              <div className="text-2xl font-bold text-[#C46B4E] tracking-tight">100% Split</div>
              <div className="text-xs text-[#64748B] font-medium mt-0.5">Kitchen & Bar Separation</div>
            </div>
            <div className="p-4 rounded-xl bg-white border border-[#E5E1D9] text-center shadow-2xs">
              <div className="text-2xl font-bold text-emerald-800 tracking-tight">Zero-Reset</div>
              <div className="text-xs text-[#64748B] font-medium mt-0.5">Admin-Controlled Tables</div>
            </div>
            <div className="p-4 rounded-xl bg-white border border-[#E5E1D9] text-center shadow-2xs">
              <div className="text-2xl font-bold text-[#20252B] tracking-tight">Multi-Station</div>
              <div className="text-xs text-[#64748B] font-medium mt-0.5">Realtime Cross-Tab Sync</div>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive Live Station Showcase (Secondary Background Pure White) */}
      <section id="stations" className="py-20 bg-white border-y border-[#E5E1D9]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <span className="text-xs font-bold tracking-wider uppercase text-[#C46B4E]">
              Interactive Live Preview
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-[#20252B] tracking-tight">
              Test Drive the Stations Live
            </h2>
            <p className="text-xs sm:text-sm text-[#64748B]">
              Click through the tabs, add items to the cart, select tables, and test ticket progression.
            </p>
          </div>

          {/* Master View Switcher Tabs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 max-w-2xl mx-auto p-1.5 rounded-xl bg-[#E9E3D8] border border-[#E5E1D9]">
            <button
              onClick={() => setPreviewTab("pos")}
              className={`py-2 px-3 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center justify-center gap-2 ${
                previewTab === "pos"
                  ? "bg-[#C46B4E] text-white shadow-2xs"
                  : "text-[#20252B] hover:text-[#C46B4E]"
              }`}
            >
              <ShoppingCart className="w-3.5 h-3.5" />
              <span>POS Terminal</span>
            </button>
            <button
              onClick={() => setPreviewTab("kds")}
              className={`py-2 px-3 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center justify-center gap-2 ${
                previewTab === "kds"
                  ? "bg-[#C46B4E] text-white shadow-2xs"
                  : "text-[#20252B] hover:text-[#C46B4E]"
              }`}
            >
              <ChefHat className="w-3.5 h-3.5" />
              <span>Kitchen & Bar</span>
            </button>
            <button
              onClick={() => setPreviewTab("tables")}
              className={`py-2 px-3 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center justify-center gap-2 ${
                previewTab === "tables"
                  ? "bg-[#C46B4E] text-white shadow-2xs"
                  : "text-[#20252B] hover:text-[#C46B4E]"
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Table Floor</span>
            </button>
            <button
              onClick={() => setPreviewTab("qr-menu")}
              className={`py-2 px-3 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center justify-center gap-1.5 ${
                previewTab === "qr-menu"
                  ? "bg-[#C46B4E] text-white shadow-2xs"
                  : "text-[#20252B] hover:text-[#C46B4E]"
              }`}
            >
              <QrCode className="w-3.5 h-3.5" />
              <span>QR Menu</span>
              <span
                className={`text-[9px] px-1.5 py-0.2 rounded font-bold uppercase ${
                  previewTab === "qr-menu"
                    ? "bg-white/20 text-white"
                    : "bg-[#C46B4E]/15 text-[#C46B4E]"
                }`}
              >
                Demo
              </span>
            </button>
          </div>

          {/* Preview Canvas: Contrast Deep Charcoal Surface */}
          <div className="rounded-2xl bg-[#20252B] border border-[#2D333B] p-6 shadow-sm relative overflow-hidden text-[#F7F5F0]">
            {previewTab === "pos" ? (
              /* --- POINT OF SALE INTERACTIVE PREVIEW --- */
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-[#2D333B] pb-4">
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <ShoppingCart className="w-4 h-4 text-[#C46B4E]" />
                      Point of Sale Counter Terminal
                    </h3>
                    <p className="text-xs text-[#94A3B8] mt-0.5">
                      Touch-ready order creation with mandatory table picker for Dine-In orders.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {posNotification && (
                      <span className="px-3 py-1 rounded-md bg-emerald-950/80 text-emerald-300 border border-emerald-800 text-xs font-semibold">
                        {posNotification}
                      </span>
                    )}
                    <span className="px-2.5 py-1 rounded-md bg-emerald-950/60 text-emerald-400 border border-emerald-800/80 text-xs font-medium">
                      Register Active
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Left Column: Category Tabs + Catalog */}
                  <div className="lg:col-span-2 space-y-4">
                    {/* Category Filter Tabs */}
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        onClick={() => setPosCategory("all")}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                          posCategory === "all"
                            ? "bg-[#C46B4E] text-white"
                            : "bg-[#2B323B] text-[#94A3B8] hover:text-white border border-[#353D47]"
                        }`}
                      >
                        All Items ({PREVIEW_CATALOG.length})
                      </button>
                      <button
                        onClick={() => setPosCategory("mains")}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                          posCategory === "mains"
                            ? "bg-[#C46B4E] text-white"
                            : "bg-[#2B323B] text-[#94A3B8] hover:text-white border border-[#353D47]"
                        }`}
                      >
                        Mains & Pizza
                      </button>
                      <button
                        onClick={() => setPosCategory("sides")}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                          posCategory === "sides"
                            ? "bg-[#C46B4E] text-white"
                            : "bg-[#2B323B] text-[#94A3B8] hover:text-white border border-[#353D47]"
                        }`}
                      >
                        Sides
                      </button>
                      <button
                        onClick={() => setPosCategory("drinks")}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                          posCategory === "drinks"
                            ? "bg-[#C46B4E] text-white"
                            : "bg-[#2B323B] text-[#94A3B8] hover:text-white border border-[#353D47]"
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
                          className="p-3 rounded-xl bg-[#262C34] hover:bg-[#2D343E] border border-[#353D47] hover:border-[#C46B4E] transition cursor-pointer flex flex-col justify-between group"
                        >
                          <div>
                            <div className="flex items-start justify-between">
                              <span className="text-2xl mb-1">{item.icon}</span>
                              {item.tag && (
                                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-[#C46B4E]/20 text-[#E8C2B5] border border-[#C46B4E]/30">
                                  {item.tag}
                                </span>
                              )}
                            </div>
                            <div className="text-xs font-semibold text-white mt-1 group-hover:text-[#E8C2B5] transition">
                              {item.name}
                            </div>
                            <div className="text-xs text-[#E8C2B5] font-semibold mt-0.5">
                              ₹{item.price.toFixed(2)}
                            </div>
                          </div>

                          <div className="mt-3 flex items-center justify-between pt-2 border-t border-[#353D47]">
                            <span
                              className={`text-[10px] font-medium ${
                                item.station === "bar" ? "text-amber-400" : "text-emerald-400"
                              }`}
                            >
                              {item.station === "bar" ? "Bar Station" : "Kitchen Item"}
                            </span>
                            <span className="w-5 h-5 rounded-md bg-[#C46B4E] text-white flex items-center justify-center text-xs group-hover:bg-[#B25C40] transition">
                              <Plus className="w-3 h-3" />
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Right Column: Live Ticket & Order Controls */}
                  <div className="p-4 rounded-xl bg-[#262C34] border border-[#353D47] flex flex-col justify-between space-y-4">
                    <div className="space-y-3">
                      {/* Cart Header */}
                      <div className="flex items-center justify-between border-b border-[#353D47] pb-2">
                        <span className="text-xs font-semibold text-white flex items-center gap-1.5">
                          <Receipt className="w-3.5 h-3.5 text-[#C46B4E]" />
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

                      {/* Order Channel: Dine In / Takeaway / Delivery */}
                      <div className="space-y-1.5">
                        <span className="text-[10px] text-[#94A3B8] font-medium uppercase tracking-wider block">
                          Order Channel
                        </span>
                        <div className="grid grid-cols-3 gap-1 p-1 rounded-lg bg-[#1E2329] border border-[#353D47]">
                          <button
                            onClick={() => setPosOrderType("dine-in")}
                            className={`py-1.5 rounded-md text-xs font-medium transition cursor-pointer text-center ${
                              posOrderType === "dine-in"
                                ? "bg-[#C46B4E] text-white"
                                : "text-[#94A3B8] hover:text-white"
                            }`}
                          >
                            Dine In
                          </button>
                          <button
                            onClick={() => setPosOrderType("takeaway")}
                            className={`py-1.5 rounded-md text-xs font-medium transition cursor-pointer text-center ${
                              posOrderType === "takeaway"
                                ? "bg-[#C46B4E] text-white"
                                : "text-[#94A3B8] hover:text-white"
                            }`}
                          >
                            Takeaway
                          </button>
                          <button
                            onClick={() => setPosOrderType("delivery")}
                            className={`py-1.5 rounded-md text-xs font-medium transition cursor-pointer text-center ${
                              posOrderType === "delivery"
                                ? "bg-[#C46B4E] text-white"
                                : "text-[#94A3B8] hover:text-white"
                            }`}
                          >
                            Delivery
                          </button>
                        </div>
                      </div>

                      {/* Table Picker (When Dine-In is active) */}
                      {posOrderType === "dine-in" && (
                        <div className="p-2.5 rounded-lg bg-[#1E2329] border border-[#353D47] space-y-2">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-[#E8C2B5] font-medium flex items-center gap-1">
                              <LayoutGrid className="w-3.5 h-3.5 text-[#C46B4E]" /> Table (Mandatory):
                            </span>
                            <span className="text-white font-semibold px-1.5 py-0.5 rounded-md bg-[#C46B4E] text-[10px]">
                              {selectedTable}
                            </span>
                          </div>
                          <div className="grid grid-cols-4 gap-1.5">
                            {["Table 01", "Table 02", "Table 03", "Table 04"].map((tbl) => (
                              <button
                                key={tbl}
                                onClick={() => setSelectedTable(tbl)}
                                className={`py-1.5 rounded-md text-[11px] font-medium transition cursor-pointer text-center ${
                                  selectedTable === tbl
                                    ? "bg-[#C46B4E] text-white"
                                    : "bg-[#2B323B] text-[#94A3B8] hover:text-white border border-[#353D47]"
                                }`}
                              >
                                {tbl}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Cart Items List */}
                      <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                        {posCart.length === 0 ? (
                          <div className="py-6 text-center text-xs text-[#94A3B8]">
                            Ticket is empty. Tap any menu item to add.
                          </div>
                        ) : (
                          posCart.map((item) => (
                            <div
                              key={item.id}
                              className="p-2 rounded-lg bg-[#1E2329] border border-[#353D47] flex items-center justify-between text-xs"
                            >
                              <div>
                                <div className="font-medium text-[#F7F5F0]">{item.name}</div>
                                <div className="text-[10px] text-[#E8C2B5]">
                                  ₹{item.price.toFixed(2)} each · {item.station.toUpperCase()}
                                </div>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <button
                                  onClick={() => updateCartQty(item.id, -1)}
                                  className="w-5 h-5 rounded-md bg-[#2B323B] hover:bg-[#353D47] text-white flex items-center justify-center cursor-pointer"
                                >
                                  <Minus className="w-2.5 h-2.5" />
                                </button>
                                <span className="font-semibold text-white text-xs w-4 text-center">
                                  {item.quantity}
                                </span>
                                <button
                                  onClick={() => updateCartQty(item.id, 1)}
                                  className="w-5 h-5 rounded-md bg-[#2B323B] hover:bg-[#353D47] text-white flex items-center justify-center cursor-pointer"
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
                    <div className="pt-3 border-t border-[#353D47] space-y-2.5">
                      <div className="space-y-1 text-xs text-[#94A3B8]">
                        <div className="flex justify-between">
                          <span>Subtotal</span>
                          <span className="text-[#F7F5F0]">₹{cartSubtotal.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>GST (5%)</span>
                          <span className="text-[#F7F5F0]">₹{cartTax.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-sm font-semibold text-white pt-1 border-t border-[#353D47]">
                          <span>Total Due</span>
                          <span className="text-[#E8C2B5]">₹{cartTotal.toFixed(2)}</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <button
                          disabled={posCart.length === 0}
                          onClick={() => {
                            setPosNotification(`Order sent to ${selectedTable} & Kitchen!`)
                            setTimeout(() => setPosNotification(null), 3000)
                          }}
                          className="py-2.5 text-center rounded-lg bg-[#2B323B] hover:bg-[#353D47] text-[#F7F5F0] text-xs font-medium border border-[#353D47] transition disabled:opacity-40 cursor-pointer"
                        >
                          Send to Kitchen
                        </button>
                        <button
                          disabled={posCart.length === 0}
                          onClick={() => {
                            setPosNotification(`Paid ₹${cartTotal.toFixed(2)}! Order Completed.`)
                            setTimeout(() => setPosNotification(null), 3000)
                          }}
                          className="py-2.5 text-center rounded-lg bg-[#C46B4E] hover:bg-[#B25C40] text-white text-xs font-semibold transition disabled:opacity-40 cursor-pointer"
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
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-[#2D333B] pb-4">
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <ChefHat className="w-4 h-4 text-[#C46B4E]" />
                      Kitchen & Bar Display System (KDS)
                    </h3>
                    <p className="text-xs text-[#94A3B8] mt-0.5">
                      Decoupled station tracking: advancing kitchen tickets will never overwrite bar drinks.
                    </p>
                  </div>
                  {/* KDS Station Filter Tabs */}
                  <div className="flex items-center gap-1.5 p-1 rounded-lg bg-[#1E2329] border border-[#353D47]">
                    <button
                      onClick={() => setKdsStationFilter("all")}
                      className={`px-2.5 py-1 rounded-md text-xs font-medium transition cursor-pointer ${
                        kdsStationFilter === "all"
                          ? "bg-[#C46B4E] text-white"
                          : "text-[#94A3B8] hover:text-white"
                      }`}
                    >
                      All Stations
                    </button>
                    <button
                      onClick={() => setKdsStationFilter("kitchen")}
                      className={`px-2.5 py-1 rounded-md text-xs font-medium transition cursor-pointer ${
                        kdsStationFilter === "kitchen"
                          ? "bg-[#C46B4E] text-white"
                          : "text-[#94A3B8] hover:text-white"
                      }`}
                    >
                      Kitchen Station
                    </button>
                    <button
                      onClick={() => setKdsStationFilter("bar")}
                      className={`px-2.5 py-1 rounded-md text-xs font-medium transition cursor-pointer ${
                        kdsStationFilter === "bar"
                          ? "bg-amber-600 text-white"
                          : "text-[#94A3B8] hover:text-white"
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
                        className="p-4 rounded-xl bg-[#262C34] border border-[#353D47] space-y-3 flex flex-col justify-between"
                      >
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-xs text-white">
                              {ticket.num} · {ticket.table}
                            </span>
                            <span className="text-[10px] text-[#94A3B8] flex items-center gap-1">
                              <Clock className="w-3 h-3 text-[#C46B4E]" /> {ticket.time}
                            </span>
                          </div>
                          <div className="p-2.5 rounded-lg bg-[#1E2329] text-xs space-y-1">
                            {ticket.items.map((it, idx) => (
                              <div key={idx} className="font-medium text-[#F7F5F0]">
                                {ticket.station === "bar" ? "🍸" : "🍳"} {it}
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-[#353D47]">
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-medium uppercase ${
                              ticket.stage === "new"
                                ? "bg-[#C46B4E]/20 text-[#E8C2B5] border border-[#C46B4E]/30"
                                : ticket.stage === "preparing"
                                ? "bg-amber-950/60 text-amber-300 border border-amber-700/50"
                                : ticket.stage === "ready"
                                ? "bg-emerald-950/60 text-emerald-300 border border-emerald-700/50"
                                : "bg-slate-700 text-slate-300"
                            }`}
                          >
                            {ticket.stage}
                          </span>
                          <button
                            onClick={() => advanceKdsTicket(ticket.id)}
                            className="text-xs text-[#E8C2B5] hover:text-white font-medium cursor-pointer"
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
            ) : previewTab === "tables" ? (
              /* --- TABLE FLOOR MANAGEMENT INTERACTIVE PREVIEW --- */
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-[#2D333B] pb-4">
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <LayoutGrid className="w-4 h-4 text-[#C46B4E]" />
                      Visual Floor Plan & Table Management
                    </h3>
                    <p className="text-xs text-[#94A3B8] mt-0.5">
                      Click any table to toggle occupancy. Tables remain occupied until manually cleared by restaurant admin.
                    </p>
                  </div>
                  <span className="px-2.5 py-1 rounded-md bg-emerald-950/60 text-emerald-400 border border-emerald-800 text-xs font-medium">
                    Floor Synchronization Active
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {floorTables.map((tbl) => (
                    <div
                      key={tbl.id}
                      onClick={() => toggleTableStatus(tbl.id)}
                      className={`p-4 rounded-xl text-center cursor-pointer transition border ${
                        tbl.status === "available"
                          ? "bg-[#1E2E25] border-emerald-700/50 hover:border-emerald-500"
                          : tbl.status === "occupied"
                          ? "bg-[#33221C] border-[#C46B4E]/50 hover:border-[#C46B4E]"
                          : "bg-[#2E281F] border-amber-700/50 hover:border-amber-500"
                      }`}
                    >
                      <div
                        className={`text-xs font-bold ${
                          tbl.status === "available"
                            ? "text-emerald-300"
                            : tbl.status === "occupied"
                            ? "text-[#E8C2B5]"
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
                            ? "text-[#C46B4E]"
                            : "text-amber-400"
                        }`}
                      >
                        {tbl.status === "available"
                          ? "Available (Tap to Occupy)"
                          : tbl.status === "occupied"
                          ? "Occupied (Tap to Free)"
                          : "Reserved 19:30"}
                      </div>
                      <div className="text-[10px] text-[#94A3B8] mt-0.5">{tbl.seats} Seats</div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              /* --- CUSTOMER QR MENU INTERACTIVE SHOWCASE --- */
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-[#2D333B] pb-4">
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <QrCode className="w-4 h-4 text-[#C46B4E]" />
                      Customer QR Menu — Interactive Demo Showcase
                    </h3>
                    <p className="text-xs text-[#94A3B8] mt-0.5">
                      Scan the QR code with your phone or open in a new tab. Full guest self-ordering, dietary filters, and assistance calls.
                    </p>
                  </div>
                  <span className="px-2.5 py-1 rounded-md bg-amber-950/60 text-amber-300 border border-amber-800 text-xs font-medium flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                    <span>Sandbox Mode · 0% Kitchen Impact</span>
                  </span>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                  {/* Left: Scannable QR Code & Quick Action Box */}
                  <div className="lg:col-span-5 space-y-4">
                    <div className="p-5 rounded-2xl bg-[#1E2329] border border-[#353D47] flex flex-col items-center text-center space-y-4 shadow-lg">
                      <div className="space-y-1">
                        <span className="text-[11px] font-bold text-[#E8C2B5] tracking-wider uppercase">
                          Live Interactive Mobile Menu
                        </span>
                        <h4 className="text-sm font-bold text-white">
                          Scan with Smartphone Camera
                        </h4>
                        <p className="text-xs text-[#94A3B8]">
                          Instantly opens the digital self-ordering menu on your phone for <strong>Demo Table 01</strong>.
                        </p>
                      </div>

                      {/* QR Code Container */}
                      <div className="p-3 bg-white rounded-2xl shadow-md border-4 border-[#C46B4E]/30 inline-block">
                        {demoQrUrl ? (
                          <img
                            src={demoQrUrl}
                            alt="Demo Customer QR Menu"
                            className="w-48 h-48 rounded-lg"
                          />
                        ) : (
                          <div className="w-48 h-48 flex items-center justify-center text-xs text-[#64748B] bg-slate-100 rounded-lg">
                            Generating QR...
                          </div>
                        )}
                      </div>

                      {/* Actions: Open in tab & Copy link */}
                      <div className="w-full space-y-2 pt-1">
                        <Link
                          href="/menu?demo=true&table=Demo%20Table%2001"
                          target="_blank"
                          rel="noreferrer"
                          className="w-full py-2.5 px-4 rounded-xl bg-[#C46B4E] hover:bg-[#B25C40] text-white text-xs font-semibold flex items-center justify-center gap-2 transition cursor-pointer shadow-xs"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>Open Demo Menu in New Tab</span>
                        </Link>

                        <button
                          onClick={() => {
                            if (typeof window !== "undefined") {
                              navigator.clipboard.writeText(
                                `${window.location.origin}/menu?demo=true&table=Demo%20Table%2001`
                              )
                              setCopiedDemoLink(true)
                              setTimeout(() => setCopiedDemoLink(false), 2500)
                            }
                          }}
                          className="w-full py-2 px-4 rounded-xl bg-[#262C34] hover:bg-[#2D343E] text-[#94A3B8] hover:text-white border border-[#353D47] text-xs font-medium flex items-center justify-center gap-2 transition cursor-pointer"
                        >
                          {copiedDemoLink ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                              <span className="text-emerald-300">Link Copied to Clipboard!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>Copy Demo QR Link</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Isolation Reassurance Banner */}
                    <div className="p-3.5 rounded-xl bg-amber-950/40 border border-amber-800/60 text-amber-200 text-xs flex items-start gap-2.5">
                      <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                      <p className="text-[11px] leading-relaxed">
                        <strong>100% Isolated Demo Sandbox:</strong> Orders placed from this menu run safely in test sandbox memory. They will <strong>NOT</strong> dispatch to Nodedr Bistro's kitchen KDS, will <strong>NOT</strong> occupy live dining tables, and will <strong>NOT</strong> alert the staff desk.
                      </p>
                    </div>
                  </div>

                  {/* Right: Phone Frame Live Mockup Preview */}
                  <div className="lg:col-span-7 flex justify-center">
                    <div className="w-full max-w-sm rounded-[36px] bg-[#121519] border-4 border-[#353D47] p-3 shadow-2xl relative overflow-hidden">
                      {/* Speaker / Dynamic Island notch */}
                      <div className="w-24 h-4 bg-[#262C34] rounded-full mx-auto mb-2 flex items-center justify-center">
                        <span className="w-2 h-2 rounded-full bg-emerald-500/80 mr-1.5" />
                        <span className="w-1.5 h-1.5 rounded-full bg-black/60" />
                      </div>

                      {/* Screen Content inside phone frame */}
                      <div className="rounded-[24px] bg-[#F7F5F0] text-[#20252B] p-3.5 space-y-3 font-sans shadow-inner overflow-hidden select-none">
                        {/* Phone Top Header */}
                        <div className="flex items-center justify-between border-b border-[#E5E1D9] pb-2.5">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-[#E9E3D8] text-[#C46B4E] flex items-center justify-center font-bold text-xs">
                              <Utensils className="w-3.5 h-3.5" />
                            </div>
                            <div>
                              <div className="text-xs font-bold leading-tight">Demo Restaurant</div>
                              <div className="text-[9px] text-[#64748B]">Digital Menu</div>
                            </div>
                          </div>
                          <span className="px-2 py-0.5 rounded-md bg-[#E9E3D8] text-[#20252B] text-[10px] font-semibold flex items-center gap-1 border border-[#E5E1D9]">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                            Demo Table 01
                          </span>
                        </div>

                        {/* Sandbox Notice inside mockup */}
                        <div className="p-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-[10px] flex items-center gap-1.5">
                          <Zap className="w-3 h-3 text-amber-600 shrink-0" />
                          <span>Sandbox Mode: Safe to test ordering without affecting kitchen.</span>
                        </div>

                        {/* Dietary Tags */}
                        <div className="flex items-center gap-1.5 text-[10px]">
                          <span className="px-2 py-0.5 rounded-md bg-[#C46B4E] text-white font-medium">All Items</span>
                          <span className="px-2 py-0.5 rounded-md bg-white border border-[#E5E1D9] text-[#64748B] font-medium">Veg Only</span>
                          <span className="px-2 py-0.5 rounded-md bg-white border border-[#E5E1D9] text-[#64748B] font-medium">Drinks</span>
                        </div>

                        {/* Mock Item Cards */}
                        <div className="space-y-2">
                          <div className="p-2.5 rounded-xl bg-white border border-[#E5E1D9] flex items-center justify-between gap-2 shadow-2xs">
                            <div className="flex items-center gap-2.5">
                              <span className="text-2xl">🍔</span>
                              <div>
                                <div className="text-xs font-bold text-[#20252B]">Classic Wagyu Burger</div>
                                <div className="text-[10px] text-[#C46B4E] font-semibold">₹349.00</div>
                              </div>
                            </div>
                            <Link
                              href="/menu?demo=true&table=Demo%20Table%2001"
                              target="_blank"
                              className="px-2.5 py-1 rounded-lg bg-[#C46B4E] hover:bg-[#B25C40] text-white text-[10px] font-bold shadow-2xs"
                            >
                              + Add
                            </Link>
                          </div>

                          <div className="p-2.5 rounded-xl bg-white border border-[#E5E1D9] flex items-center justify-between gap-2 shadow-2xs">
                            <div className="flex items-center gap-2.5">
                              <span className="text-2xl">🍕</span>
                              <div>
                                <div className="text-xs font-bold text-[#20252B]">Margherita Artisan Pizza</div>
                                <div className="text-[10px] text-[#C46B4E] font-semibold">₹299.00</div>
                              </div>
                            </div>
                            <Link
                              href="/menu?demo=true&table=Demo%20Table%2001"
                              target="_blank"
                              className="px-2.5 py-1 rounded-lg bg-[#C46B4E] hover:bg-[#B25C40] text-white text-[10px] font-bold shadow-2xs"
                            >
                              + Add
                            </Link>
                          </div>

                          <div className="p-2.5 rounded-xl bg-white border border-[#E5E1D9] flex items-center justify-between gap-2 shadow-2xs">
                            <div className="flex items-center gap-2.5">
                              <span className="text-2xl">🍹</span>
                              <div>
                                <div className="text-xs font-bold text-[#20252B]">Sparkling Berry Fizz</div>
                                <div className="text-[10px] text-[#C46B4E] font-semibold">₹149.00</div>
                              </div>
                            </div>
                            <Link
                              href="/menu?demo=true&table=Demo%20Table%2001"
                              target="_blank"
                              className="px-2.5 py-1 rounded-lg bg-[#C46B4E] hover:bg-[#B25C40] text-white text-[10px] font-bold shadow-2xs"
                            >
                              + Add
                            </Link>
                          </div>
                        </div>

                        {/* Mock Bottom Sheet / Bell button preview */}
                        <div className="pt-1 flex items-center justify-between gap-2">
                          <div className="flex-1 py-1.5 px-2.5 rounded-lg bg-[#20252B] text-white text-[10px] font-semibold flex items-center justify-between">
                            <span>View Order (3 items)</span>
                            <span className="text-[#E8C2B5] font-bold">₹797.00 →</span>
                          </div>
                          <div className="w-8 h-8 rounded-full bg-[#C46B4E] text-white flex items-center justify-center shadow-xs">
                            <Bell className="w-4 h-4" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Role-Based Portals Section (Primary Background Warm Ivory) */}
      <section id="portals" className="py-20 bg-[#F7F5F0]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <span className="text-xs font-bold tracking-wider uppercase text-[#C46B4E]">
              Role-Based Access
            </span>
            <h2 className="text-3xl font-bold text-[#20252B] tracking-tight">
              Tailored Screens for Every Restaurant Role
            </h2>
            <p className="text-sm text-[#64748B]">
              Staff only access their authorized workspace, ensuring operational focus and data integrity.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Card 1: Restaurant Admin */}
            <div className="p-6 rounded-2xl bg-white border border-[#E5E1D9] flex flex-col justify-between hover:border-[#C46B4E] transition group shadow-2xs">
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-xl bg-[#E9E3D8] text-[#C46B4E] flex items-center justify-center border border-[#E5E1D9]">
                  <Store className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[#20252B]">Restaurant Admin</h3>
                  <p className="text-xs text-[#64748B] mt-1 leading-relaxed">
                    Complete management of tables, live orders feed, reservations, inventory, team members, and business settings.
                  </p>
                </div>
                <ul className="space-y-2 text-xs text-[#20252B] pt-2">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#C46B4E] shrink-0" />
                    <span>Table availability & code toggling</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#C46B4E] shrink-0" />
                    <span>Full orders progression & manual pay toggle</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#C46B4E] shrink-0" />
                    <span>Menu catalog & pricing control</span>
                  </li>
                </ul>
              </div>

              <div className="pt-6">
                <Link
                  href="/restaurant-admin/login"
                  className="w-full py-2.5 px-4 rounded-lg bg-[#C46B4E] hover:bg-[#B25C40] text-white text-xs font-semibold transition flex items-center justify-center gap-2 shadow-2xs"
                >
                  <span>Admin Sign In</span>
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            </div>

            {/* Card 2: POS Orders Terminal */}
            <div className="p-6 rounded-2xl bg-white border border-[#E5E1D9] flex flex-col justify-between hover:border-[#20252B] transition group shadow-2xs">
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-xl bg-[#E9E3D8] text-[#20252B] flex items-center justify-center border border-[#E5E1D9]">
                  <ShoppingCart className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[#20252B]">Counter & Waiter POS</h3>
                  <p className="text-xs text-[#64748B] mt-1 leading-relaxed">
                    Lightning-fast order entry for cashiers and floor staff. Supports Dine-In with table validation, Takeaway, and Delivery.
                  </p>
                </div>
                <ul className="space-y-2 text-xs text-[#20252B] pt-2">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                    <span>Mandatory table picker on Dine-In</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                    <span>Instant automatic station routing</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                    <span>Clean empty ticket on new order</span>
                  </li>
                </ul>
              </div>

              <div className="pt-6">
                <Link
                  href="/pos/login"
                  className="w-full py-2.5 px-4 rounded-lg bg-white hover:bg-[#F7F5F0] text-[#20252B] text-xs font-semibold border border-[#20252B] transition flex items-center justify-center gap-2 shadow-2xs"
                >
                  <span>Staff POS Terminal</span>
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            </div>

            {/* Card 3: Kitchen & Bar Display */}
            <div className="p-6 rounded-2xl bg-white border border-[#E5E1D9] flex flex-col justify-between hover:border-[#20252B] transition group shadow-2xs">
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-xl bg-[#E9E3D8] text-[#20252B] flex items-center justify-center border border-[#E5E1D9]">
                  <ChefHat className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[#20252B]">Kitchen & Bar KDS</h3>
                  <p className="text-xs text-[#64748B] mt-1 leading-relaxed">
                    Visual paperless ticket rails for chefs and bartenders with elapsed prep timers and station filter toggles.
                  </p>
                </div>
                <ul className="space-y-2 text-xs text-[#20252B] pt-2">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#C46B4E] shrink-0" />
                    <span>Independent station advancement</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#C46B4E] shrink-0" />
                    <span>Individual item preparation checkboxes</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#C46B4E] shrink-0" />
                    <span>Dedicated bar and kitchen filters</span>
                  </li>
                </ul>
              </div>

              <div className="pt-6">
                <Link
                  href="/restaurant-admin/login"
                  className="w-full py-2.5 px-4 rounded-lg bg-white hover:bg-[#F7F5F0] text-[#20252B] text-xs font-semibold border border-[#20252B] transition flex items-center justify-center gap-2 shadow-2xs"
                >
                  <span>Kitchen KDS Access</span>
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Core Platform Architecture (Secondary Background Soft Sand) */}
      <section id="features" className="py-20 bg-[#E9E3D8] border-t border-[#E5E1D9]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <span className="text-xs font-bold tracking-wider uppercase text-[#C46B4E]">
              Core Architecture
            </span>
            <h2 className="text-3xl font-bold text-[#20252B] tracking-tight">
              Engineered for Speed, Reliability, & Zero Data Loss
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="p-6 rounded-2xl bg-white border border-[#E5E1D9] space-y-3 shadow-2xs">
              <div className="w-10 h-10 rounded-lg bg-[#F7F5F0] text-[#C46B4E] flex items-center justify-center border border-[#E5E1D9]">
                <Zap className="w-5 h-5" />
              </div>
              <h4 className="text-base font-bold text-[#20252B]">Cross-Tab Realtime Broadcast</h4>
              <p className="text-xs text-[#64748B] leading-relaxed">
                Tickets, table occupied states, and payment updates broadcast instantaneously across all connected POS terminals and kitchen screens.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-white border border-[#E5E1D9] space-y-3 shadow-2xs">
              <div className="w-10 h-10 rounded-lg bg-[#F7F5F0] text-[#20252B] flex items-center justify-center border border-[#E5E1D9]">
                <Layers className="w-5 h-5" />
              </div>
              <h4 className="text-base font-bold text-[#20252B]">Dual-Layer Persistence</h4>
              <p className="text-xs text-[#64748B] leading-relaxed">
                Orders and table occupancy are safely backed to persistent local storage and disk so refreshing or network blips never wipe order feeds.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-white border border-[#E5E1D9] space-y-3 shadow-2xs">
              <div className="w-10 h-10 rounded-lg bg-[#F7F5F0] text-emerald-800 flex items-center justify-center border border-[#E5E1D9]">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h4 className="text-base font-bold text-[#20252B]">Strict Role Protection</h4>
              <p className="text-xs text-[#64748B] leading-relaxed">
                No unauthenticated access via direct URL manipulation. Cookie-anchored middleware blocks unauthorized entry and protects administrative settings.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Dark Banner */}
      <section className="py-20 bg-[#F7F5F0]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="p-10 sm:p-14 rounded-2xl bg-[#20252B] border border-[#2D333B] text-center space-y-6 shadow-sm">
            <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
              Ready to Upgrade Your Restaurant Operations?
            </h2>
            <p className="text-sm text-[#94A3B8] max-w-xl mx-auto">
              Open your POS terminal or access management controls now.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <Link
                href="/restaurant-admin/login"
                className="w-full sm:w-auto px-6 py-3 rounded-lg bg-[#C46B4E] hover:bg-[#B25C40] text-white text-xs font-semibold transition shadow-xs"
              >
                Sign In to Restaurant Portal
              </Link>
              <Link
                href="/pos/login"
                className="w-full sm:w-auto px-6 py-3 rounded-lg bg-transparent hover:bg-white/10 text-white text-xs font-medium border border-white/30 transition"
              >
                Open POS Cashier Screen
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#E5E1D9] bg-white py-10 text-[#64748B]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-md bg-[#C46B4E] flex items-center justify-center text-white">
              <Utensils className="w-3.5 h-3.5" />
            </div>
            <span className="font-semibold text-[#20252B]">Restro POS Enterprise</span>
            <span>· All Rights Reserved © 2026</span>
          </div>

          <div className="flex items-center gap-6">
            <Link href="/restaurant-admin/login" className="hover:text-[#20252B] transition">
              Admin Login
            </Link>
            <Link href="/pos/login" className="hover:text-[#20252B] transition">
              POS Staff Login
            </Link>
            <span className="flex items-center gap-1.5 text-emerald-700 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-600" />
              All Systems Operational
            </span>
          </div>
        </div>
      </footer>
    </div>
  )
}
