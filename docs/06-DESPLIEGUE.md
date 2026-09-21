# 06 — Despliegue (Vercel + Railway/Render + Neon)

Topología elegida:

```
Navegador ──HTTPS──▶  Vercel (web, SPA React/Vite)
                         │  rewrite  /api/*  ─────────▶  API (Railway o Render, NestJS)
                         │                                      │
   WebSocket /socket.io ─┼──────────(directo a la API)──────────┘
                                                                 │
                                                          Neon (PostgreSQL + PostGIS)
```

- **Web → Vercel**: sitio estático; `vercel.json` (raíz) ya trae build y rewrites.
- **API → Railway o Render**: proceso Node persistente (necesario por Prisma,
  rate-limiting, WebSocket `/socket.io` y las colas de Fase 5).
- **Postgres → Neon**: gestionado, con PostGIS (requerido por el GPS de Fase 5).

> La web llama a `/api` **relativo**; Vercel lo proxya a la API. Así la cookie de
> refresh (HttpOnly, SameSite=Strict) es **first-party** y no hay CORS en el HTTP.
> El **WebSocket** no puede ir por el rewrite de Vercel: conecta **directo** a la
> URL de la API (ver §5).

---

## 1) Base de datos — Neon

1. Crea un proyecto en [neon.tech](https://neon.tech), región cercana (p. ej.
   `aws-sa-east-1`). Base de datos: `agrogood`.
2. Habilita PostGIS (para Fase 5):
   ```sql
   CREATE EXTENSION IF NOT EXISTS postgis;
   ```
3. Copia la connection string y añádele `?sslmode=require`. Será tu
   `DATABASE_URL`.
   - **Para el primer despliegue usa la cadena DIRECTA** (la que **no** lleva
     `-pooler` en el host): funciona tanto para `prisma db push` como para la
     app. La cadena *pooled* (PgBouncer) puede romper `db push`/`migrate`.
   - *Optimización posterior*: usar la *pooled* como `DATABASE_URL` y la directa
     como `directUrl` en el `datasource` de Prisma (requiere tocar
     `schema.prisma`, coordinar con el resto del equipo).

> El problema del `template1` contaminado que bloqueaba `prisma migrate dev` en
> local **no aplica en Neon** (su template está limpio).

## 2) API — Railway (recomendado) o Render

### Opción A — Railway (build nativo, sin Docker)

