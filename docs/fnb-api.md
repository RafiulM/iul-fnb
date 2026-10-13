# IUL FnB API

The Express API in `apps/api` serves both frontends: the customer **QR Menu**
app (`apps/qr-menu`, no account) and the **Kasir + Dashboard** app
(`apps/web`, staff accounts). Request schemas live in
`packages/shared/src/validators/fnb/*`, response shapes in
`packages/shared/src/fnb/{types,api,access}.ts`.

Every response uses the starter envelope: `{ data }` for one item or a list,
`{ data, meta: { limit, offset, hasMore } }` for paginated lists, and
`{ error: { code, message, details? } }` for errors. Validation errors are
`422`, conflicts with the current state (wrong order status, duplicate name)
are `409`.

## Setup

```bash
pnpm db:migrate
pnpm db:seed            # menu, tables, ingredients, recipes, settings
pnpm db:seed --orders   # plus ~60 days of demo sales and today's board
```

The seed only fills empty sections and never changes existing rows.

**First owner:** the very first account that signs up becomes the owner
(Pemilik). Later sign-ups get no cafe access until an owner adds them on the
staff screen, or you run `pnpm role:set <email> owner|cashier`.

## Time

"Today", order numbers (`A-001`, restarting daily), and report dates use the
cafe's time zone, `Asia/Jakarta`. Dates in queries are `YYYY-MM-DD`.

## Public endpoints (QR Menu app)

No cookies. CORS allows `VITE_QR_MENU_URL` (or `QR_MENU_URL`) without
credentials. Rate limited per IP (300 requests/minute, 20 new orders per
10 minutes), plus at most 5 orders waiting (MENUNGGU) per table.

| Method | Path                       | Notes                                                                                                                      |
| ------ | -------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| GET    | `/api/public/cafe`         | `PublicCafeDto`: settings without the receipt format                                                                       |
| GET    | `/api/public/menu`         | `{ categories, menus, popularMenuIds }` (best sellers, last 7 days)                                                        |
| GET    | `/api/public/tables/:code` | `{ tableNumber, area }`; `:code` is the QR token or the table number (`07`). 404 if unknown or inactive                    |
| POST   | `/api/public/orders`       | `{ qrCode, items: [{ menuId, qty 1–50, note ≤120 }] }` → `201 PublicOrderDto` (status MENUNGGU). Prices come from the menu |
| GET    | `/api/public/orders/:id`   | Order tracking by the order's unguessable id; poll it for status. Includes a `timeline` of step times                      |

## Staff endpoints (Kasir + Dashboard app)

Signed-in staff only (`401` without a session, `403` without the
permission). Mutations need the web app's `Origin`. A **Pemilik** (role
`owner` or `admin`) may do everything. A **Kasir** (role `cashier`) may do
what the owner's permission matrix allows; the API re-reads it on every
request.

| Key          | Default for Kasir | Grants                                       |
| ------------ | ----------------- | -------------------------------------------- |
| `pos`        | on                | cashier board, manual orders, status, cancel |
| `payment`    | on (needs `pos`)  | record payment                               |
| `stock_view` | on                | ingredients, movements, recipes              |
| `stock_in`   | on (needs view)   | record incoming stock                        |
| `menu`       | off               | menus, categories, recipes, availability     |
| `tables`     | off               | tables and QR codes                          |
| `report`     | off               | sales report                                 |
| `staff`      | off               | staff accounts (owner accounts: owner only)  |
| `settings`   | off               | cafe settings                                |

Owner only, whatever the matrix says: editing the matrix, adding/editing
ingredients, and stock opname.

### Orders

`:ref` is an order id or today's code (`A-027`).

