# Restaurant POS — Database Design Document

## Overview
PostgreSQL database with Prisma ORM. Multi-tenant isolation via `restaurant_id` and `outlet_id` on all tenant-scoped tables. Super Admin records have no `restaurant_id` (or `null`).

## Entity Relationship Diagram

```
┌──────────────┐      ┌─────────────────────┐      ┌─────────────────────┐
│  users       │      │  restaurants        │      │  outlets            │
├──────────────┤      ├─────────────────────┤      ├─────────────────────┤
│ id PK        │      │ id PK               │      │ id PK               │
│ name         │      │ name                │      │ name                │
│ email        │      │ slug                │      │ slug                │
│ password     │      │ plan_id FK          │      │ restaurant_id FK    │
│ role         │      │ is_active           │      │ is_active           │
│ restaurant_id│◄──────│ is_active           │◄──────│ is_active           │
│ outlet_id    │      │                     │      │ operating_hours     │
│ created_at   │      │                     │      │ (JSON)              │
└──────────────┘      └─────────────────────┘      └─────────────────────┘
```

```
┌─────────────────────┐
│  memberships        │
├─────────────────────┤
│ id PK               │
│ restaurant_id FK    │
│ user_id FK          │
│ role               │  (enum: owner, admin, staff, viewer) │
│ outlet_id FK        │  (null = restaurant-level) │
│ status             │  (active, suspended, expired) │
│ created_at          │
└─────────────────────┘
```

```
┌─────────────────────┐
│  subscriptions      │
├─────────────────────┤
│ id PK               │
│ restaurant_id FK    │
│ plan_id FK          │
│ status             │  (active, trial, past_due, suspended, cancelled, expired) │
│ billing_cycle      │  (monthly, yearly) │
│ trial_ends_at      │
│ current_period_start│
│ current_period_end │
│ cancel_at_period_end│
│ created_at         │
│ updated_at         │
└─────────────────────┘
```

```
┌─────────────────────┐
│  plans              │
├─────────────────────┤
│ id PK               │
│ name               │  (starter, pro, enterprise) │
│ price              │
│ billing_cycle      │  (monthly, yearly) │
│ trial_duration_days│
│ feature_limits     │  (JSON: max_tables, max_staff, etc.) │
│ is_active          │
│ created_at         │
└─────────────────────┘
```

```
┌─────────────────────┐
│  categories         │
├─────────────────────┤
│ id PK               │
│ restaurant_id FK    │
│ name               │
│ display_order      │
│ is_active          │
│ created_at         │
└─────────────────────┘
```

```
┌─────────────────────┐
│  menu_items         │
├─────────────────────┤
│ id PK               │
│ category_id FK      │
│ restaurant_id FK    │
│ name               │
│ description        │
│ price              │
│ image_url          │
│ is_available       │
│ is_modifiable      │
│ modifiers_allowed  │
│ display_order      │
│ created_at         │
└─────────────────────┘
```

```
┌─────────────────────┐
│  modifiers          │
├─────────────────────┤
│ id PK               │
│ restaurant_id FK    │
│ name               │
│ price_adjustment   │  (positive = add cost, negative = discount) │
│ is_required        │
│ display_order      │
│ created_at         │
└─────────────────────┘
```

```
┌─────────────────────┐
│  order_items        │
├─────────────────────┤
│ id PK               │
│ order_id FK         │
│ menu_item_id FK     │
│ quantity           │
│ unit_price         │  (price at time of order, for historical accuracy) │
│ special_instructions│
│ modifiers JSON     │  (selected modifier IDs) │
│ created_at         │
┓
```
```
┌─────────────────────┐
│  orders             │
├─────────────────────┤
│ id PK               │
│ restaurant_id FK    │
│ outlet_id FK        │  (nullable = restaurant-level) │
│ user_id FK          │  (who created the order) │
│ status             │  (open, paid, cancelled, refunded) │
│ order_type         │  (dine_in, takeaway, delivery) │
│ table_id FK        │  (nullable = takeaway/delivery) │
│ total_amount       │
│ tax_amount         │
│ discount_amount    │
│ payment_status     │  (unpaid, paid, partial, refunded) │
│ payment_method     │  (cash, card, upi, manual) │
│ source             │  (pos, waiter, kds, qr) │
│ created_at         │
│ updated_at         │
└─────────────────────┘
```

```
┌─────────────────────┐
│  kitchen_stations   │
├─────────────────────┤
│ id PK               │
│ restaurant_id FK    │
│ name               │  (grill, salads, drinks, etc.) │
│ is_active          │
│ display_order      │
│ created_at         │
└─────────────────────┘
```

```
┌─────────────────────┐
│  kds_tickets        │
├─────────────────────┤
│ id PK               │
│ kitchen_station_id FK│
│ order_id FK         │
│ status             │  (new, preparing, ready, served) │
│ priority           │  (normal, high) │
│ created_at         │
│ updated_at         │
└─────────────────────┘
```

