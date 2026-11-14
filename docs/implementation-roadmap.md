# Restaurant POS — Implementation Roadmap v0.2

This document tracks the phase-wise implementation plan. Work is done **one phase at a time**. Do not start the next phase until the current phase is complete and approved.

---

## Phase 0 — Completed
- Repository assessment and technical blueprint
- Architecture document: `docs/architecture.md`
- Database design: `docs/database-design.md`
- Implementation roadmap: `docs/implementation-roadmap.md`
- README with proposed setup approach

---

## Phase 1 — Foundation, Authentication, Tenant Isolation, and Design System

**Goal:** Create a secure, runnable foundation.

**Tasks:**
- Set up project structure and development scripts (Node, TypeScript, Tailwind, Prisma).
- Configure database connection and migration workflow (Prisma init, first migration).
- Implement authentication and session handling (NextAuth.js with JWT).
- Create user, restaurant, outlet, membership, role, and permission foundations (models, seed).
- Implement protected route groups for Super Admin, Restaurant Admin, and POS.
- Enforce server-side authorization and tenant isolation (middleware).
- Add initial design system: typography, colors, spacing, buttons, inputs, dialogs, tables, navigation, notifications (shadcn/ui + Tailwind).
- Create responsive application shells for all three applications (base layout, navigation, page routing).
- Add audit-log infrastructure for sensitive actions (audit_logs table, API middleware).
- Add development seed data for one platform admin, one restaurant, one outlet, and sample roles.

**Acceptance criteria:**
- A user cannot access protected screens without authentication.
- A restaurant user cannot read or modify another restaurant's data, including through direct API requests.
- Super Admin routes are inaccessible to ordinary restaurant users.
- Role and permission checks are enforced server-side.
- All three application shells render and navigate correctly.
- Migrations, seed scripts, and automated checks run successfully.

**Deliverables at end of Phase 1:**
- `packages/api/` — Next.js API routes, middleware, Prisma client.
- `packages/ui/` — Shared shadcn/ui components, Tailwind config.
- `apps/super-admin/` — Super Admin portal shell.
- `apps/restaurant-admin/` — Restaurant Admin portal shell.
- `apps/pos/` — POS portal shell.
- `README.md` — updated with setup, env vars, migration, and seed commands.
- `CHANGELOG.md` — Phase 0 complete noted.

---

## Phase 2 — Super Admin Portal and Subscription Management

**Goal:** Allow the platform owner to manage the SaaS business.

**Tasks:**
- Dashboard with restaurant count, active trials, active subscriptions, expired subscriptions, and basic platform usage.
- Restaurant account listing, search, filters, and detail view.
- Create, edit, activate, suspend, and deactivate restaurant accounts.
- Create subscription plans with name, price, billing cycle, trial duration, and feature/usage limits.
- Assign plans to restaurant accounts.
- Manage trial start/end dates, renewals, upgrades, downgrades, cancellations, and expiry.
- Display subscription status and payment history/status.
- Implement plan entitlements and usage-limit checks in the backend.
- Configure grace-period behaviour and restrictions for overdue subscriptions.
- Record subscription and account-management actions in audit logs.

**Important:**
- Do not integrate a live payment gateway without approval of the provider and billing rules.
- Until payment integration is approved, support admin-managed payment status with a clear manual/recorded-payment label.
- Do not allow the frontend alone to determine subscription access.

**Acceptance criteria:**
- Super Admin can create and manage restaurant accounts.
- Super Admin can create plans and assign them to restaurants.
- Restaurant access reflects the assigned plan and subscription status.
- Expired or suspended account behaviour follows documented rules.
- Subscription changes are audited.
- Restaurant users cannot access Super Admin functions.

**Deliverables at end of Phase 2:**
- Super Admin dashboard page and API routes.
- Restaurant CRUD routes and UI.
- Subscription plan CRUD and assignment UI.
- Entitlement/usage-limit check middleware.
- Grace-period logic and overdue subscription handling.
- Audit log entries for subscription/account changes.

---

## Phase 3 — Restaurant Admin Portal: Business Setup and Menu

**Goal:** Allow a restaurant to configure its operating environment.

**Tasks:**
- Restaurant profile and business details.
- Outlet creation and editing.
- Outlet operating hours and service modes.
- Floor sections and table setup.
- Menu categories and menu items.
- Item descriptions, images, prices, and availability.
- Variants, add-ons, and modifiers.
- Outlet-specific availability and pricing where required.
- Tax configuration and invoice settings.
- Staff invitations/accounts and outlet assignments.
- Role and permission configuration using approved roles.
- Restaurant-level settings and audit history.

