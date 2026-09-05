# 05 — Auditoría de la especificación (PROMPT MAESTRO)

Revisión del PROMPT MAESTRO buscando **vacíos, inconsistencias y riesgos** antes
de construir. Formato (§59): **Problema · Impacto · Prioridad · Solución
propuesta.** Prioridad: 🔴 alta · 🟠 media · 🟡 baja.

Hallazgos marcados con ⚠️ **requieren una decisión del cliente**.

---

## A. Riesgos regulatorios y de negocio

### A1 — Facturación electrónica SII: alcance y responsabilidad ⚠️ 🔴
**Problema:** el §26 pide facturas, boletas, NC, ND, folios, XML, acuse, pero no
define si AGROGOOD emitirá directamente ante el SII (requiere certificado
digital, CAF/folios, timbre electrónico y **certificación formal**) o vía
proveedor autorizado. La emisión directa es un proyecto en sí mismo.
**Impacto:** subestimar esto puede frenar la Fase 6 semanas y generar
incumplimiento tributario.
**Prioridad:** 🔴
**Solución:** adoptar ADR-007 (proveedor autorizado detrás de `InvoicingService`).
**Decisión requerida:** elegir proveedor y confirmar volumen de documentos. No
se implementará integración real hasta revisar su documentación vigente.

### A2 — Manejo de IVA y redondeo CLP no especificado 🟠
**Problema:** el §8 lista "IVA" y "margen" pero no define reglas de cálculo,
exentos, ni redondeo (CLP sin decimales).
**Impacto:** diferencias de centavos en documentos tributarios = rechazos SII y
descuadres.
**Prioridad:** 🟠
**Solución:** definir `iva_afecto` por producto, tasa configurable (hoy 19 %),
cálculo con `Decimal` y redondeo a peso en el total del documento (ADR-008).

### A3 — Precio de compra como campo único vs. histórico 🟠
**Problema:** el §8 define "Precio compra" como un campo del producto, pero el
§12 pide "variaciones de precio" y evolución. Un campo único mutable pierde el
histórico.
**Impacto:** imposible analizar evolución de precios ni valorizar stock a costo
real.
**Prioridad:** 🟠
**Solución:** el costo real vive en recepciones/OC e `inventory_movements`; el
campo del producto es solo un precio de referencia. (Reflejado en doc 02.)

---

## B. Inconsistencias / ambigüedades funcionales

### B1 — "Stock comprometido" vs. "reservado" sin definición 🟠
**Problema:** §15 lista "reservado", "comprometido", "en tránsito", "bloqueado"
como estados distintos, pero no los define ni cómo transicionan.
**Impacto:** riesgo de doble descuento o de vender stock ya prometido.
**Prioridad:** 🟠
**Solución propuesta (a validar):** *reservado* = asignado a un pedido confirmado
en picking; *comprometido* = suma de pedidos confirmados aún no pickeados; *en
tránsito* = comprado, no recibido; *bloqueado* = calidad/vencimiento. Disponible
= física − reservada − bloqueada.

### B2 — Concurrencia en la reserva de stock (condición de carrera) 🔴
**Problema:** el §10 valida stock al ingresar un pedido, pero dos pedidos
simultáneos del mismo producto pueden ambos "ver" stock suficiente y sobrevender.
El prompt no menciona control de concurrencia.
**Impacto:** sobreventa, quiebres no detectados, faltantes en picking — justo lo
que el sistema debe evitar.
**Prioridad:** 🔴
**Solución:** reservar dentro de una transacción con bloqueo de fila
(`SELECT ... FOR UPDATE` sobre `inventory`) o actualización condicional atómica;
la disponibilidad se decide al **confirmar/reservar**, no solo al mostrar.

### B3 — Numeración de documentos concurrente 🟠
**Problema:** IDs como `PED-2026-000001` (§9) sugieren secuencia por año. Generar
el "siguiente número" bajo concurrencia puede duplicar folios.
**Impacto:** números repetidos = descuadre y problemas de auditoría/tributarios.
**Prioridad:** 🟠
**Solución:** secuencia atómica por (empresa, año, tipo) en BD; el `id` interno
es UUID y el "número" legible se asigna transaccionalmente.

### B4 — Sustituciones en picking sin regla de precio/aprobación 🟠
**Problema:** §17 permite "sustitución" de producto, pero no define si cambia el
precio, si requiere aprobación del cliente/vendedor, ni cómo impacta la factura.
**Impacto:** entregas y facturación incorrectas, reclamos.
**Prioridad:** 🟠
**Solución:** toda sustitución exige justificación (ya previsto) + regla
configurable: ¿autoriza vendedor? ¿mantiene precio original? A definir con negocio.

### B5 — Unicidad de RUT y de email por empresa 🟡
**Problema:** clientes/proveedores/usuarios usan RUT (§7, §36) pero no se define
si el RUT es único global o por empresa (un mismo RUT podría ser cliente y
proveedor).
**Impacto:** duplicados o bloqueos indebidos.
**Prioridad:** 🟡
**Solución:** unicidad **por empresa y por rol de contraparte**; un RUT puede
existir como cliente y como proveedor. Email de usuario único por empresa.

### B6 — Estados de pedido: transiciones no formalizadas 🟠
**Problema:** el §9 lista 12 estados pero no qué transiciones son válidas
(p. ej. ¿se puede pasar de INCIDENCIA a ENTREGADO?).
**Impacto:** estados inconsistentes, difícil de auditar.
**Prioridad:** 🟠
**Solución:** máquina de estados explícita validada en el servicio (definida en
doc 02 §5); transiciones inválidas se rechazan y se auditan.

---

## C. Riesgos técnicos

