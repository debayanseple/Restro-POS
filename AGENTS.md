# Restaurant POS — Agent Quick Start Guide

## 🚀 Commands

| Action | Command |
|--------|---------|
| Start dev server | `npm run dev` (port 3000) |
| Build for production | `npm run build` |
| Lint | `npm run lint` |
| Type check | `npm run typecheck` (or `npx tsc --noEmit`) |
| Generate Prisma client | `npx prisma generate` |
| Run migrations | `npx prisma migrate deploy` |
| Create new migration | `npx prisma migrate dev --name <name>` |
| Seed development data | `npm run seed` |

> **Note**: `npm run typecheck` is defined in package.json; `npx tsc --noEmit` works as fallback.

## 📁 Project Structure

```
src/
  app/                    # Next.js 14 App Router
    api/                  # API routes + auth
      auth/login/route.ts # Login endpoint (sets session cookies)
      orders/             # Order management
      menu/               # Menu items
      inventory/          # Inventory
      team/               # Staff management
      tables/             # Table management
      ...                 # Other API routes
    pos/                  # POS Application (route group)
    restaurant-admin/     # Restaurant Admin Portal (route group)
    super-admin/          # Super Admin Portal (route group)
    layout.tsx            # Root layout
    page.tsx              # Redirects to /pos/login
  components/
    ui/                   # shadcn/ui components:
      button.tsx          # 5 variants: default/ghost/outline/danger/success
      card.tsx            # Glassmorphism, title/subtitle
      badge.tsx           # Variants: default/danger/success/warning/info
      input.tsx           # text/email/password/number
      table.tsx           # Header/Body/Row/Cell
  lib/                    # Utilities & business logic
    utils.ts              # cn() — clsx + twMerge
    roles.ts              # Role definitions & permissions
    supabase.ts           # Supabase client
    supabase-config.ts    # Supabase config
    serverless-store.ts   # Serverless-compatible storage
    order-utils.ts        # Order helpers
    bell-sound.ts         # Notification sounds
    menu-catalog.ts       # Menu data
    team-catalog.ts       # Team data
    inventory-catalog.ts  # Inventory data
    restaurant-settings.ts # Restaurant settings
  utils/
    supabase/
      server.ts           # Server-side Supabase client
      client.ts           # Client-side Supabase client
      middleware.ts       # Auth middleware (updateSession)
  middleware.ts           # Next.js middleware (auth + route rewrites)

prisma/
  schema.prisma           # Full database schema (26 models, enums)
  migrations/             # Applied migrations
  seed.ts                 # Dev data (if exists)

docs/
  architecture.md         # Tech stack & decisions
  database-design.md      # ER diagram & tenant isolation
  implementation-roadmap.md # 9-phase plan
  roles-permissions.md    # RBAC details
  subscriptions.md        # Subscription plans
  order-lifecycle.md      # Order states & flow
  testing.md              # Test strategy
  CHANGELOG.md            # Completed phases

# Path alias: @/ imports resolve to src/* (tsconfig.json lines 24-26)
```

## 🔐 Authentication

- **Session cookies**: `restaurant_id`, `outlet_id`, `user_role`, `pos_role`
- **Middleware** (`src/middleware.ts`):
  - Refreshes Supabase session via `updateSession()`
  - Redirects unauthenticated users from `/pos` and `/restaurant-admin` to login pages
  - Rewrites legacy module routes (e.g., `/tables`) to `/restaurant-admin?tab=tables`
- **Login pages**: `/pos/login`, `/restaurant-admin/login`
- **Root `/`** redirects to `/pos/login`
- **Login API** (`/api/auth/login`): Accepts email/password/role, returns session cookies with demo tenant IDs (`demo-restaurant-1`, `demo-outlet-1`)

## 🏢 Three Applications (Route Groups)

Each is a Next.js route group with its own layout and navigation:

- **`/pos`** — Counter/Waiter/Kitchen/Reception modes: touch-friendly order taking, table selection, KDS integration
- **`/restaurant-admin`** — Business setup: outlets, menus, staff, tables, settings, reports
- **`/super-admin`** — Platform-wide: all restaurant accounts, subscriptions, users

