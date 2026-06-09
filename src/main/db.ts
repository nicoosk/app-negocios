import Database, { Database as DatabaseType } from 'better-sqlite3'
import path from 'path'
import { app } from 'electron'

const dbPath = path.join(app.getPath('userData'), 'negocio.db')
const db: DatabaseType = new Database(dbPath)

db.exec(`
  CREATE TABLE IF NOT EXISTS usuarios (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    username      TEXT UNIQUE NOT NULL,
    pin           TEXT NOT NULL,
    creado_en     TEXT DEFAULT (datetime('now')),
    is_admin      INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS ventas (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    monto         INTEGER NOT NULL,
    fecha         TEXT DEFAULT (date('now')),
    hora          TEXT DEFAULT (time('now'))
  );

  CREATE TABLE IF NOT EXISTS fiados (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre        TEXT UNIQUE NOT NULL,
    deuda_total   INTEGER DEFAULT 0,
    creado_en     TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS fiados_detalle (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    fiado_id      INTEGER NOT NULL,
    monto         INTEGER NOT NULL,
    fecha         TEXT DEFAULT (date('now')),
    hora          TEXT DEFAULT (time('now')),
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
    creado_en     TEXT NOT NULL DEFAULT (datetime('now'))
  )
`)

// START: Bloque de migraciones
let migrationsCount: number = 0
try {
  console.log('[db : migrations] Iniciando migraciones pendientes')
  const columnasUsuarios = db.pragma('table_info(usuarios)') as { name: string }[]
  const tieneIsAdmin = columnasUsuarios.some((c) => c.name === 'is_admin')

  if (!tieneIsAdmin) {
    console.log(
      '[db : migrations] No se encontró la columna is_admin para la tabla usuarios. Agregando...'
    )
    db.exec(`ALTER TABLE usuarios ADD COLUMN is_admin INTEGER DEFAULT 0`)
    db.prepare(`UPDATE usuarios SET is_admin = 1 WHERE username = 'admin'`).run()
    console.log(
      `[db : migrations] Migración aplicada: Columna is_admin agregada y usuario 'admin' es un admin por defecto. Procura cambiar esto a la brevedad`
    )
    migrationsCount++
  }
  const columnasFiadosDetalle = db.pragma('table_info(fiados_detalle)') as { name: string }[]
  const idUsuarioPresenteEnFiadosDetalle = columnasFiadosDetalle.some(
    (c) => c.name === 'id_usuario'
  )

  if (!idUsuarioPresenteEnFiadosDetalle) {
    console.log(
      `[db : migrations] No se encontró la columna id_usuario para la tabla fiados_detalle. Agregando...`
    )
    db.exec('ALTER TABLE fiados_detalle ADD COLUMN id_usuario INTEGER NOT NULL DEFAULT 1')
    console.log(
      '[db : migrations] Migración aplicada: Columna id_usuario agregada. Registros existentes adoptan id_usuario = 1'
    )
    migrationsCount++
  }

  console.log(
    `[db : migrations] Fin del proceso. ${migrationsCount === 0 ? 'No se realizaron migraciones.' : `Migraciones realizadas con éxito: ${migrationsCount}.`}`
  )
} catch (err) {
  console.error(
    `Ocurrió un error al realizar las migraciones. Se lograron realizar ${migrationsCount} con éxito`
  )
  console.error(err)
}
// END: Bloque de migraciones

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

const testUserExists = db
  .prepare('SELECT COUNT(*) as c FROM usuarios WHERE username = ?')
  .get('Prueba') as { c: number }
if (testUserExists.c === 0) {
  db.prepare('INSERT INTO usuarios (username, pin) VALUES (?, ?)').run('Prueba', '0000')
}

const productCount = db.prepare('SELECT COUNT(*) as c FROM productos').get() as { c: number }
console.log('Productos registrados:', productCount.c)

export function findUser(
  username: string,
  pin: string
): { id: number; username: string; creado_en: string; id_admin: boolean } {
  return db.prepare('SELECT * FROM usuarios WHERE username = ? AND pin = ?').get(username, pin) as {
    id: number
    username: string
    creado_en: string
    id_admin: boolean
  }
}

export function createUser(
  username: string,
  pin: string,
  is_admin: boolean = false
): Database.RunResult {
  console.log(`Creando usuario: '${username}', pin '${pin}', es admin: ${is_admin}`)
  return db
    .prepare('INSERT INTO usuarios (username, pin, is_admin) VALUES (?, ?, ?)')
    .run(username, pin, is_admin ? 1 : 0)
}

export function listUsers(): {
  id: number
  username: string
  creado_en: string
  is_admin: boolean
}[] {
  return db
    .prepare('SELECT id, username, creado_en, is_admin FROM usuarios ORDER BY username')
    .all() as {
    id: number
    username: string
    creado_en: string
    is_admin: boolean
  }[]
}

