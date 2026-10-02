# negocio-app

An Electron application with React and TypeScript

> ⚠️ **Rama estacionada.** Esta rama (`wip/codigos-de-barra`) guarda un trabajo **incompleto** a
> propósito. No la merges como está: lee la sección
> [Cambio pendiente: códigos de barra](#cambio-pendiente-códigos-de-barra) más abajo antes de
> tocar nada.

## Cambio pendiente: códigos de barra

**Estado: a medio implementar.** La capa de datos y el canal IPC están completos, pero
**no hay nada en la interfaz que los use**. Ninguna de las funciones nuevas se invoca desde el
renderer: el código compila, pasa lint y pasa typecheck, pero la funcionalidad es inaccesible
para el usuario.

### Ya implementado (en esta rama)

- `productos.es_nuevo`, agregado por el bloque de migraciones de `src/main/db.ts`.
- `crearProducto` acepta el flag `es_nuevo`.
- `src/main/db.ts`: `buscarPorCodigoBarra`, `contarProductosNuevos`, `resolverProductoNuevo`.
- `src/main/index.ts` + `src/preload`: canales `productos:buscarPorCodigoBarra`,
  `productos:contarNuevos`, `productos:resolverNuevo`, con sus tipados.

### Falta implementar

- Integración con el escáner en `TabVentas`: captura del evento de teclado del lector de códigos
  y llamada a `buscarPorCodigoBarra`.
- UI para resolver un producto desconocido (precio + stock) vía `resolverNuevo`.
- Badge con `contarProductosNuevos` en el panel de Inventario o en el Sidebar.
- Habilitar el campo de código de barra del formulario de `PanelInventario`, hoy deshabilitado
  con el badge "No soportado".

### Defectos conocidos que hay que corregir al retomarlo

1. `buscarPorCodigoBarra` crea automáticamente un producto con `nombre: ''`, `precio_venta: 0` y
   `unidad: ''`. Cada código escaneado desconocido deja una fila basura en el inventario de forma
   permanente.
2. Se llama recursivamente a sí misma para releer el producto recién creado.
3. `es_nuevo` no está en el `CREATE TABLE productos`, así que toda base nueva depende de que el
   bloque de migraciones corra bien.
4. Busca el código también contra `productos.nombre`, lo que puede matchear un producto con otro
   código en el campo de nombre.

### Nota de integración

Esta rama quedó estacionada antes de la Fase 1 del plan de refactor, que modifica
`src/main/db.ts`, `src/main/index.ts`, `src/preload/index.ts` y `src/preload/index.d.ts`: los
cuatro archivos que esta rama también toca. **El merge va a tener conflictos en todos ellos.**

Recomendación: usar esta rama como referencia, y re-derivar la función sobre la capa
`nucleo/` que introduce la Fase 2, en vez de hacer merge a ciegas. El punto 1 de los defectos
conocidos de todas formas habría que reescribirlo.

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
