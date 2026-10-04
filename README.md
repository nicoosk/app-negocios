# negocio-app

Una aplicación de escritorio (Electron + React + TypeScript) para gestionar las ventas, los
**fíos** (fiados/ créditos de clientes) y el inventario de un negocio de barrio.

## Funcionalidades

### Ventas
- Carrito de venta con búsqueda de productos por nombre y por **código de barra**.
- Precio editable por venta (sin modificar el precio base del producto) y soporte de
  **monto libre** para artículos sin producto asociado.
- Cada venta descuenta stock del producto y queda registrada con fecha, hora y usuario.
- Atajos de teclado/numérico pensados para uso intensivo en caja.

### Fiados
- Registro de deuda por **deudor** (se reutiliza el deudor existente si coincide el nombre).
- **Abonos** con historial de movimientos (los abonos se guardan con `monto` negativo).
- La deuda nunca baja de 0 y cada detalle conserva quién lo registró.

### Inventario
- Alta/edición/baja de productos con nombre, código de barra, precio, stock y unidad.
- **Productos pendientes**: al escanear un código desconocido se crea como pendiente
  (`es_nuevo = 1`) sin precio; deja de serlo al guardar un `precio_venta > 0`.
- Badge en el Sidebar y en Inventario con la cantidad de pendientes por completar.

### Escáner de códigos de barra por celular
- El modal **Conectar escáner** muestra un QR con la URL del servidor local. El celular
  (misma red Wi-Fi que el PC) abre la página, escanea y el código llega al PC en tiempo real.
- El servidor local se sirve por **HTTPS con certificado autofirmado** (generado y persistido en
  el PC) porque la cámara en vivo (`getUserMedia`) solo funciona en contexto seguro. La primera
  vez el celular avisa que la conexión no es segura: hay que aceptar el aviso ("Mostrar detalles"
  → "Visitar este sitio") o instalar el certificado desde el enlace de la propia página
  (`/certificado.crt`).
- La lectura de la foto usa **ZBar (WebAssembly)** como decodificador 1D principal (rápido y
  fiable con EAN/UPC/Code128) y **ZXing** como respaldo. También hay entrada manual de código.
- Al escanear, un producto existente va directo al carrito; uno pendiente abre el formulario de
  resolución antes de agregarlo.

### Administración
- Panel para **editar, eliminar y convertir** ventas y fíos históricos (venta ↔ fiado). Cada
  acción requiere un admin autorizado.
- **Auditoría** de acciones (login, ventas, fíos, productos, usuarios) con usuario, fecha y detalle.
- **Usuarios**: alta/baja con rol admin. Siempre debe quedar al menos un administrador y no se
  puede eliminar un usuario con actividad.

### Dashboard
- Resumen del día: ventas, fiado, deuda total y promedio vendido, más listas de últimas ventas,
  fíos y deudores con saldo.

### Actualizaciones
- Auto-actualización con `electron-updater` y banner de estado (disponible, descargando, listo).

## Arquitectura

- `src/main/`: proceso principal de Electron (ventana, IPC, base de datos).
  - `src/main/nucleo/`: lógica de negocio + SQLite (`nucleo.ts`, `esquema.ts`), testeable con
    `:memory:` (sin Electron ni rutas del sistema).
  - `src/main/ipc/`: handlers IPC (`index.ts`) y validación de entradas (`validacion.ts`).
  - `src/main/scanner/`: servidor local HTTPS + página móvil del escáner.
- `src/preload/`: puente seguro (`contextBridge`) expuesto al renderer como `window.api`.
- `src/renderer/src/`: UI en React con CSS Modules.
- `src/shared/`: tipos e constantes de dominio compartidos entre todas las capas.

La lectura de códigos de barra (datos, IPC y servidor HTTP/HTTPS) vive en el proceso main y está
cubierta por tests. El workflow de ramas y el estado del roadmap están en `docs/ROADMAP.md`.

## Recommended IDE Setup

- [VSCode](https://code.visualstudio.com/) + [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint) + [Prettier](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode)

## Project Setup

### Install

```bash
$ pnpm install
```

### Development

```bash
$ pnpm dev
```

### Tests

`better-sqlite3` está compilado para el ABI de Electron, así que los tests se ejecutan con Electron
en modo Node:

```bash
$ ELECTRON_RUN_AS_NODE=1 ./node_modules/.bin/electron node_modules/vitest/vitest.mjs run
```

### Build

```bash
# For windows
$ pnpm build:win

# For macOS
$ pnpm build:mac

# For Linux
$ pnpm build:linux
```
