# 02 — Diseño de base de datos

Motor: **PostgreSQL 16** (+ **PostGIS** para geolocalización). ORM: **Prisma**.

Convenciones:
- Claves primarias `id` tipo `uuid` (v7 cuando esté disponible; si no, `cuid`).
- `created_at`, `updated_at` en toda tabla; `created_by`, `updated_by` en tablas
  de negocio.
- Nombres de tabla en `snake_case` plural (mapeados desde modelos Prisma).
- Multi-tenant: casi toda tabla operativa tiene `company_id` (FK a `companies`).
- Montos monetarios en **enteros** (centavos CLP) o `Decimal(14,2)`; **nunca
  `float`** (evita errores de redondeo en dinero). CLP no usa decimales, pero se
  reserva precisión para cálculos intermedios de margen/costos.
- Cantidades con `Decimal(14,3)` (permite kg, gramos, fracciones).

> ⚠️ Este documento describe el modelo objetivo completo. La **Fase 1**
> implementa solo el núcleo de identidad/seguridad (`companies`, `users`,
> `roles`, `permissions`, `audit_logs`). El resto se agrega en sus fases.

## 1. Identidad, seguridad y multi-tenant

### `companies`
Empresa/tenant. `id`, `rut`, `razon_social`, `nombre_comercial`, `giro`,
`direccion`, `estado`, timestamps.

### `warehouses`
Bodegas por empresa. `id`, `company_id`→companies, `nombre`, `tipo`, `direccion`,
`estado`. Una empresa tiene N bodegas.

### `warehouse_locations`
Ubicaciones dentro de una bodega (cámara refrigerada, secos, congelados, zona
despacho, rack/pasillo/posición). `id`, `warehouse_id`, `codigo`, `tipo`,
`descripcion`. Habilita WMS por ubicación.

### `users`
`id`, `company_id`, `nombre`, `email` (único por empresa), `password_hash`
(Argon2), `estado`, `two_factor_secret` (nullable), `two_factor_enabled`,
`last_login_at`, timestamps.

### `roles`
`id`, `company_id` (nullable para roles de sistema), `nombre` (ADMINISTRADOR,
GERENTE, JEFE_OPERACIONES, ENCARGADO_COMPRAS, BODEGUERO, PICKER, DESPACHADOR,
CONDUCTOR, ADMINISTRACION), `descripcion`.

### `permissions`
Permisos granulares tipo `recurso:accion` (p. ej. `sales_order:create`,
`inventory_movement:read`, `purchase_order:approve`).

### Tablas puente
- `user_roles` (user_id, role_id)
- `role_permissions` (role_id, permission_id)
- `user_warehouses` (user_id, warehouse_id) — a qué bodegas accede un usuario.

### `audit_logs`  🔒 append-only
`id`, `company_id`, `user_id`, `action`, `entity_type`, `entity_id`,
`state_before` (jsonb), `state_after` (jsonb), `related_document`, `ip_address`,
`location` (geography, nullable), `notes`, `created_at`.
**Sin UPDATE/DELETE.** Índices por (`entity_type`,`entity_id`) y (`user_id`,`created_at`).

## 2. CRM

### `customers`
`id`, `company_id`, `rut`, `razon_social`, `nombre_comercial`, `tipo_cliente`,
`lista_precio_id`→price_lists, `condicion_pago`, `credito_habilitado`,
`limite_credito` (Decimal), `vendedor_id`→users, `estado`, timestamps.

### `customer_addresses`
`id`, `customer_id`, `alias` (matriz/sucursal), `direccion`, `comuna`, `region`,
`geo` (geography point), `horario_recepcion`, `dias_pedido`, `dias_despacho`,
`es_principal`.

### `customer_contacts`
`id`, `customer_id`, `nombre`, `cargo`, `telefono`, `email`, `es_principal`.

> Indicadores (frecuencia, ticket promedio, rentabilidad) se **calculan** desde
> pedidos/facturas — no se almacenan duplicados; se materializan en vistas o BI.

## 3. Productos y precios

### `categories`
`id`, `company_id`, `nombre`, `parent_id` (nullable → subcategorías).

### `products`
`id`, `company_id`, `sku` (único por empresa), `codigo_interno`, `codigo_barras`,
`nombre`, `category_id`, `marca`, `unidad_base` (enum: UN, KG, G, CAJA, SACO,
MALLA, BANDEJA, L, OTRO), `peso`, `volumen`, `iva_afecto` (bool),
`stock_minimo`, `stock_maximo`, `punto_reposicion`, `proveedor_principal_id`,
`maneja_lote` (bool), `maneja_vencimiento` (bool), `estado`.

### `product_suppliers`
Proveedores alternativos + código de proveedor: `product_id`, `supplier_id`,
`codigo_proveedor`, `precio_ref`, `es_principal`.

### `price_lists` / `product_prices`
`price_lists`: `id`, `company_id`, `nombre`, `moneda`, `vigencia`.
`product_prices`: `id`, `price_list_id`, `product_id`, `precio_venta`,
`vigente_desde`, `vigente_hasta`. Precio de compra se registra en recepciones y
OC (histórico real), no como campo único mutable.

