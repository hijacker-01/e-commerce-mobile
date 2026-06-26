# Voltora·Store — Feature Report

**Project:** Voltora·Store — a multi-role electronics **marketplace + ERP** with an AI device-intelligence layer.
**Stack:** Next.js 14 (App Router) web storefront · NestJS + Prisma + PostgreSQL backend · React Native mobile · Redis + Meilisearch · Groq LLM for AI features.
**Roles:** Customer · Owner · Employee · Stockist.

This report describes everything built, and for each feature notes its **Financial characteristic** (how it affects revenue, margin, cost, or cash flow) and its **Useful characteristic** (operational / experience value).

---

## 1. Executive summary

Voltora is a single platform that runs **both** the customer-facing shop **and** the shop's back-office (inventory, billing, supply, credit, returns, staff). The storefront is engineered around proven e-commerce conversion levers (discount signalling, urgency, comparison, wishlist, EMI, offers, fast search), while the ERP side automates the costly manual work of a real electronics retailer (GST invoicing, stock receipts, supplier challans, customer credit ledgers, returns). An AI layer reduces effort on listing creation, support, review digestion, and trade-in pricing.

**Where the money comes from / is saved:**
- **Conversion & AOV:** smart filters, compare, EMI, coupons, "you may also like", recently viewed, urgency on stock.
- **Trust → fewer abandoned carts:** verified reviews, IMEI/warranty verification, Q&A, ratings.
- **Margin control:** owner-set pricing/MRP, coupon scoping, bargaining (controlled discounting), credit terms.
- **Operating-cost savings:** automated GST invoices + warranty cards, stock-receipt (GRN) automation, audit log, AI listing/support, single console instead of separate tools.
- **Cash flow:** customer credit ledger, EMI, COD/UPI/online options.

---

## 2. Architecture & cross-cutting systems

| System | Financial characteristic | Useful characteristic |
|---|---|---|
| **Monorepo (web + backend + mobile + shared)** | Lower build/maintenance cost; one codebase serves web and mobile reach. | Shared types/logic; faster delivery. |
| **Role-based access control (Owner/Employee/Stockist/Customer) + granular permissions** | Reduces fraud/error cost; lets the owner delegate without over-granting. | Each role sees only what it needs; employees get scoped powers (e.g. `order.approve`). |
| **Voltora design system** (framed-glass-on-gradient, Inter, floating nav, bento layout, tokens) | Premium look lifts perceived value → supports higher prices & conversion. | Consistent, modern UI across all pages; one CSS token source. |
| **Global toast feedback + optimistic UI** | Fewer mis-clicks/duplicate actions → fewer support tickets. | Instant, clear feedback on every action. |
| **`next/image` optimization** | Lower bandwidth cost; faster load → higher conversion (speed ↔ sales). | Sharp, lazy-loaded, fallback-safe images. |
| **AI layer (Groq LLM)** | Cuts labour cost of listing copy, support, review reading, trade-in pricing. | Faster catalog building and customer help. |
| **Docker infra (Postgres + Redis + Meilisearch)** | Predictable, low infra cost; search engine improves findability → sales. | Reproducible environment; fast search. |

---

## 3. Customer-facing storefront

### 3.1 Discovery & browsing

| Feature | Financial characteristic | Useful characteristic |
|---|---|---|
| **Bento homepage** (hero, stat card, promo / new-gen / big-image cards from real product media, popular-colour swatches, "more devices") | High-impact merchandising surface → drives clicks to high-margin/featured items; premium feel supports pricing. | Modern, scannable landing that showcases range and social proof (5M+/4.6★). |
| **Category pills** (`/products/meta/categories`) | Faster path to intent → higher conversion. | One-tap browse by Mobile, Headphone, Laptop, Smartwatch, Tablet, Mobile Accessory. |
| **Smart filter menu** (Brand, Processor, RAM, Storage, Camera, Budget) with **category-contextual facets** | Helps shoppers self-qualify into the right price band → fewer bounces, better AOV match. | Only shows filters relevant to the category (e.g. processor hidden for accessories). |
| **Sort** (Price ↑/↓, Newest) | Budget shoppers find affordable SKUs; premium shoppers find flagships → captures both ends. | Standard expected control; reduces friction. |
| **Live debounced search** (top-bar) | Findability ↔ sales; reduces "couldn't find it" abandonment. | Type-to-filter the catalog instantly. |
| **Pagination ("Load more")** | Faster first paint → better conversion; lower data cost. | Keeps the grid light; loads on demand. |
| **Recently viewed** (localStorage strip) | Re-engagement → return-to-purchase; lifts conversion on considered buys. | Quick path back to items the shopper weighed. |