**Navigation**: Root redirects to `/pos/login`. Inside apps, use the provided UI components.

## 🗄️ Database

- **PostgreSQL** via Prisma ORM
- Schema in `prisma/schema.prisma` — 26 models (User, Restaurant, Outlet, Subscription, MenuItem, Order, KDS, Inventory, etc.)
- **Enums**: UserRole, OrderStatus, PaymentStatus, PaymentMethod, OrderType, KDSStatus, StockMovementType
- **Tenant isolation**: Every tenant-scoped table has `restaurant_id` and/or `outlet_id`. All queries must filter by current session tenant.
- **Super Admin** records have no `restaurant_id` (or `null`)
- **Migration commands**:
  - `npx prisma generate` — Generate Prisma client
  - `npx prisma migrate dev --name <name>` — Create & apply migration (dev)
  - `npx prisma migrate deploy` — Apply pending migrations (prod)
  - `npm run seed` — Seed development data

## 📐 UI Components

Import from `@/components/ui/`:

```tsx
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableHeader, TableBody, TableRow, TableCell } from "@/components/ui/table"
```

**Button variants**: `default`/`ghost`/`outline`/`danger`/`success`
**Button sizes**: `sm`/`default`/`lg`/`icon`

## 🌐 Path Aliases

`@/` resolves to `src/*` (configured in `tsconfig.json` line 24-26).

Imports like `@/components/ui/button` → `src/components/ui/button.tsx`.

## 📋 Development Workflow

1. **Start**: `npm run dev` — starts Next.js at `http://localhost:3000`
2. **Edit** — components auto-reload via Turbopack
3. **Type check**: `npm run typecheck` — run before committing
4. **Build**: `npm run build` — produces production build
5. **Database**: Run `npm run seed` after migration to populate dev data

## ⚠️ Known Quirks

- **Node.js v26** — Some `forwardRef` generic types need `import React from "react"` in UI components
- **Production build** — `npm run build` may require minor TypeScript adjustments (import React in components)
- **No test suite** — `npm test` exits with error; tests not yet implemented
- **Prisma migrations** — Must run `prisma generate` before `prisma migrate deploy`
- **Session cookies** — Set manually via login pages; middleware checks for `restaurant_id`/`outlet_id`/`user_role`
- **Demo mode** — Login API uses hardcoded `demo-restaurant-1` / `demo-outlet-1`; real auth pending
- **Supabase auth** — Uses `@supabase/ssr` for cookie-based sessions, not NextAuth.js

## 📚 Key Documents

- `README.md` — Setup, environment, migrations, seed commands
- `docs/architecture.md` — Tech stack and technical decisions
- `docs/database-design.md` — Entities, relationships, tenant boundaries
- `docs/implementation-roadmap.md` — 9-phase implementation plan
- `docs/roles-permissions.md` — Roles, permissions, sensitive actions
- `docs/subscriptions.md` — Plans, entitlements, billing states
- `docs/order-lifecycle.md` — Order states and POS-to-kitchen-to-payment flow
- `docs/testing.md` — Test strategy
- `CHANGELOG.md` — Completed phases and notable changes
- `AGENTS.md` — This file (agent guidance)

## 🏗️ Architecture Notes

- **Single Next.js app** with route groups (not a Turbo monorepo despite README mentioning packages/apps)
- **Shared backend** — API routes in `src/app/api/` serve all three portals
- **Middleware** handles auth, tenant context, and legacy route rewrites
- **Supabase** for auth/session management (not NextAuth.js)
- **Prisma** for database access with explicit tenant filtering in queries
- **React Query** for server state caching (planned/partial)
- **Deployment** — Vercel, zero-config

## 🔑 Key Files to Understand

- `src/middleware.ts` — Auth, tenant routing, legacy route rewrites
- `src/app/api/auth/login/route.ts` — Login flow, cookie setting
- `src/utils/supabase/middleware.ts` — Supabase session refresh
- `prisma/schema.prisma` — Complete data model
- `src/lib/roles.ts` — Role definitions and permission checks