```
┌─────────────────────┐
│  inventory_items    │
├─────────────────────┤
│ id PK               │
│ restaurant_id FK    │
│ name               │
│ unit               │
│ current_stock      │
│ minimum_stock      │
│ is_tracked         │
│ created_at         │
└─────────────────────┘
```

```
┌─────────────────────┐
│  recipes            │
├─────────────────────┤
│ id PK               │
│ menu_item_id FK     │
│ ingredient_id FK    │
│ quantity           │
│ unit               │
│ created_at         │
└─────────────────────┘
```

```
┌─────────────────────┐
│  stock_movements    │
├─────────────────────┤
│ id PK               │
│ inventory_item_id FK│
│ type               │  (purchase, adjustment, wastage, sale) │
│ quantity           │
│ reference_type     │  (order, purchase_order) │
│ reference_id       │  (order ID, purchase order ID) │
│ reason             │
│ created_at         │
└─────────────────────┘
```

```
┌─────────────────────┐
│  suppliers          │
├─────────────────────┤
│ id PK               │
│ name               │
│ contact            │
│ created_at         │
└─────────────────────┘
```

```
┌─────────────────────┐
│  purchase_orders    │
├─────────────────────┤
│ id PK               │
│ restaurant_id FK    │
│ supplier_id FK      │
│ status             │  (pending, received, cancelled) │
│ total_amount       │
│ created_at         │
│ updated_at         │
└─────────────────────┘
```

```
┌─────────────────────┐
│  tables             │
├─────────────────────┤
│ id PK               │
│ outlet_id FK        │
│ name               │  (e.g. "Table 1") │
│ section            │  (optional floor section) │
│ capacity           │
│ is_active          │
│ created_at         │
└─────────────────────┘
```

```
┌─────────────────────┐
│  staff              │
├─────────────────────┤
│ id PK               │
│ restaurant_id FK    │
│ outlet_id FK        │  (nullable = restaurant-level) │
│ user_id FK          │  (link to auth users) │
│ role_id FK          │
│ is_active          │
│ created_at         │
└─────────────────────┘
```

```
┌─────────────────────┐
│  audit_logs         │
├─────────────────────┤
│ id PK               │
│ entity_type        │  (order, subscription, menu_item, etc.) │
│ entity_id          │
│ action             │  (create, update, delete, status_change) │
│ user_id FK         │
│ restaurant_id FK   │
│ outlet_id FK       │  (nullable) │
│ changes JSON       │  (before/after snapshot) │
│ created_at         │
└─────────────────────┘
```

## Tenant Isolation Strategy

| Approach | Description |
|----------|-------------|
| **Database-level** | PostgreSQL RLS policies on every tenant-scoped table. Policy: `WHERE restaurant_id = current_setting('app.restaurant_id')::int`. |
| **Application-level** | Every Prisma query explicitly filters by `restaurant_id` = current session tenant. Super Admin bypass via separate middleware. |
| **Super Admin** | No `restaurant_id` filter (or `null`). Accessible only via dedicated Super Admin middleware with separate auth. |

## Migration Strategy

- **Prisma Schema** managed in `prisma/schema.prisma`.
- Migrations generated via `npx prisma migrate make <name>` and applied via `npx prisma migrate deploy`.
- Seed script (`prisma/seed.ts`) creates: one platform admin, one restaurant, one outlet, sample roles, and sample data for categories/menu items.

## Key Data Notes

- **`users.role`**: enum (`super-admin`, `restaurant-admin`, `owner`, `manager`, `cashier`, `waiter`, `kitchen-staff`, `reporting-only`).
- **`orders.payment_status`**: enum (`unpaid`, `paid`, `partial`, `refunded`).
- **`orders.payment_method`**: enum (`cash`, `card`, `upi`, `manual`).
- **`orders.source`**: enum (`pos`, `waiter`, `kds`, `qr`).
- **`kds_tickets.status`**: enum (`new`, `preparing`, `ready`, `served`).
- **`inventory_items.is_tracked`**: boolean — if false, stock movements not tracked for that item.
- **`suppliers`**: optional; some restaurants may not have suppliers (made-to-order only).

## Indexes for Performance

- `idx_orders_restaurant_id` on orders(restaurant_id)
- `idx_orders_outlet_id` on orders(outlet_id)
- `idx_orders_status` on orders(status)
- `idx_orders_created_at` on orders(created_at DESC)
- `idx_kds_tickets_station_status` on kds_tickets(kitchen_station_id, status)
- `idx_order_items_order_id` on order_items(order_id)
- `idx_menu_items_restaurant_id` on menu_items(restaurant_id)
- `idx_subscriptions_restaurant_id` on subscriptions(restaurant_id)
- `idx_audits_restaurant_id` on audit_logs(restaurant_id)
- Partial unique index: `UNIQUE(menu_items_restaurant_name)` on menu_items(restaurant_id, name) — prevents duplicate item names per restaurant.