export function deleteUser(id: number): Database.RunResult {
  return db.prepare('DELETE FROM usuarios WHERE id = ?').run(id)
}

export function registrarVenta(monto: number): Database.RunResult {
  return db.prepare('INSERT INTO ventas (monto) VALUES (?)').run(monto)
}

export function getVentasHoy(): { monto: number; hora: string }[] {
  return db
    .prepare("SELECT monto, hora FROM ventas WHERE fecha = date('now') ORDER BY id DESC LIMIT 20")
    .all() as { monto: number; hora: string }[]
}

export function getTotalVentasHoy(): { total: number; count: number } {
  return db
    .prepare(
      "SELECT COALESCE(SUM(monto), 0) AS total, COUNT(*) as count FROM ventas WHERE fecha = date('now')"
    )
    .get() as { total: number; count: number }
}

export function buscarFiados(): { id: number; nombre: string; deuda_total: number }[] {
  return db.prepare('SELECT id, nombre, deuda_total FROM fiados ORDER BY nombre ASC').all() as {
    id: number
    nombre: string
    deuda_total: number
  }[]
}

export function registrarFio(
  nombre: string,
  monto: number,
  id_usuario: number
): Database.RunResult {
  const existing = db.prepare('SELECT id FROM fiados WHERE nombre = ?').get(nombre) as
    | { id: number }
    | undefined

  if (existing) {
    db.prepare('UPDATE fiados SET deuda_total = deuda_total + ? WHERE id = ?').run(
      monto,
      existing.id
    )
    return db
      .prepare('INSERT INTO fiados_detalle (fiado_id, monto, id_usuario) VALUES (?, ?, ?)')
      .run(existing.id, monto, id_usuario)
  } else {
    const result = db
      .prepare('INSERT INTO fiados (nombre, deuda_total) VALUES (?, ?)')
      .run(nombre, monto)
    return db
      .prepare('INSERT INTO fiados_detalle (fiado_id, monto, id_usuario) VALUES (?, ?, ?)')
      .run(result.lastInsertRowid, monto, id_usuario)
  }
}

export function getFiadosHoy(): { nombre: string; monto: number; hora: string }[] {
  return db
    .prepare(
      `
      SELECT f.nombre, fd.monto, fd.hora
      FROM fiados_detalle fd
      JOIN fiados f ON f.id = fd.fiado_id
      WHERE fd.fecha = date('now')
      AND fd.monto > 0
      ORDER BY fd.id DESC
      LIMIT 10
    `
    )
    .all() as { nombre: string; monto: number; hora: string }[]
}

export function getTotalFiadosHoy(): { total: number; deudores: number } {
  return db
    .prepare(
      `
    SELECT
      COALESCE(SUM(fd.monto), 0) AS total,
      COUNT(DISTINCT fd.fiado_id) AS deudores
    FROM fiados_detalle fd
    WHERE fd.fecha = date('now')
    AND fd.monto > 0
    `
    )
    .get() as { total: number; deudores: number }
}

export function getTotalFiados(): { total: number } {
  return db
    .prepare(`SELECT COALESCE(COUNT(*), 0) AS total FROM fiados f WHERE f.deuda_total > 0`)
    .get() as { total: number }
}

export function abonarFiado(id: number, monto: number, id_usuario: number): Database.RunResult {
  const deudor = db.prepare('SELECT deuda_total FROM fiados WHERE id = ?').get(id) as
    | { deuda_total: number }
    | undefined
  if (!deudor) throw new Error('Deudor no encontrado')
  const nuevaDeuda = Math.max(0, deudor.deuda_total - monto)
  db.prepare('UPDATE fiados SET deuda_total = ? WHERE id = ?').run(nuevaDeuda, id)
  return db
    .prepare('INSERT INTO fiados_detalle (fiado_id, monto, id_usuario) VALUES (?, ?, ?)')
    .run(id, -monto, id_usuario)
}

export function getHistorialFiado(id: number): { monto: number; fecha: string; hora: string }[] {
  return db
    .prepare(`SELECT monto, fecha, hora FROM fiados_detalle WHERE fiado_id = ? ORDER BY id DESC`)
    .all(id) as { monto: number; fecha: string; hora: string }[]
}

export function getTodosLosFiados(): { id: number; nombre: string; deuda_total: number }[] {
  return db
    .prepare('SELECT id, nombre, deuda_total FROM fiados ORDER BY deuda_total DESC')
    .all() as { id: number; nombre: string; deuda_total: number }[]
}

// Administrador de ventas y fíos

export function esAdmin(id_usuario: number): boolean {
  const user = db.prepare('SELECT is_admin FROM usuarios WHERE id = ?').get(id_usuario) as
    | { is_admin: number }
    | undefined
  return user?.is_admin === 1
}

