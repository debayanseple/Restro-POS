# Restaurant POS — Agent Quick Start Guide

## 🚀 Commands

| Action | Command |
|--------|---------|
| Start dev server | `npm run dev` (port 3000) |
| Build for production | `npm run build` |
| Lint | `npm run lint` |
| Type check | `npx tsc --noEmit` |
| Generate Prisma client | `npx prisma generate` |
| Run migrations | `npx prisma migrate deploy` |
| Create new migration | `npx prisma migrate make <name>` |
| Seed development data | `npm run seed` |

## 📁 Project Structure

```
src/
  app/              # Next.js 14 App Router
    pos/            # Restaurant POS Application
    restaurant-admin/  # Restaurant Admin Portal
    super-admin/    # Super Admin Portal
    api/            # API routes + auth
      auth/         # Authentication endpoints
    css/            # Global styles
  components/       # Shared UI components
    ui/             # shadcn/ui components:
      - button.tsx  (5 variants: default/ghost/outline/danger/success)
      - card.tsx    (glassmorphism, title/subtitle)
      - badge.tsx   (variants: default/danger/success/warning/info)
      - input.tsx   (text/email/password/number)
      - table.tsx   (Header/Body/Row/Cell)
  lib/              # Utilities
    utils.ts        # cn() — clsx + twMerge for class joining

  # Path alias: @/ imports resolve to src/*

prisma/
  schema.prisma   # Full database schema (26 models)
  migrations/     # Applied migrations
  seed.ts         # Dev data: admin, restaurant, outlet, roles

docs/
  architecture.md    # Tech stack & decisions
  database-design.md # ER diagram & tenant isolation
  implementation-roadmap.md  # 9-phase plan
  README.md          # Setup & run commands
```

## 🔐 Authentication

- Session cookies: `restaurant_id`, `outlet_id`, `user_role`
- Middleware (`src/middleware.ts`) redirects unauthenticated users from `/pos` and `/restaurant-admin` to login pages
- Login pages: `/pos/login`, `/restaurant-admin/login`
- Root `/` redirects to `/pos/login`

## 🏢 Three Applications

Each is a Next.js route group with its own layout and navigation:

- **`/pos`** — Counter/Waiter mode: touch-friendly order taking, table selection, KDS integration
- **`/restaurant-admin`** — Business setup: outlets, menus, staff, tables, settings
- **`/super-admin`** — Platform-wide: all restaurant accounts, subscriptions, users

**Navigation**: Root redirects to `/pos/login`. Inside apps, use the provided UI components.

## 🗄️ Database

- **PostgreSQL** via Prisma ORM
- Schema in `prisma/schema.prisma` — 26 models (User, Restaurant, Outlet, Subscription, MenuItem, Order, KDS, Inventory, etc.)
- **Tenant isolation**: Every tenant-scoped table has `restaurant_id` and/or `outlet_id`. All queries must filter by current session tenant.
- **Migration commands**:
  - `npx prisma generate` — Generate Prisma client
  - `npx prisma migrate make <name>` — Create new migration
  - `npx prisma migrate deploy` — Apply pending migrations
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
3. **Test** — no test suite configured yet (`npm test` echoes error)
4. **Build**: `npm run build` — produces production build (may need TypeScript fixes)
5. **Database**: Run `npm run seed` after migration to populate dev data

## ⚠️ Known Quirks

- **Node.js v26** — Some `forwardRef` generic types need `import React from "react"` in UI components
- **Production build** — `npm run build` may require minor TypeScript adjustments (import React in components)
- **No test suite** — `npm test` exits with error; tests not yet implemented
- **Prisma migrations** — Must run `prisma generate` before `prisma migrate deploy`
- **Session cookies** — Set manually via login pages; middleware checks for `restaurant_id`/`outlet_id`/`user_role`

## 📚 Key Documents

- `README.md` — Setup, environment, migrations, seed commands
- `docs/architecture.md` — Tech stack and technical decisions
- `docs/database-design.md` — Entities, relationships, tenant boundaries
- `docs/implementation-roadmap.md` — 9-phase implementation plan
- `AGENTS.md` — This file (agent guidance)

## 📦 Packages vs Apps

- **`packages/api/`** — Shared API logic (if using monorepo)
- **`packages/ui/`** — Shared UI components (if using monorepo)
- **`apps/`** — Not used; single Next.js app with route groups for the three portals

The single Next.js app approach is preferred over a multi-app monorepo for this project.