1. [railway.app](https://railway.app) → New Project → Deploy from GitHub → este repo.
2. En el servicio, **Settings**:
   - **Root Directory**: `/` (raíz del repo).
   - **Build Command**:
     ```bash
     npm ci && npm run build:shared && npm run prisma:generate --workspace @agrogood/api && npm run build --workspace @agrogood/api
     ```
   - **Start Command**:
     ```bash
     node apps/api/dist/apps/api/src/main.js
     ```
     (El `dist` queda anidado porque el tsconfig abarca el monorepo. Ojo: el
     script `start:prod` del `package.json` apunta a `dist/main.js` — bug menor,
     usa la ruta de arriba.)
   - **Pre-Deploy / Release Command** (aplica el esquema antes de arrancar):
     ```bash
     cd apps/api && npx prisma db push --skip-generate
     ```
3. **Variables** (ver `apps/api/.env.production.example`): `DATABASE_URL`,
   `CORS_ORIGIN`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `COOKIE_SECURE=true`,
   `NODE_ENV=production`. Railway inyecta `PORT` solo; la app ya lo lee.
4. **Health check**: `/health`.
5. Toma la URL pública del servicio (p. ej. `https://agrogood-api.up.railway.app`).

### Opción B — Render (blueprint)

Usa `render.yaml` (raíz): Dashboard → New → Blueprint → este repo. Pega
`DATABASE_URL` y `CORS_ORIGIN`; los secretos JWT se autogeneran. Construye desde
`apps/api/Dockerfile`.

## 3) Web — Vercel

1. [vercel.com](https://vercel.com) → Add New → Project → importa este repo.
2. Vercel leerá `vercel.json` (raíz): install/build/output y rewrites ya están.
   Deja **Root Directory** en la raíz del repo.
3. **Edita `vercel.json`**: reemplaza `https://REEMPLAZA-API.up.railway.app` por
   la URL real de tu API (en las dos entradas de rewrite). Commit + push.
4. Deploy. Tu web queda en `https://tu-app.vercel.app`.
5. Vuelve a la API y pon `CORS_ORIGIN=https://tu-app.vercel.app` (para el
   WebSocket y cualquier llamada directa).

## 4) Carga inicial de datos (opcional)

Para poblar datos demo la primera vez, con `DATABASE_URL` y `SEED_DEMO_PASSWORD`
apuntando a Neon, ejecuta una sola vez (shell del host o en local):

```bash
cd apps/api && npm run db:seed
```

Usuarios demo: `admin@agrogood.cl` … (contraseña `SEED_DEMO_PASSWORD`), RUT
empresa `76123456-7`.

## 5) Cookies, CORS y WebSocket (importante)

- **HTTP (`/api`)**: va por el **rewrite de Vercel** → mismo origen → la cookie de
  refresh es first-party. Requiere `COOKIE_SECURE=true` (hay HTTPS). Sin cambios
  de código.
- **WebSocket (`/socket.io`, realtime de Fase 5)**: **no** pasa por el rewrite de
  Vercel. El cliente realtime debe conectar a la **URL absoluta de la API**
  (variable de entorno del front, p. ej. `VITE_API_URL`), y `CORS_ORIGIN` de la
  API debe incluir el dominio de Vercel. → **Coordinar con el código de Fase 5**
  (el cliente socket.io) para que use esa URL absoluta.
- **Dominio propio (mejor a futuro)**: si pones web y API bajo el mismo dominio
  (p. ej. `app.agrogood.cl` y `api.agrogood.cl`), las cookies pueden ser
  `Domain=.agrogood.cl; SameSite=Lax` y todo (incluido el WS) es first-party sin
  proxys.

## 6) Migraciones

- **Ahora**: `prisma db push` (sin migraciones versionadas). Vale para el primer
  despliegue y staging.
- **Producción estable**: generar migraciones versionadas y usar
  `prisma migrate deploy` en el release. Genéralas cuando el esquema se
  estabilice (tras Fases 6-8), en local contra una base creada desde `template0`
  (o directamente contra una rama de Neon como shadow DB).

## 7) Secretos

```bash
openssl rand -base64 48   # uno para JWT_ACCESS_SECRET, otro para JWT_REFRESH_SECRET
```
Nunca commitees secretos; van en el panel del host. `.env`/`.env.production` están
en `.gitignore`.

## 8) Verificación post-despliegue

1. `GET https://<api>/health` → `{ status: ok }`.
2. Abre la web de Vercel → login con un usuario demo → carga el dashboard.
3. Revisa que `/api/...` responde a través del rewrite (pestaña Network, mismo
   origen) y que el realtime conecta (si Fase 5 está desplegada).

## 9) CI/CD

### Integración continua (CI)

`.github/workflows/ci.yml` corre en cada push/PR a `main` (una vez el repo esté
en GitHub — hoy no hay remote configurado). Levanta un **Postgres real con
PostGIS** como servicio del runner y ejecuta:

1. `npm ci` + build del paquete compartido.
2. `prisma generate` + `prisma db push` + seed.
3. Build de API y web.
4. **Tests unitarios y e2e** (los e2e contra la BD real del runner).

Un job aparte hace *typecheck* de la app móvil de forma **informativa**
(`continue-on-error`), porque Expo Router genera tipos en build.

> Nota: `lint` no se incluye porque la API aún no tiene ESLint instalado
> (script declarado pero sin dependencia). Es un pendiente separado.

### Despliegue continuo (CD) — "deploy por push"

Lo más simple y robusto es la **integración Git nativa** de cada plataforma
(cero secretos en GitHub):

- **Vercel**: al conectar el repo, cada push a `main` hace deploy a producción y
  cada PR genera un *preview deploy*.
- **Railway / Render**: igual, auto-despliegan al hacer push a `main`.

Para que solo se despliegue lo que pasa CI: en GitHub → Settings → Branches →
**branch protection** en `main` exigiendo el check *CI / Build + tests*.

> Alternativa (opcional): disparar el deploy desde el propio workflow con la CLI
> de Vercel (`VERCEL_TOKEN`) o un *deploy hook* de Render/Railway. Requiere
> guardar esos tokens como *GitHub Secrets*. Se recomienda la integración Git
> nativa antes que esto.

## Pendientes (no bloqueantes)

- **Migraciones versionadas** (§6 arriba).
- **ESLint** en la API (el `npm run lint` está roto: falta la dependencia).
- **`start:prod`** en `apps/api/package.json`: corregir a
  `node dist/apps/api/src/main.js`.
- **Backups** (§47): Neon hace point-in-time; definir retención.
