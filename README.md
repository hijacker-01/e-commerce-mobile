# Electronics Commerce + ERP Platform

Multi-role marketplace + ERP for electronics (mobiles, headphones, Bluetooth/audio
devices) with an AI device-intelligence engine. Web + Mobile + API monorepo.

> Full product/architecture plan: see [PROJECT_PLAN.md](./PROJECT_PLAN.md).

## Monorepo layout

```
apps/
  backend/   NestJS API + Prisma (Postgres/pgvector)  — auth/RBAC, products, orders
  web/       Next.js storefront (App Router)
  mobile/    Expo / React Native app
packages/
  shared/    Shared TypeScript types & constants
docker-compose.yml   Postgres(pgvector) + Redis + Meilisearch
```

## Stack
React Native (Expo) · Next.js · NestJS · PostgreSQL + pgvector · Redis · Meilisearch ·
Anthropic Claude (AI engine) · Razorpay/UPI (India) · GST-ready billing.

## Roles (RBAC)
`OWNER`, `EMPLOYEE`, `STOCKIST`, `CUSTOMER`. Owner can grant **granular permission
flags** to employees (e.g. `order.approve`, `product.write`, `invoice.create`).

## Quick start

### 1. Environment
```bash
cp .env.example .env          # fill in secrets as needed
```

### 2. Start infrastructure (Docker)
```bash
npm run infra:up              # Postgres + Redis + Meilisearch
```

### 3. Install dependencies
```bash
npm install                   # installs all workspaces
```

### 4. Database
```bash
npm run db:generate           # generate Prisma client
npm run db:migrate            # create tables
npm run db:seed               # demo owner + sample product
```
Seeded owner login → phone `9000000001`, password `password123`.
> Note: the Postgres container is mapped to host port **5433** (to avoid clashing
> with a locally-installed Postgres on 5432) — see `DATABASE_URL`.

### 6. Smoke test (proves the core flow end-to-end)
With the API running, against the seeded DB:
```bash
npm run test:smoke --workspace apps/backend
```
Drives: owner login → catalog → register customer → cart → delivery-slot order →
owner approval (with stock decrement) → GST invoice + warranty card → coupon apply
→ RBAC denial → notifications → analytics → credit → exchange → stockist
challan/GRN. 30 assertions.

Chat-bargaining WebSocket test (auth → message → offer/accept → bad-token reject):
```bash
npm run test:chat --workspace apps/backend
```

### 5. Run the apps
```bash
npm run backend               # API   -> http://localhost:4000/api
npm run web                   # Web   -> http://localhost:3000
npm run mobile                # Expo  -> scan QR / press a (Android) / i (iOS)
```

## API (current MVP slice)
| Method | Route | Access |
|---|---|---|
| POST | `/api/auth/register` | public |
| POST | `/api/auth/login` | public |
| GET | `/api/auth/me` | any authed |
| GET | `/api/products` | public |
| GET | `/api/products/:id` | public |
| POST | `/api/products` | OWNER / EMPLOYEE+`product.write` |
| GET | `/api/users` | OWNER |
| PUT | `/api/users/:id/permissions` | OWNER |
| POST | `/api/orders` | CUSTOMER |
| GET | `/api/orders` | authed (scoped by role) |
| PATCH | `/api/orders/:id/status` | OWNER / EMPLOYEE+`order.approve` |
| POST | `/api/invoices` | OWNER / EMPLOYEE+`invoice.create` |
| GET | `/api/invoices/gst-report` | OWNER / EMPLOYEE |
| GET | `/api/invoices/:id` | authed |
| POST | `/api/ai/compare` | public (AI device comparison) |
| POST | `/api/ai/recommend` | public (AI device recommender) |
| POST | `/api/ai/draft-listing` | OWNER / EMPLOYEE+`product.write` (spec auto-fill) |
| POST | `/api/reviews` | CUSTOMER (verified-purchase aware) |
| GET | `/api/reviews/product/:id` | public |
| GET | `/api/reviews/product/:id/summary` | public (AI pros/cons + sentiment) |
| POST | `/api/coupons` | OWNER / EMPLOYEE+`coupon.create` |
| GET | `/api/coupons` | public |
| POST | `/api/coupons/apply` | CUSTOMER (apply to order) |
| POST | `/api/credit/apply` | CUSTOMER |
| GET | `/api/credit/me` | CUSTOMER |
| PUT | `/api/credit/:userId/terms` | OWNER (set credit model) |
| POST | `/api/credit/:userId/ledger` | OWNER (debit/repay) |
| POST | `/api/exchange` | CUSTOMER (submit + AI valuation) |
| GET | `/api/exchange/me` | CUSTOMER |
| GET | `/api/exchange` | OWNER / EMPLOYEE |
| PATCH | `/api/exchange/:id` | OWNER / EMPLOYEE (approve/reject) |
| GET | `/api/service-centers` | public (search by brand/text) |
| POST/DELETE | `/api/service-centers` | OWNER / EMPLOYEE |
| GET | `/api/lobby` | public (curated picks) |
| POST/DELETE | `/api/lobby` | OWNER (curate) |
| GET | `/api/notifications` | authed (own, latest 50) |
| GET | `/api/notifications/unread-count` | authed |
| POST | `/api/notifications/:id/read` / `/read-all` | authed |
| GET | `/api/analytics/summary` | OWNER / EMPLOYEE (sales/inventory/GST) |
| POST/GET | `/api/stockists` | OWNER / EMPLOYEE (registry) |
| POST | `/api/stockists/challans` | OWNER / EMPLOYEE+`challan.create` |
| GET | `/api/stockists/challans` | OWNER / EMPLOYEE |
| POST | `/api/stockists/challans/:id/receive` | OWNER / EMPLOYEE+`inventory.write` (GRN → stock) |
| GET | `/api/cart` | CUSTOMER |
| POST | `/api/cart/items` | CUSTOMER (add to cart) |
| PATCH | `/api/cart/items/:productId` | CUSTOMER (qty; 0 removes) |
| DELETE | `/api/cart` | CUSTOMER (clear) |
| POST | `/api/payments/create` | CUSTOMER (Razorpay order) |
| POST | `/api/payments/verify` | CUSTOMER (verify signature) |
| GET | `/api/chat/threads` | authed (scoped by role) |
| POST | `/api/chat/threads` | CUSTOMER |
| GET | `/api/chat/threads/:id/messages` | authed |

**WebSocket** (`/chat` namespace, JWT in `handshake.auth.token`): emit `thread:join`,
`message:send`, `offer:make`, `offer:respond`; listen for `message:new`, `offer:new`,
`offer:update`. Powers real-time chat + offer/counter-offer bargaining.

## Roadmap
Phase 1 (MVP) is being built: catalog, smart filters, cart, delivery-slot orders +
owner approval, GST billing + warranty card, inventory, challans, chat bargaining,
coupons, reviews, service centers, AI compare + recommender. See PROJECT_PLAN.md
for Phase 2/3 (credit model, exchange portal, spec auto-fill, analytics, calls).
