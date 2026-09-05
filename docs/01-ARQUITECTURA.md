# 01 — Arquitectura general

## 1. Principios rectores

Ordenados por prioridad (según instrucción final del prompt maestro):

**FUNCIONALIDAD → SEGURIDAD → TRAZABILIDAD → ESCALABILIDAD → USABILIDAD → RENDIMIENTO**

1. **Una sola fuente de verdad.** Un único backend + una única base de datos
   transaccional. Web y móvil consumen la misma API. Nada de lógica de negocio
   duplicada en el cliente.
2. **Trazabilidad por diseño.** Todo cambio de estado en una entidad crítica
   genera un registro inmutable (`audit_logs`) y, cuando aplica, un movimiento
   contable/de inventario. El historial de un pedido debe poder reconstruirse
   completo.
3. **Modularidad.** Cada dominio (CRM, Ventas, Compras, WMS, TMS, Finanzas…) es
   un módulo independiente con su frontera clara. Se evita el monolito
   "espagueti" sin caer en microservicios prematuros (ver ADR-002).
4. **Multi-tenant desde el día uno.** Toda entidad operativa cuelga de
   `company_id` y (cuando corresponde) `warehouse_id`. No se diseña pensando en
   una sola bodega.

## 2. Vista de alto nivel

```text
┌──────────────┐     ┌──────────────┐     ┌───────────────────────┐
│   Web (SPA)  │     │  Móvil (RN)  │     │  Integraciones ext.   │
│ React + Vite │     │    Expo      │     │ SII, Maps, WhatsApp…  │
└──────┬───────┘     └──────┬───────┘     └───────────┬───────────┘
       │  HTTPS/REST+JWT    │  HTTPS/REST+JWT          │ webhooks/API
       └─────────┬──────────┴──────────────┬──────────┘
                 ▼                          ▼
        ┌────────────────────────────────────────────┐
        │              API (NestJS)                    │
        │  Auth/RBAC · Módulos de dominio · Validación │
        │  Servicios: GPS, Notif., Archivos, Reportes, │
        │             Facturación, IA, Integraciones   │
        └───────┬───────────────────┬──────────────────┘
                │                   │
      ┌─────────▼─────────┐   ┌─────▼───────────┐
      │  PostgreSQL       │   │ Cola / Jobs     │
      │  (+ PostGIS)      │   │ (BullMQ/Redis)* │
      │  Prisma ORM       │   └─────────────────┘
      └───────────────────┘
      * Redis/colas se incorporan en Fase 5 (GPS/notificaciones/reportes async).
```

## 3. Estructura del monorepo

```text
/
├── apps/
│   ├── api/          # Backend NestJS (fuente de verdad de la lógica)
│   ├── web/          # Panel de administración y operación (React)
│   └── mobile/       # App de pickers, conductores, supervisores (Expo)
├── packages/
│   └── shared/       # Tipos, enums, DTOs y contratos compartidos web/móvil/api
├── docs/             # Documentación técnica y de negocio
├── docker-compose.yml
└── package.json      # npm workspaces
```

### Backend — estructura por módulos (`apps/api/src`)

```text
src/
├── main.ts
├── app.module.ts
├── common/           # Guards, interceptors, filtros, decoradores, utilidades
│   ├── auth/         # JWT strategy, RBAC guard, decoradores @Roles/@Permissions
│   ├── audit/        # Interceptor + servicio de auditoría (trazabilidad)
│   ├── prisma/       # PrismaService (conexión única)
│   └── errors/       # Filtro global de excepciones, formato de error estándar
├── modules/
│   ├── users/
│   ├── auth/
│   ├── companies/    # Multi-empresa / multi-sucursal
│   ├── crm/          # Fase 2
│   ├── products/     # Fase 2
│   ├── sales/        # Fase 2
│   ├── purchasing/   # Fase 3
│   ├── inventory/    # Fase 3 (WMS)
│   ├── waste/        # Fase 3 (mermas)
│   ├── picking/      # Fase 4
│   ├── dispatch/     # Fase 4
│   ├── routes/       # Fase 4 (TMS)
│   ├── gps/          # Fase 5
│   ├── deliveries/   # Fase 5
│   ├── notifications/# Fase 5
│   ├── finance/      # Fase 6
│   ├── invoicing/    # Fase 6 (SII)
│   ├── reports/      # Fase 7
│   └── ai/           # Fase 8
└── config/           # Configuración tipada por entorno
```