### 3.2 Product cards & detail

| Feature | Financial characteristic | Useful characteristic |
|---|---|---|
| **MRP strikethrough + "% off" discount badge** | Discount signalling is a primary conversion/AOV lever; frames value. | Shopper instantly sees the saving. |
| **Stock status** ("● N in stock" / "Out of stock", disabled add) | Urgency/scarcity nudges purchase; prevents overselling losses. | Clear availability; no dead "add to cart". |
| **Product image gallery + thumbnails + zoom** | Better imagery reduces returns and lifts conversion. | Inspect the device closely before buying. |
| **Variant selector — storage × colour SKUs** | Captures the full price ladder (e.g. 256GB→512GB upsell) → higher AOV. | Pick the exact configuration without leaving the page. |
| **No-cost EMI calculator** (3/6/9/12 mo) | Lowers the affordability barrier on big-ticket items → more high-value sales. | Shows monthly cost upfront. |
| **Available offers / coupons on product** | Promotes active discounts at the decision point → conversion. | "Use code … for ₹/% off" right where it matters. |
| **Delivery estimate by pincode** | Delivery certainty reduces cart abandonment. | "Delivery by <date> · Free" check. |
| **Specifications table** | Reduces pre-sales questions; supports confident purchase. | Full technical detail incl. camera, processor, RAM, storage, battery. |
| **"You may also like" (similar products)** | Cross-sell → more items per session, higher AOV. | Relevant same-category alternatives. |
| **Buy Now (1-click to checkout)** | Shortens funnel → higher conversion on decided buyers. | Skip the cart step. |

### 3.3 Trust & social proof

| Feature | Financial characteristic | Useful characteristic |
|---|---|---|
| **Reviews — submit + star rating + verified-buyer badge** | Trust raises conversion and justifies price; verified badges deter fake-review risk. | Real customer feedback; shoppers can contribute. |
| **Rating distribution histogram + average** | At-a-glance credibility → conversion. | See the 5★→1★ spread, not just an average. |
| **AI review summary (pros/cons/sentiment)** | Faster decisions → conversion; less reading friction. | LLM digests many reviews into a verdict. |
| **Product Q&A (ask a question)** | Resolves objections that block purchase → conversion. | Buyers ask; the store answers (see owner inbox). |
| **IMEI / warranty verification** | Anti-counterfeit trust = key in electronics; protects brand and reduces disputes. | Check a serial/IMEI for genuine warranty coverage. |

### 3.4 Conversion mechanics

| Feature | Financial characteristic | Useful characteristic |
|---|---|---|
| **Wishlist** (optimistic hearts on cards + detail; count badge) | Saves intent → re-marketing & later conversion. | One-tap save; visible saved state. |
| **Product comparison** (up to 4, floating bar, side-by-side spec table) | Keeps the shopper *in-store* during evaluation → prevents leakage to competitors. | Union of all spec keys compared at once. |
| **Cart with quantity steppers (optimistic) + order summary** | Smooth cart editing reduces abandonment; multi-qty lifts AOV. | +/- steppers, live subtotal. |
| **Address book** (saved addresses) | Faster repeat checkout → higher repeat conversion. | Reuse a saved address in one tap. |
| **Checkout — delivery slot, payment method (UPI/Online/COD), coupon apply** | Payment choice (incl. COD) widens the buyer base; coupons drive conversion; slots reduce failed deliveries. | Flexible, complete checkout. |
| **Bargaining / live chat with offers (accept/reject)** | **Controlled discounting** — converts price-sensitive buyers without blanket markdowns, protecting margin. | Real-time haggling like an offline shop. |

### 3.5 Post-purchase & services

| Feature | Financial characteristic | Useful characteristic |
|---|---|---|
| **Orders list + order detail page** (status timeline, line items, invoice PDF download) | Self-service tracking cuts support cost; invoices aid tax compliance. | Visual journey: Placed → Approved → Out for delivery → Delivered. |
| **Returns request** (reason modal) | Structured returns reduce processing cost and disputes. | Easy, guided return request. |
| **Exchange / trade-in with AI valuation** | Trade-in funds new purchases → drives upgrade sales; recovers resale value. | Instant AI estimate for an old device. |
| **AI support chat** | Deflects support tickets → labour savings; faster answers → conversion. | Ask about orders, delivery, compatibility. |
| **Loyalty points** | Repeat-purchase incentive → higher lifetime value. | Points shown on orders. |
| **Notifications** | Re-engagement → repeat sales; order transparency. | In-app alerts with unread count. |

