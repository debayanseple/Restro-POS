import { NextResponse } from "next/server"
import { readStore, writeStore } from "@/lib/serverless-store"
import type { DemoBookingRequest } from "@/app/api/contact/route"
import { DEFAULT_RESTAURANT_SETTINGS, RestaurantSettings } from "@/lib/restaurant-settings"

export const dynamic = "force-dynamic"

export type PlanTier = "Starter" | "Pro" | "Enterprise"
export type TenantStatus = "Active" | "Trial" | "Suspended"

export interface TenantAccount {
  id: string
  name: string
  ownerName: string
  email: string
  phone: string
  city: string
  outlets: number
  plan: PlanTier
  monthlyPrice: number
  status: TenantStatus
  createdAt: string
  trialEndsAt?: string
}

export interface PlatformSettings {
  platformName: string
  supportEmail: string
  supportPhone: string
  defaultTrialDays: number
  maintenanceMode: boolean
  allowDemoBookings: boolean
  planPrices: Record<PlanTier, number>
  updatedAt: string
}

export interface AuditLogEntry {
  id: string
  actor: string
  action: string
  target: string
  category: "tenant" | "subscription" | "demo" | "settings" | "security"
  timestamp: string
}

const DEFAULT_PLATFORM_SETTINGS: PlatformSettings = {
  platformName: "Restro POS",
  supportEmail: "demo@restropos.in",
  supportPhone: "+91 98200 11223",
  defaultTrialDays: 14,
  maintenanceMode: false,
  allowDemoBookings: true,
  planPrices: {
    Starter: 3999,
    Pro: 7999,
    Enterprise: 14999,
  },
  updatedAt: "2026-11-28T00:00:00.000Z",
}

const DEFAULT_TENANTS: TenantAccount[] = [
  {
    id: "ten_nodedr_1",
    name: "Nodedr Bistro",
    ownerName: "Aarav Mehta",
    email: "aarav@nodedrbistro.in",
    phone: "+91 98201 23456",
    city: "Mumbai",
    outlets: 1,
    plan: "Enterprise",
    monthlyPrice: 14999,
    status: "Active",
    createdAt: "2026-09-10T08:00:00.000Z",
  },
  {
    id: "ten_bella_2",
    name: "Bella Italia Trattoria",
    ownerName: "Rohan Kapoor",
    email: "rohan@bellaitalia.in",
    phone: "+91 98112 44556",
    city: "Delhi NCR",
    outlets: 3,
    plan: "Pro",
    monthlyPrice: 7999,
    status: "Active",
    createdAt: "2026-10-02T10:30:00.000Z",
  },
  {
    id: "ten_tokyo_3",
    name: "Tokyo Ramen Bar",
    ownerName: "Kenji Takahashi",
    email: "ops@tokyoramen.in",
    phone: "+91 99001 77889",
    city: "Bengaluru",
    outlets: 2,
    plan: "Enterprise",
    monthlyPrice: 14999,
    status: "Active",
    createdAt: "2026-10-18T12:15:00.000Z",
  },
  {
    id: "ten_smoke_4",
    name: "Downtown Smokehouse",
    ownerName: "Vikram Nair",
    email: "vikram@smokehouse.in",
    phone: "+91 97400 33221",
    city: "Pune",
    outlets: 1,
    plan: "Starter",
    monthlyPrice: 3999,
    status: "Active",
    createdAt: "2026-11-05T09:00:00.000Z",
  },
  {
    id: "ten_green_5",
    name: "Green Leaf Organics",
    ownerName: "Meera Iyer",
    email: "meera@greenleaf.in",
    phone: "+91 98450 66112",
    city: "Hyderabad",
    outlets: 1,
    plan: "Starter",
    monthlyPrice: 3999,
    status: "Trial",
    createdAt: "2026-11-22T14:20:00.000Z",
    trialEndsAt: "2026-12-06T14:20:00.000Z",
  },
]

const DEFAULT_AUDIT_LOGS: AuditLogEntry[] = [
  {
    id: "aud_1",
    actor: "Super Admin",
    action: "Provisioned Trial Tenant",
    target: "Green Leaf Organics (Starter)",
    category: "tenant",
    timestamp: "2026-11-22T14:20:00.000Z",
  },
  {
    id: "aud_2",
    actor: "System Auth",
    action: "Verified RBAC Middleware",
    target: "All Tenant Portals",
    category: "security",
    timestamp: "2026-11-27T09:00:00.000Z",
  },
]

