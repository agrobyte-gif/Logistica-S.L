# 03 — Roadmap por fases

Cada fase se considera **terminada solo cuando funciona de extremo a extremo**:
diseñada, programada, conectada a BD, validada, probada, integrada y documentada
(prompt maestro §56). Entregables por fase (§57): código, BD, migraciones, APIs,
documentación, tests, datos demo, manuales y procedimiento de despliegue.

---

## Fase 1 — Cimientos 🚧 (en curso)
**Meta:** base técnica sólida sobre la que se construye todo lo demás.

- [x] Arquitectura y decisiones técnicas (docs 01–04)
- [x] Auditoría de la especificación (doc 05)
- [x] Monorepo + Docker Compose (PostgreSQL)
- [x] Esquema Prisma: `companies`, `warehouses`, `users`, `roles`,
      `permissions`, tablas puente, `audit_logs`
- [x] Autenticación (login, refresh, logout, recuperación de contraseña)
- [x] RBAC (guard de roles + permisos) y servicio de auditoría
- [x] Seed con empresa demo, roles y un usuario por rol
- [x] Swagger en `/docs`, health check en `/health`
- [x] Web: login + layout con menú lateral + dashboard placeholder
- [x] Tests: unit de RBAC (en verde), e2e de login (requiere BD)
- [ ] Verificación end-to-end contra BD (migración + seed + e2e) — pendiente de
      `DATABASE_URL` (Postgres en la nube)

**Criterio de aceptación:** un usuario de cada rol puede iniciar sesión; el
acceso a endpoints respeta permisos; toda acción crítica queda en `audit_logs`.

---

## Fase 2 — CRM, productos y ventas 🚧
CRM (clientes/contactos/direcciones), maestro de productos, listas de precio,
proveedores, y el módulo de **pedidos** con su máquina de estados y el **control
automático de stock** (🟢🟡🔴) que crea necesidades de compra.

- [x] Esquema Prisma: customers, addresses, contacts, suppliers, categories,
      products, product_suppliers, price_lists, product_prices, inventory,
      sales_orders, sales_order_items, purchase_requests, document_sequences
- [x] Backend: módulos customers, products (+categorías), suppliers, sales,
      purchasing (necesidades) — CRUD paginado y multi-tenant
- [x] Pedidos: numeración atómica (PED-AAAA-######), clasificación de stock,
      reserva con bloqueo de fila (anti-sobreventa), necesidades automáticas,
      máquina de estados y línea de tiempo (auditoría)
- [x] Web: Clientes, Productos, Proveedores, Necesidades, Pedidos (listado,
      alta y detalle con transiciones y timeline)
- [x] Tests unit: máquina de estados + clasificación de stock (en verde)
- [ ] Verificación e2e contra BD (pendiente de `DATABASE_URL`)
- [ ] Contactos/direcciones de cliente en UI, importación Excel (más adelante)

## Fase 3 — Inventario, WMS, compras y mermas 🚧
Inventario por ubicación/lote, `inventory_movements` como libro mayor,
transferencias, ajustes, conteos; flujo de compras completo (necesidad →
solicitud → cotización → aprobación → OC → recepción → stock); módulo de mermas.

- [x] Esquema: inventory_movements (libro mayor append-only), purchase_orders,
      purchase_order_items, goods_receipts, goods_receipt_items, waste
- [x] InventoryService.applyMovement: único punto de mutación del stock
      (proyección + asiento en una transacción con bloqueo de fila) — ADR-009
- [x] Inventario: stock, movimientos, ajuste (con motivo) y transferencia
- [x] Compras: crear OC (desde necesidades o manual), aprobación por umbral
      de monto (§41), recepción que ingresa stock y actualiza la OC
- [x] Mermas: registro con motivo obligatorio que descuenta stock, resumen
      por motivo y costo
- [x] Web: Stock, Movimientos, Mermas, Órdenes de compra (listado, alta,
      detalle con aprobar/recepcionar)
- [x] Tests unit: signo de movimiento + umbral de aprobación (en verde)
- [ ] Ubicaciones/lotes en detalle, conteos cíclicos, cotizaciones (más adelante)
- [ ] Verificación e2e contra BD (pendiente de `DATABASE_URL`)

## Fase 4 — Picking, despacho, TMS y app móvil
App móvil (Expo) para pickers y supervisores; picking con escaneo, faltantes y
sustituciones; control de calidad; centro de despacho; creación y optimización
de rutas; asignación de vehículos y conductores.

## Fase 5 — GPS, entregas, evidencias y notificaciones
App del conductor; captura de GPS con frecuencia configurable y bajo consumo;
entregas con firma/foto/geolocalización; rechazos; **colas (Redis/BullMQ)** para
GPS y notificaciones; centro de notificaciones por rol.

## Fase 6 — Caja chica, finanzas y facturación SII
Caja chica con rendición y cierre; cuentas por cobrar/pagar; **integración de
facturación electrónica SII a través de proveedor autorizado** (ver ADR y doc 05
para riesgos y verificación de documentación vigente antes de implementar).

## Fase 7 — BI, reportes y KPIs
Dashboard gerencial y **Control Tower** en tiempo real; reportes exportables
(Excel/CSV/PDF); módulo BI (márgenes, rentabilidad por ruta/cliente/producto,
productividad).

## Fase 8 — Inteligencia artificial
Predicción de demanda/compras/merma, detección de anomalías, recomendación de
stock/compras. La IA **asiste y recomienda**; no ejecuta compras críticas sin
autorización (prompt §32).

---

## Temas transversales (se refuerzan cada fase)
Seguridad, trazabilidad/auditoría, tests (unit/integration/e2e), datos demo,
importación/exportación Excel, multi-tenant, y CI/CD + backups.
