# Production image for the Next.js web app (standalone output).
# Build context = repo root (npm workspaces).

# ---- build (install + next build in one stage so workspace bins survive) ----
FROM node:20-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/web/package.json apps/web/package.json
COPY apps/backend/package.json apps/backend/package.json
COPY apps/mobile/package.json apps/mobile/package.json
COPY packages/shared/package.json packages/shared/package.json
# --ignore-scripts: skip other workspaces' postinstall (not needed to build web).
RUN npm ci --ignore-scripts
COPY . .
# Empty API URL => the browser calls /api, /uploads, /socket.io on the same
# origin; the reverse proxy routes them to the API. No domain baked in.
ENV NEXT_PUBLIC_API_URL=""
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build -w apps/web

# ---- runtime (only the standalone server + assets) ----
FROM node:20-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
COPY --from=build /app/apps/web/.next/standalone ./
COPY --from=build /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=build /app/apps/web/public ./apps/web/public
EXPOSE 3000
CMD ["node", "apps/web/server.js"]
