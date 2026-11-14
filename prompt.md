# Restaurant POS --- Phase-wise Build Prompt

**Document:** `prompt.md`\
**Purpose:** Master implementation prompt for an AI coding agent
(OpenCode or similar)\
**Product plan:** Restaurant POS Application Plan v0.2

------------------------------------------------------------------------

## 1. Role and Mission

Act as a senior product engineer, solution architect, UI/UX designer,
database engineer, and QA engineer.

Build a multi-tenant SaaS Restaurant POS platform in controlled,
reviewable phases. The platform has **three main applications**:

1.  **Super Admin Portal** --- platform owner manages all restaurant
    accounts, subscription plans, subscriptions, and platform-wide
    operations.
2.  **Restaurant Admin Portal** --- each restaurant manages its outlets,
    menu, tables, staff, inventory, settings, and reports.
3.  **Restaurant POS Application** --- staff operate the restaurant
    through role-based screens for counter, waiter, and kitchen
    workflows.

Do not create separate applications for Waiter or Kitchen. Waiter Mode
and Kitchen Display System (KDS) must be role-based experiences within
the Restaurant POS Application. Customer QR ordering is a
customer-facing web experience connected to the same restaurant
platform, not a fourth staff portal.

Use the requirements in this prompt as the initial scope. If a
requirement is ambiguous or a technical decision materially affects
cost, security, or architecture, document the options and ask for
approval before committing to it.

## 2. Mandatory Working Rules

-   Work **one phase at a time**. Do not silently start the next phase.
-   At the beginning, inspect the existing repository, its framework,
    package manager, conventions, and current implementation. Do not
    overwrite an existing project without understanding it.
-   If the repository is empty, first recommend a technology stack and
    explain the trade-offs. Wait for approval before scaffolding if the
    stack has not already been selected.
-   Do not assume that a previous project's technology choices apply to
    this project.
-   Do not build all features in one pass or generate placeholder
    screens and call them complete.
-   Before each phase, summarize its scope, dependencies, database
    changes, and acceptance criteria.
-   Implement only the approved phase. At the end, run the relevant
    checks and report what passed, failed, or remains incomplete.
-   Keep the application runnable after every phase.
-   Prefer small, maintainable components and reusable patterns. Avoid
    unnecessary abstractions.
-   Do not use Docker for local development unless explicitly approved.
-   Never hardcode secrets, service-role keys, payment credentials, or
    private tokens in client-side code or source control.
-   Use environment variables and provide an `.env.example` containing
    names and safe example placeholders only.
-   Do not claim that an integration works unless it has been
    implemented and tested against the relevant service or a clearly
    documented mock.
-   Do not use fake data in production flows. Seed data may be used for
    local development and must be clearly identified.
-   Add loading, empty, success, and error states to user-facing
    workflows.
-   Ensure responsive layouts for desktop and tablet; POS screens must
    be optimized for touch.
-   Follow accessible form, keyboard, contrast, and focus-state
    practices.
-   Keep a `README.md` with setup, environment variables, migrations,
    seed instructions, and run/test commands.
-   Maintain a `CHANGELOG.md` or phase completion notes so progress is
    traceable.

## 3. Product Architecture

### 3.1 Multi-tenant model

The platform must support many independent restaurant businesses.

-   A **platform** contains multiple restaurant accounts.
-   A **restaurant account** may contain one or more outlets.
-   Each outlet may have its own tables, staff assignments, operating
    hours, menu availability, prices, taxes, and devices.
-   Every restaurant-owned record must be associated with the correct
    tenant (`restaurant_id`) and, where relevant, `outlet_id`.
-   Users must only access records allowed by their restaurant
    membership, outlet assignment, and role.
-   Super Admin access is platform-wide and must be protected separately
    from restaurant user access.

Treat tenant isolation as a core security requirement, not a UI filter.
Enforce it in the backend and database policies, not only in the
frontend.

### 3.2 Main applications and roles

**A. Super Admin Portal** - Super Admin - Support/Admin staff (optional,
permission-controlled)

**B. Restaurant Admin Portal** - Restaurant Owner - Restaurant Admin -
Outlet Manager - Inventory/Purchase Manager - Reporting-only user
(optional)

**C. Restaurant POS Application** - Cashier - Waiter - Kitchen Staff -
Shift Supervisor

A user may have different permissions in different outlets. Use
role-based access control (RBAC), with explicit permissions for
sensitive actions.

### 3.3 Core modules

-   Authentication and authorization
-   Restaurant and outlet management
-   Subscription plans and entitlements
-   Staff, roles, and permissions
-   Menu categories, items, variants, and modifiers
-   Floor sections, tables, and table status
-   Orders and order items
-   Kitchen stations and KDS tickets
-   Billing, taxes, discounts, payments, refunds, and receipts
-   Cash register and shift closing
-   Inventory, recipes, stock movements, suppliers, and purchase orders
-   Customers and order history
-   Reports and analytics
-   Audit logs and platform settings
-   Optional QR menu and customer ordering

