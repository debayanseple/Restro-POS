/**
 * Role model shared by client and server.
 *
 * 3 user types × 3 POS staff sub-roles. The role stored in the session cookie
 * is one of ROLES below (or "pos-staff" with a separate pos_role cookie, kept
 * for backwards compatibility with existing sessions).
 */

export type Role =
  | "super-admin"
  | "restaurant-admin"
  | "pos-orders"
  | "pos-reception"
  | "pos-kitchen"

export const ROLES: readonly string[] = [
  "super-admin",
  "restaurant-admin",
  "pos-orders",
  "pos-reception",
  "pos-kitchen",
]

export const POS_ROLES = ["orders", "reception", "kitchen"] as const

export type PosRole = (typeof POS_ROLES)[number]

export function isPosRole(role: string): role is `pos-${PosRole}` {
  return role.startsWith("pos-") && (POS_ROLES as readonly string[]).includes(role.slice(4))
}

export function toPosRole(role: string): PosRole | null {
  return isPosRole(role) ? (role.slice(4) as PosRole) : null
}

/**
 * Demo convenience: infer a role from an email address.
 * Used only by the demo login fallback — real authentication must source the
 * role from verified user metadata, never from the email string.
 */
export function determineRoleFromEmail(email: string, metaRole?: string): Role | string {
  if (metaRole && (ROLES as readonly string[]).includes(metaRole)) return metaRole
  const lower = (email || "").toLowerCase()
  if (lower.includes("superadmin") || lower.includes("super-admin")) return "super-admin"
  if (lower.includes("kitchen") || lower.includes("chef") || lower.includes("cook")) return "pos-kitchen"
  if (lower.includes("reception") || lower.includes("frontdesk") || lower.includes("host")) return "pos-reception"
  if (lower.includes("orders") || lower.includes("cashier") || lower.includes("waiter")) return "pos-orders"
  if (lower.includes("admin") || lower.includes("owner") || lower.includes("manager")) return "restaurant-admin"
  return "restaurant-admin"
}
