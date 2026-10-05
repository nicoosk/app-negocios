# Roadmap y contexto de sesiones

> **Fuente de verdad del roadmap.** Si el contexto de una sesión se pierde, leer este documento
> antes de continuar. Registrar aquí decisiones, fases completadas y lo que viene.

## Contexto de trabajo

- App Electron + React + TS (`negocio-app`), persistencia local SQLite (`better-sqlite3`).
- `better-sqlite3` está compilado para el ABI de Electron y **no carga en Node puro**. Tests:
  `ELECTRON_RUN_AS_NODE=1 ./node_modules/.bin/electron node_modules/vitest/vitest.mjs run`.
- Workflow git: rama `fase-N` → ff-merge a `dev` → PR manual `dev → main` → aprobación de
  `nicoosk`. Los PRs deben ser **autoría `nicoosk-bot`** (el ruleset exige que los commits estén
  atribuidos al autor del PR).
- Remote `origin` = `git@github-nicoosk-bot:nicoosk/app-negocios.git`.
- Identidad git del repo = `nicoosk-bot <nicoosk-bot@users.noreply.github.com>`.
- **El repo es público**: nunca commitear correos reales, hostnames ni rutas personales. Toda
  identidad va con direcciones `users.noreply.github.com`.
- Verificación de cada entrega: `pnpm typecheck`, `pnpm lint`, tests Electron-as-node y
  `npx electron-vite build`.

## Fases completadas

- **Fase 3** — Capa núcleo testeable (`src/main/nucleo/`), tipos compartidos (`src/shared/tipos.ts`),
  IPC separado y preload tipado. PR #35.
- **Fase 4 / 4.1** — Capa de datos e IPC de códigos de barra, `UNIDADES`, validación. PR #36.
- **Fase 5** — Escáner por celular: servidor HTTP(S) local, página móvil (ZBar + ZXing), QR de
  conexión, certificado autofirmado, productos pendientes. PR #37.
- **Pulido de repo** — Deduplicación de tipos/helpers, limpieza de deps y typos, `fios` → `fiados`,
  índices pendientes. Commit `5ccec3e`.

## Fase 6 — Dashboard analítico (Parte A) ✅

**Objetivo cumplido:** el dashboard pasó de 4 stat cards + 3 listas a un panel con **gráficos
interactivos** (Recharts) construidos sobre la data existente, con selector de período global.

### Insights y gráficos

| # | Insight | Gráfico | Fuente |
|---|---|---|---|
| 1 | Evolución de ventas y fiados (rango seleccionable) | Área + `Brush` | `ventas` + `fiados_detalle` |
| 2 | Ventas por hora | Barras | `ventas(hora, monto)` |
| 3 | Top productos (monto o unidades) | Barras horizontales | `ventas_detalle` + `fiados_detalle_items` |
| 4 | Mix de ventas por producto | Donut + leyenda | `ventas_detalle` + `fiados_detalle_items` |
| 5 | Dispersión monto × hora | Scatter (tamaño = ítems) | `ventas(id, hora, monto)` |
| 6 | Ventas por cajero | Barras | `ventas` + `usuarios` |
| 7 | Salud de fiados (recuperación) + top deudores | Barras + KPI + lista | `fiados_detalle` + `fiados` |

- Selector de período global: **Hoy / 7d / 30d / personalizado**.
- Interactividad: tooltips oscuros, `Brush` en la serie temporal, toggle monto/unidades y click que
  abre un modal de detalle (día, producto o venta). La tarjeta de deuda abre el `ModalDeudores` que
  ya existía.
- Tarjetas KPI reenfocadas a cruces útiles: ventas, ticket promedio, **ítems por venta**,
  **tasa de fiado**, deuda total (con nº de deudores) e inventario (con nº de productos), todas con
  **variación vs el período anterior** de igual duración.

### Arquitectura implementada

- `src/main/nucleo/estadisticas.ts` (nuevo): `crearEstadisticas(db)`, expuesto como
  `nucleo.estadisticas`; cubierto por `estadisticas.test.ts`.
- IPC único `estadisticas:panel(desde, hasta)` (protegido por sesión) que devuelve `PanelEstadisticas`
  con todas las series, y `window.api.estadisticas.panel` en preload.