## 4. Phase-wise Implementation Plan

### Phase 0 --- Repository Assessment and Technical Blueprint

**Goal:** Confirm the project foundation before implementation.

Tasks: - Inspect repository structure and existing code. - Identify
framework, runtime, package manager, database, authentication, and
deployment assumptions. - Review the Restaurant POS Application Plan
v0.2. - Recommend an architecture for the three applications. Prefer a
shared backend and shared data model; do not duplicate business logic
across portals. - Recommend whether to use a monorepo or a single
application with clearly separated route groups. - Propose database
entities and relationships. - Propose authentication, tenant isolation,
RBAC, subscription entitlement, and audit-log strategy. - Identify risks
around offline POS operation, payment handling, printing, and
third-party integrations. - Define local development and deployment
approach. Do not use Docker unless approved.

Deliverables: - `docs/architecture.md` - `docs/database-design.md` -
`docs/implementation-roadmap.md` - Updated `README.md` with the proposed
setup approach

**Acceptance criteria:** - Architecture and stack recommendation are
documented. - Three-application structure and role boundaries are
clear. - Tenant isolation strategy is explicit. - Major data entities
and relationships are documented. - No production feature implementation
begins until the technical direction is approved.

### Phase 1 --- Foundation, Authentication, Tenant Isolation, and Design System

**Goal:** Create a secure, runnable foundation.

Tasks: - Set up the approved project structure and development
scripts. - Configure database connection and migration workflow. -
Implement authentication and session handling. - Create user,
restaurant, outlet, membership, role, and permission foundations. -
Implement protected route groups for Super Admin, Restaurant Admin, and
POS. - Enforce server-side authorization and tenant isolation. - Add
initial design system: typography, colors, spacing, buttons, inputs,
dialogs, tables, navigation, and notifications. - Create responsive
application shells for all three applications. - Add audit-log
infrastructure for sensitive actions. - Add development seed data for
one platform admin, one restaurant, one outlet, and sample roles.

**Acceptance criteria:** - A user cannot access protected screens
without authentication. - A restaurant user cannot read or modify
another restaurant's data, including through direct API requests. -
Super Admin routes are inaccessible to ordinary restaurant users. - Role
and permission checks are enforced server-side. - All three application
shells render and navigate correctly. - Migrations, seed scripts, and
automated checks run successfully.

### Phase 2 --- Super Admin Portal and Subscription Management

**Goal:** Allow the platform owner to manage the SaaS business.

Tasks: - Dashboard with restaurant count, active trials, active
subscriptions, expired subscriptions, and basic platform usage. -
Restaurant account listing, search, filters, and detail view. - Create,
edit, activate, suspend, and deactivate restaurant accounts. - Create
subscription plans with name, price, billing cycle, trial duration, and
feature/usage limits. - Assign plans to restaurant accounts. - Manage
trial start/end dates, renewals, upgrades, downgrades, cancellations,
and expiry. - Display subscription status and payment history/status. -
Implement plan entitlements and usage-limit checks in the backend. -
Configure grace-period behaviour and restrictions for overdue
subscriptions. - Record subscription and account-management actions in
audit logs.

Important: - Do not integrate a live payment gateway without approval of
the provider and billing rules. - Until payment integration is approved,
support admin-managed payment status with a clear
manual/recorded-payment label. - Do not allow the frontend alone to
determine subscription access.

**Acceptance criteria:** - Super Admin can create and manage restaurant
accounts. - Super Admin can create plans and assign them to
restaurants. - Restaurant access reflects the assigned plan and
subscription status. - Expired or suspended account behaviour follows
documented rules. - Subscription changes are audited. - Restaurant users
cannot access Super Admin functions.

### Phase 3 --- Restaurant Admin Portal: Business Setup and Menu

**Goal:** Allow a restaurant to configure its operating environment.

Tasks: - Restaurant profile and business details. - Outlet creation and
editing. - Outlet operating hours and service modes. - Floor sections
and table setup. - Menu categories and menu items. - Item descriptions,
images, prices, and availability. - Variants, add-ons, and modifiers. -
Outlet-specific availability and pricing where required. - Tax
configuration and invoice settings. - Staff invitations/accounts and
outlet assignments. - Role and permission configuration using approved
roles. - Restaurant-level settings and audit history.

**Acceptance criteria:** - Restaurant owners can manage only their own
restaurant and authorized outlets. - Menu items can be organized into
categories and configured with variants/modifiers. - Table and floor
setup is usable. - Staff access follows assigned roles and outlet
membership. - Menu and outlet data is ready for use by POS workflows.