### C1 — GPS de alta frecuencia: volumen y batería 🔴
**Problema:** §21 pide GPS continuo minimizando batería. Guardar posiciones cada
pocos segundos por muchos vehículos crece rápido (millones de filas/mes).
**Impacto:** costo de almacenamiento, consultas lentas, drenaje de batería.
**Prioridad:** 🔴
**Solución:** frecuencia configurable, buffer offline con envío por lotes,
partición mensual de `gps_positions` + retención, e índice GIST PostGIS.
Procesar por colas (Fase 5).

### C2 — Offline-first: resolución de conflictos ⚠️ 🔴
**Problema:** §39 pide "offline first" para picking/entregas, pero no define qué
pasa si el mismo pedido se modifica offline en dos dispositivos, o si el estado
cambió en el servidor mientras el móvil estaba sin red.
**Impacto:** pérdida de datos o estados contradictorios (p. ej. entrega
confirmada offline sobre un pedido cancelado en servidor).
**Prioridad:** 🔴
**Solución:** modelo de sincronización con `updated_at`/versión, operaciones
idempotentes con id de cliente, y reglas de resolución (el servidor es la
autoridad; conflictos generan incidencia en vez de sobrescribir). **Decisión de
negocio:** ¿qué gana ante conflicto? Propuesta: servidor + revisión manual.

### C3 — Evidencia (fotos/firmas): almacenamiento y tamaño 🟠
**Problema:** picking, mermas, entregas y caja piden fotos/firmas, pero no se
define dónde se guardan ni límites de tamaño/compresión.
**Impacto:** BD inflada si se guardan binarios en tablas; costos y lentitud.
**Prioridad:** 🟠
**Solución:** archivos en object storage (S3/GCS) detrás de `FileStorageService`;
en BD solo la URL/metadatos. Compresión en el móvil antes de subir. ⚠️ elegir
proveedor de storage.

### C4 — Optimización de rutas: dependencia de servicio externo 🟠
**Problema:** §20 pide "optimizar ruta" — es un problema NP (VRP) que
normalmente se delega a un servicio (Google/Mapbox/OSRM).
**Impacto:** costo por request y acoplamiento; sin definirlo, la feature queda a
medias.
**Prioridad:** 🟠
**Solución:** `MapsService`/`RoutingService` desacoplado; empezar con
optimización simple (orden por cercanía) y conectar VRP externo después.
⚠️ elegir proveedor de mapas.

### C5 — Tiempo real ("en tiempo real", Control Tower, dashboard) 🟠
**Problema:** varios puntos (§27, §52) piden "tiempo real" sin definir si es
polling o push (WebSocket/SSE).
**Impacto:** expectativa de inmediatez no cumplida o sobrecarga por polling.
**Prioridad:** 🟠
**Solución:** WebSocket/SSE para GPS y alertas críticas; polling con caché para
KPIs agregados. Se introduce con colas en Fase 5/7.

---

## D. Seguridad y cumplimiento

### D1 — Datos personales (Ley 19.628 / 21.719 Chile) 🟠
**Problema:** se almacenan RUT, contactos, direcciones, geolocalización de
personas (conductores). El prompt cubre seguridad técnica pero no protección de
datos personales.
**Impacto:** riesgo legal; la nueva ley chilena de datos personales endurece
obligaciones.
**Prioridad:** 🟠
**Solución:** minimización de datos, cifrado en reposo de campos sensibles,
política de retención (GPS, evidencia), y consentimiento para rastreo de
conductores. Revisar con asesoría legal antes de producción.

### D2 — Inmutabilidad real de auditoría 🟠
**Problema:** §30 exige que sea "imposible eliminar registros críticos de
auditoría desde la interfaz normal", pero un admin de BD igual podría.
**Impacto:** auditoría manipulable = pierde valor probatorio.
**Prioridad:** 🟠
**Solución:** sin endpoints de UPDATE/DELETE; en prod, revocar DELETE a nivel de
rol de BD de la app; opcional: encadenar hash de registros (tamper-evident).

### D3 — Permisos por bodega/sucursal, no solo por rol 🟡
**Problema:** el RBAC del §6 es por rol, pero multi-sucursal (§34) implica que un
bodeguero solo debe ver su bodega.
**Impacto:** fuga de datos entre sucursales.
**Prioridad:** 🟡
**Solución:** RBAC + alcance por `warehouse_id`/`company_id` (tabla
`user_warehouses`, ya prevista en doc 02).

---

## E. Vacíos menores / mejoras

- **E1 🟡** Devoluciones de cliente (RMA) no tienen flujo propio aunque se
  mencionan como motivo de merma/movimiento. Proponer módulo de devoluciones.
- **E2 🟡** No se define política de **backups/restore probado** más allá de
  "hacer backups" (§47). Definir RPO/RTO objetivo.
- **E3 🟡** No hay **internacionalización**; se asume es-CL. Confirmar si habrá
  otros idiomas/monedas (multi-empresa podría implicarlo).
- **E4 🟡** No se define **SLA de notificaciones** ni preferencias por usuario
  (evitar spam de alertas). Proponer configuración por usuario/rol.
- **E5 🟡** Importación Excel (§50) necesita definición de **plantillas y reglas
  de deduplicación** (¿match por SKU? ¿por RUT?).

---

## Resumen de decisiones bloqueantes que se consultarán al cliente

| # | Tema | Bloquea |
|---|------|---------|
| A1 | Proveedor de facturación SII | Fase 6 |
| C2 | Regla de resolución de conflictos offline | Fase 4/5 |
| C3 | Proveedor de almacenamiento de archivos | Fase 4/5 |
| C4 | Proveedor de mapas/ruteo | Fase 4/5 |
| B4 | Reglas de sustitución en picking | Fase 4 |

**Ninguna bloquea las Fases 1–3.** Se avanza y se consultan al llegar a su fase.
