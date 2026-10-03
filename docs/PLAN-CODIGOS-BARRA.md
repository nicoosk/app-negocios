# Plan: Códigos de barra (Fase 4.1 + Fase 5)

> Este archivo es la fuente de verdad del trabajo de códigos de barra.
> Si el contexto de la sesión se pierde, leer este documento antes de continuar.

## Contexto

Aplicación Electron + React + TS (`negocio-app`). Tras la Fase 3 (capa `nucleo`
testeable, tipos compartidos, IPC separado) se implementó la Fase 4: **capa de
datos + IPC + tests** de códigos de barra (rama `fase-4-codigos-barra`, PR #36,
ya mergeada en `main`). La UI todavía no los usa.

Entorno a recordar:
- `better-sqlite3` está compilado para el ABI de Electron y **no carga en Node puro**.
  Los tests se corren con:
  `ELECTRON_RUN_AS_NODE=1 ./node_modules/.bin/electron node_modules/vitest/vitest.mjs run`
- Workflow git: rama `fase-N` → ff-merge a `dev` → PR manual `dev → main` → aprobación
  de `nicoosk`. Los PRs deben ser **autoría `nicoosk-bot`** (nicoosk no puede
  auto-aprobar su propio PR y el ruleset exige que los commits estén atribuidos al
  autor del PR).
- Remote `origin` = `git@github-nicoosk-bot:nicoosk/app-negocios.git`.
- Identidad git local del repo = `nicoosk-bot <(cuenta noreply del bot)>`.

## Decisiones tomadas con el usuario

1. **Captura del escáner**: servidor HTTP local en el proceso main que sirve una
   página web al **celular**; el celular escanea con la cámara y envía el código al
   servidor. No se usan lectores físicos.
2. **Página del celular**: `html5-qrcode` (universal, funciona en Android e iPhone).
   Verificar que soporte **códigos de barra 1D** (EAN/UPC/CODE_128), no solo QR.
3. **QR de conexión**: dependencia `qrcode` para mostrar un QR en pantalla que abre
   la URL en el celular sin tipear.
4. **Escucha del evento**: **global** en `AppShell`, con router según la pantalla
   activa (Ventas ahora; Inventario también).
5. **Regla `es_nuevo`**: un producto deja de ser "nuevo" cuando queda con
   `precio_venta > 0`. El formulario exige nombre, precio y stock (obligatorios),
   con tooltip guía. Stock 0 es válido, por eso el disparador en DB es el precio.
6. Cualquier usuario logueado puede resolver productos pendientes.

## Fase 4.1 — Endurecer la capa de datos (nueva rama, PR nuevo)

PR #36 ya está mergeada; los fixes van en una rama nueva.

Cambios:
- `src/main/nucleo/nucleo.ts`
  - `actualizarProducto`: limpiar `es_nuevo` cuando el precio entrante sea `> 0`.
  - `buscarProductosPorNombre`: agregar `AND es_nuevo = 0` (los pendientes no se
    venden por nombre; siguen visibles en `listar` para inventario).
- `src/shared/`: exportar `UNIDADES` (lista de unidades) para compartir main/renderer.
- `src/main/ipc/index.ts`: validar `productos:resolverNuevo` (nombre `trim`
  obligatorio, `precio_venta > 0`, `stock >= 0`, `unidad` en `UNIDADES`).
- `src/main/nucleo/nucleo.test.ts`: tests nuevos.

## Fase 5 — Escáner por celular

### Backend (proceso main)
- Deps: `qrcode` (+ `@types/qrcode`) y `html5-qrcode` embebido en la página con
  import `?raw`/asset para que funcione empaquetado (sin CDN).
- `src/main/scanner/red.ts`: `obtenerIpLan()` usando `os.networkInterfaces()`.
- `src/main/scanner/servidor.ts`: `crearServidorEscanner({ onCodigo })` con
  `iniciar()`, `detener()`, `estado()`. HTTP nativo de Node, bind `0.0.0.0`,
  puerto `8787` con fallback a libre, token aleatorio validado.
  Rutas: `GET /` (página móvil), `POST /scan` (recibe `{ codigo }`),
  `GET /estado`.
- `src/main/scanner/index.ts`: wiring; arranca en `app.whenReady`, detiene en
  `before-quit`, y reenvía el código a la ventana con
  `webContents.send('scanner:codigo', codigo)`.
- IPC `scanner:estado|iniciar|detener` + evento `scanner:codigo`.
- `src/preload/api.ts`: `window.api.scanner = { estado, iniciar, detener, onCodigo }`.

### Frontend (renderer)
- `src/renderer/src/escaner/ModalEscaner.tsx`: URL LAN + QR + estado
  (esperando/conectado) + aviso de permiso de red de macOS.
- Contexto/hook global en `AppShell`: suscribe `onCodigo` una vez y enruta según
  `paginaActiva`.
- `ModalResolverProducto.tsx`: nombre, precio, stock, unidad obligatorios +
  tooltip guía; llama `resolverNuevo`.
- `TabVentas`: botón de escáner; al recibir código `escanear` → existente al
  carrito; pendiente (`es_nuevo === 1`) → resolver → carrito.
- `PanelInventario`: badge "Pendiente", contador `N pendientes`, filtro, habilitar
  campo código (quitar "No soportado"), acción resolver.
- `Sidebar`: badge numérico con `contarNuevos()`.

### Tests Fase 5
- `src/main/scanner/servidor.test.ts`: token inválido no emite; `POST /scan`
  válido emite; `GET /` responde HTML. Servidor en puerto `0`.

### Precauciones
- Aislación de clientes en la Wi-Fi puede impedir celular↔PC.
- macOS pide permiso de conexiones entrantes.
- El puerto fijo puede estar ocupado (fallback a libre).

## Verificación
- `pnpm typecheck`, `pnpm lint`, tests con Electron-as-node, `npx electron-vite build`.
- Smoke manual: `pnpm dev`, abrir modal escáner, abrir URL en celular, escanear,
  verificar carrito/resolución.

## Estado
- [ ] Fase 4.1
- [ ] Fase 5 backend
- [ ] Fase 5 UI
- [ ] Docs
- [ ] PR final dev → main