### Phase 4 --- Restaurant POS: Counter and Waiter Mode

**Goal:** Implement the core order-taking experience.

Tasks: - POS login and outlet/shift selection. - Touch-friendly POS
layout. - Order types: dine-in and takeaway initially; delivery only if
approved for MVP. - Table and floor selection for dine-in. - Counter
order creation. - Waiter Mode inside the same POS application. - Add,
edit, and remove order items. - Apply variants, modifiers, quantity, and
special instructions. - Add items to an existing table order. - Table
transfer and order transfer, permission-controlled. - Save and resume
open orders. - Order numbers and order source tracking. - Send orders to
kitchen. - Display order status. - Handle cancellations with permission
checks and reason capture.

**Acceptance criteria:** - Cashier can create and update
dine-in/takeaway orders. - Waiter can select a table and create/update
its order within the same POS application. - Order items preserve their
modifiers, notes, quantities, and prices. - Unauthorized users cannot
perform restricted actions. - Orders are persisted reliably and appear
in the correct outlet.

### Phase 5 --- Kitchen Display System (KDS)

**Goal:** Provide a live kitchen workflow inside the POS application.

Tasks: - Kitchen role and kitchen screen. - Kitchen station setup or
configuration. - Route order items to relevant kitchen stations. -
Display new tickets with order number, table/order type, item details,
modifiers, and notes. - Item-level and ticket-level status. - Statuses:
New, Preparing, Ready, Served (adapt if the approved workflow requires
fewer states). - Highlight delayed or priority tickets. - Track
preparation timestamps. - Notify POS/waiter views when items become
ready. - Optional kitchen printer support only after hardware
requirements are confirmed.

**Acceptance criteria:** - New POS orders appear in the correct kitchen
queue. - Kitchen staff can update ticket/item statuses. - POS and waiter
views reflect status changes. - Tickets are isolated by restaurant and
outlet. - Reconnection does not create duplicate tickets.

### Phase 6 --- Billing, Payments, Receipts, and Shifts

**Goal:** Complete the checkout lifecycle.

Tasks: - Bill preview and invoice/receipt generation. - Configurable
taxes, service charges, and discounts. - Item-level and order-level
discounts with permissions. - Cash, card, and UPI payment recording. -
Split payments and partial payments if approved for MVP. - Refund and
void workflows with reason and permission checks. - Payment status and
transaction references. - Cash register opening and closing. - Shift
summary and cash reconciliation. - Receipt printing support based on
confirmed printer hardware. - GST invoice requirements to be validated
before production release.

Important: - Do not store card numbers, CVV, UPI PINs, or other
sensitive payment credentials. - Use a compliant payment provider for
online payments. - Clearly distinguish a payment recorded manually from
a payment verified by a gateway.

**Acceptance criteria:** - An order can be billed and marked paid only
according to its payment records. - Partial/unpaid balances are handled
correctly if enabled. - Refunds and voids are permission-controlled and
audited. - Shift totals reconcile with recorded transactions. - Receipts
show the configured restaurant and tax details.

### Phase 7 --- Inventory, Purchasing, and Basic Reports

**Goal:** Add essential back-office operations.

Tasks: - Ingredient and stock-item catalogue. - Units of measurement and
conversions. - Recipe/BOM configuration for menu items. - Stock
deduction based on configured recipes and completed sales. - Stock
adjustments, wastage, and stock transfers. - Supplier records. -
Purchase orders and goods received. - Low-stock alerts. - Daily sales
and payment reports. - Top-selling items and category performance. -
Tax, discount, refund, cancellation, and shift reports. - Basic
outlet-wise reporting.

**Acceptance criteria:** - Stock movements are traceable. - Recipe-based
deductions are explainable and auditable. - Reports reconcile with
completed POS transactions. - Restaurant data remains tenant-isolated.

### Phase 8 --- Customer QR Ordering and Enhancements

**Goal:** Add customer self-service and expansion features.

Tasks: - Publish a restaurant's customer-facing QR menu. - Generate
table-specific QR codes. - Browse categories/items and view
variants/modifiers. - Submit orders from a table. - Route QR orders into
the same POS and KDS lifecycle. - Show order confirmation and status. -
Add online payment only after provider approval. - Consider customer
profiles, loyalty, feedback, and promotions. - Consider delivery
aggregator integrations subject to partner API access. - Consider
multi-outlet consolidated analytics and advanced reporting.

**Acceptance criteria:** - QR orders are linked to the correct
restaurant and table. - QR orders follow the same pricing, availability,
tax, and kitchen rules as staff orders. - Duplicate submissions and
invalid table references are handled safely. - QR ordering can be
enabled or disabled per restaurant/outlet.

