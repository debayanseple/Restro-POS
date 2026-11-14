# Restaurant POS — Architecture Document

## Overview
Multi-tenant SaaS Restaurant POS platform with three distinct applications sharing a common backend and data model.

## Technology Stack

| Layer | Choice | Rationale |
|-------|--------|-----------|
| **Framework** | Next.js 14 (App Router) | Full-stack React, file-based routing, middleware for auth/tenant isolation, API routes + RSC for performance. |
| **Language** | TypeScript | Type safety across frontend/backend, catches RBAC/tenant bugs early, essential for multi-tenant code. |
| **UI Library** | shadcn/ui + Radix UI | Accessible components, consistent design across three apps, touch-friendly defaults, easy customization. |
| **Styling** | Tailwind CSS | Utility-first, responsive design for desktop/tablet/POS, easy theming, small production CSS. |
| **Database** | PostgreSQL + Prisma ORM | Robust relational data, JSON columns for flexible menu items, Prisma migrations for team workflow, DB-level tenant policies. |
| **Authentication** | NextAuth.js (custom JWT) | Session management, integrates with Next.js, OAuth if needed. |
| **State Management** | React Query | Server state caching, stale-while-revalidate for KDS updates, simple API. |
| **Notifications** | sonner | Simple toast notifications for orders/KDS events. |
| **Deployment** | Vercel | Zero-config deployments, edge functions for middleware, seamless Next.js integration. |

## Architecture Style

- **Monorepo** (Turbo/PNX workspaces) for shared types/libraries across the three apps, each with its own Next.js config.
- **Shared backend** and shared data model; business logic lives in one place (API routes/services).
- **Route groups** per app:
  - `/super-admin` — Super Admin Portal
  - `/restaurant-admin` — Restaurant Admin Portal (per-tenant)
  - `/pos` — Restaurant POS Application

## Tenant Isolation

- **Database-level**: PostgreSQL Row Level Security (RLS) policies filter by `restaurant_id`/`outlet_id` on every table.
- **Application-level**: Every API route/query explicitly filters by current tenant; Super Admin bypass via separate middleware.
- Users can only read/write records allowed by their restaurant membership, outlet assignment, and role.

## RBAC (Role-Based Access Control)

- Roles stored in DB; middleware enforces `requireRole('cashier')`, `requireRole('waiter')`, etc.
- Frontend shows/hides based on role, but **enforcement is server-side only**.
- Super Admin access is platform-wide and protected separately from restaurant user access.

## Data Flow

1. User authenticates → session attached to `restaurant_id`/`outlet_id`.
2. Every API request passes through middleware that attaches tenant context.
3. Queries are scoped: `WHERE restaurant_id = $currentTenant`.
4. Super Admin routes have separate auth middleware that bypasses tenant scoping.

## Key Decisions & Trade-offs

| Decision | Alternative | Reason |
|----------|------------|--------|
| Monorepo | Single app with route groups | Clearer boundaries, shared domain types, easier to maintain separate release cycles for each app. |
| PostgreSQL + Prisma | MongoDB | Relational integrity for orders/inventory/subscriptions; Prisma migrations are team-friendly. |
| NextAuth.js | Clerk / DevAuth | No per-user cost at MVP; full control over sessions and tenant linking. |
| Offline POS | Deferred to Phase 7+ | MVP is online-first; offline requires local persistence, sync, conflict-resolution — significant scope. |
| Live payment gateway | Admin-managed status only | Payment integration requires provider approval, PCI compliance, and significant backend work. Deferred. |
| KDS via WebSockets | Simple polling | WebSockets provide real-time updates without reconnection/duplicate issues; extra setup cost justified for kitchen workflow. |

## Security Model

- Authorization enforced on **every** protected server action/API.
- Database-level tenant isolation policies where supported (PostgreSQL RLS).
- All input validated on the server.
- Rate-limit sensitive authentication and public endpoints.
- Security-sensitive actions logged without recording passwords, tokens, or payment secrets.

## UI/UX Strategy

- Three applications visually consistent while giving each role a focused workflow.
- POS prioritizes speed, touch targets, clear order state, and minimal steps.
- Admin screens prioritize clear forms, searchable tables, filters, and useful summaries.
- Super Admin makes subscription status and account actions easy to identify.

## Offline POS Consideration

- **Not approved for MVP**. Design online-first.
- If offline mode is approved later: design explicit local persistence, sync, conflict-resolution, and retry strategy.
- Prevent duplicate order/payment submissions via idempotency controls.

## Payment Provider Status

- **Not integrated for MVP**. Admin-managed payment status with `manual`/`recorded-payment` labels.
- Live gateway (Stripe/other) added after provider approval of billing rules.

## KDS Design

- Real-time via WebSockets or `swr` polling.
- Orders published to kitchen queue; status updates bi-directional between POS and KDS.
- Tickets isolated by restaurant and outlet.
- Reconnection does not create duplicate tickets (ticket IDempotency).

## Deployment

- Vercel for all three apps.
- Environment variables for each deployment (database URL, JWT secret, etc.).
- No Docker for local development (as per guidelines).
- `.env.example` provided with safe placeholder names only.

## Documentation References

- `docs/database-design.md` — entities, relationships, tenant boundaries, migrations.
- `docs/roles-permissions.md` — roles, permissions, and sensitive actions.
- `docs/subscriptions.md` — plans, entitlements, billing states, grace periods.
- `docs/order-lifecycle.md` — order states and POS-to-kitchen-to-payment flow.
- `docs/testing.md` — test strategy and how to run checks.
- `CHANGELOG.md` — completed phases and notable changes.