**Acceptance criteria:**
- Restaurant owners can manage only their own restaurant and authorized outlets.
- Menu items can be organized into categories and configured with variants/modifiers.
- Table and floor setup is usable.
- Staff access follows assigned roles and outlet membership.
- Menu and outlet data is ready for use by POS workflows.

**Deliverables at end of Phase 3:**
- Outlet CRUD routes and UI.
- Floor section and table setup UI.
- Menu category and menu item CRUD routes and UI.
- Variant/modifier management UI.
- Outlet-specific pricing/availability logic.
- Tax configuration UI.
- Staff invitation and role assignment UI.

---

## Phase 4 — Restaurant POS: Counter and Waiter Mode

**Goal:** Implement the core order-taking experience.

**Tasks:**
- POS login and outlet/shift selection.
- Touch-friendly POS layout.
- Order types: dine-in and takeaway initially.
- Table and floor selection for dine-in.
- Counter order creation.
- Waiter Mode inside the same POS application.
- Add, edit, and remove order items.
- Apply variants, modifiers, quantity, and special instructions.
- Add items to an existing table order.
- Table transfer and order transfer, permission-controlled.
- Save and resume open orders.
- Order numbers and order source tracking.
- Send orders to kitchen.
- Display order status.
- Handle cancellations with permission checks and reason capture.

**Acceptance criteria:**
- Cashier can create and update dine-in/takeaway orders.
- Waiter can select a table and create/update its order within the same POS application.
- Order items preserve their modifiers, notes, quantities, and prices.
- Unauthorized users cannot perform restricted actions.
- Orders are persisted reliably and appear in the correct outlet.

**Deliverables at end of Phase 4:**
- POS login and outlet/shift selection flow.
- Touch-optimized POS order creation UI.
- Order item add/edit/remove with modifiers.
- Table and floor selection for dine-in.
- Waiter mode navigation within POS.
- Order sending to kitchen (API call).
- Order status display.
- Cancellation workflow with reason capture.

---

## Phase 5 — Kitchen Display System (KDS)

**Goal:** Provide a live kitchen workflow inside the POS application.

**Tasks:**
- Kitchen role and kitchen screen.
- Kitchen station setup or configuration.
- Route order items to relevant kitchen stations.
- Display new tickets with order number, table/order type, item details, modifiers, and notes.
- Item-level and ticket-level statuses: New, Preparing, Ready, Served (adapt if the approved workflow requires fewer states).
- Highlight delayed or priority tickets.
- Track preparation timestamps.
- Notify POS/waiter views when items become ready.
- Optional kitchen printer support only after hardware requirements are confirmed.

**Acceptance criteria:**
- New POS orders appear in the correct kitchen queue.
- Kitchen staff can update ticket/item statuses.
- POS and waiter views reflect status changes.
- Tickets are isolated by restaurant and outlet.
- Reconnection does not create duplicate tickets.

**Deliverables at end of Phase 5:**
- Kitchen station configuration UI.
- KDS ticket display component.
- Order-to-station routing logic.
- Status update API (from kitchen staff).
- Real-time status propagation to POS/waiter views.

---

## Phase 6 — Billing, Payments, Receipts, and Shifts

**Goal:** Complete the checkout lifecycle.

**Tasks:**
- Bill preview and invoice/receipt generation.
- Configurable taxes, service charges, and discounts.
- Item-level and order-level discounts with permissions.
- Cash, card, and UPI payment recording.
- Split payments and partial payments if approved for MVP.
- Refund and void workflows with reason and permission checks.
- Payment status and transaction references.
- Cash register opening and closing.
- Shift summary and cash reconciliation.
- Receipt printing support based on confirmed printer hardware.
- GST invoice requirements to be validated before production release.

**Important:**
- Do not store card numbers, CVV, UPI PINs, or other sensitive payment credentials.
- Use a compliant payment provider for online payments.
- Clearly distinguish a payment recorded manually from a payment verified by a gateway.

**Acceptance criteria:**
- An order can be billed and marked paid only according to its payment records.
- Partial/unpaid balances are handled correctly if enabled.
- Refunds and voids are permission-controlled and audited.
- Shift totals reconcile with recorded transactions.
- Receipts show the configured restaurant and tax details.