## 4. Proveedores y compras

### `suppliers`
`id`, `company_id`, `rut`, `razon_social`, `contacto`, `telefono`, `email`,
`condicion_pago`, `estado`.

### `purchase_requests` (solicitud/necesidad de compra)
`id`, `company_id`, `origen` (AUTO_STOCK | MANUAL), `product_id`, `cantidad`,
`sales_order_id` (nullable, si nació de un pedido), `estado` (PENDIENTE,
COTIZANDO, APROBADA, ORDENADA, RECHAZADA), `solicitado_por`, timestamps.

### `purchase_orders` / `purchase_order_items`
OC: `id`, `company_id`, `numero` (OC-AAAA-######), `supplier_id`, `estado`
(BORRADOR, APROBADA, ENVIADA, RECIBIDA_PARCIAL, RECIBIDA, CANCELADA),
`aprobada_por`, `total`. Ítems: `purchase_order_id`, `product_id`, `cantidad`,
`precio_unitario`, `cantidad_recibida`.

### `goods_receipts` (recepción)
`id`, `purchase_order_id`, `warehouse_id`, `recibido_por`, `fecha`, `estado`,
`observaciones`. Detalle liga a ítems de OC + genera `inventory_movements` de
tipo RECEPCION y actualiza stock.

## 5. Ventas / pedidos

### `sales_orders`
`id`, `company_id`, `numero` (PED-AAAA-######), `customer_id`,
`customer_address_id`, `vendedor_id`, `estado` (ver máquina de estados abajo),
`fecha_pedido`, `fecha_despacho_programada`, `total`, `notas`, timestamps.

### `sales_order_items`
`id`, `sales_order_id`, `product_id`, `cantidad`, `unidad`, `precio_unitario`,
`cantidad_confirmada`, `estado_stock` (DISPONIBLE 🟢 | INSUFICIENTE 🟡 | SIN_STOCK 🔴).

**Máquina de estados del pedido** (sección 9 del prompt):

```text
RECIBIDO → VALIDANDO_STOCK → CONFIRMADO ┬─────────────► EN_PICKING → PREPARADO
                                        └► ESPERANDO_COMPRA ─►(recepción)─┘
PREPARADO → EN_DESPACHO → EN_RUTA → ENTREGADO
Estados transversales: PICKING_INCOMPLETO, INCIDENCIA, CANCELADO
```
Transiciones válidas se validan en el servicio; cada cambio → `audit_logs`.

## 6. Inventario (WMS)

### `inventory`  (stock por producto + ubicación + lote)
`id`, `company_id`, `warehouse_id`, `location_id` (nullable), `product_id`,
`lote` (nullable), `fecha_vencimiento` (nullable),
`cantidad_fisica`, `cantidad_reservada`, `cantidad_bloqueada`.
**Stock disponible = física − reservada − bloqueada** (calculado, no almacenado).

Únicos: (`warehouse_id`,`location_id`,`product_id`,`lote`).

### `inventory_movements`  🔒 append-only
`id`, `company_id`, `product_id`, `warehouse_id`, `location_id`, `lote`,
`tipo` (ENTRADA, SALIDA, TRANSFERENCIA, AJUSTE, MERMA, DEVOLUCION, RECEPCION,
DESPACHO), `cantidad` (con signo), `costo_unitario`, `referencia_tipo`,
`referencia_id` (documento origen), `usuario_id`, `created_at`.
Nunca se borra; correcciones = movimiento inverso. **Es la fuente de verdad del
stock**; `inventory.cantidad_fisica` es una proyección mantenida por transacción.

## 7. Mermas

### `waste`
`id`, `company_id`, `product_id`, `warehouse_id`, `cantidad`, `unidad`, `lote`,
`motivo` (VENCIMIENTO, DAÑO, MANIPULACION, DESCOMPOSICION, ERROR_PICKING,
DEVOLUCION, ROTURA, OTRO — **obligatorio**), `costo`, `usuario_id`,
`observacion`, `fecha`. Genera `inventory_movements` tipo MERMA.

## 8. Picking / Packing / Control de calidad

### `pickings` / `picking_items`
`pickings`: `id`, `sales_order_id`, `picker_id`, `estado` (ASIGNADO, EN_PROCESO,
INCOMPLETO, COMPLETADO), `inicio`, `fin`.
`picking_items`: `picking_id`, `sales_order_item_id`, `product_id`,
`cantidad_solicitada`, `cantidad_pickeada`, `faltante`, `sustitucion_product_id`
(nullable), `justificacion` (obligatoria si hay diferencia), `foto_url`.
Regla: no se cierra el picking con diferencias sin justificar.

### `packing`
Consolidación/embalaje: `id`, `sales_order_id`, `bultos`, `peso_total`,
`empacado_por`.

### `quality_checks`
`id`, `sales_order_id`, `resultado` (APROBADO, OBSERVADO, RECHAZADO),
`cantidad_ok`, `producto_ok`, `calidad_ok`, `temperatura`, `embalaje_ok`,
`etiquetado_ok`, `revisado_por`, `observaciones`.

## 9. Despacho / TMS / rutas

### `vehicles`
`id`, `company_id`, `patente`, `tipo`, `capacidad`, `refrigerado` (bool), `estado`.

### `drivers`
`id`, `company_id`, `user_id` (nullable), `nombre`, `licencia`, `telefono`, `estado`.

### `dispatches`
`id`, `company_id`, `numero`, `fecha`, `estado`, `despachado_por`. Agrupa pedidos
preparados para carga.

### `routes` / `route_stops`
`routes`: `id`, `company_id`, `numero`, `fecha`, `vehicle_id`, `driver_id`,
`hora_salida`, `hora_estimada`, `distancia_km`, `tiempo_estimado_min`, `estado`.
`route_stops`: `id`, `route_id`, `sales_order_id`, `orden`, `estado`
(PENDIENTE, LLEGADO, ENTREGADO, INCIDENCIA), `hora_estimada`, `hora_real`.

## 10. GPS y entregas

### `gps_positions`  📈 alto volumen (particionar por fecha)
`id`, `route_id`, `vehicle_id`, `driver_id`, `geo` (geography point),
`velocidad` (nullable), `estado_ruta`, `recorded_at`.
Índices por (`route_id`,`recorded_at`); política de retención + partición mensual.

### `deliveries` / `delivery_items` / `delivery_evidence`
`deliveries`: `id`, `sales_order_id`, `route_stop_id`, `estado` (ENTREGADO,
RECHAZADO_PARCIAL, RECHAZADO), `receptor_nombre`, `hora`, `geo`, `observacion`.
`delivery_items`: por producto entregado/rechazado, `cantidad`, `motivo_rechazo`.
`delivery_evidence`: `delivery_id`, `tipo` (FIRMA, FOTO), `url`, `geo`, `hora`.

## 11. Finanzas y facturación

### `cash_registers` / `cash_movements` (caja chica)
`cash_registers`: `id`, `company_id`, `responsable_id`, `saldo_inicial`,
`saldo_actual`, `estado` (ABIERTA, CERRADA), `abierta_at`, `cerrada_at`.
`cash_movements`: `id`, `cash_register_id`, `tipo` (INGRESO, EGRESO), `categoria`,
`monto`, `comprobante_url`, `aprobado_por`, `estado`, `descripcion`.
Cada movimiento actualiza `saldo_actual` en la misma transacción.

### `invoices` / `payments`
`invoices`: `id`, `company_id`, `customer_id`, `sales_order_id`, `tipo_dte`
(33 factura, 39 boleta, 61 NC, 56 ND), `folio`, `estado_sii`, `xml_url`,
`pdf_url`, `track_id`, `monto_neto`, `iva`, `monto_total`, `fecha_emision`,
`fecha_vencimiento`.
`payments`: `id`, `invoice_id`, `monto`, `medio`, `fecha`, `registrado_por`.

### `accounts_receivable` / `accounts_payable`
Vistas/tablas de saldos por cliente/proveedor con vencimientos y estado
(VIGENTE 🟢, POR_VENCER 🟠, VENCIDO 🔴).

## 12. Colaboración, documentos y workflow

- `incidents` — feedback operaciones↔compras y de entregas: `id`, `company_id`,
  `sales_order_id`, `product_id`, `departamento`, `prioridad` (BAJA, MEDIA, ALTA,
  CRITICA), `estado`, `creado_por`, `evidencia_url`.
- `comments` — hilo de conversación polimórfico (`entity_type`, `entity_id`).
- `documents` / `attachments` — archivos ligados a entidades (polimórfico).
- `tasks` — tareas asignables.
- `approvals` — workflow configurable (sección 41): `entity_type`, `entity_id`,
  `nivel`, `aprobador_id`, `estado`, `monto`, ligado a `approval_rules`
  (umbrales configurables por empresa).
- `notifications` — por usuario/rol: `tipo`, `payload` (jsonb), `leida_at`.

## 13. Índices y rendimiento (destacados)

| Tabla | Índices clave |
|-------|---------------|
| `inventory` | único (`warehouse_id`,`location_id`,`product_id`,`lote`); (`product_id`) |
| `inventory_movements` | (`product_id`,`created_at`); (`referencia_tipo`,`referencia_id`) |
| `sales_orders` | (`company_id`,`estado`); (`customer_id`); (`numero`) único |
| `audit_logs` | (`entity_type`,`entity_id`); (`user_id`,`created_at`) |
| `gps_positions` | (`route_id`,`recorded_at`); PostGIS GIST sobre `geo`; **partición mensual** |
| `products` | único (`company_id`,`sku`); (`codigo_barras`) |

## 14. Reglas de integridad de negocio (a nivel servicio + BD)

- FKs con `ON DELETE RESTRICT` en documentos de negocio (no borrado en cascada
  de historia).
- `CHECK` en cantidades ≥ 0 donde aplica; montos monetarios no negativos.
- Movimientos de inventario, caja y auditoría **sin endpoints de borrado**.
- Unicidad de folios/números de documento por empresa.

Ver la lista completa de reglas en `docs/05` (sección de reglas de negocio) y en
el prompt maestro §37.