| Method | Path                       | Permission | Notes                                                                                                                                                    |
| ------ | -------------------------- | ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GET    | `/api/orders?date=today`   | pos        | Every order of the day, oldest first (`StaffOrderDto[]`). Also `date=YYYY-MM-DD`                                                                         |
| POST   | `/api/orders`              | pos        | Manual order `{ tableId?, customerName?, items }`; starts at DIPROSES with the cashier's name                                                            |
| GET    | `/api/orders/:ref`         | pos        |                                                                                                                                                          |
| POST   | `/api/orders/:ref/advance` | pos        | MENUNGGU → DIPROSES → SIAP → DIANTAR. A paid order reaching DIANTAR becomes SELESAI. From DIANTAR: `409 PAYMENT_REQUIRED`                                |
| POST   | `/api/orders/:ref/payment` | payment    | `{ method: CASH \| NON_CASH, channel?, paidAmount }`. Cash needs `paidAmount ≥ total`; non-cash is charged the total. Paying a DIANTAR order finishes it |
| POST   | `/api/orders/:ref/cancel`  | pos        | `{ reason }`. Only unpaid orders in MENUNGGU or DIPROSES                                                                                                 |
| GET    | `/api/transactions`        | pos        | SELESAI/DIBATALKAN, newest first. Filters `from`, `to`, `status`, `method`, `type`, `q`; `limit` ≤ 200, `offset`                                         |

**Stock** is deducted once, when an order becomes SELESAI: one OUT movement
per recipe line (recipe qty × portions, floored at 0). Menus whose
ingredients no longer cover a portion are marked habis automatically and
come back after a restock; menus the owner turned off stay off.

### Menu, tables, stock, staff, settings, reports

| Method            | Path                                                                 | Permission |
| ----------------- | -------------------------------------------------------------------- | ---------- |
| GET               | `/api/menu-categories`, `/api/menus`                                 | any staff  |
| POST/PATCH/DELETE | `/api/menu-categories[/:id]`                                         | menu       |
| POST              | `/api/menu-categories/reorder` `{ ids }`                             | menu       |
| POST/PATCH/DELETE | `/api/menus[/:id]`                                                   | menu       |
| POST              | `/api/menus/availability` `{ ids, isAvailable }`                     | menu       |
| PUT               | `/api/menus/:id/recipe` `{ items: [{ ingredientId, qtyUsed }] }`     | menu       |
| GET               | `/api/recipes[?menuId=]`                                             | stock_view |
| GET               | `/api/tables`                                                        | any staff  |
| POST/PATCH/DELETE | `/api/tables[/:id]`                                                  | tables     |
| POST              | `/api/tables/:id/regenerate-qr`                                      | tables     |
| GET               | `/api/ingredients`                                                   | stock_view |
| POST/PATCH/DELETE | `/api/ingredients[/:id]`                                             | owner      |
| GET               | `/api/stock-movements[?ingredientId=&type=]`                         | stock_view |
| POST              | `/api/stock-movements/restock` `{ ingredientId, qty, note?, date? }` | stock_in   |
| POST              | `/api/stock-movements/adjust` `{ ingredientId, countedQty, note? }`  | owner      |
| GET               | `/api/staff/permissions`                                             | any staff  |
| PATCH             | `/api/staff/permissions` (Kasir matrix)                              | owner      |
| GET/POST          | `/api/staff`                                                         | staff      |
| PATCH             | `/api/staff/:id` `{ name?, email?, role?, isActive? }`               | staff      |
| POST              | `/api/staff/:id/password` `{ password }`                             | staff      |
| GET               | `/api/settings`                                                      | any staff  |
| PATCH             | `/api/settings`                                                      | settings   |
| GET               | `/api/reports/sales?from=&to=`                                       | report     |

Staff rules: adding staff without a password creates an **invited** account
that cannot sign in until a password is set (emailed invitations need an
email provider, not set up yet). Nobody can demote or deactivate themselves
or the primary (earliest) owner, an active owner always remains, and
deactivating signs the account out everywhere.

The sales report counts finished (SELESAI) orders. A one-day range is bucketed
by hour, longer ranges by day (max 366 days), with top menus, payment and
source splits, a weekday × hour heatmap, and daily rows for CSV export.
