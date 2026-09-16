# AGROGOOD — ERP + CRM + WMS + TMS + Logística

Plataforma web y móvil para gestionar de extremo a extremo la operación de
distribución de alimentos de **AGROGOOD**: venta, compra, almacenamiento,
preparación (picking), despacho, transporte, entrega, facturación y cobranza —
bajo el principio de **una sola fuente de verdad** y **trazabilidad completa**.

> Objetivo: reemplazar la operación basada en *Excel + WhatsApp + llamadas +
> registros manuales* por una plataforma **centralizada, trazable, automatizada
> y en tiempo real**, preparada para crecer a múltiples bodegas, sucursales,
> vehículos, conductores y miles de pedidos diarios.

## Estado del proyecto

Desarrollo por fases (ver [docs/03-ROADMAP-FASES.md](docs/03-ROADMAP-FASES.md)).

| Fase | Contenido | Estado |
|------|-----------|--------|
| 1 | Arquitectura, BD, usuarios, roles, autenticación, dashboard | ✅ Implementada + verificada |
| 2 | CRM, productos, clientes, proveedores, ventas/pedidos | ✅ Implementada + verificada |
| 3 | Inventario, bodega (WMS), compras, recepción, mermas | ✅ Implementada + verificada |
| 4 | Picking, despacho, rutas (TMS), vehículos, conductores | ✅ Backend + web (app móvil Expo incluida) |
| 5 | GPS, entregas, evidencias, notificaciones | ✅ Implementada + verificada |
| 6 | Caja chica, finanzas, facturación (registro DTE / SII manual) | ✅ Implementada + verificada |
| 7 | BI, reportes, KPIs, Control Tower | ✅ Implementada + verificada |
| 8 | IA: recomendación de compras, anomalías, análisis de clientes | ✅ Implementada + verificada |

> Estado: las 8 fases compilan (backend y web), la lógica crítica está cubierta
> por tests unitarios en verde (40) y el sistema está **verificado end-to-end
> contra PostgreSQL** (migración, seed, e2e y smoke de cada fase).
> Pendientes acotados (infra/decisiones): colas Redis para GPS de alto volumen,
> tiempo real por WebSocket, mapa interactivo (proveedor de mapas), push FCM y
> exportación PDF/XLSX nativa. Ver [docs/03](docs/03-ROADMAP-FASES.md).

## Documentación

- [01 — Arquitectura general](docs/01-ARQUITECTURA.md)
- [02 — Diseño de base de datos](docs/02-BASE-DE-DATOS.md)
- [03 — Roadmap por fases](docs/03-ROADMAP-FASES.md)
- [04 — Decisiones técnicas (ADR)](docs/04-DECISIONES-TECNICAS.md)
- [05 — Auditoría de la especificación (riesgos y vacíos)](docs/05-AUDITORIA-ESPECIFICACION.md)

## Stack (resumen)

- **Monorepo** npm workspaces: `apps/api`, `apps/web`, `apps/mobile`, `packages/shared`
- **Backend:** Node.js + TypeScript + NestJS (modular), API REST documentada con OpenAPI/Swagger
- **Base de datos:** PostgreSQL (+ PostGIS para GPS), ORM Prisma con migraciones
- **Web:** React + TypeScript + Vite + Tailwind
- **Móvil:** React Native (Expo), offline-first para operaciones críticas
- **Auth:** JWT (access + refresh), Argon2 para contraseñas, 2FA (TOTP) opcional, RBAC
- **Infra local:** Docker Compose (PostgreSQL)

Ver justificación completa en [docs/04-DECISIONES-TECNICAS.md](docs/04-DECISIONES-TECNICAS.md).

## Puesta en marcha (Fase 1)

```bash
# 1. Levantar la base de datos
docker compose up -d

# 2. Instalar dependencias
npm install

# 3. Configurar variables de entorno
cp apps/api/.env.example apps/api/.env

# 4. Migrar y sembrar datos demo
npm run db:migrate
npm run db:seed

# 5. Levantar la API
npm run dev:api

# 6. En otra terminal, levantar la web
npm run dev --workspace @agrogood/web
```

- API + Swagger interactivo: `http://localhost:3000/docs`
- Web (login, menú lateral, dashboard): `http://localhost:5173`

Usuarios demo (todos con la contraseña de `SEED_DEMO_PASSWORD`, por defecto
`Agrogood.2026`), RUT de empresa `76123456-7`:
`admin@agrogood.cl`, `gerente@agrogood.cl`, `operaciones@agrogood.cl`,
`compras@agrogood.cl`, `bodega@agrogood.cl`, `picker@agrogood.cl`,
`despacho@agrogood.cl`, `conductor@agrogood.cl`, `administracion@agrogood.cl`.
