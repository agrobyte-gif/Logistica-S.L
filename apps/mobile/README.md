# AGROGOOD — App móvil (Expo)

App operativa para **pickers** y **conductores** (sub-entrega 4B). Consume la
misma API que la web. Mobile-first, botones grandes, pocas acciones (prompt §39).

## Alcance actual

- **Login** (RUT empresa + correo + contraseña); el token se guarda en
  `expo-secure-store`.
- **Picker**: lista de pickings, pantalla de ejecución (iniciar, editar cada
  línea con cantidad/faltante/sustitución + justificación, cerrar). Aplica la
  regla §17: no cierra con diferencias sin justificar (validado en el backend).
- **Conductor (shell)**: "Mis rutas" y detalle de ruta con paradas ordenadas y
  direcciones. La **confirmación de entrega (firma/foto), rechazos y GPS** son
  de la **Fase 5**.
- **Fotos de evidencia**: diferidas (el campo existe en el modelo; falta definir
  el proveedor de almacenamiento).

## Requisitos

- Node ≥ 20, y la API AGROGOOD corriendo y accesible por red.
- App Expo Go en el teléfono, o un emulador Android / simulador iOS.

## Puesta en marcha

```bash
# 1. Instalar dependencias (desde la raíz del monorepo)
npm install

# 2. Configurar la URL de la API
#    Edita apps/mobile/app.json → expo.extra.apiBaseUrl
#    En dispositivo físico usa la IP LAN de la máquina que corre la API,
#    NO "localhost" (eso apunta al propio teléfono). Ejemplo:
#      "apiBaseUrl": "http://192.168.1.100:3000/api"

# 3. Arrancar el bundler
npm run start --workspace @agrogood/mobile
#    Luego escanea el QR con Expo Go, o pulsa "a" (Android) / "i" (iOS).
```

Usuarios demo (contraseña `Agrogood.2026`, RUT empresa `76123456-7`):
`picker@agrogood.cl` (picker), `conductor@agrogood.cl` (conductor).

## Notas técnicas

- **Autenticación**: el login guarda el `accessToken` en almacenamiento seguro.
  El *refresh* por cookie httpOnly del backend no se usa en móvil (React Native
  no gestiona cookies como el navegador); ante expiración del token la app pide
  volver a iniciar sesión. Un refresh móvil dedicado (token en cuerpo) es una
  mejora futura.
- **Tipos autocontenidos**: `src/types.ts` replica los enums mínimos del backend
  para evitar transpilar `@agrogood/shared` en Metro dentro del monorepo. Deben
  mantenerse en sincronía con el backend.
- **Offline-first** (§39): pendiente. Hoy la app requiere conexión; la cola de
  acciones offline es una mejora planificada.
- **Escaneo QR/código de barras** (§40): pendiente (requiere `expo-camera`).

## Verificación

Este código **no** se ha ejecutado en CI (requiere dispositivo/emulador).
Verifícalo con `npm run typecheck --workspace @agrogood/mobile` y luego
`expo start`.
