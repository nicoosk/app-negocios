# Plan de integración — Auditoría de seguridad y calidad (2026-10-04)

> Fuente de verdad de esta iteración. Si se pierde el contexto, leer esto antes de continuar.
> El usuario ya aprobó el alcance (Lote 0 + Lote 1) y todas las decisiones de diseño.

## Contexto

- Origen: informe de auditoría externo (PDF, 7 páginas) revisado contra el código el 2026-10-04.
  **Todos los hallazgos fueron verificados y confirmados** con 3 correcciones de detalle
  (abono clampeado en 0, force-push es `--force-with-lease`, entitlements están en
  `build/entitlements.mac.plist` y no en `electron-builder.yml`).
- Repo **público**: https://github.com/nicoosk/app-negocios
- Workflow: rama `fase-N` → ff-merge a `dev` → PR `dev → main`. Los commits van a `dev` y el
  PR #38 se actualiza solo (no abrir un PR nuevo a `main`).

## Decisiones tomadas por el usuario

| Tema | Decisión |
|---|---|
| Alcance | Solo **Lote 0 (privacidad)** + **Lote 1 (seguridad alta)**. Lotes 2-4 quedan para después. |
| Historial de git | **Reescribir con `git filter-repo`** (no solo sanear el archivo). |
| PIN | **Hash + cambio forzado + límite de intentos.** |
| Monto de venta | **Recalcularlo en el main** (no confiar en el renderer). |
| Descuento | Columna explícita + **el admin siempre puede editar el total**, y queda **registrado y con aviso visible para todos los usuarios**. |
| Reset de PIN | **Sí**, el admin puede resetearlo, con auditoría. |
| Certificado | Vigencia de **825 días** (máximo que aceptan iOS/Safari). |

## Lote 0 — Privacidad (urgente, el repo es público)

- [ ] **0.1** Respaldo: `git bundle create ../negocio-app-respaldo-<fecha>.bundle --all`.
- [ ] **0.2** Sanear `docs/ROADMAP.md:14-15`: quitar el correo personal y dejar la identidad en
      `nicoosk-bot@users.noreply.github.com`, con la regla explícita de no volver a commitear
      correos reales.
- [ ] **0.3** Volcar el informe a `docs/AUDITORIA-2026-10-04.md` (resumen + veredicto de cada
      hallazgo). El PDF original queda **fuera** del repo.
- [ ] **0.4** Instalar `git-filter-repo` (no está en el PATH: `pipx install git-filter-repo` o
      `python3 -m pip install --user git-filter-repo`). En macOS sin `pipx` se puede invocar con
      `python3 <site-packages>/git_filter_repo/git-filter-repo.py`.
- [ ] **0.5** Direcciones a sustituir en la historia (autor y committer, y también el tagger de los
      tags):
      - El email real del owner (79 commits) → `146401416+nicoosk@users.noreply.github.com`
      - El email con el **hostname de la máquina de desarrollo** (2 commits) → ese mismo noreply
      - El email real del bot (18 commits) → `nicoosk-bot@users.noreply.github.com`
      - `--replace-text` para limpiar el literal del correo dentro de los blobs (ROADMAP viejo).
      - **Ojo:** `git filter-repo --mailmap` **no** sirve aquí. Con dos entradas apuntando al mismo
        noreply invierte el mapeo y acaba escribiendo el hostname en 39 commits. Usar
        `--commit-callback` y `--tag-callback` comparando el email literal.
- [ ] **0.6** `git filter-repo` **reescribe 9 ramas y 8 tags** → force-push de todo
      (`git push --force origin <ramas>` + `git push --force --tags origin`). El bot tiene
      `push: true` pero no `admin`: alcanza para ramas y tags.
- [ ] **0.7** Verificar: `git log --all --format='%ae' | sort -u` solo devuelve noreply, y el
      PR #38 sigue abierto con el mismo diff (los hashes cambian, el contenido no).
- [ ] **0.8** `git config user.name/user.email` del repo en noreply.