function appendAuditLog(
  actor: string,
  action: string,
  target: string,
  category: AuditLogEntry["category"]
): AuditLogEntry[] {
  const logs = readStore<AuditLogEntry[]>("audit-logs.json", DEFAULT_AUDIT_LOGS)
  const entry: AuditLogEntry = {
    id: `aud_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    actor,
    action,
    target,
    category,
    timestamp: new Date().toISOString(),
  }
  const updated = [entry, ...logs].slice(0, 200)
  writeStore("audit-logs.json", updated)
  return updated
}

export async function GET() {
  const rawTenants = readStore<TenantAccount[]>("tenants.json", DEFAULT_TENANTS)
  const activeSettings = readStore<RestaurantSettings>(
    "settings.json",
    DEFAULT_RESTAURANT_SETTINGS
  )
  const tenants = rawTenants.map((t) =>
    t.id === "ten_nodedr_1"
      ? {
          ...t,
          name: activeSettings.restaurantName || t.name,
          email: activeSettings.email || t.email,
          phone: activeSettings.phone || t.phone,
          city: activeSettings.cityState || t.city,
        }
      : t
  )
  const demoRequests = readStore<DemoBookingRequest[]>("demo-requests.json", [])
  const platformSettings = readStore<PlatformSettings>(
    "platform-settings.json",
    DEFAULT_PLATFORM_SETTINGS
  )
  const auditLogs = readStore<AuditLogEntry[]>("audit-logs.json", DEFAULT_AUDIT_LOGS)
  const orders = readStore<any[]>("orders.json", [])

  const totalOrders = Array.isArray(orders) ? orders.length : 0
  const totalGmv = Array.isArray(orders)
    ? orders.reduce((sum, o) => sum + (Number(o?.total_amount) || 0), 0)
    : 0

  return NextResponse.json({
    success: true,
    tenants,
    demoRequests,
    platformSettings,
    auditLogs,
    platformStats: {
      totalOrders,
      totalGmv,
    },
  })
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { action } = body

    const platformSettings = readStore<PlatformSettings>(
      "platform-settings.json",
      DEFAULT_PLATFORM_SETTINGS
    )

    if (action === "provision_tenant") {
      const name = String(body.name || "").trim()
      if (!name) {
        return NextResponse.json({ error: "Restaurant name is required" }, { status: 400 })
      }
      const plan: PlanTier = ["Starter", "Pro", "Enterprise"].includes(body.plan)
        ? body.plan
        : "Starter"
      const status: TenantStatus = ["Active", "Trial", "Suspended"].includes(body.status)
        ? body.status
        : "Active"
      const outlets = Math.max(1, Number(body.outlets) || 1)
      const now = new Date()
      const trialEndsAt =
        status === "Trial"
          ? new Date(
              now.getTime() + (platformSettings.defaultTrialDays || 14) * 86400000
            ).toISOString()
          : undefined

      const newTenant: TenantAccount = {
        id: `ten_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        name,
        ownerName: String(body.ownerName || "Owner").trim(),
        email: String(body.email || "").trim(),
        phone: String(body.phone || "").trim(),
        city: String(body.city || "India").trim(),
        outlets,
        plan,
        monthlyPrice: platformSettings.planPrices[plan] ?? 3999,
        status,
        createdAt: now.toISOString(),
        trialEndsAt,
      }

      const tenants = readStore<TenantAccount[]>("tenants.json", DEFAULT_TENANTS)
      const updated = [newTenant, ...tenants]
      writeStore("tenants.json", updated)
      const auditLogs = appendAuditLog(
        "Super Admin",
        `Provisioned ${status} Tenant`,
        `${newTenant.name} (${plan})`,
        "tenant"
      )

      return NextResponse.json({ success: true, tenant: newTenant, tenants: updated, auditLogs })
    }

    if (action === "update_tenant") {
      const { id, status, plan, outlets } = body
      if (!id) {
        return NextResponse.json({ error: "Tenant ID is required" }, { status: 400 })
      }
      const tenants = readStore<TenantAccount[]>("tenants.json", DEFAULT_TENANTS)
      let targetName = ""
      const updated = tenants.map((t) => {
        if (t.id !== id) return t
        targetName = t.name
        const nextPlan: PlanTier = ["Starter", "Pro", "Enterprise"].includes(plan) ? plan : t.plan
        const nextStatus: TenantStatus = ["Active", "Trial", "Suspended"].includes(status)
          ? status
          : t.status
        return {
          ...t,
          plan: nextPlan,
          monthlyPrice: platformSettings.planPrices[nextPlan] ?? t.monthlyPrice,
          status: nextStatus,
          outlets: outlets !== undefined ? Math.max(1, Number(outlets) || 1) : t.outlets,
        }
      })
      writeStore("tenants.json", updated)
      const auditLogs = appendAuditLog(
        "Super Admin",
        plan ? `Changed Plan to ${plan}` : `Updated Status to ${status}`,
        targetName || id,
        plan ? "subscription" : "tenant"
      )
      return NextResponse.json({ success: true, tenants: updated, auditLogs })
    }

    if (action === "delete_tenant") {
      const { id } = body
      const tenants = readStore<TenantAccount[]>("tenants.json", DEFAULT_TENANTS)
      const target = tenants.find((t) => t.id === id)
      const updated = tenants.filter((t) => t.id !== id)
      writeStore("tenants.json", updated)
      const auditLogs = appendAuditLog(
        "Super Admin",
        "Removed Tenant",
        target?.name || id,
        "tenant"
      )
      return NextResponse.json({ success: true, tenants: updated, auditLogs })
    }

    if (action === "update_demo_request") {
      const { id, status } = body
      const requests = readStore<DemoBookingRequest[]>("demo-requests.json", [])
      let targetName = ""
      const updated = requests.map((r) => {
        if (r.id !== id) return r
        targetName = r.restaurantName
        return { ...r, status }
      })
      writeStore("demo-requests.json", updated)
      const auditLogs = appendAuditLog(
        "Super Admin",
        `Marked Demo Lead "${status}"`,
        targetName || id,
        "demo"
      )
      return NextResponse.json({ success: true, demoRequests: updated, auditLogs })
    }

    if (action === "save_platform_settings") {
      const nextSettings: PlatformSettings = {
        ...platformSettings,
        ...body.settings,
        planPrices: {
          ...platformSettings.planPrices,
          ...(body.settings?.planPrices || {}),
        },
        updatedAt: new Date().toISOString(),
      }
      writeStore("platform-settings.json", nextSettings)
      const auditLogs = appendAuditLog(
        "Super Admin",
        "Updated Platform Settings",
        nextSettings.platformName,
        "settings"
      )
      return NextResponse.json({ success: true, platformSettings: nextSettings, auditLogs })
    }

    return NextResponse.json({ error: "Unsupported action" }, { status: 400 })
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Super admin operation failed" },
      { status: 500 }
    )
  }
}
