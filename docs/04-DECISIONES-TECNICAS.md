# 04 — Decisiones técnicas (ADR)

Formato por decisión (según prompt §"INSTRUCCIÓN FINAL"): **qué se propone, por
qué, alternativas, ventajas, desventajas, impacto futuro.** Estado: ✅ adoptada,
🔵 propuesta (requiere confirmación del cliente).

---

## ADR-001 — Lenguaje único TypeScript en todo el stack ✅
**Qué:** TypeScript en backend, web y móvil.
**Por qué:** un solo lenguaje/tipado compartido (paquete `packages/shared`)
reduce duplicación de contratos entre API, web y móvil, y baja la curva del
equipo. El prompt exige código "tipado" (§43).
**Alternativas:** backend en Python/Django o Java/Spring; móvil nativo.
**Ventajas:** tipos compartidos, un solo pipeline, contratación más simple.
**Desventajas:** menos maduro que Java/.NET para algunos módulos financieros.
**Impacto futuro:** facilita mantener la "única fuente de verdad" de contratos.

## ADR-002 — Monolito modular (NestJS), no microservicios ✅
**Qué:** un backend NestJS con módulos de dominio bien aislados; **no**
microservicios al inicio.
**Por qué:** el prompt pide "no crear código monolítico innecesariamente" pero
también "no microservicios prematuros". Un monolito modular da fronteras claras,
transacciones ACID simples (críticas para stock/caja/auditoría) y despliegue
sencillo. Se puede extraer un servicio (p. ej. GPS) a futuro si el volumen lo
exige.
**Alternativas:** microservicios desde el día uno; monolito sin módulos.
**Ventajas:** transacciones atómicas cross-dominio, menor complejidad operativa,
evolución incremental.
**Desventajas:** escalado por componentes menos granular al inicio.
**Impacto futuro:** las fronteras de módulo permiten extraer servicios sin
reescribir.

## ADR-003 — PostgreSQL + PostGIS ✅
**Qué:** PostgreSQL como base relacional; PostGIS para GPS/geolocalización.
**Por qué:** el prompt exige BD relacional con FKs, índices y trazabilidad;
Postgres aporta transacciones robustas, `jsonb` para campos flexibles
(auditoría), particionamiento (GPS, auditoría) y PostGIS para consultas
geoespaciales (rutas, cercanía, mapas).
**Alternativas:** MySQL/MariaDB; SQL Server; Mongo (descartado: se necesita
integridad relacional).
**Ventajas:** madurez, geoespacial nativo, `jsonb`, costo cero de licencia.
**Desventajas:** operación/tuning requiere conocimiento.
**Impacto futuro:** soporta el crecimiento a millones de posiciones GPS y
auditoría con partición.

## ADR-004 — ORM Prisma ✅
**Qué:** Prisma para modelado, migraciones y acceso tipado.
**Por qué:** migraciones versionadas (entregable §57), tipos generados que se
comparten con el dominio, buena DX. Consultas parametrizadas → mitiga SQLi.
**Alternativas:** TypeORM (más integrado con NestJS pero migraciones frágiles),
Drizzle, SQL puro.
**Ventajas:** seguridad de tipos, migraciones claras, velocidad de desarrollo.
**Desventajas:** soporte PostGIS no es de primera clase → para geoespacial se
usan columnas `Unsupported("geography")` + SQL crudo puntual. Aceptable y
acotado al módulo GPS.
**Impacto futuro:** si el geoespacial crece mucho, evaluar Drizzle/SQL para ese
módulo sin afectar el resto.

## ADR-005 — Autenticación: JWT access + refresh rotatorio ✅
**Qué:** access token corto (15 min) + refresh token rotatorio en cookie
`HttpOnly/Secure/SameSite=Strict`; contraseñas con **Argon2id**; 2FA TOTP opcional.
**Por qué:** API stateless escalable; refresh en cookie reduce riesgo XSS de
robo de token; Argon2id es el estándar recomendado actual para contraseñas.
**Alternativas:** sesiones server-side (Redis); Auth0/Cognito (proveedor externo).
**Ventajas:** stateless, escalable, sin costo de proveedor.
**Desventajas:** revocación de tokens requiere lista/rotación (se implementa con
rotación + `jti`).
**Impacto futuro:** se puede migrar a un IdP externo si se requiere SSO
corporativo.

## ADR-006 — React + Vite (web) y Expo/React Native (móvil) ✅
**Qué:** SPA web con React+Vite+Tailwind; móvil con Expo.
**Por qué:** el prompt separa "desktop-first" (admin) y "mobile-first"
(operación). React comparte modelo mental con RN; Expo acelera cámara, GPS,
escáner y builds Android/iOS; offline-first con SQLite/WatermelonDB.
**Alternativas:** Flutter (otro lenguaje), PWA para móvil (limitaciones GPS en
background/escaneo).
**Ventajas:** reutilización de tipos y conocimiento, acceso nativo a
cámara/GPS/escáner, un ecosistema.
**Desventajas:** dos targets de UI que mantener; RN en background GPS requiere
config nativa.
**Impacto futuro:** base común TS facilita features compartidas.

