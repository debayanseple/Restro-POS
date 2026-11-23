/**
 * Shared order/domain utilities used by both the API routes and the client UI,
 * so business rules can never drift between the two.
 */

export const KDS_STAGES = ["new", "preparing", "ready", "completed"] as const
export type KdsStage = (typeof KDS_STAGES)[number]

export const ORDER_STATUSES = ["OPEN", "PREPARING", "READY", "CLOSED", "CANCELLED"] as const
export const PAYMENT_STATUSES = ["UNPAID", "PAID", "PARTIAL", "REFUNDED"] as const
export const PAYMENT_METHODS = ["MANUAL", "CASH", "CARD", "UPI", "WALLET", "ONLINE"] as const
export const ORDER_TYPES = ["dine-in", "takeaway", "delivery"] as const

/** Heuristic station routing for menu items (shared rule, single copy). */
export function isBarItem(name: string): boolean {
  const lower = (name || "").toLowerCase()
  return (
    lower.includes("beer") ||
    lower.includes("wine") ||
    lower.includes("fizz") ||
    lower.includes("cocktail") ||
    lower.includes("macchiato") ||
    lower.includes("coffee") ||
    lower.includes("drink") ||
    lower.includes("juice") ||
    lower.includes("beverage") ||
    lower.includes("tea") ||
    lower.includes("smoothie") ||
    lower.includes("soda") ||
    lower.includes("water") ||
    lower.includes("latte") ||
    lower.includes("espresso")
  )
}

/** Collision-resistant, sortable order number (no random 4-digit guesses). */
export function generateOrderNumber(): string {
  const ts = Date.now().toString(36).toUpperCase()
  const rand = Math.floor(Math.random() * 1296)
    .toString(36)
    .toUpperCase()
    .padStart(2, "0")
  return `ORD-${ts}${rand}`
}

export function clampInt(value: unknown, min: number, max: number, fallback: number): number {
  const n = Math.floor(Number(value))
  if (!Number.isFinite(n)) return fallback
  return Math.min(max, Math.max(min, n))
}

export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100
}

export interface ValidatedItem {
  menuItemId: string | null
  name: string
  quantity: number
  unitPrice: number
  specialInstructions: string | null
}

/**
 * Validates and normalizes a cart payload from the client. Returns null when
 * the payload is unusable, along with a human-readable error via the second
 * element of the tuple.
 */
export function validateOrderItems(raw: unknown): { items: ValidatedItem[]; error?: string } {
  if (!Array.isArray(raw) || raw.length === 0) {
    return { items: [], error: "Cart is empty. Please add items to place an order." }
  }
  if (raw.length > 200) {
    return { items: [], error: "Too many items in a single order (max 200)." }
  }

  const items: ValidatedItem[] = []
  for (const it of raw as Record<string, unknown>[]) {
    if (typeof it !== "object" || it === null) continue
    const name = String(it.name ?? it.title ?? "").trim().slice(0, 120)
    if (!name) return { items: [], error: "Every item needs a name." }

    const quantity = Math.floor(Number(it.quantity ?? 1))
    if (!Number.isFinite(quantity) || quantity < 1 || quantity > 999) {
      return { items: [], error: `Invalid quantity for "${name}". Must be 1–999.` }
    }

    const unitPrice = Number(it.unitPrice ?? it.price ?? 0)
    if (!Number.isFinite(unitPrice) || unitPrice < 0 || unitPrice > 1_000_000) {
      return { items: [], error: `Invalid price for "${name}".` }
    }

    const instructions = it.specialInstructions ?? it.special_instructions
    items.push({
      menuItemId: typeof it.menuItemId === "string" || typeof it.id === "string"
        ? String(it.menuItemId ?? it.id).slice(0, 64)
        : null,
      name,
      quantity,
      unitPrice,
      specialInstructions: instructions ? String(instructions).slice(0, 300) : null,
    })
  }
  return { items }
}

/** Computes authoritative money values server-side. Never trust client totals. */
export function computeTotals(items: ValidatedItem[], taxAmount: number, discountAmount: number) {
  const subtotal = round2(items.reduce((s, it) => s + it.unitPrice * it.quantity, 0))
  const tax = Math.min(Math.max(round2(Number.isFinite(taxAmount) ? taxAmount : 0), 0), round2(subtotal * 0.5))
  const discount = Math.min(Math.max(round2(Number.isFinite(discountAmount) ? discountAmount : 0), 0), subtotal)
  const total = round2(subtotal + tax - discount)
  return { subtotal, tax, discount, total }
}

/** Overall order status derived from per-station KDS stages. */
export function computeOverallStatus(
  items: { name: string }[],
  kitchenStage: string | undefined,
  barStage: string | undefined,
): "OPEN" | "PREPARING" | "READY" | "CLOSED" {
  const hasKitchen = items.some((it) => !isBarItem(it.name))
  const hasBar = items.some((it) => isBarItem(it.name))
  const k = kitchenStage || "new"
  const b = barStage || "new"
  const kDone = !hasKitchen || k === "completed"
  const bDone = !hasBar || b === "completed"
  if (kDone && bDone) return "CLOSED"
  if ((hasKitchen && k === "ready") || (hasBar && b === "ready")) return "READY"
  if ((hasKitchen && k === "preparing") || (hasBar && b === "preparing")) return "PREPARING"
  return "OPEN"
}