Cada módulo sigue el patrón NestJS: `*.module.ts`, `*.controller.ts`,
`*.service.ts`, `dto/`, y pruebas `*.spec.ts`.

## 4. Capas y responsabilidades

| Capa | Responsabilidad | Regla |
|------|-----------------|-------|
| Controller | Entrada HTTP, validación de forma (DTO), autorización | Sin lógica de negocio |
| Service | Lógica de negocio, transacciones, reglas | Único lugar que escribe |
| Prisma (repos) | Acceso a datos, migraciones | Sin reglas de negocio |
| Guards/Interceptors | Auth, RBAC, auditoría, logging | Transversales |

**Regla dura:** toda mutación de estado crítico se ejecuta dentro de una
transacción de base de datos que escribe (a) la entidad, (b) su movimiento
(inventario/caja/etc.) y (c) el registro de auditoría — o no escribe nada.

## 5. Seguridad (transversal)

- Contraseñas con **Argon2id** (nunca texto plano).
- **JWT** de acceso corto (15 min) + **refresh token** rotatorio en cookie
  `HttpOnly`/`Secure`/`SameSite=Strict`.
- **RBAC** con roles + permisos granulares (ver `docs/02`), evaluado en un guard.
- Validación de entrada en backend con `class-validator` (nunca confiar en el
  cliente). Prisma parametriza consultas → mitiga SQL injection.
- **Rate limiting** global y reforzado en `/auth`.
- CORS restringido, headers de seguridad (Helmet), HTTPS obligatorio en prod.
- 2FA (TOTP) opcional por usuario.
- Auditoría inmutable: los `audit_logs` no se pueden editar ni borrar desde la
  API normal (sin endpoints de UPDATE/DELETE; revocado a nivel de permiso de BD
  en prod).

## 6. Trazabilidad y auditoría

Dos mecanismos complementarios:

1. **`audit_logs`** — quién, cuándo, qué acción, entidad, estado anterior/nuevo,
   documento relacionado, IP, observaciones. Generado por un interceptor +
   llamadas explícitas en servicios críticos.
2. **Tablas de movimientos** — `inventory_movements`, `cash_movements`, y
   transiciones de estado de pedidos/rutas/entregas. Son el "libro mayor" del
   dominio: nunca se borran, solo se agregan (append-only) y se corrigen con
   movimientos compensatorios.

La **línea de tiempo del pedido** (sección 53 del prompt) se reconstruye
consultando `audit_logs` + eventos de estado filtrados por el documento.

## 7. Servicios de plataforma (fachadas desacopladas)

Cada integración externa vive detrás de una interfaz propia para no acoplar el
núcleo (sección 49 del prompt):

- `GpsService`, `NotificationService`, `MapsService`, `FileStorageService`,
  `InvoicingService` (SII vía proveedor autorizado), `ReportService`, `AiService`.
- Implementaciones intercambiables (p. ej. almacenamiento local en dev, S3 en
  prod) seleccionadas por configuración.

## 8. Escalabilidad

- Estado en la BD, API **stateless** → escala horizontal detrás de un balanceador.
- Trabajo pesado (optimización de rutas, reportes, GPS de alta frecuencia,
  notificaciones) se mueve a **colas** (BullMQ/Redis) a partir de la Fase 5.
- Índices y particionamiento previstos para tablas de alto volumen
  (`gps_positions`, `audit_logs`, `inventory_movements`) — ver `docs/02`.

## 9. Despliegue (resumen; detalle en Fase 1+)

Tres entornos: **development / staging / production**. Configuración 100 % por
variables de entorno. Migraciones versionadas (Prisma). Health checks
(`/health`). CI/CD y backups automáticos se detallan en el roadmap.