---

## 4. Owner / ERP back-office

| Feature | Financial characteristic | Useful characteristic |
|---|---|---|
| **Owner dashboard** — paid revenue, inventory value, GST collected, top sellers, low-stock warning | Single financial cockpit; **low-stock alert prevents lost sales**; top-sellers guide buying. | At-a-glance health of the business. |
| **Order management** — approve / dispatch, status control | Approval gate prevents fraud/oversell losses; controls fulfilment cost. | Move orders through the pipeline. |
| **GST invoice + warranty-card PDF generation** | **Automates tax-compliant billing** (CGST/SGST/IGST) → saves accountant hours, avoids penalties. | One-click invoice & warranty documents. |
| **Product creator** — AI auto-fill, category/shop dropdowns, MRP, **image upload (browse) + URL** | Faster listing = quicker time-to-revenue; AI cuts copywriting cost; clean media lifts conversion. | List a product in minutes, no raw-ID pasting, drag in photos. |
| **Stockists & challans (GRN)** — register suppliers, inbound challans, "receive" → auto-increment inventory | **Automates goods-receipt accounting**; accurate stock → fewer oversells & write-offs. | Supply chain tracked end to end. |
| **Customer credit** — accounts, terms (limit), ledger (debit/repay) | **Working-capital tool**: extend credit to drive sales while tracking exposure and dues. | Per-customer credit control. |
| **Storefront management** — lobby ("owner's picks"), service centers | Merchandising control over what's featured → push high-margin items; service info builds trust. | Curate the homepage; publish support centers. |
| **Returns management** — approve / reject / complete | Controls refund cost and abuse; structured workflow. | Decide and close returns. |
| **Customer Q&A inbox** — answer all pending questions in one place | Faster answers → conversion; reduces repeat questions. | Staff clear the backlog with inline replies. |
| **Audit log** | Accountability reduces internal-fraud/error cost; compliance. | Who did what, when. |
| **Coupons** (percent / flat, min-order, scope) | **Targeted promotions** with floors protect margin while driving volume. | Issue and manage discount codes. |
| **Offers & loyalty** | Promotional levers for conversion and retention. | Time-boxed banners; points program. |

---

## 5. Stockist portal

| Feature | Financial characteristic | Useful characteristic |
|---|---|---|
| **Stockist login + "My Challans"** (read-only challan list with status/items/totals) | Transparent supply relationship → smoother replenishment, fewer disputes. | Supplier sees exactly what the shop has issued/received. |

---

## 6. Authentication

| Feature | Financial characteristic | Useful characteristic |
|---|---|---|
| **4-role login chooser** (Customer/Owner/Employee/Stockist) with role-tailored forms | Customer self-registration grows the buyer base at zero cost; staff accounts are provisioned (security). | Clear, guided entry for each user type. |
| **Validation, show/hide password, accessibility, "continue browsing"** | Fewer failed logins/support resets; guest browsing keeps the funnel open. | Smoother, accessible sign-in/up. |

---

## 7. Technical capability: image uploads

| Feature | Financial characteristic | Useful characteristic |
|---|---|---|
| **Local-disk image upload endpoint** (`POST /api/uploads`, owner/employee, 5 MB image-only, served at `/uploads/...`) + **Browse / From-URL picker** with thumbnail strip | Removes dependency on external image hosts; faster, richer listings → conversion. Production-swappable to S3 with no UI change. | Owners add product photos from their device or a link, with previews and removal. |

---

## 8. Financial levers — consolidated view

**Revenue / conversion up:** smart filters · sort · search · compare · wishlist · recently viewed · "you may also like" · Buy Now · discount badges · EMI · coupons/offers · delivery ETA · reviews/Q&A/verification (trust) · bento merchandising.

**Average order value up:** variant (storage/colour) upsell · similar-product cross-sell · multi-qty cart · EMI on flagships.

**Margin protected:** bargaining (controlled, per-deal discounting) · coupon min-order floors & scoping · owner-set MRP/price · credit terms.

**Operating cost down:** automated GST invoices + warranty cards · stock-receipt (GRN) automation · AI listing/support/review-summary/trade-in pricing · single console (no separate ERP tools) · self-service orders/returns/tracking (ticket deflection) · audit log.

**Cash flow / reach widened:** customer credit ledger · EMI · COD/UPI/Online payment options · trade-in funding upgrades.

---

*Generated as a feature/value summary of the Voltora·Store build. Brand name is a neutral placeholder; product manufacturer names (e.g. Samsung Galaxy) are real catalog data.*