### Phase 9 --- Hardening, Testing, and Production Readiness

**Goal:** Prepare the platform for real restaurant operations.

Tasks: - Security review of authentication, authorization, tenant
isolation, and sensitive actions. - Automated unit, integration, and
end-to-end tests for critical workflows. - Test concurrent orders and
multiple users. - Test subscription expiry, suspension, and plan-limit
enforcement. - Test payment failure, refund, cancellation, and shift
reconciliation cases. - Performance checks for POS and KDS updates. -
Backup and restore procedure. - Error monitoring, logging, and
operational alerts. - Accessibility and responsive UI review. -
Production environment configuration and deployment documentation. -
User acceptance testing with representative restaurant staff.

**Acceptance criteria:** - Critical workflows pass end-to-end tests. -
No known cross-tenant data exposure remains. - Backup and restore
process is documented and tested. - Production secrets are stored
securely. - Deployment and rollback steps are documented. - Known
limitations are listed before launch.

------------------------------------------------------------------------

## 5. Cross-Cutting Technical Requirements

### Security

-   Enforce authorization on every protected server action/API.
-   Apply database-level tenant isolation policies where supported.
-   Validate all input on the server.
-   Rate-limit sensitive authentication and public endpoints.
-   Protect against common web vulnerabilities.
-   Log security-sensitive actions without recording passwords, tokens,
    or payment secrets.

### Data and Auditability

-   Use stable IDs and appropriate foreign keys.
-   Store timestamps consistently; display them in the restaurant/outlet
    timezone.
-   Use transactions for operations that must succeed or fail together.
-   Keep an auditable history for payments, refunds, stock movements,
    subscription changes, and order cancellations.
-   Avoid hard deletion of financial and operational records; use
    controlled cancellation/void/archive states where appropriate.

### POS Reliability and Offline Behaviour

-   During Phase 0, decide whether offline billing is required for the
    first release.
-   If offline mode is approved, design an explicit local persistence,
    sync, conflict-resolution, and retry strategy before implementing
    it.
-   Do not claim offline support if orders or payments still require a
    live connection.
-   Prevent duplicate order and payment submissions through idempotency
    controls where appropriate.

### UI/UX

-   Keep the three applications visually consistent while giving each
    role a focused workflow.
-   POS must prioritize speed, touch targets, clear order state, and
    minimal steps.
-   Admin screens should prioritize clear forms, searchable tables,
    filters, and useful summaries.
-   Super Admin should make subscription status and account actions easy
    to identify.
-   Do not overload the POS with back-office configuration features.

## 6. Required Documentation and Project Hygiene

Maintain these documents as the project evolves:

-   `README.md` --- setup, environment, migrations, seed data, run/test
    commands.
-   `docs/architecture.md` --- application architecture and key
    technical decisions.
-   `docs/database-design.md` --- entities, relationships, tenant
    boundaries, and migrations.
-   `docs/roles-permissions.md` --- roles, permissions, and sensitive
    actions.
-   `docs/subscriptions.md` --- plans, entitlements, billing states,
    grace periods, and restrictions.
-   `docs/order-lifecycle.md` --- order states and
    POS-to-kitchen-to-payment flow.
-   `docs/testing.md` --- test strategy and how to run checks.
-   `CHANGELOG.md` --- completed phases and notable changes.

Update documentation when implementation changes the agreed design.

## 7. Definition of Done for Every Phase

A phase is complete only when:

1.  All approved scope items for the phase are implemented.
2.  Relevant database migrations and seed data are included.
3.  Authorization and tenant isolation are tested where applicable.
4.  Loading, empty, success, and error states are handled.
5.  Relevant automated tests pass.
6.  Linting, type checks, and production build pass where configured.
7.  No critical console/server errors remain in the tested workflows.
8.  Documentation is updated.
9.  The agent provides a concise completion report with:
    -   Features implemented
    -   Files/modules changed
    -   Database changes
    -   Commands/checks run and their results
    -   Known issues or deferred items
    -   Manual testing instructions
10. The agent stops and waits for approval before beginning the next
    phase.

## 8. First Instruction to the Coding Agent

**Start with Phase 0 only.**

Inspect the repository and the available project files. Read the
Restaurant POS Application Plan v0.2 if it is present. If it is not
present, use the product structure and requirements in this prompt.

Produce the Phase 0 architecture and implementation documents. Identify
unresolved decisions, especially technology stack, hosting, offline POS
requirements, printer hardware, GST requirements, and payment provider.

Do not begin Phase 1 or generate the application code until the Phase 0
recommendations and technical decisions have been reviewed and approved.

After approval, implement one phase at a time and follow the Definition
of Done above.
