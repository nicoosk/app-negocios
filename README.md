# negocio-app

An Electron application with React and TypeScript

## Estado del proyecto

### Lectura de códigos de barra

La app incluye un escáner de códigos de barra por celular. Desde el Panel de ventas o el Inventario
se abre el modal **Conectar escáner**, que muestra un QR con la URL del servidor local. El celular
(misma red Wi-Fi que el PC) abre esa página, escanea el código y este llega al PC en tiempo real.

- El servidor local se sirve por **HTTPS con certificado autofirmado** (generado y persistido en el
  PC), porque la cámara en vivo (`getUserMedia`) solo funciona en contexto seguro. La primera vez el
  celular avisa que la conexión no es segura: hay que aceptar el aviso ("Mostrar detalles" → "Visitar
  este sitio") o instalar el certificado desde el enlace de la propia página (`/certificado.crt`).
- La lectura de la foto usa **ZBar (WebAssembly)** como decodificador 1D principal (rápido y fiable
  con EAN/UPC/Code128) y **ZXing** como respaldo. También hay entrada manual de código.
- Si el código no existe, se crea un producto **pendiente** (`es_nuevo = 1`) sin nombre ni precio.
  El badge del Sidebar y del Inventario muestra cuántos hay por completar.
- Al guardar un precio mayor a 0, el producto deja de ser pendiente y queda disponible para vender.

La capa de datos (`es_nuevo`, `escanear`, `resolverNuevo`, `contarNuevos`) y el servidor HTTP local
viven en el proceso main (`src/main/scanner/` y `src/main/nucleo/`) y están cubiertos por tests.

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