**Deliverables at end of Phase 6:**
- Bill preview and invoice generation UI.
- Tax, service charge, and discount configuration.
- Payment recording API (cash, card, UPI, manual).
- Split payment logic (if approved).
- Refund and void API with audit logging.
- Shift opening/closing and cash reconciliation reports.
- Receipt generation and printing logic.

---

## Phase 7 — Inventory, Purchasing, and Basic Reports

**Goal:** Add essential back-office operations.

**Tasks:**
- Ingredient and stock-item catalogue.
- Units of measurement and conversions.
- Recipe/BOM configuration for menu items.
- Stock deduction based on configured recipes and completed sales.
- Stock adjustments, wastage, and stock transfers.
- Supplier records.
- Purchase orders and goods received.
- Low-stock alerts.
- Daily sales and payment reports.
- Top-selling items and category performance.
- Tax, discount, refund, cancellation, and shift reports.
- Outlet-wise reporting.

**Acceptance criteria:**
- Stock movements are traceable.
- Recipe-based deductions are explainable and auditable.
- Reports reconcile with completed POS transactions.
- Restaurant data remains tenant-isolated.

**Deliverables at end of Phase 7:**
- Inventory item catalogue UI and API.
- Recipe/BOM configuration for menu items.
- Stock deduction logic (from recipes and sales).
- Stock adjustment and wastage UI.
- Supplier records UI.
- Purchase order creation and receipt processing.
- Low-stock alert logic and UI.
- Sales reports (daily, top items, categories).
- Outlet-wise reporting UI.

---

## Phase 8 — Customer QR Ordering and Enhancements

**Goal:** Add customer self-service and expansion features.

**Tasks:**
- Publish a restaurant's customer-facing QR menu.
- Generate table-specific QR codes.
- Browse categories/items and view variants/modifiers.
- Submit orders from a table.
- Route QR orders into the same POS and KDS lifecycle.
- Show order confirmation and status.
- Add online payment only after provider approval.
- Consider customer profiles, loyalty, feedback, and promotions.
- Consider delivery aggregator integrations subject to partner API access.
- Consider multi-outlet consolidated analytics and advanced reporting.

**Acceptance criteria:**
- QR orders are linked to the correct restaurant and table.
- QR orders follow the same pricing, availability, tax, and kitchen rules as staff orders.
- Duplicate submissions and invalid table references are handled safely.
- QR ordering can be enabled or disabled per restaurant/outlet.

**Deliverables at end of Phase 8:**
- QR menu generation and serving URL.
- Table-specific QR code generator.
- Customer-facing order submission UI.
- QR order routing into POS/KDS lifecycle.
- Order confirmation and status display.
- QR ordering enable/disable per restaurant/outlet.

---

## Phase 9 — Hardening, Testing, and Production Readiness

**Goal:** Prepare the platform for real restaurant operations.

**Tasks:**
- Security review of authentication, authorization, tenant isolation, and sensitive actions.
- Automated unit, integration, and end-to-end tests for critical workflows.
- Test concurrent orders and multiple users.
- Test subscription expiry, suspension, and plan-limit enforcement.
- Test payment failure, refund, cancellation, and shift reconciliation cases.
- Performance checks for POS and KDS updates.
- Backup and restore procedure.
- Error monitoring, logging, and operational alerts.
- Accessibility and responsive UI review.
- Production environment configuration and deployment documentation.
- User acceptance testing with representative restaurant staff.

**Acceptance criteria:**
- Critical workflows pass end-to-end tests.
- No known cross-tenant data exposure remains.
- Backup and restore process is documented and tested.
- Production secrets are stored securely.
- Deployment and rollback steps are documented.
- Known limitations are listed before launch.

**Deliverables at end of Phase 9:**
- Full test suite (unit, integration, e2e).
- Security audit report.
- Backup/restore documentation.
- Performance benchmark results.
- Accessibility review findings.
- Deployment documentation.
- UAT sign-off notes.

---

## Cross-Phase Notes

| Topic | Status |
|-------|--------|
| Monorepo structure | Phase 0 decided; to be set up in Phase 1. |
| Tenant isolation | Enforced from Phase 1 onward; DB-level RLS + app-level scoping. |
| RBAC | Enforced from Phase 1 onward; roles per app. |
| Payment provider | Not integrated until after Phase 6 approval. |
| Offline POS | Not approved for MVP; deferred. |
| KDS | Starts Phase 5; real-time via WebSockets. |
| GST invoices | Validated in Phase 6 before production release. |