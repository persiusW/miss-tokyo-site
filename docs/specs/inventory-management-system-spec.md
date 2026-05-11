# Inventory Management System — Full Specification
**Version:** 1.0  
**Date:** 2026-05-03  
**Standard:** Industry-grade, ecommerce-ready with variant support

---

## Table of Contents

1. [Overview](#1-overview)
2. [Core Domain Model](#2-core-domain-model)
3. [Variant & SKU Architecture](#3-variant--sku-architecture)
4. [Inventory Lifecycle & State Machine](#4-inventory-lifecycle--state-machine)
5. [Concurrency Control & Race Condition Handling](#5-concurrency-control--race-condition-handling)
6. [Reservation System](#6-reservation-system)
7. [SAGA Pattern for Distributed Transactions](#7-saga-pattern-for-distributed-transactions)
8. [Reorder, Safety Stock & Demand Forecasting](#8-reorder-safety-stock--demand-forecasting)
9. [Multi-Location & Warehouse Management](#9-multi-location--warehouse-management)
10. [Audit Trail & Event Sourcing](#10-audit-trail--event-sourcing)
11. [API Specification](#11-api-specification)
12. [Non-Functional Requirements](#12-non-functional-requirements)
13. [Scenario Walkthroughs](#13-scenario-walkthroughs)
14. [Security & Compliance](#14-security--compliance)

---

## 1. Overview

An Inventory Management System (IMS) is the authoritative source of truth for the quantity, location, and availability of every product a business holds or sells. It sits at the intersection of purchasing, warehousing, order fulfilment, and finance.

### 1.1 Goals

| Goal | Description |
|------|-------------|
| Accuracy | Stock counts must never drift from physical reality |
| Consistency | No oversell under any concurrent load |
| Auditability | Every stock movement must be traceable to a cause |
| Scalability | Sustain Black Friday / flash-sale peak concurrency |
| Adaptability | Support physical, digital, and pre-order inventory models |

### 1.2 System Boundaries

```
┌─────────────────────────────────────────────────────────────────┐
│                      INVENTORY SYSTEM                           │
│                                                                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌───────────────┐  │
│  │  Catalog  │  │  Orders  │  │Warehouses│  │  Purchasing   │  │
│  │  Service  │  │  Service │  │  Service │  │    Service    │  │
│  └─────┬─────┘  └────┬─────┘  └─────┬────┘  └──────┬────────┘  │
│        │              │              │               │           │
│        └──────────────┴──────────────┴───────────────┘          │
│                               │                                 │
│                    ┌──────────▼──────────┐                      │
│                    │   Inventory Core    │                      │
│                    │  (This System)      │                      │
│                    └──────────┬──────────┘                      │
│                               │                                 │
│        ┌──────────────────────┼──────────────────────┐         │
│        ▼                      ▼                      ▼         │
│  ┌──────────┐          ┌─────────────┐        ┌──────────┐     │
│  │ Ledger / │          │  Messaging  │        │  Search  │     │
│  │ Finance  │          │   Broker    │        │  Index   │     │
│  └──────────┘          └─────────────┘        └──────────┘     │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Core Domain Model

### 2.1 Entities

#### Product
The logical grouping. Has no stock itself — stock lives on Variants.

```typescript
interface Product {
  id: string;                    // UUID
  sku_prefix: string;            // e.g. "SHIRT"
  title: string;
  description: string;
  category_id: string;
  option_types: OptionType[];    // e.g. ["size", "color"]
  variants: Variant[];
  metadata: Record<string, unknown>;
  created_at: Date;
  updated_at: Date;
}
```

#### Variant
A single sellable permutation of a product. **This is the atom of inventory.**

```typescript
interface Variant {
  id: string;                         // UUID
  product_id: string;
  sku: string;                        // Globally unique. e.g. "SHIRT-M-BLK"
  option_values: Record<string, string>; // {size: "M", color: "Black"}
  price: number;                      // In minor units (cents)
  price_override?: number;            // e.g. XL surcharge
  weight_grams: number;
  barcode?: string;
  images: string[];
  is_active: boolean;
  preorder_enabled: boolean;
  preorder_max_quantity?: number;
  preorder_estimated_ship_date?: Date;
  created_at: Date;
}
```

#### InventoryItem
Tracks stock for one Variant at one Location.

```typescript
interface InventoryItem {
  id: string;
  variant_id: string;
  location_id: string;
  quantity_on_hand: number;       // Physical units present
  quantity_reserved: number;      // Held by open orders/reservations
  quantity_available: number;     // on_hand - reserved (computed)
  quantity_incoming: number;      // On open purchase orders
  quantity_damaged: number;       // Quarantined/unsellable
  reorder_point: number;          // Trigger for auto-replenishment
  reorder_quantity: number;       // Units to order when triggered
  safety_stock: number;           // Buffer below reorder point
  version: number;                // Optimistic lock version counter
  updated_at: Date;
}
```

#### StockMovement (Immutable Ledger)

```typescript
interface StockMovement {
  id: string;
  inventory_item_id: string;
  type: MovementType;             // See enum below
  quantity_delta: number;         // Positive = in, Negative = out
  quantity_before: number;
  quantity_after: number;
  reference_type: string;         // "order" | "purchase_order" | "adjustment" | ...
  reference_id: string;
  note?: string;
  performed_by: string;           // User or system actor
  created_at: Date;               // Immutable once written
}

enum MovementType {
  RECEIVE          = "receive",          // PO received
  SELL             = "sell",             // Order fulfilled
  RETURN           = "return",           // Customer return
  ADJUSTMENT_UP    = "adjustment_up",    // Manual count correction up
  ADJUSTMENT_DOWN  = "adjustment_down",  // Manual count correction down
  TRANSFER_IN      = "transfer_in",      // Moved from another location
  TRANSFER_OUT     = "transfer_out",     // Moved to another location
  DAMAGE           = "damage",           // Quarantined
  WRITE_OFF        = "write_off",        // Disposal / loss
  RESERVE          = "reserve",          // Soft hold for checkout
  UNRESERVE        = "unreserve",        // Released hold (abandoned cart)
}
```

---

## 3. Variant & SKU Architecture

### 3.1 SKU Design Rules

| Rule | Rationale |
|------|-----------|
| Globally unique per system | Prevents cross-product stock confusion |
| Human-readable, machine-parseable | `BRAND-CATEGORY-ATTR1-ATTR2` format |
| 8–14 alphanumeric characters | Scanner-compatible, no ambiguous chars (0/O, 1/I) |
| Uppercase only | Case-insensitive comparisons safe |
| No special characters | Barcode, URL, and filename safe |
| Stable once created | Renaming a SKU breaks historical ledger records |

**Example schema: `{PREFIX}-{OPTION1}-{OPTION2}`**
```
SHIRT-S-RED   → T-Shirt, Small, Red
SHIRT-XL-BLK  → T-Shirt, XL, Black
WATCH-42-SLV  → Watch, 42mm, Silver
```

### 3.2 Option Matrix

The system enumerates all valid option combinations on product creation. Only listed combinations can have active InventoryItems.

```
Product: "Classic T-Shirt"
Option Types: [size: [XS,S,M,L,XL], color: [Red,Black,White]]

Generated variants: 5 × 3 = 15 SKUs
Invalid combo guard: attempts to create stock for a non-enumerated combo → rejected
```

### 3.3 Variant Deactivation vs. Deletion

- **Deactivate** (`is_active = false`): Hides from storefront. Existing stock and history preserved. Reversible.
- **Delete**: Blocked if any stock movement history exists. Cascade to InventoryItem allowed only on zero-history variants.

---

## 4. Inventory Lifecycle & State Machine

### 4.1 Stock States per Unit

```
            ┌─────────┐
            │ Incoming │  (on open PO)
            └────┬─────┘
                 │ receive()
                 ▼
            ┌─────────┐
            │ On Hand  │ ◄──── return() / unreserve() / adjustment_up()
            └────┬─────┘
                 │
       ┌─────────┼─────────┐
       │reserve()│         │damage()
       ▼         ▼         ▼
  ┌──────────┐  (still  ┌─────────┐
  │ Reserved │  on_hand) │ Damaged │
  └────┬─────┘          └────┬────┘
       │ fulfill()            │ write_off() or restore()
       ▼                      ▼
  ┌──────────┐           ┌──────────┐
  │   Sold   │           │Written   │
  │ (out)    │           │  Off     │
  └──────────┘           └──────────┘
```

### 4.2 Computed Availability Formula

```
quantity_available = quantity_on_hand - quantity_reserved - quantity_damaged
```

The `quantity_available` column is **never stored** — it is always computed in a database view or application layer from the authoritative columns above. This prevents drift.

---

## 5. Concurrency Control & Race Condition Handling

This is the most critical section of the spec. Two customers buying the last unit simultaneously is the canonical inventory failure scenario.

### 5.1 The Problem

```
Time  Thread A (Customer 1)           Thread B (Customer 2)
────  ───────────────────────         ─────────────────────
T1    READ: available = 1             READ: available = 1
T2                                    WRITE: available = 0  ✓
T3    WRITE: available = -1  ✗        ← OVERSELL
```

### 5.2 Strategy Selection Matrix

| Scenario | Recommended Strategy | Why |
|---|---|---|
| Single-DB, high contention (flash sale) | **Pessimistic locking** (`SELECT FOR UPDATE`) | Guaranteed no oversell; worth blocking cost |
| Single-DB, normal traffic | **Optimistic locking** (version column) | Lower lock contention, retries on conflict |
| Multi-node / microservices | **Redis atomic decrement + SAGA** | Distributed coordination without DB lock |
| Pre-order with soft quota | **Reservation with TTL** | Quota tracked separately; releases on expiry |

### 5.3 Pessimistic Locking (PostgreSQL)

```sql
BEGIN;

SELECT quantity_available
FROM inventory_items
WHERE variant_id = $1 AND location_id = $2
FOR UPDATE;              -- Blocks all other reads-for-update on this row

-- If quantity_available >= requested:
UPDATE inventory_items
SET
  quantity_reserved  = quantity_reserved + $qty,
  quantity_available = quantity_on_hand - (quantity_reserved + $qty) - quantity_damaged
WHERE variant_id = $1 AND location_id = $2;

INSERT INTO stock_movements (...) VALUES (...);

COMMIT;
```

- Row-level lock held only for the duration of the transaction (milliseconds).
- Under extreme concurrency (10,000 concurrent requests), remaining requests queue at the DB. Use connection pooling (PgBouncer) to prevent exhaustion.

### 5.4 Optimistic Locking (version column)

```sql
-- Application reads current state + version
SELECT quantity_available, version FROM inventory_items WHERE id = $id;
-- Returns: available=1, version=42

-- Application attempts update; fails if version changed
UPDATE inventory_items
SET
  quantity_reserved = quantity_reserved + $qty,
  version = version + 1
WHERE id = $id AND version = 42;  -- Stale version = 0 rows affected

-- Application retries up to N times with exponential backoff
-- After max retries: return "stock unavailable" to client
```

**Retry policy:**
```
max_retries: 3
backoff: 50ms × 2^attempt + jitter(0–25ms)
final failure: surface as 409 Conflict to caller
```

### 5.5 Redis Atomic Decrement (Distributed / High-Throughput)

Used when multiple API nodes share a Redis cache as the hot inventory layer.

```lua
-- Lua script executed atomically in Redis
local available = tonumber(redis.call('GET', KEYS[1]))
if available == nil then
  return redis.error_reply('STOCK_NOT_CACHED')
end
if available < tonumber(ARGV[1]) then
  return -1  -- Insufficient stock
end
return redis.call('DECRBY', KEYS[1], ARGV[1])  -- Atomic; returns new value
```

- Redis decrement is the reservation gate; the authoritative decrement to PostgreSQL follows asynchronously via a message queue.
- A background reconciler syncs Redis cache with DB every 60 seconds and on any direct DB write.

### 5.6 Handling the "Last Item" Simultaneously

**Scenario:** 3 users check out with the last 1 unit at the same millisecond.

```
User A (wins lock)   → reserve(1) → quantity_available = 0  ✓
User B (loses lock)  → SELECT returns 0 → return HTTP 409: "Out of stock"
User C (loses lock)  → SELECT returns 0 → return HTTP 409: "Out of stock"
```

User B and C receive an "item no longer available" message. The system does **not** oversell. The UI should offer:
- "Notify me when back in stock" (waitlist enrollment)
- "Pre-order" if the variant has `preorder_enabled = true`

---

## 6. Reservation System

A reservation is a **soft hold** — stock is committed to an intent but not yet deducted from physical inventory.

### 6.1 Reservation Lifecycle

```
PENDING_PAYMENT → CONFIRMED → FULFILLED → (closed)
       │               │
       │ timeout/cancel│ cancel
       ▼               ▼
   RELEASED        RELEASED → stock_movement(UNRESERVE)
```

### 6.2 Reservation Record

```typescript
interface Reservation {
  id: string;
  order_id?: string;              // Set once order is created
  cart_id: string;
  variant_id: string;
  location_id: string;
  quantity: number;
  status: ReservationStatus;
  expires_at: Date;               // TTL; system auto-releases on expiry
  created_at: Date;
  confirmed_at?: Date;
  released_at?: Date;
}

enum ReservationStatus {
  PENDING   = "pending",
  CONFIRMED = "confirmed",
  FULFILLED = "fulfilled",
  RELEASED  = "released",
  EXPIRED   = "expired",
}
```

### 6.3 TTL Policy

| Cart Stage | Reservation TTL |
|---|---|
| Item added to cart | 15 minutes |
| Checkout started | 30 minutes |
| Payment processing | 10 minutes |
| Payment confirmed | Until fulfilment |

A background worker (cron: every 60 seconds) scans for expired reservations and releases them, emitting a `reservation.expired` event.

---

## 7. SAGA Pattern for Distributed Transactions

When order creation, payment, and inventory reservation span multiple services, a SAGA ensures atomicity without a distributed lock.

### 7.1 Order Placement SAGA (Orchestration Style)

```
Orchestrator (Order Service)
│
├─► 1. CreateOrder         → orders_db (status: PENDING)
│
├─► 2. ReserveInventory    → inventory_service
│       │ success → continue
│       │ fail    → compensate: CancelOrder
│
├─► 3. ChargePayment       → payment_service
│       │ success → continue
│       │ fail    → compensate: ReleaseInventory → CancelOrder
│
├─► 4. ConfirmInventory    → inventory_service (PENDING → CONFIRMED)
│
└─► 5. FinalizeOrder       → orders_db (status: CONFIRMED)
         │ fail    → compensate: RefundPayment → ReleaseInventory → CancelOrder
```

### 7.2 Compensation Guarantees

Every forward step must have a defined compensating transaction:

| Step | Compensating Transaction |
|---|---|
| ReserveInventory | ReleaseInventory (emit `reservation.released`) |
| ChargePayment | RefundPayment |
| ConfirmInventory | RevertInventoryConfirmation |
| FinalizeOrder | CancelOrder |

### 7.3 Idempotency

All SAGA steps are idempotent. Each step receives a `saga_id` + `step_id`. If re-delivered (message broker at-least-once), the handler checks a processed-events table and no-ops on duplicate.

```sql
INSERT INTO processed_saga_steps (saga_id, step_id, processed_at)
VALUES ($1, $2, NOW())
ON CONFLICT (saga_id, step_id) DO NOTHING;

-- If 0 rows inserted: duplicate, skip processing
```

---

## 8. Reorder, Safety Stock & Demand Forecasting

### 8.1 Key Formulas

**Safety Stock (Standard Deviation Method)**
```
Safety Stock = Z × σ_demand × √(lead_time)

Where:
  Z             = Service level z-score (e.g. 1.65 for 95%, 2.33 for 99%)
  σ_demand      = Standard deviation of daily demand over trailing 90 days
  lead_time     = Average supplier lead time in days
```

**Reorder Point (ROP)**
```
ROP = (average_daily_demand × lead_time) + safety_stock
```

**Economic Order Quantity (EOQ)**
```
EOQ = √(2 × annual_demand × order_cost / holding_cost_per_unit)
```

### 8.2 Automated Replenishment Flow

```
Cron: every 6 hours
  For each InventoryItem:
    IF quantity_available <= reorder_point AND no open PO exists:
      → Create PurchaseOrderSuggestion
      → Emit event: reorder.triggered
      → (Optional) Auto-create PO if supplier integration active
```

### 8.3 Demand Forecasting Tiers

| Method | Use When | Accuracy |
|---|---|---|
| Moving Average (7/30/90 day) | Stable demand, low variance | Moderate |
| Exponential Smoothing (ETS) | Trend or seasonal patterns | Good |
| ML (Prophet / ARIMA) | Complex seasonality, external signals | High |
| Human Override | New products, promotional events | N/A |

Forecast confidence scores are stored alongside forecasts. Below 60% confidence, the system flags the SKU for manual review rather than auto-replenishing.

---

## 9. Multi-Location & Warehouse Management

### 9.1 Location Types

```typescript
enum LocationType {
  WAREHOUSE     = "warehouse",      // Fulfilment centre
  STORE         = "store",          // Retail shop floor
  STORE_BACK    = "store_back",     // Store stockroom
  IN_TRANSIT    = "in_transit",     // Between locations
  SUPPLIER      = "supplier",       // Virtual; represents supplier stock
  DAMAGED       = "damaged",        // Quarantine zone
  VIRTUAL       = "virtual",        // Digital goods, pre-order buckets
}
```

### 9.2 Stock Allocation Priority

When an order is placed and stock exists at multiple locations, the system uses a configurable allocation strategy:

| Strategy | Description |
|---|---|
| `NEAREST_TO_CUSTOMER` | Minimise shipping distance (requires geo data) |
| `HIGHEST_STOCK_FIRST` | Deplete largest stockpiles first |
| `LOWEST_COST_FIRST`  | Prioritise cheapest fulfilment node |
| `MANUAL`             | Operator assigns location at pick time |

### 9.3 Inter-Location Transfer

```
Source Location: WAREHOUSE_A
Destination:     STORE_NYC

Steps:
1. Create TransferOrder (status: PENDING)
2. TRANSFER_OUT movement at WAREHOUSE_A → quantity_on_hand decreases
3. Goods enter IN_TRANSIT virtual location
4. On receipt at STORE_NYC: TRANSFER_IN movement → quantity_on_hand increases
5. TransferOrder status: COMPLETED
```

---

## 10. Audit Trail & Event Sourcing

### 10.1 Principle

The `stock_movements` table is an **append-only ledger**. Current state is always derivable by replaying all movements for an `inventory_item_id`. No record is ever updated or deleted.

### 10.2 Event Catalogue

| Event | Trigger | Subscribers |
|---|---|---|
| `inventory.reserved` | Checkout reservation created | Order Service, Analytics |
| `inventory.unreserved` | Cart abandoned / reservation expired | Order Service, Notification |
| `inventory.fulfilled` | Order shipped | Finance, Analytics |
| `inventory.received` | PO receipt recorded | Finance, Analytics |
| `inventory.low_stock` | quantity_available ≤ reorder_point | Purchasing, Notification |
| `inventory.out_of_stock` | quantity_available = 0 | Storefront, Notification |
| `inventory.back_in_stock` | quantity_available > 0 after zero | Storefront, Wishlist |
| `inventory.adjusted` | Manual correction made | Audit, Finance |
| `reorder.triggered` | Auto-replenishment threshold hit | Purchasing |

### 10.3 Replay & Reconciliation

```sql
-- Reconstruct current on_hand for a given inventory_item
SELECT
  SUM(quantity_delta) AS computed_on_hand
FROM stock_movements
WHERE inventory_item_id = $1
  AND type IN ('receive','return','adjustment_up','adjustment_down',
               'transfer_in','transfer_out','damage','write_off');

-- This should equal inventory_items.quantity_on_hand
-- If not: raise reconciliation_alert event
```

A nightly reconciliation job runs this query against every InventoryItem. Drift triggers an alert to the operations team; it does **not** auto-correct (human review required).

---

## 11. API Specification

### 11.1 Endpoints

#### Check Availability
```
GET /inventory/availability?variant_id={id}&location_id={id}&quantity={n}

Response 200:
{
  "variant_id": "uuid",
  "location_id": "uuid",
  "quantity_available": 12,
  "quantity_requested": 3,
  "is_available": true,
  "preorder_available": false
}
```

#### Create Reservation
```
POST /inventory/reservations

Body:
{
  "cart_id": "uuid",
  "variant_id": "uuid",
  "location_id": "uuid",      // optional; system allocates if omitted
  "quantity": 2,
  "ttl_seconds": 900
}

Response 201:
{
  "reservation_id": "uuid",
  "status": "pending",
  "expires_at": "2026-05-03T12:15:00Z",
  "quantity_reserved": 2
}

Response 409 (conflict — insufficient stock):
{
  "error": "INSUFFICIENT_STOCK",
  "quantity_available": 0,
  "preorder_available": true,
  "preorder_estimated_ship": "2026-06-15"
}
```

#### Record Stock Movement
```
POST /inventory/movements

Body:
{
  "inventory_item_id": "uuid",
  "type": "receive",
  "quantity_delta": 50,
  "reference_type": "purchase_order",
  "reference_id": "PO-2026-0483",
  "note": "Spring restock — Supplier Acme"
}

Response 201:
{
  "movement_id": "uuid",
  "quantity_before": 10,
  "quantity_after": 60,
  "created_at": "2026-05-03T10:00:00Z"
}
```

#### Get Inventory Item
```
GET /inventory/items/{id}

Response 200:
{
  "id": "uuid",
  "variant_id": "uuid",
  "location_id": "uuid",
  "sku": "SHIRT-M-BLK",
  "quantity_on_hand": 60,
  "quantity_reserved": 5,
  "quantity_available": 55,
  "quantity_incoming": 100,
  "quantity_damaged": 0,
  "reorder_point": 20,
  "safety_stock": 10,
  "version": 47
}
```

### 11.2 Error Codes

| Code | HTTP | Meaning |
|---|---|---|
| `INSUFFICIENT_STOCK` | 409 | Available < requested |
| `VARIANT_NOT_FOUND` | 404 | Unknown variant_id |
| `RESERVATION_EXPIRED` | 410 | TTL elapsed before confirmation |
| `STALE_VERSION` | 409 | Optimistic lock conflict |
| `LOCATION_UNAVAILABLE` | 422 | Location inactive or wrong type |
| `INVALID_MOVEMENT` | 422 | Would put quantity below zero |

---

## 12. Non-Functional Requirements

| Requirement | Target |
|---|---|
| **Read latency** (availability check) | p99 < 20ms |
| **Write latency** (reservation create) | p99 < 100ms |
| **Throughput** | ≥ 5,000 reservation writes/sec per node |
| **Availability** | 99.95% uptime (< 4.4 hrs/year downtime) |
| **Consistency model** | Strong consistency for writes; eventual for read replicas |
| **Data retention** | Stock movements retained 7 years (financial audit) |
| **RPO** | ≤ 5 minutes (point-in-time recovery) |
| **RTO** | ≤ 30 minutes (full service restoration) |
| **Audit trail** | Every stock change logged with actor + timestamp |
| **Encryption** | AES-256 at rest; TLS 1.3 in transit |
| **Access control** | RBAC with least-privilege; PII masked for non-admin roles |

### 12.1 Scalability Patterns

- **Horizontal sharding** by `location_id` — each warehouse node is independently scalable.
- **Read replicas** for reporting and availability checks (reads can tolerate ~500ms staleness).
- **Redis hot cache** for `quantity_available` of high-traffic SKUs (invalidated on every write).
- **Queue-based write flattening** during flash sales: reservation requests queued, processed FIFO at controlled rate.

---

## 13. Scenario Walkthroughs

### Scenario A — Flash Sale: 500 Users Buy the Last 3 Units Simultaneously

```
Context:
  variant_id: SNEAKER-10-WHT
  quantity_available: 3
  500 simultaneous POST /inventory/reservations (qty=1 each)

Resolution:
  1. All 500 requests hit the API simultaneously
  2. Connection pool limits to 20 concurrent DB transactions
  3. Transactions queue at PgBouncer
  4. First 3 transactions acquire SELECT FOR UPDATE, decrement, commit → 3 reservations created
  5. Transactions 4–20 acquire lock, read available=0, return 409 immediately
  6. Remaining 480 requests in queue receive 409 before even acquiring lock
  7. System emits: inventory.out_of_stock event
  8. Storefront disables "Buy Now" button; enables "Notify Me"
  9. 0 oversells. 497 customers get graceful rejection.
```

### Scenario B — Simultaneous Checkout + Manual Adjustment

```
Context:
  quantity_available: 5
  Admin runs: POST /inventory/movements {type: adjustment_down, delta: -3}
  Customer simultaneously: POST /inventory/reservations {qty: 4}

Resolution (both arrive at same millisecond):
  Thread A (adjustment) acquires row lock first:
    on_hand: 10 → 7
    available: 5 → 2   (also has 3 reserved from prior orders)
    COMMIT

  Thread B (reservation) then acquires lock:
    reads available = 2, requested = 4
    → returns 409 INSUFFICIENT_STOCK
    → customer sees "Only 2 remaining"

No phantom inventory sold. Admin adjustment wins by lock acquisition order.
```

### Scenario C — Payment Failure After Stock Reserved (SAGA Compensation)

```
Context:
  Customer reserves 2× DRESS-S-RED (reservation_id: RES-001)
  Payment charge fails (card declined)

SAGA compensation:
  1. Payment Service emits: payment.failed {order_id, reason: "card_declined"}
  2. Inventory Orchestrator receives event
  3. Calls: ReleaseInventory(reservation_id: RES-001)
  4. Inventory Service:
     - Sets reservation status: RELEASED
     - Emits: inventory.unreserved {variant_id, qty: 2}
     - Updates inventory_item: quantity_reserved -= 2
     - Inserts stock_movement: {type: UNRESERVE, delta: +2 to available}
  5. Order Service marks order CANCELLED
  6. Customer receives: "Payment failed — your cart has been restored"
  7. 2 units back in available pool for other customers
```

### Scenario D — Pre-Order: Estimated Ship Date Passes Without Stock

```
Context:
  CANDLE-SM-VAN has preorder_enabled=true, preorder_estimated_ship_date=2026-05-01
  30 pre-orders placed (quantity_reserved via preorder bucket)
  2026-05-01 passes; no stock received

Resolution:
  1. Scheduled job detects: ship date passed, quantity_incoming = 0
  2. System emits: preorder.date_missed
  3. Notification Service sends customer email: "Your pre-order is delayed"
  4. Admin updates estimated_ship_date to 2026-06-01
  5. Reservations remain CONFIRMED (not auto-cancelled)
  6. Customers have option to cancel via self-service (releases reservation)
```

### Scenario E — Multi-Location: Order Routed to Wrong Warehouse

```
Context:
  Customer in NYC orders 1× BAG-LRG-TAN
  WAREHOUSE_LA: qty_available = 5
  WAREHOUSE_NY: qty_available = 0

Allocation:
  Strategy = NEAREST_TO_CUSTOMER
  System finds: WAREHOUSE_NY available = 0 → skip
  Next nearest: WAREHOUSE_LA → reserve(1) there
  Shipping cost flag: CROSS_COUNTRY raised
  Notification to ops: "Consider transfer to NY warehouse — 12 pending orders"
```

### Scenario F — Inventory Reconciliation Drift Detected

```
Context:
  Nightly reconciliation job runs
  computed_on_hand (from ledger replay) = 47
  inventory_items.quantity_on_hand = 50
  Drift: 3 units unaccounted for

Resolution:
  1. System emits: inventory.reconciliation_drift
     {inventory_item_id, ledger_qty: 47, stored_qty: 50, delta: -3}
  2. Alert sent to Operations team
  3. System does NOT auto-correct (requires human sign-off)
  4. Ops investigates: finds 3 units scanned out via RF scanner but movement never posted
  5. Ops posts: adjustment_down {delta: -3, note: "Reconciliation 2026-05-03, RF scanner gap"}
  6. Drift cleared; audit trail preserved
```

---

## 14. Security & Compliance

### 14.1 Access Control (RBAC)

| Role | Permissions |
|---|---|
| `inventory:read` | View availability, movement history |
| `inventory:reserve` | Create/release reservations (Order Service) |
| `inventory:write` | Post movements, adjustments (Warehouse staff) |
| `inventory:admin` | Full access including location management, reconciliation override |
| `inventory:audit` | Read-only to full ledger including deleted/inactive items |

### 14.2 Input Validation Rules

- `quantity_delta` must be an integer; never float (avoids rounding drift)
- All IDs validated as UUID v4 before any DB query
- `reference_id` sanitised to alphanumeric + hyphens (prevents injection)
- `quantity_delta` for SELL/RESERVE: must be positive (direction encoded in type)
- No movement may put `quantity_on_hand` below 0 without explicit `ALLOW_NEGATIVE` flag (requires admin role)

### 14.3 Compliance

| Standard | Requirement |
|---|---|
| GDPR | Movements referencing customer orders must support right-to-erasure via pseudonymisation of `performed_by` |
| SOC 2 Type II | Full audit log with tamper-evident hash chain |
| ISO 27001 | Encryption at rest and in transit; access log retention 1 year |
| PCI DSS | Inventory service must not store card data; payment references are opaque tokens only |

---

*Specification ends.*

---

## Sources

- [Inventory Management Software Requirements Checklist — The Retail Exec](https://theretailexec.com/logistics/inventory-management-requirements/)
- [How to Build an Inventory Management System That Scales — CockroachDB](https://www.cockroachlabs.com/blog/inventory-management-reference-architecture/)
- [Design Inventory Management System — System Design Handbook](https://www.systemdesignhandbook.com/guides/design-inventory-management-system/)
- [Fixing Race Conditions in Inventory Systems — Medium](https://medium.com/@ahmedmaher22292/fixing-race-conditions-in-inventory-systems-spring-boot-00f5d9b3cbb1)
- [Inventory Reservation with Redis WATCH/MULTI — Redis.io](https://redis.io/tutorials/inventory-reservation-in-real-time-with-redis/)
- [Managing Inventory Reservation in SAGA Pattern — DEV Community](https://dev.to/jackynote/managing-inventory-reservation-in-saga-pattern-for-e-commerce-systems-2d14)
- [Inventory Reservation Patterns: How to Stop Overselling — Stoa Logistics](https://stoalogistics.com/blog/inventory-reservation-patterns)
- [Optimistic vs Pessimistic Locking — Medium (2026)](https://medium.com/@liberatoreanita/optimistic-vs-pessimistic-locking-what-nobody-tells-you-until-youve-burnt-in-production-c12f972ec90d)
- [Eliminating Inventory Race Conditions in Production — Medium (2026)](https://medium.com/@chaturvediinitin/how-i-eliminated-inventory-race-conditions-in-a-production-e-commerce-system-2302ba81846b)
- [Saga Design Pattern — Microsoft Azure Architecture Center](https://learn.microsoft.com/en-us/azure/architecture/patterns/saga)
- [Reorder Point Formula Guide — inFlow Inventory](https://www.inflowinventory.com/blog/reorder-point-formula-safety-stock/)
- [Safety Stock Formulas: 6 Methods — Fishbowl](https://www.fishbowlinventory.com/blog/calculating-the-safety-stock-formula-6-variations-key-use-cases)
- [SKU Management Best Practices — ShipBob](https://www.shipbob.com/blog/sku-management/)
- [NetSuite: Must-Have Inventory Management System Features](https://www.netsuite.com/portal/resource/articles/inventory-management/inventory-management-system-features.shtml)
