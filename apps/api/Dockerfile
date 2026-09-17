# AGROGOOD API — imagen de producción (monorepo npm workspaces).
# NOTA: build no verificado localmente (Docker no disponible en el entorno de
# desarrollo original); sigue el patrón estándar multi-stage. La ruta del
# entrypoint es apps/api/dist/apps/api/src/main.js (el tsconfig abarca el
# monorepo, por eso el dist queda anidado).

# ---------- build ----------
FROM node:20-slim AS build
WORKDIR /app
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

# Copiamos manifiestos de todos los workspaces (npm ci los necesita todos).
COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY apps/mobile/package.json apps/mobile/
RUN npm ci

# Fuente necesaria para compilar la API (shared + api).
COPY packages/shared packages/shared
COPY apps/api apps/api

RUN npm run build:shared \
 && npm run prisma:generate --workspace @agrogood/api \
 && npm run build --workspace @agrogood/api

# ---------- runtime ----------
FROM node:20-slim AS runtime
WORKDIR /app
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
ENV NODE_ENV=production

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/packages/shared/dist ./packages/shared/dist
COPY --from=build /app/packages/shared/package.json ./packages/shared/package.json
COPY --from=build /app/apps/api/dist ./apps/api/dist
COPY --from=build /app/apps/api/package.json ./apps/api/package.json
COPY --from=build /app/apps/api/prisma ./apps/api/prisma

EXPOSE 3000
# Las migraciones se aplican como paso de "release" del host, no aquí, para que
# un fallo de migración no deje el servidor en crash-loop:
#   npx prisma migrate deploy   (cuando existan migraciones versionadas)
#   npx prisma db push          (primer despliegue, sin migraciones)
CMD ["node", "apps/api/dist/apps/api/src/main.js"]