**Impacto a avisar:** cambian todos los hashes; los commits citados en el PR #37 quedan
obsoletos y los tags `v1.0.0`–`v1.2.0` se reescriben (los assets de las releases se conservan).

## Lote 1 — Seguridad de prioridad alta

### 1.1 El certificado del escáner es una autoridad certificadora
`src/main/scanner/certificado.ts:34-38` genera el cert con `cA: true`, `keyCertSign: true` y 3650
días de vigencia; `pagina.ts:55` invita a instalarlo y la llave queda en `scanner-tls.json`
(`0600`, sin cifrar). Si un celular lo instala como confiable, ese archivo permite interceptar todo
el HTTPS del celular.

- [ ] `cA: false`, quitar `keyCertSign`, vigencia 825 días.
- [ ] Detectar el cert viejo (si tiene `cA: true`) y **regenerarlo** aunque el archivo exista.
- [ ] Aviso en `ModalEscaner`: si el certificado es anterior a esta versión, desinstalarlo del
      celular y volver a instalar el nuevo.
- [ ] Test: el certificado generado no tiene `basicConstraints` CA ni `keyCertSign`.

### 1.2 Con un solo admin no se puede borrar a nadie
`src/main/ipc/index.ts:154` compara `contarAdmins() <= 1` sin mirar si **el usuario a eliminar**
es admin. Con el bootstrap (`admin`/`1234`) queda un único admin → no se puede borrar ni un cajero.

- [ ] Bloquear solo si el objetivo **es** admin y es el último.
- [ ] Test en `nucleo.test.ts` o el test de IPC que corresponda.

### 1.3 El main confía en los montos del renderer
`validacion.ts` solo valida productos (3 de 38 handlers). Confirmado: cantidad negativa **suma**
stock (`nucleo.ts:166`), abono negativo **aumenta** la deuda (`nucleo.ts:345`), `admin:fiados:*`
toman monto y `fiado_id` de la interfaz (`nucleo.ts:379-420`) y el total de venta nunca se contrasta
con `Σ subtotales`.

- [ ] **Migración v5**: `ALTER TABLE ventas ADD COLUMN descuento INTEGER NOT NULL DEFAULT 0` y
      `ADD COLUMN ajuste_admin INTEGER NOT NULL DEFAULT 0`. Actualizar el `user_version` esperado en
      `nucleo.test.ts` (4 → 5).
- [ ] Invariante en el núcleo: `monto = Σ subtotales − descuento`, con `descuento >= 0`.
- [ ] `validacion.ts`: `validarMonto`, `validarLineas` (cantidad **entera > 0**,
      `subtotal == precio_unitario × cantidad`, `producto_id` número o null, nombre no vacío),
      `validarCredenciales`, `validarAbono` (monto > 0). Mismo patrón `string | null` y mismos
      tests en `validacion.test.ts`.
- [ ] `abonarFiado`: rechazar monto ≤ 0 y monto > deuda, y envolver en `db.transaction`.
- [ ] `admin:fiados:editar/eliminar/convertir`: **leer monto y `fiado_id` desde la base**; cambiar
      el contrato de `nucleo.ts` y los 3 call sites de `PanelAdmin.tsx` (mecánico).
- [ ] `editarVenta` (admin): se sigue permitiendo editar el total; el main deriva `descuento`,
      marca `ajuste_admin = 1` y audita `{monto_anterior, monto_nuevo, descuento}`.
- [ ] **Aviso visible para todos**: badge "Ajuste de admin" en las listas de ventas de `TabVentas`
      y `PanelAdmin` cuando `ajuste_admin = 1`.
- [ ] Tests: cantidad negativa rechazada, abono mayor que la deuda, `monto != Σ` bloqueado,
      `admin:fiados:*` ignora los montos del renderer.

### 1.4 Login débil
PIN en texto plano (`esquema.ts:7`), comparado en SQL (`nucleo.ts:112`), admin/1234 que nunca se
cambia y **sin ninguna ruta en la app para cambiar un PIN** (solo hay dos `INSERT`, ningún
`UPDATE usuarios SET pin`). `auth:login` no limita intentos. Hallazgo extra del informe: no
menciona que el cambio de PIN no existe.

