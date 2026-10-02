# negocio-app

An Electron application with React and TypeScript

## Estado del proyecto

### Cambio pendiente: códigos de barra

**La lectura de códigos de barras NO está implementada en la app.** No hay forma de escanear un
producto: el formulario de producto tiene el campo de código de barras deshabilitado con el badge
"No soportado", y el flujo de venta solo permite buscar por nombre.

Existe un trabajo parcial estacionado en la rama `wip/codigos-de-barra` con la capa de datos
(`es_nuevo`, `buscarPorCodigoBarra`, `contarProductosNuevos`, `resolverProductoNuevo`) y sus tres
canales IPC. **No se debe mergear tal cual**: ninguna de esas funciones se usa desde el renderer, y
tiene defectos conocidos (el más grave: al escanear un código desconocido crea un producto con
nombre vacío y precio 0, ensuciando el inventario de forma permanente).

El detalle completo de qué falta y qué corregir está en el
[README de la rama `wip/codigos-de-barra`](https://github.com/nicoosk/app-negocios/blob/wip/codigos-de-barra/README.md).

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

### Build

```bash
# For windows
$ pnpm build:win

# For macOS
$ pnpm build:mac

# For Linux
$ pnpm build:linux
```