## ADR-007 — Facturación electrónica SII vía proveedor autorizado 🔵
**Qué:** integrar DTE (33/39/61/56) a través de un **proveedor certificado**
(PSTC/OSA), detrás de la interfaz `InvoicingService`; **no** implementar la
comunicación directa con el SII al inicio.
**Por qué:** la emisión directa exige firma electrónica, gestión de folios (CAF),
timbre electrónico y certificación formal ante el SII — alto costo y riesgo. El
prompt es explícito: **"No inventar APIs. Verificar la documentación técnica
vigente antes de implementar."**
**Alternativas:** integración directa con el SII (mayor control, mucho más
esfuerzo y certificación).
**Ventajas:** menor time-to-market, cumplimiento delegado, menos superficie
regulatoria propia.
**Desventajas:** costo por documento del proveedor; acoplamiento a su API
(mitigado por la interfaz).
**Impacto futuro / ⚠️ requiere decisión del cliente:** elegir proveedor. **No se
implementará ninguna integración real hasta confirmar proveedor y revisar su
documentación vigente.** Ver doc 05 §Facturación.

## ADR-008 — Dinero como enteros/`Decimal`, nunca `float` ✅
**Qué:** montos en `Decimal(14,2)` (o enteros en centavos); cantidades en
`Decimal(14,3)`.
**Por qué:** los `float` introducen errores de redondeo inaceptables en dinero y
en cálculos de margen/costo (prioridad del prompt: trazabilidad y control).
**Impacto futuro:** cálculos de rentabilidad y cuadraturas de caja confiables.

## ADR-009 — Inventario como libro mayor append-only ✅
**Qué:** `inventory_movements` es la fuente de verdad; `inventory.cantidad_*` es
una proyección mantenida transaccionalmente. Correcciones = movimiento inverso,
nunca UPDATE/DELETE del historial.
**Por qué:** prompt §37 ("no permitir eliminar movimientos de inventario") y
principio de trazabilidad total.
**Impacto futuro:** auditoría de stock reconstruible en cualquier fecha
(valorización histórica, quiebres).

## ADR-010 — La ruta unifica el "despacho" (Fase 4) ✅
**Qué:** no existe una tabla `dispatches` separada; una **ruta** (`routes` +
`route_stops`) representa el despacho — un vehículo, un conductor y una carga
con paradas ordenadas. El "Centro de despacho" (§19) es la vista que agrupa
pedidos PREPARADOS y crea la ruta; "controlar salida" es la transición
`CARGANDO → EN_RUTA` (`routes/:id/depart`).
**Por qué:** despacho (§19) y rutas (§20) describen el mismo artefacto físico;
una entidad separada duplicaría datos (prompt §43: no duplicar) sin aportar.
**Alternativa:** tabla `dispatches` 1:N con `routes` (un despacho, varios
vehículos). Se puede introducir más adelante sin romper el modelo (la ruta ya
es la unidad atómica de carga).
**Impacto futuro:** si se requiere consolidar varias rutas bajo un mismo evento
de despacho, se agrega `dispatches` como agregador por encima de `routes`.

## ADR-011 — La salida física de stock ocurre al despachar ✅
**Qué:** el picking **no** mueve stock; al "controlar salida" de la ruta se
registra un movimiento `DESPACHO` (por lo confirmado en cada línea) vía el único
punto de mutación (`InventoryService.applyMovement`) y se libera la reserva.
**Por qué:** el stock físico deja la bodega cuando el camión sale, no antes; así
`cantidad_fisica` refleja la realidad y `applyMovement` impide despachar más de
lo disponible (§37: "no despachar pedido no preparado / sin stock").
**Limitación conocida:** la consistencia de `cantidad_reservada` depende del
camino del pedido (los que pasaron por `ESPERANDO_COMPRA` no reservaron en
Fase 2); la liberación usa `GREATEST(0, …)` para no quedar negativa. Se
endurecerá al revisar la reserva de pedidos re-confirmados.

---

## Decisiones que requieren confirmación del cliente (bloqueantes de fase)
1. **Proveedor de facturación SII** (ADR-007) — bloqueante de Fase 6.
2. **Proveedor de mapas/ruteo** (Google Maps vs. Mapbox/OSRM) — impacta costo y
   optimización de rutas (Fase 4/5).
3. **Almacenamiento de archivos/fotos** (S3, GCS, u on-premise) — Fase 4/5.
4. **Canal de WhatsApp** (API oficial vs. proveedor) — integración futura.

Estas no bloquean las Fases 1–3 y se dejan detrás de interfaces desacopladas.
