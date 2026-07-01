# Deploying Prakash Mobile (one server, Docker Compose)

The whole app runs on a **single server** with one command. Cheapest and
simplest for low traffic (~500 user-hours/month).

```
┌──────────────── one server (Docker) ────────────────┐
│  Caddy  :80/:443  (reverse proxy + auto-HTTPS)       │
│    ├─ /            → web   (Next.js, standalone)      │
│    ├─ /api/*       → api   (NestJS)                   │
│    ├─ /uploads/*   → api   (product images)           │
│    └─ /socket.io/* → api   (bargain chat)             │
│  postgres (pgvector) + volume   ·   uploads volume    │
└──────────────────────────────────────────────────────┘
```

Everything is same-origin, so there's **no CORS and no domain baked into the
build**. This exact stack has been built and smoke-tested end-to-end.

## Cost / where to run it
| Host | Spec | Price |
|---|---|---|
| **Hetzner** CX22 (recommended) | 2 vCPU / 4 GB, x86 | ~€4/mo |
| **Oracle Cloud** Always-Free | 4 vCPU / 24 GB, ARM | **$0/mo** (images are multi-arch) |
| DigitalOcean / Vultr / Contabo | 1-2 GB droplet | ~$5-6/mo |

Any Linux VM with **2 GB+ RAM** and ports **80/443** open works.

---

## 1. Create the server + install Docker
Spin up an Ubuntu 22.04/24.04 VM, open ports 22/80/443, then SSH in and run:
```bash
curl -fsSL https://get.docker.com | sh
```

## 2. Get the code
```bash
git clone https://github.com/hijacker-01/e-commerce-mobile.git
cd e-commerce-mobile
```
(Private repo → use a GitHub Personal Access Token as the password, or add a
deploy key.)

## 3. Configure
```bash
cp .env.prod.example .env.prod
nano .env.prod
```
Fill in:
```ini
# HTTP on the raw IP (quickest):
SITE_ADDRESS=:80
PUBLIC_URL=http://YOUR_SERVER_IP

# …or free HTTPS with no domain (replace dots with dashes):
# SITE_ADDRESS=203-0-113-5.sslip.io
# PUBLIC_URL=https://203-0-113-5.sslip.io

# …or your own domain (point its A record at the server first):
# SITE_ADDRESS=shop.example.com
# PUBLIC_URL=https://shop.example.com

POSTGRES_PASSWORD=<openssl rand -hex 16>
JWT_ACCESS_SECRET=<openssl rand -hex 32>
JWT_REFRESH_SECRET=<openssl rand -hex 32>
GROQ_API_KEY=            # optional, enables the AI assistant
```
> `PUBLIC_URL` **must** match `SITE_ADDRESS` — it's how uploaded product-image
> links are built. With a domain/sslip.io you get automatic HTTPS from Caddy.

## 4. Launch (build + start everything)
```bash
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build
```
The API applies all DB migrations (incl. the pgvector extension) on boot.

## 5. Seed the first data (one time)
```bash
docker compose -f docker-compose.prod.yml exec api npm run prisma:seed:prod
```
Creates the shop + demo catalogue and these logins (**change the passwords
after first sign-in**):
`9000000001` owner · `9000000003` employee · `9000000002` stockist — all `password123`.

## 6. Open it
- `http://YOUR_SERVER_IP` (or your https URL). Done — it's live.

---

## Day-2 operations
```bash
# Update after pushing changes
git pull && docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build

# Logs / status
docker compose -f docker-compose.prod.yml logs -f api
docker compose -f docker-compose.prod.yml ps

# Backup the database
docker compose -f docker-compose.prod.yml exec postgres \
  pg_dump -U ecom ecommerce > backup-$(date +%F).sql
```
Data lives in Docker volumes (`pgdata`, `uploads`) and survives restarts and
redeploys. Uploaded images persist in the `uploads` volume.

## Optional: turn on Meilisearch later
Add a `meilisearch` service (`getmeili/meilisearch:v1.7`) + volume, set
`MEILI_HOST`/`MEILI_MASTER_KEY` on the API, and hit `POST /api/search/reindex`
once. Until then the app uses Postgres search automatically.
