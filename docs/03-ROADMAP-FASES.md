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

## Fase 4 — Picking, despacho, TMS y app móvil 🚧
Picking con faltantes y sustituciones; control de calidad; centro de despacho;
creación de rutas; asignación de vehículos y conductores. La app móvil (Expo)
es la segunda sub-entrega.

**Sub-entrega 4A — Backend + Web (hecha):**
- [x] Esquema Prisma: `pickings`, `picking_items`, `quality_checks`,
      `vehicles`, `drivers`, `routes`, `route_stops` (+ enums y relaciones)
- [x] Contratos compartidos: permisos por rol (PICKER/DESPACHADOR/CONDUCTOR),
      máquinas de estado de picking y ruta, y reglas puras
      (`pickingHasUnjustifiedDifference`, `resolvePickingOutcome`)
- [x] Backend: `fleet` (vehículos/conductores), `picking` (crear, iniciar,
      actualizar línea, cerrar), `quality` (control previo), `routing`
      (despacho, rutas, reordenar, salida, cierre)
- [x] Reglas de negocio (§37): no cerrar picking con diferencias sin
      justificar; no despachar sin vehículo/conductor/paradas; bloqueo de
      salida si hay calidad RECHAZADA; salida física de stock por el único
      punto de mutación (ADR-011); despacho ≡ ruta (ADR-010)
- [x] Web: Picking (listado + ejecución), Despacho, Rutas (listado + detalle
      con asignación/salida/cierre), Vehículos, Conductores
- [x] Tests unit: regla de picking + máquinas de estado (en verde, 27 total)
- [x] Seed: vehículos y conductores demo
- [ ] Verificación e2e contra BD (pendiente de `DATABASE_URL`)

**Sub-entrega 4B — App móvil Expo (pendiente):**
App para pickers y conductores; escaneo QR/código de barras (§40); offline-first
para operaciones críticas (§39). La app del conductor con GPS/entregas es Fase 5.

## Fase 5 — GPS, entregas, evidencias y notificaciones 🚧
App del conductor; captura de GPS con frecuencia configurable y bajo consumo;
entregas con firma/foto/geolocalización; rechazos; centro de notificaciones por rol.

**Sub-entrega 5A — Backend + Web (hecha):**
- [x] Esquema: deliveries, delivery_items, delivery_evidence, gps_positions,
      notifications (+ enums y relaciones)
- [x] Contratos compartidos: permisos (DELIVERY/GPS), enums de entrega y
      `resolveDeliveryStatus` (regla pura ENTREGADO/PARCIAL/RECHAZADO)
- [x] Backend `deliveries`: registrar entrega con evidencia (firma/foto),
      actualiza parada + pedido (ENTREGADO/INCIDENCIA), completa la ruta cuando
      no quedan paradas, y notifica (§29: vendedor si OK, JEFE_OPERACIONES si
      hay incidencia)
- [x] Backend `gps`: reporte de posición (soporta lote offline), última posición
      por ruta en curso, traza histórica
- [x] Backend `notifications`: notificar por usuario/rol, listar, contar no
      leídas, marcar leída(s)
- [x] Web: Entregas, GPS (últimas posiciones, refresco 15s), Notificaciones
- [x] Tests unit: `resolveDeliveryStatus` (en verde, 31 total)
- [ ] Verificación e2e contra BD (pendiente de `DATABASE_URL`)

**Pendiente en Fase 5 (infra/decisiones):**
- [ ] Colas Redis/BullMQ para GPS de alto volumen y notificaciones (requiere
      Redis; interfaz preparada)
- [ ] Tiempo real (WebSocket/SSE) y mapa interactivo (requiere proveedor de mapas)
- [ ] Push a móvil (FCM) — junto con la app del conductor

## Fase 6 — Caja chica, finanzas y facturación ✅
Caja chica con rendición y cierre; cuentas por cobrar/pagar; **facturación como
registro de DTE** (emisión manual en el portal del SII — decisión del cliente,
ADR-007 actualizado; sin proveedor externo ni API).

- [x] Esquema: cash_registers, cash_movements, invoices, payments,
      supplier_invoices, supplier_payments (+ enums)
- [x] Contratos compartidos: permisos + enums (DteType, DocumentStatus, etc.) y
      funciones puras (computeTax, computeDocumentStatus, agingStatus)
- [x] Caja chica: abrir, ingresos/egresos que afectan saldo en transacción,
      cierre, gastos por categoría (no permite saldo negativo)
- [x] Facturación (CxC): registrar DTE (calcula IVA), pagos/abonos que actualizan
      saldo y estado, anulación (sin pagos); folio único por tipo
- [x] Finanzas: Cuentas por Cobrar y por Pagar con semáforo de vencimiento
      (🟢🟠🔴), facturas de proveedor y sus pagos, KPIs financieros
- [x] Web: Caja chica, Facturación, CxC, CxP
- [x] Fix: `start:prod` apuntaba a `dist/main.js` → `dist/apps/api/src/main.js`
- [x] Tests unit: computeTax/estado/aging (en verde, 40 total)
- [x] Verificado build API + web; e2e contra BD real (fases 1-5) en verde

## Fase 7 — BI, reportes y KPIs ✅
Dashboard gerencial y **Control Tower**; reportes exportables; módulo BI.

- [x] DashboardService con KPIs reales (ventas hoy, pedidos por estado,
      entregas, stock crítico, compras pendientes, merma, caja, CxC/CxP)
- [x] Control Tower: contadores operativos en vivo + alertas (refresco 20s)
- [x] Reportes: ventas por cliente/producto, compras por proveedor, mermas por
      motivo, stock/inventario — con **export CSV** (BOM, apto Excel-es)
- [x] Web: Dashboard renovado, Control Tower, Reportes (con descarga CSV)
- [x] Verificado contra BD real (KPIs, control-tower y CSV)
- [x] Export nativo **XLSX** (exceljs) y **PDF** (pdfkit) además de CSV —
      verificado (magic bytes PK / %PDF con datos reales)
- [ ] BI avanzado (rentabilidad por ruta) — futuro

## Fase 8 — Inteligencia artificial ✅
Recomendación de compras basada en demanda estimada, detección de anomalías y
análisis de clientes. La IA **asiste y recomienda**; NO ejecuta acciones
(prompt §32).

- [x] AiService heurístico/estadístico (sin proveedor externo ni credenciales):
      - Recomendación de compra: estima demanda diaria desde las salidas de
        inventario (90 días), la proyecta al horizonte y la compara con el
        disponible; usa stock mínimo/punto de reposición como piso
      - Detección de anomalías: merma de la semana vs. la previa
      - Análisis de clientes: frecuencia, ticket promedio, última compra
- [x] Web: página Inteligencia (recomendaciones, anomalías, clientes)
- [x] Verificado contra BD real: al dejar Palta bajo mínimo (merma), el motor
      marca crítico y recomienda comprar; el mensaje sigue el ejemplo del §32
- [x] Arquitectura lista para sustituir las heurísticas por un modelo/LLM
      detrás de la misma interfaz, sin tocar controladores ni frontend

---

## Temas transversales (se refuerzan cada fase)
Seguridad, trazabilidad/auditoría, tests (unit/integration/e2e), datos demo,
importación/exportación Excel, multi-tenant, y CI/CD + backups.