export function getVentasAdmin(limit: number = 100): {
  id: number
  monto: number
  fecha: string
  hora: string
}[] {
  return db
    .prepare('SELECT id, monto, fecha, hora FROM ventas ORDER BY id DESC LIMIT ?')
    .all(limit) as {
    id: number
    monto: number
    fecha: string
    hora: string
  }[]
}

export function editarVenta(id: number, monto: number): Database.RunResult {
  return db.prepare('UPDATE ventas SET monto = ? WHERE id = ?').run(monto, id)
}

export function eliminarVenta(id: number): Database.RunResult {
  return db.prepare('DELETE FROM ventas WHERE id = ?').run(id)
}

export function convertirVentaAFiado(id: number, nombre: string, id_usuario: number): void {
  const venta = db.prepare('SELECT monto FROM ventas WHERE id = ?').get(id) as
    | { monto: number }
    | undefined

  if (!venta) throw new Error('Venta no encontrada')
  db.transaction(() => {
    db.prepare('DELETE FROM ventas WHERE id = ?').run(id)
    registrarFio(nombre, venta.monto, id_usuario)
  })()
}

export function getFiadosDetalleAdmin(limit: number = 100): {
  id: number
  fiado_id: number
  nombre: string
  monto: number
  fecha: string
  hora: string
}[] {
  return db
    .prepare(
      `SELECT fd.id, fd.fiado_id, f.nombre, fd.monto, fd.fecha, fd.hora, u.username
        FROM fiados_detalle fd
        JOIN fiados f ON f.id = fd.fiado_id
        JOIN usuarios u ON u.id = fd.id_usuario
        WHERE fd.monto > 0
        ORDER BY fd.id DESC
        LIMIT ?`
    )
    .all(limit) as {
    id: number
    fiado_id: number
    nombre: string
    monto: number
    fecha: string
    hora: string
    username: string
  }[]
}

export function editarFiadoDetalle(
  detalle_id: number,
  fiado_id: number,
  monto_anterior: number,
  monto_nuevo: number
): void {
  db.transaction(() => {
    db.prepare('UPDATE fiados_detalle SET monto = ? WHERE id = ?').run(monto_nuevo, detalle_id)
    db.prepare('UPDATE fiados SET deuda_total = MAX(0, deuda_total + ?) WHERE id = ?').run(
      monto_nuevo - monto_anterior,
      fiado_id
    )
  })()
}

export function eliminarFiadoDetalle(detalle_id: number, fiado_id: number, monto: number): void {
  db.transaction(() => {
    db.prepare('DELETE FROM fiados_detalle WHERE id = ?').run(detalle_id)
    db.prepare('UPDATE fiados SET deuda_total = MAX(0, deuda_total - ?) WHERE id = ?').run(
      monto,
      fiado_id
    )
  })()
}

export function convertirFiadoAVenta(detalle_id: number, fiado_id: number, monto: number): void {
  db.transaction(() => {
    db.prepare('DELETE FROM fiados_detalle WHERE id = ?').run(detalle_id)
    db.prepare('UPDATE fiados SET deuda_total = MAX(0, deuda_total - ?) WHERE id = ?').run(
      monto,
      fiado_id
    )
    db.prepare('INSERT INTO ventas (monto) VALUES (?)').run(monto)
  })()
}

// Productos / Inventario
interface Producto {
  id: number
  nombre: string
  codigo_barra: string | null
  precio_venta: number
  stock: number
  unidad: string
  activo: number
  creado_en: string
}

export function listarProductos(): Producto[] {
  return db
    .prepare('SELECT * FROM productos WHERE activo = 1 ORDER BY nombre ASC')
    .all() as Producto[]
}

export function crearProducto(
  nombre: string,
  codigo_barra: string | null,
  precio_venta: number,
  stock: number,
  unidad: string
): Database.RunResult {
  return db
    .prepare(
      'INSERT INTO productos (nombre, codigo_barra, precio_venta, stock, unidad) VALUES (?, ?, ?, ?, ?)'
    )
    .run(nombre, codigo_barra, precio_venta, stock, unidad)
}

export function actualizarProducto(
  id: number,
  nombre: string,
  codigo_barra: string | null,
  precio_venta: number,
  stock: number,
  unidad: string
): Database.RunResult {
  return db
    .prepare(
      'UPDATE productos SET nombre = ?, codigo_barra = ?, precio_venta = ?, stock = ?, unidad = ? WHERE id = ?'
    )
    .run(nombre, codigo_barra, precio_venta, stock, unidad, id)
}

export function eliminarProducto(id: number): Database.RunResult {
  return db.prepare('UPDATE productos SET activo = 0 WHERE id = ?').run(id)
}

export default db