- [ ] `src/main/nucleo/pin.ts`: `hashPin` / `verificarPin` con **scrypt** de `node:crypto`
      (sin dependencia nueva), salt de 16 bytes, formato `scrypt$<salt>$<hash>` y comparación con
      `timingSafeEqual`.
- [ ] **Migración v5**: `usuarios.pin_hash TEXT` y `usuarios.debe_cambiar_pin INTEGER NOT NULL
      DEFAULT 0`. El bootstrap `admin`/`1234` nace con `debe_cambiar_pin = 1`.
- [ ] Upgrade transparente: si `pin_hash` es null se compara el `pin` plano (legacy) y, si calza,
      se hashea y se borra el plano. Así los PINs existentes siguen funcionando.
- [ ] `auth:login` devuelve `{ok, debeCambiarPin}`; el renderer muestra una pantalla de **cambio
      obligatorio** entre `Login` y `AppShell` (`App.tsx` tiene 18 líneas, encaja fácil).
- [ ] Canal nuevo `usuarios:cambiarPin(id, actual, nuevo)` con validación (mínimo 4 dígitos, debe
      ser distinto del anterior) y auditoría.
- [ ] **Reset por admin**: `usuarios:resetearPin` (solo admin) genera un PIN aleatorio, lo devuelve
      **una sola vez** para mostrarlo, marca `debe_cambiar_pin = 1` y audita
      `usuario_pin_reseteado`. Botón en `PanelUsuarios`.
- [ ] Límite de intentos: 5 fallos por usuario → bloqueo de 60 s, contador **en memoria** (se
      reinicia al cerrar la app) y reset al login exitoso.
- [ ] Tests: hash/verificación, upgrade legacy, `debe_cambiar_pin` del bootstrap, límite de
      intentos, reset por admin.

## Fuera de alcance (decidido no hacerlo ahora)

- Firma de código macOS/Windows (requiere Apple Developer).
- Cifrado de la base.
- Lote 2: exposición del escáner (autoarranque antes del login, `0.0.0.0`, sin límites, promesa
  colgada en `servidor.ts:95`), bugs de datos (reponer stock al eliminar, conservar líneas al
  convertir venta ↔ fiado, `ahoraLocal()` en `convertirFiadoAVenta`, `abonarFiado` sin
  transacción, deudores por nombre exacto) y `usuarios:eliminar`.
- Lote 3: `abrirUrl` por IPC, CI/CD (actions por SHA, tests en `release.yml`, tags solo desde
  `main`, `sync-dev.yml` sin rebase), `.npmrc`/`pnpm-workspace`, `pnpm test` funcional, restos de
  plantilla, README/LICENSE.
- Lote 4: **la tabla `bitacora` que proponía el ROADMAP NO se crea**: la tabla `auditoria` ya
  existe (`esquema.ts:70`, `nucleo.ts:517`) con UI (pestaña en `PanelAdmin`). Lo que falta son
  filtros, paginación, export CSV, guardar el valor anterior en `venta_editada` y
  `producto_actualizado`, detalle de líneas de venta, eventos del escáner y rechazos de
  autorización. Corregir la sección del ROADMAP para que no proponga una tabla duplicada.

## Verificación por lote

`pnpm typecheck` + `pnpm lint` (0 warnings) +
`ELECTRON_RUN_AS_NODE=1 ./node_modules/.bin/electron node_modules/vitest/vitest.mjs run` +
`pnpm exec electron-vite build`. Prueba manual: login → cambio de PIN forzado → venta → venta con
ajuste de admin (ver aviso) → escáner.

## Commits

1. `chore: sanear PII del repo y registrar la auditoría de seguridad`
2. `fix: regenerar el certificado del escáner sin autoridad certificadora`
3. `fix: calcular los montos en el main y marcar los ajustes de admin`
4. `feat: storing del PIN con scrypt, cambio forzado y límite de intentos`