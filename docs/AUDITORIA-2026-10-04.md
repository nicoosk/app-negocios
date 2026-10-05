# Auditoría de seguridad y calidad — 2026-10-04

> Resumen del informe externo (revisión estática, 7 páginas) verificado **contra el código** el
> 2026-10-04 en `dev`. Cada punto fue confirmado o refutado leyendo el repo; donde el informe se
> equivocó, se deja la corrección. El PDF original **no** se versiona.
>
> Estado: **Lote 0 y Lote 1 implementados**. Lo demás queda planificado abajo.

## Veredicto ejecutivo

La base de seguridad de Electron es correcta (`sandbox`, `contextIsolation`, autorización en el
proceso main, consultas parametrizadas). Los riesgos reales están en tres puntos concretos: el
certificado del escáner es una autoridad certificadora, el login es débil y el proceso main confía
en los montos que envía la interfaz.

## Lote 0 — Privacidad (repo público)

| Hallazgo | Verificación | Estado |
|---|---|---|
| `docs/ROADMAP.md` publicaba un correo personal y el alias SSH del remote | Confirmado | ✅ Saneado |
| 99 commits con email real y 2 con el hostname de la máquina de desarrollo | Confirmado | ✅ Reescrito con `git filter-repo` (los hashes cambiaron) |

Regla vigente: toda identidad git usa direcciones `users.noreply.github.com`. El respaldo previo a
la reescritura quedó en `negocio-app-respaldo-20261004.bundle` (fuera del repo).

## Lote 1 — Seguridad de prioridad alta

### 1. El certificado del escáner es una CA — ✅ resuelto