- Migración **v4**: solo índices (`ventas(fecha)`, `ventas(id_usuario)`, `ventas_detalle(venta_id/
  producto_id)`, `fiados_detalle(fecha)`, `fiados_detalle_items(detalle_id)`).
- Renderer: componentes `Grafico*` en `src/renderer/src/dashboard/graficos/`, `PanelGrafico`,
  `SelectorPeriodo`, `ModalDetallePunto`, CSS Module oscuro compartido.

## Próximamente — Configuración y escalado (Parte B)

Decidido con el usuario: los **"locales" son sucursales/tiendas**. El objetivo final es
**multi-local con sincronización en la nube**, pero por ahora queda como *próximamente*
(la ruta `config` del Sidebar sigue deshabilitada). Roadmap propuesto: **umbrales → cajas →
locales → sync**.

### B1. Umbrales (thresholds)
- Tabla `configuracion(clave TEXT PRIMARY KEY, valor TEXT, actualizado_en TEXT)` + accessor tipado.
- Claves iniciales: `stock_bajo_umbral`, `fiado_limite_por_deudor`, `alerta_deuda_total`,
  `dias_sin_venta`, `ticket_alto`.
- Se consumen en Dashboard (alertas) y en el Panel de ventas (aviso de límite de fiado).
- UI: `PanelConfig.tsx` y habilitar la ruta `config`.

### B2. Cajas / turnos
- `cajas(id, nombre, local_id, activo)` y
  `turnos_caja(id, caja_id, id_usuario_apertura, monto_apertura, fecha/hora_apertura,
  cierre_declarado, diferencia, estado)`.
- Agregar `caja_id`/`turno_id` a `ventas` (y `fiados_detalle`).
- Habilita ventas por caja, cierre con arqueo y el gráfico #7 por caja.

### B3. Locales (sucursales) y sync
- Tabla `locales(id, nombre, direccion, zona_horaria, moneda, activo)` y `local_id` en `ventas`,
  `fiados`, `productos`, `usuarios`, `cajas`.
- Escenarios evaluados:
  1. **Una PC por local** (datos independientes): etiquetas, sin red. Simple.
  2. **Varias cajas en LAN**: una PC hace de servidor; `better-sqlite3` es mono-proceso, requiere
     API HTTP/WS (se puede reutilizar el patrón del escáner).
  3. **Multi-local con sync en nube** (elegido a futuro): servidor + Postgres y sincronización;
     implica reescribir la capa de datos.

## Siguiente iteración — Bitácora de auditoría (ampliar `auditoria`, no crear `bitacora`)

> Corrección: la tabla **`auditoria` ya existe** (`esquema.ts`, `nucleo.ts`, con escritura desde la
> capa IPC y una pestaña de lectura en `PanelAdmin`). No hay que crear una tabla `bitacora`: sería
> un duplicado. Ver `docs/AUDITORIA-2026-10-04.md` para el detalle de lo que falta.

Lo que realmente le falta a `auditoria` para servir de bitácora:

- **Filtros** por usuario, acción, entidad y rango de fechas (`listar()` solo acepta `limit`).
- **Paginación** en lugar del tope fijo de 200 registros.
- **Exportación a CSV** y política de **retención** (la tabla hoy crece sin límite).
- **Antes/después**: hoy solo `fiado_editado` guarda el valor anterior; `venta_editada` y
  `producto_actualizado` no permiten reconstruir qué cambió.
- **Detalle de las líneas** de la venta (hoy solo `{monto, items: <cantidad>}`) y eventos de stock.
- **Índice** en `auditoria(fecha)` y `auditoria(accion)`.
- Registrar también **rechazos de autorización** y los **eventos del escáner**.

## Archivos clave

- `src/main/nucleo/nucleo.ts`, `src/main/nucleo/esquema.ts`, `src/main/nucleo/estadisticas.ts`.
- `src/main/ipc/index.ts`, `src/preload/api.ts`, `src/shared/tipos.ts`.
- `src/renderer/src/dashboard/`, `src/renderer/src/admin/PanelAdmin.tsx`,
  `src/renderer/src/dashboard/Sidebar.tsx`.
- `README.md` (funcionalidades), `INSTRUCTIONS.md` (reglas para asistentes).
