# Production image for the NestJS API (Railway).
# Build context = repo root. The backend workspace is self-contained
# (no @ecom/shared dependency) so it builds standalone.

# ---- build ----
FROM node:20-slim AS build
WORKDIR /app
RUN apt-get update -y \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY apps/backend/package.json ./package.json
RUN npm install

COPY apps/backend/ ./
RUN npx prisma generate && npm run build
# Compile the seed + fresh-start scripts to plain JS so they run on the prod
# Node runtime (no ts-node).
RUN npx tsc prisma/seed.ts prisma/fresh-start.ts --outDir dist/prisma --rootDir prisma \
  --module commonjs --target ES2021 --esModuleInterop --skipLibCheck --resolveJsonModule

# ---- runtime ----
FROM node:20-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
RUN apt-get update -y \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

# node_modules keeps the prisma CLI so `migrate deploy` can run on boot.
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/package.json ./package.json

# Uploaded images live here — mount a Railway volume at /app/uploads to persist.
RUN mkdir -p /app/uploads

EXPOSE 4000
# Apply any pending migrations, then start the API.
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/src/main.js"]
