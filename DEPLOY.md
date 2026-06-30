# Deploying Prakash Mobile (Vercel + Railway)

This hosts the whole app on free / cheapest tiers:

| Piece | Where | Notes |
|---|---|---|
| Web (Next.js) | **Vercel** | Free Hobby plan |
| API (NestJS) | **Railway** | Dockerfile build |
| PostgreSQL **+ pgvector** | **Railway** | Must use the `pgvector/pgvector` image (the schema needs the `vector` extension) |
| Uploads | **Railway volume** | Mounted at `/app/uploads` |
| Redis | _not needed_ | The backend doesn't use it |
| Meilisearch | _optional_ | Unset `MEILI_HOST` → automatic Postgres-search fallback |

Everything is already production-ready in the repo: backend `Dockerfile`,
`migrate deploy` on boot, env-driven CORS, absolute upload URLs, and
`next build` verified green.

---

## Part A — Backend on Railway

### 1. Create the project + Postgres (pgvector)
1. Go to <https://railway.app> → **New Project** → **Empty Project**.
2. **+ New → Database → Add PostgreSQL** gives you a *plain* Postgres — that
   one lacks pgvector. Instead delete it and add a **Docker image** service:
   **+ New → Empty Service → Settings → Source → Docker Image** =
   `pgvector/pgvector:pg16`.
3. On that Postgres service → **Variables**, set:
   ```
   POSTGRES_USER=ecom
   POSTGRES_PASSWORD=<a-strong-password>
   POSTGRES_DB=ecommerce
   ```
4. **Settings → Volumes → Add Volume**, mount path `/var/lib/postgresql/data`.
5. Note the internal connection string (Railway shows host/port). It will be
   `postgresql://ecom:<password>@<postgres-host>:5432/ecommerce?schema=public`.

### 2. Create the API service
1. **+ New → GitHub Repo** → pick `hijacker-01/e-commerce-mobile`.
2. **Settings → Build**:
   - **Builder** = Dockerfile
   - **Dockerfile Path** = `apps/backend/Dockerfile`
   - **Root Directory** = leave blank (repo root is the build context).
3. **Settings → Volumes → Add Volume**, mount path `/app/uploads`
   (keeps uploaded product images across deploys).
4. **Variables** (see `apps/backend/.env.example` for the full list):
   ```
   DATABASE_URL=postgresql://ecom:<password>@<postgres-host>:5432/ecommerce?schema=public
   JWT_ACCESS_SECRET=<openssl rand -hex 32>
   JWT_REFRESH_SECRET=<openssl rand -hex 32>
   JWT_ACCESS_TTL=12h
   JWT_REFRESH_TTL=30d
   PORT=4000
   PUBLIC_URL=https://<your-api-domain>      # fill after step 5
   CORS_ORIGINS=https://<your-web-domain>    # fill after Part B
   GROQ_API_KEY=<your groq key>              # optional, for AI features
   ```
5. **Settings → Networking → Generate Domain** → you get
   `https://<something>.up.railway.app`. Put that into **PUBLIC_URL** and redeploy.
   - The API base is then `https://<something>.up.railway.app/api`.
   - Health check: open `…/api/health` → should return `{"status":"ok"}`.

> On every deploy the container runs `prisma migrate deploy` automatically,
> so the schema (incl. the pgvector extension) is created on first boot.

### 3. Seed the first owner + demo data (one time)
In the API service → **⋯ → Shell** (or `railway run`):
```
npm run prisma:seed -w apps/backend
```
Default logins (CHANGE THE PASSWORDS after first sign-in):
`9000000001` owner · `9000000003` employee · `9000000002` stockist — all `password123`.

---

## Part B — Web on Vercel

1. <https://vercel.com> → **Add New → Project** → import the same GitHub repo.
2. **Root Directory** = `apps/web` (click *Edit* and select it).
   Framework preset auto-detects **Next.js**.
3. **Environment Variables**:
   ```
   NEXT_PUBLIC_API_URL = https://<your-api-domain>     (no /api, no trailing slash)
   ```
4. **Deploy.** You get `https://<project>.vercel.app`.
5. Go back to Railway → API → set `CORS_ORIGINS` to that Vercel URL → redeploy.

Done — open the Vercel URL and sign in.

---

## Adding a custom domain later
- **Vercel**: Project → Domains → add `yourshop.com` → follow DNS records.
- **Railway**: API service → Networking → Custom Domain (e.g. `api.yourshop.com`),
  then update `PUBLIC_URL` and the web's `NEXT_PUBLIC_API_URL`, and add the
  apex/web domain to `CORS_ORIGINS`.

## Turning Meilisearch on (optional, later)
Add a Railway Docker service `getmeili/meilisearch:v1.7` with a volume at
`/meili_data` and `MEILI_MASTER_KEY=<key>`, then set `MEILI_HOST` +
`MEILI_MASTER_KEY` on the API and hit `POST /api/search/reindex` once.

## Cost
Vercel Hobby = free. Railway = usage-based (~$5 trial credit, then a few $/mo
for the API + Postgres on the smallest sizes). No Redis, Meili optional → keeps
it to two small services.
