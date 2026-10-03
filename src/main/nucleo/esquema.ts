import type { Database as DatabaseType } from 'better-sqlite3'

const ESQUEMA = `
  CREATE TABLE IF NOT EXISTS usuarios (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    username      TEXT UNIQUE NOT NULL,
    pin           TEXT NOT NULL,
    creado_en     TEXT DEFAULT (datetime('now', 'localtime')),
    is_admin      INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS ventas (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    monto         INTEGER NOT NULL,
    id_usuario    INTEGER REFERENCES usuarios(id),
    fecha         TEXT DEFAULT (date('now', 'localtime')),
    hora          TEXT DEFAULT (time('now', 'localtime'))
  );

  CREATE TABLE IF NOT EXISTS fiados (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre        TEXT UNIQUE NOT NULL,
    deuda_total   INTEGER DEFAULT 0,
    creado_en     TEXT DEFAULT (datetime('now', 'localtime'))
  );

  CREATE TABLE IF NOT EXISTS fiados_detalle (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    fiado_id      INTEGER NOT NULL,
    monto         INTEGER NOT NULL,
    fecha         TEXT DEFAULT (date('now', 'localtime')),
    hora          TEXT DEFAULT (time('now', 'localtime')),
    id_usuario    INTEGER NOT NULL,
    FOREIGN KEY (id_usuario) REFERENCES usuarios(id),
    FOREIGN KEY (fiado_id) REFERENCES fiados(id)
  );

  CREATE TABLE IF NOT EXISTS productos (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre        TEXT NOT NULL,
    codigo_barra  TEXT UNIQUE,
    precio_venta  INTEGER NOT NULL DEFAULT 0,
    stock         INTEGER NOT NULL DEFAULT 0,
    unidad        TEXT NOT NULL DEFAULT 'unidad',
    activo        INTEGER NOT NULL DEFAULT 1,
    creado_en     TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
  );

  CREATE TABLE IF NOT EXISTS ventas_detalle (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    venta_id            INTEGER NOT NULL REFERENCES ventas(id),
    producto_id         INTEGER REFERENCES productos(id),
    nombre_producto     TEXT NOT NULL,
    precio_unitario     INTEGER NOT NULL,
    cantidad            INTEGER NOT NULL DEFAULT 1,
    subtotal            INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS fiados_detalle_items (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    detalle_id          INTEGER NOT NULL REFERENCES fiados_detalle(id),
    producto_id         INTEGER REFERENCES productos(id),
    nombre_producto     TEXT NOT NULL,
    precio_unitario     INTEGER NOT NULL,
    cantidad            INTEGER NOT NULL DEFAULT 1,
    subtotal            INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS auditoria (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    fecha         TEXT NOT NULL DEFAULT (date('now', 'localtime')),
    hora          TEXT NOT NULL DEFAULT (time('now', 'localtime')),
    id_usuario    INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
    username      TEXT,
    accion        TEXT NOT NULL,
    entidad       TEXT,
    entidad_id    INTEGER,
    detalle       TEXT
  );
`

interface Migracion {
  version: number
  descripcion: string
  up: () => void
}

// Migraciones versionadas sobre `PRAGMA user_version`. Cada una debe ser
// idempotente y quedar registrada aquí en orden ascendente.
function migraciones(db: DatabaseType): Migracion[] {
  return [
    {
      version: 1,
      descripcion:
        'Base histórica: is_admin, fiados_detalle.id_usuario y limpieza del usuario Prueba',
      up: () => {
        const columnasUsuarios = db.pragma('table_info(usuarios)') as { name: string }[]
        if (!columnasUsuarios.some((c) => c.name === 'is_admin')) {
          db.exec('ALTER TABLE usuarios ADD COLUMN is_admin INTEGER DEFAULT 0')
          db.prepare(`UPDATE usuarios SET is_admin = 1 WHERE username = 'admin'`).run()
          console.log("[db : migrations] v1: columna 'is_admin' agregada a usuarios")
        }

        const columnasFiadosDetalle = db.pragma('table_info(fiados_detalle)') as {
          name: string
        }[]
        if (!columnasFiadosDetalle.some((c) => c.name === 'id_usuario')) {
          db.exec('ALTER TABLE fiados_detalle ADD COLUMN id_usuario INTEGER NOT NULL DEFAULT 1')
          console.log("[db : migrations] v1: columna 'id_usuario' agregada a fiados_detalle")
        }

        const usuariosPrueba = db
          .prepare(`SELECT id FROM usuarios WHERE username = 'Prueba' AND pin = '0000'`)
          .all() as { id: number }[]

        if (usuariosPrueba.length > 0) {
          for (const u of usuariosPrueba) {
            db.prepare('UPDATE fiados_detalle SET id_usuario = 1 WHERE id_usuario = ?').run(u.id)
          }
          db.prepare(`DELETE FROM usuarios WHERE username = 'Prueba' AND pin = '0000'`).run()
          console.log('[db : migrations] v1: usuario "Prueba" eliminado y movimientos reasignados')
        }
      }
    },
    {
      version: 2,
      descripcion: 'Columna ventas.id_usuario para trazabilidad',
      up: () => {
        const columnasVentas = db.pragma('table_info(ventas)') as { name: string }[]
        if (!columnasVentas.some((c) => c.name === 'id_usuario')) {
          db.exec('ALTER TABLE ventas ADD COLUMN id_usuario INTEGER REFERENCES usuarios(id)')
          console.log("[db : migrations] v2: columna 'id_usuario' agregada a ventas")
        }
      }
    }
  ]
}

function aplicarMigraciones(db: DatabaseType): void {
  const versionActual = db.pragma('user_version', { simple: true }) as number
  const pendientes = migraciones(db)
    .filter((m) => m.version > versionActual)
    .sort((a, b) => a.version - b.version)

  if (pendientes.length === 0) {
    console.log('[db : migrations] Sin migraciones pendientes')
    return
  }

  for (const m of pendientes) {
    try {
      db.transaction(() => {
        m.up()
        db.pragma(`user_version = ${m.version}`)
      })()
      console.log(`[db : migrations] Aplicada v${m.version}: ${m.descripcion}`)
    } catch (err) {
      console.error(`[db : migrations] Error aplicando v${m.version}: ${m.descripcion}`)
      console.error(err)
      throw err
    }
  }
}

export function aplicarEsquema(db: DatabaseType): void {
  db.exec(ESQUEMA)

  // Bootstrap del administrador antes de las migraciones para garantizar que exista el usuario id = 1
  const count = db.prepare('SELECT COUNT(*) as c FROM usuarios').get() as { c: number }
  console.log('Usuarios en DB:', count.c)
  if (count.c === 0) {
    db.prepare('INSERT INTO usuarios (username, pin, is_admin) VALUES (?, ?, ?)').run(
      'admin',
      '1234',
      1
    )
    console.log('Usuario admin creado')
  }

  aplicarMigraciones(db)

  const productCount = db.prepare('SELECT COUNT(*) as c FROM productos').get() as { c: number }
  console.log('Productos registrados:', productCount.c)
}
