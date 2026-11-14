# Restaurant POS — Multi-Tenant SaaS Platform

## Overview
A multi-tenant Restaurant POS platform with three applications:
1. **Super Admin Portal** — platform owner manages all restaurant accounts, subscriptions, and platform-wide operations.
2. **Restaurant Admin Portal** — each restaurant manages its outlets, menu, tables, staff, inventory, settings, and reports.
3. **Restaurant POS Application** — staff operate the restaurant through role-based screens for counter, waiter, and kitchen workflows.

## Technology Stack

| Layer | Choice | Rationale |
|-------|--------|-----------|
| **Framework** | Next.js 14 (App Router) | Full-stack React, file-based routing, middleware for auth/tenant isolation. |
| **Language** | TypeScript | Type safety across frontend/backend, essential for multi-tenant code. |
| **UI Library** | shadcn/ui + Radix UI | Accessible components, consistent design across three apps, touch-friendly defaults. |
| **Styling** | Tailwind CSS | Utility-first, responsive design for desktop/tablet/POS, easy theming. |
| **Database** | PostgreSQL + Prisma ORM | Robust relational data, JSON columns for flexible menu items, Prisma migrations. |
| **Authentication** | NextAuth.js (JWT) | Session management, integrates with Next OAuth if needed. |
| **State Management** | React Query | Server state caching, stale-while-revalidate for KDS updates. |
| **Notifications** | sonner | Simple toast notifications for orders/KDS events. |
| **Deployment** | Vercel | Zero-config deployments, edge functions for middleware. |

## Prerequisites

- Node.js 20+
- PostgreSQL database (local or hosted)
- npm, yarn, or pnpm

## Getting Started

### 1. Install dependencies

```bash
npm install
# or
yarn install
```

### 2. Environment variables

Create a `.env` file in the root (based on `.env.example`):

```env
# Database
DATABASE_URL="postgresql://postgres:password@localhost:5432/restaurant_pos?schema=public"

# Authentication
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="a-very-secret-key-minimum-32-chars-long"

# Application
APP_URL="http://localhost:3000"
```

See `.env.example` for all available variables with safe placeholders.

### 3. Database setup

```bash
# Generate Prisma client
npx prisma generate

# Run migrations (first migration creates base tables)
npx prisma migrate deploy

# Seed development data (admin, restaurant, outlet, roles)
npm run seed
```

### 4. Run the development server

```bash
npm run dev
# or
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can access the three application shells at:
- `/super-admin` — Super Admin Portal (requires super-admin role)
- `/restaurant-admin` — Restaurant Admin Portal (requires restaurant role)
- `/pos` — Restaurant POS Application (requires cashier/waiter role)

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server (hot reloading). |
| `npm run build` | Build for production. |
| `npm run lint` | Run ESLint. |
| `npm run typecheck` | Run TypeScript type check. |
| `npm run prisma:generate` | Generate Prisma client. |
| `npm run prisma:migrate` | Run pending Prisma migrations. |
| `npm run seed` | Seed development data (admin, restaurant, outlet, roles). |
| `npm run test` | Run test suite. |
| `npm run test:e2e` | Run end-to-end tests. |

## Project Structure

```
packages/
  api/           # Next.js API routes, middleware, Prisma services
  ui/            # Shared shadcn/ui components, Tailwind config
apps/
  super-admin/   # Super Admin Portal
  restaurant-admin/  # Restaurant Admin Portal
  pos/           # Restaurant POS Application
prisma/
  schema.prisma  # Database schema (single source of truth)
  seed.ts        # Development seed data
docs/
  architecture.md   # Architecture document
  database-design.md  # Database design
  implementation-roadmap.md # Phase-wise roadmap
  roles-permissions.md # Roles and permissions
  subscriptions.md   # Subscription plans and entitlements
  order-lifecycle.md # Order states and flow
  testing.md         # Test strategy
  CHANGELOG.md       # Completed phases and notable changes
README.md            # This file
package.json         # Root scripts and configurations
turbo.json           # Turbo monorepo task pipeline (if used)
```

## Multi-Tenant Isolation

- Every tenant-scoped table (`users`, `restaurants`, `outlets`, `menu_items`, `orders`, etc.) includes `restaurant_id` and/or `outlet_id` columns.
- **Application-level**: Every API query explicitly filters by the current session's `restaurant_id`. Super Admin bypass via separate middleware.
- **Database-level**: PostgreSQL Row Level Security (RLS) policies enforce `WHERE restaurant_id = current_setting('app.restaurant_id')::int` on relevant tables.
- Users can only read/write records allowed by their restaurant membership, outlet assignment, and role.

## RBAC (Role-Based Access Control)

- Roles are stored in the database and enforced server-side on every protected action.
- Frontend shows/hides UI elements based on role, but **all authorization is server-side**.
- Roles include: `super-admin`, `restaurant-admin`, `owner`, `manager`, `cashier`, `waiter`, `kitchen-staff`, `reporting-only`.

## Security Rules

- Authorization enforced on **every** protected server action/API.
- All input validated on the server.
- Rate-limit sensitive authentication and public endpoints.
- Security-sensitive actions logged without recording passwords, tokens, or payment secrets.
- Do not store card numbers, CVV, UPI PINs, or other sensitive payment credentials.

## Design System

The platform uses shadcn/ui components with Tailwind CSS customization:

- **Typography**: heading scales, line heights, text sizes.
- **Colors**: primary, secondary, success, warning, error palettes; accessible contrast ratios.
- **Spacing**: 4-based scale (4px, 8px, 12px, 16px, 24px, 32px).
- **Buttons**: primary, secondary, destructive, ghost variants; touch-friendly min-height 44px.
- **Inputs**: text, number, select, textarea with clear labels and error states.
- **Dialogs**: modal, alert, confirm with focus trap and escape handling.
- **Tables**: header, row, cell striped; sortable; responsive.
- **Navigation**: sidebar, top nav, breadcrumbs.
- **Notifications**: toast/snackbar for orders, KDS events, errors.

Responsive layouts for desktop and tablet; POS screens optimized for touch.

## Documentation

Maintain these documents as the project evolves:

- `README.md` — setup, environment, migrations, seed data, run/test commands.
- `docs/architecture.md` — application architecture and key technical decisions.
- `docs/database-design.md` — entities, relationships, tenant boundaries, and migrations.
- `docs/roles-permissions.md` — roles, permissions, and sensitive actions.
- `docs/subscriptions.md` — plans, entitlements, billing states, grace periods, and restrictions.
- `docs/order-lifecycle.md` — order states and POS-to-kitchen-to-payment flow.
- `docs/testing.md` — test strategy and how to run checks.
- `CHANGELOG.md` — completed phases and notable changes.

Update documentation when implementation changes the agreed design.

## Deployment

- All three apps deploy to Vercel with zero configuration.
- Environment variables set per deployment (database URL, JWT secret, etc.).
- No Docker required for local development (as per guidelines).
- Production secrets stored securely via Vercel environment variables.

## Known Limitations (MVP Scope)

- Offline POS billing not supported (online-first only).
- Live payment gateway not integrated (admin-managed payment status only).
- KDS uses WebSocket polling; no physical printer support yet.
- No customer QR ordering (deferred to Phase 8).
- No delivery aggregator integrations.