`src/main/scanner/certificado.ts` generaba el certificado con `cA: true`, `keyCertSign: true` y 3650
días de vigencia, y `pagina.ts` invitaba a instalarlo en el celular. La llave privada queda en
`scanner-tls.json` (permiso `0600`, sin cifrar: el informe exagera al decir "expuesto a cualquier
usuario local").

- Ahora: `cA: false`, sin `keyCertSign`, vigencia de 825 días (el máximo que aceptan iOS y Safari).
- Si el archivo contiene el certificado viejo, se regenera aunque exista.
- El modal del escáner avisa que hay que desinstalar el certificado anterior del celular.

### 2. Login débil — ✅ resuelto

PIN en texto plano (`esquema.ts`), comparado en SQL (`nucleo.ts`), admin/1234 de fábrica y login sin
límite de intentos. **El informe no detectó lo más grave: no existía ninguna ruta en la app para
cambiar un PIN** (solo dos `INSERT`, ningún `UPDATE usuarios SET pin`).

- Ahora: `pin_hash` con **scrypt** (`node:crypto`, sin dependencia nueva), comparación con
  `timingSafeEqual`, upgrade transparente del PIN plano en el primer login exitoso y
  `debe_cambiar_pin` para el admin de fábrica, con pantalla de cambio obligatorio.
- Límite de intentos: 5 fallos por usuario → bloqueo de 60 s (contador en memoria).
- El admin puede resetear el PIN de un cajero: genera uno aleatorio, lo muestra una sola vez, marca
  `debe_cambiar_pin` y lo audita.

### 3. El main confía en los montos del renderer — ✅ resuelto

`validacion.ts` solo validaba productos (3 de 38 handlers). Confirmado: cantidad negativa **sumaba**
stock (`nucleo.ts:166`), abono negativo **aumentaba** la deuda (`nucleo.ts:345`), `admin:fiados:*`
tomaban monto y `fiado_id` de la interfaz (`:379-420`) y el total de venta nunca se contrastaba con
`Σ subtotales`.

- Ahora: los montos se calculan en el main. Invariante `monto = Σ subtotales − descuento`
  (columna nueva `ventas.descuento`).
- El admin **sigue pudiendo corregir el total**: el main deriva el descuento, marca
  `ventas.ajuste_admin = 1`, audita `{monto_anterior, monto_nuevo, descuento}` y las listas de ventas
  muestran un badge **"Ajuste de admin"** para todos los usuarios.
- Validación de líneas (cantidad entera > 0, `subtotal == precio × cantidad`), abonos positivos y
  acotados a la deuda, y `admin:fiados:*` leen los montos desde la base.

### 4. Con un solo admin no se podía borrar a nadie — ✅ resuelto

`usuarios:eliminar` comparaba `contarAdmins() <= 1` sin mirar si el objetivo era admin, así que con
el admin de fábrica no se podía borrar ni a un cajero. Ahora solo se bloquea cuando el objetivo **es**
un admin y es el último.

## Pendientes (fuera del alcance acordado)

### Lote 2 — Exposición del escáner

- El servidor arranca solo al abrir la app, **antes del login**, y escucha en `0.0.0.0:8787`
  (`main/index.ts:61`, `scanner/servidor.ts:187`). `auth:logout` no lo detiene.
- Los canales `scanner:estado|iniciar|detener` no exigen sesión. `iniciar` y `detener` están **muertos**:
  nadie los invoca desde el renderer.
- `GET /` sirve la página sin token; sin límite de clientes SSE ni de peticiones a `/scan`; sin
  validación de `Origin`/`Host`.
- `leerCuerpo` (`servidor.ts:95`): al cortar por tamaño, la promesa nunca resuelve ni rechaza.
- Plan: arrancar el escáner recién después del login, exigir sesión en los tres canales, escuchar
  solo en la IP de la LAN, topes de clientes y peticiones, y `reject` al cortar el cuerpo.

### Lote 2 — Bugs de datos

| Bug | Ubicación |
|---|---|
| Borrar una venta o un fiado no repone el stock descontado | `nucleo.ts:226`, `:394` |
| Convertir venta ↔ fiado borra las líneas (desaparecen de "Top productos") y usa el `DEFAULT` de fecha, que en bases heredadas es **UTC** | `nucleo.ts:239`, `:411` |
| Editar venta cambia el total sin tocar el detalle (ya se mitigó con `ajuste_admin`) | `nucleo.ts:222` |
| Deudores identificados por nombre exacto: "Juan" y "juan" son dos deudores | `esquema.ts:22` |

> Ojo: `nucleo.test.ts` tiene un test que **codifica** el borrado de líneas al convertir
> ("convertirAVenta no deja items huérfanos"). Hay que cambiar ese test, no solo el código.

### Lote 3 — Calidad, CI/CD y documentación

- `abrirUrl` llama `shell` directamente desde el preload (`preload/api.ts:1,149`); con `sandbox: true`
  `shell` no existe, así que el botón "Ver descarga" de macOS y el enlace de versión del login
  deberían fallar. Confirmar en un build empaquetado y pasar la llamada por IPC con allowlist `https:`.
- `.github/workflows/release.yml`: no corre tests ni typecheck, acepta cualquier tag `v*` aunque no
  esté en `main`, y la plantilla tiene viñetas vacías que **se publican y se muestran dentro de la
  app**. Las actions están fijadas por tag y no por SHA, con `contents: write` global.
- `sync-dev.yml` hace `rebase` + `force-with-lease` sobre `dev` (corregido: es `--force-with-lease`,
  la variante segura, pero sigue reescribiendo la rama).
- `.npmrc`: `only-built-dependencies[]` es configuración muerta en pnpm 11, y `shamefully-hoist` sí
  es necesario (hay imports `?raw` a `node_modules` desde `scanner/index.ts`).
- `pnpm test` no funciona tal cual (documentado): el comando correcto es el de Electron-as-node.
- README desactualizado (dashboard anterior a la Fase 6, credenciales de fábrica, puerto 8787, dónde
  se guardan los datos, que el escáner arranca solo). No hay `LICENSE`.
- Cambiar el `name` del paquete mueve la carpeta de datos: hay dos `negocio.db` en esta máquina
  (`negocio-app` y `mi-negocio-digital`). No documentado.
- Versión `0.1.0-alpha` en `package.json` contra el tag `v1.2.0` (las releases lo corrigen; los
  builds locales salen mal).
- Restos de plantilla: `<title>Electron</title>`, `setAppUserModelId('com.electron')` vs `appId`,
  `electron.svg` sin usar, y `generarPagina(token)` recibe un parámetro que no usa.
- El dashboard **corta en silencio** los rangos de más de 400 días: el truncamiento conserva los días
  más antiguos, así que el gráfico no coincide con los KPIs. `dispersion` también tiene `LIMIT 400`
  fijo.
- `fiados:buscar` ignora su parámetro `query` y `fiados.total()` devuelve un conteo de deudores.
- La migración v1 tiene lógica fija que borra al usuario "Prueba" con PIN 0000.

### Lote 4 — Bitácora de auditoría

Ver la sección correspondiente del ROADMAP: `auditoria` **ya existe** con UI; lo que falta son
filtros, paginación, export CSV, valores anteriores, detalle de líneas e índices.

## Descartado por ahora

Firma de código para macOS/Windows (requiere Apple Developer), cifrado de la base y el sync
multi-local.