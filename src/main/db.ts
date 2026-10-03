import Database, { Database as DatabaseType } from 'better-sqlite3'
import path from 'path'
import { app } from 'electron'

const dbPath = path.join(app.getPath('userData'), 'negocio.db')
const db: DatabaseType = new Database(dbPath)

db.pragma('foreign_keys = ON')

// Fecha y hora en la zona horaria local del equipo (no UTC) para que "hoy" coincida
// con el día real del negocio. Se usan valores explícitos en los INSERT para que
// también apliquen a bases de datos existentes cuyos DEFAULT originales eran UTC.
export function ahoraLocal(): { fecha: string; hora: string } {
  const ahora = new Date()
  const fecha = [
    ahora.getFullYear(),
    String(ahora.getMonth() + 1).padStart(2, '0'),
    String(ahora.getDate()).padStart(2, '0')
  ].join('-')
  const hora = [
    String(ahora.getHours()).padStart(2, '0'),
    String(ahora.getMinutes()).padStart(2, '0'),
    String(ahora.getSeconds()).padStart(2, '0')
  ].join(':')
  return { fecha, hora }
}

db.exec(`
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
`)

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

// START: Migraciones versionadas (PRAGMA user_version)
interface Migracion {
  version: number
  descripcion: string
  up: () => void
}

const migraciones: Migracion[] = [
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

      const columnasFiadosDetalle = db.pragma('table_info(fiados_detalle)') as { name: string }[]
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

function aplicarMigraciones(): void {
  const versionActual = db.pragma('user_version', { simple: true }) as number
  const pendientes = migraciones
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

aplicarMigraciones()
// END: Migraciones versionadas

const productCount = db.prepare('SELECT COUNT(*) as c FROM productos').get() as { c: number }
console.log('Productos registrados:', productCount.c)

export interface UsuarioRow {
  id: number
  username: string
  creado_en: string
  is_admin: number
}

export function findUser(username: string, pin: string): UsuarioRow | undefined {
  return db
    .prepare(
      'SELECT id, username, creado_en, is_admin FROM usuarios WHERE username = ? AND pin = ?'
    )
    .get(username, pin) as UsuarioRow | undefined
}

export function createUser(
  username: string,
  pin: string,
  is_admin: boolean = false
): Database.RunResult {
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

export function contarAdmins(): number {
  const res = db.prepare('SELECT COUNT(*) as c FROM usuarios WHERE is_admin = 1').get() as {
    c: number
  }
  return res.c
}

export function usuarioTieneActividad(id: number): boolean {
  const fiados = db
    .prepare('SELECT COUNT(*) as c FROM fiados_detalle WHERE id_usuario = ?')
    .get(id) as { c: number }
  if (fiados.c > 0) return true
  const ventas = db.prepare('SELECT COUNT(*) as c FROM ventas WHERE id_usuario = ?').get(id) as {
    c: number
  }
  return ventas.c > 0
}

export interface EntradaAuditoria {
  id_usuario: number | null
  username: string | null
  accion: string
  entidad?: string | null
  entidad_id?: number | null
  detalle?: string | null
}

export function registrarAuditoria(entrada: EntradaAuditoria): Database.RunResult {
  const { fecha, hora } = ahoraLocal()
  return db
    .prepare(
      `INSERT INTO auditoria (id_usuario, username, accion, entidad, entidad_id, detalle, fecha, hora)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      entrada.id_usuario,
      entrada.username,
      entrada.accion,
      entrada.entidad ?? null,
      entrada.entidad_id ?? null,
      entrada.detalle ?? null,
      fecha,
      hora
    )
}

export interface AuditoriaRow {
  id: number
  fecha: string
  hora: string
  username: string | null
  accion: string
  entidad: string | null
  entidad_id: number | null
  detalle: string | null
}

export function getAuditoria(limit: number = 200): AuditoriaRow[] {
  return db
    .prepare(
      `SELECT id, fecha, hora, username, accion, entidad, entidad_id, detalle
       FROM auditoria
       ORDER BY id DESC
       LIMIT ?`
    )
    .all(limit) as AuditoriaRow[]
}

export interface LineaCarrito {
  producto_id: number | null
  nombre: string
  precio_unitario: number
  cantidad: number
  subtotal: number
}

export function registrarVenta(
  monto: number,
  lineas: LineaCarrito[],
  id_usuario: number
): Database.RunResult {
  return db.transaction(() => {
    const { fecha, hora } = ahoraLocal()
    const venta = db
      .prepare('INSERT INTO ventas (monto, id_usuario, fecha, hora) VALUES (?, ?, ?, ?)')
      .run(monto, id_usuario, fecha, hora)
    const ventaId = venta.lastInsertRowid

    for (const l of lineas) {
      db.prepare(
        `INSERT INTO ventas_detalle
        (venta_id, producto_id, nombre_producto, precio_unitario, cantidad, subtotal)
        VALUES (?, ?, ?, ?, ?, ?)`
      ).run(ventaId, l.producto_id, l.nombre, l.precio_unitario, l.cantidad, l.subtotal)

      if (l.producto_id !== null) {
        db.prepare('UPDATE productos SET stock = MAX(0, stock - ?) WHERE id = ?').run(
          l.cantidad,
          l.producto_id
        )
      }
    }

    return venta
  })()
}

interface ItemVenta {
  nombre_producto: string
  cantidad: number
  subtotal: number
}

export interface VentaHoy {
  id: number
  monto: number
  hora: string
  items: ItemVenta[]
}

export function getVentasHoy(): VentaHoy[] {
  const ventas = db
    .prepare(
      "SELECT id, monto, hora FROM ventas WHERE fecha = date('now', 'localtime') ORDER BY id DESC LIMIT 20"
    )
    .all() as { id: number; monto: number; hora: string }[]

  const stmtItems = db.prepare(
    'SELECT nombre_producto, cantidad, subtotal FROM ventas_detalle WHERE venta_id = ? ORDER BY id ASC'
  )

  return ventas.map((v) => ({
    items: stmtItems.all(v.id) as ItemVenta[],
    ...v
  }))
}

export function getTotalVentasHoy(): { total: number; count: number } {
  return db
    .prepare(
      "SELECT COALESCE(SUM(monto), 0) AS total, COUNT(*) as count FROM ventas WHERE fecha = date('now', 'localtime')"
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
  id_usuario: number,
  lineas: LineaCarrito[] = []
): Database.RunResult {
  return db.transaction(() => {
    const { fecha, hora } = ahoraLocal()
    const existing = db.prepare('SELECT id FROM fiados WHERE nombre = ?').get(nombre) as
      | { id: number }
      | undefined

    let fiadoId: number | bigint
    let result: Database.RunResult

    if (existing) {
      db.prepare('UPDATE fiados SET deuda_total = deuda_total + ? WHERE id = ?').run(
        monto,
        existing.id
      )
      result = db
        .prepare(
          'INSERT INTO fiados_detalle (fiado_id, monto, id_usuario, fecha, hora) VALUES (?, ?, ?, ?, ?)'
        )
        .run(existing.id, monto, id_usuario, fecha, hora)
      fiadoId = existing.id
    } else {
      const fiado = db
        .prepare('INSERT INTO fiados (nombre, deuda_total) VALUES (?, ?)')
        .run(nombre, monto)
      fiadoId = fiado.lastInsertRowid
      result = db
        .prepare(
          'INSERT INTO fiados_detalle (fiado_id, monto, id_usuario, fecha, hora) VALUES (?, ?, ?, ?, ?)'
        )
        .run(fiadoId, monto, id_usuario, fecha, hora)
    }

    const detalleId = result.lastInsertRowid

    for (const l of lineas) {
      db.prepare(
        `INSERT INTO fiados_detalle_items
          (detalle_id, producto_id, nombre_producto, precio_unitario, cantidad, subtotal)
          VALUES (?, ?, ?, ?, ?, ?)
        `
      ).run(detalleId, l.producto_id, l.nombre, l.precio_unitario, l.cantidad, l.subtotal)

      if (l.producto_id !== null) {
        db.prepare('UPDATE productos SET stock = MAX(0, stock - ?) WHERE id = ?').run(
          l.cantidad,
          l.producto_id
        )
      }
    }

    return result
  })()
}

interface ItemFiado {
  nombre_producto: string
  cantidad: number
  subtotal: number
}

export interface FiadoHoy {
  nombre: string
  monto: number
  hora: string
  items: ItemFiado[]
}

export function getFiadosHoy(): FiadoHoy[] {
  const fiados = db
    .prepare(
      `
      SELECT f.nombre, fd.id AS detalle_id, fd.monto, fd.hora
      FROM fiados_detalle fd
      JOIN fiados f ON f.id = fd.fiado_id
      WHERE fd.fecha = date('now', 'localtime')
      AND fd.monto > 0
      ORDER BY fd.id DESC
      LIMIT 10
    `
    )
    .all() as { nombre: string; detalle_id: number; monto: number; hora: string }[]

  const stmtItems = db.prepare(
    'SELECT nombre_producto, cantidad, subtotal FROM fiados_detalle_items WHERE detalle_id = ? ORDER BY id ASC'
  )

  return fiados.map((f) => ({
    nombre: f.nombre,
    monto: f.monto,
    hora: f.hora,
    items: stmtItems.all(f.detalle_id) as ItemFiado[]
  }))
}

export function getTotalFiadosHoy(): { total: number; deudores: number } {
  return db
    .prepare(
      `
    SELECT
      COALESCE(SUM(fd.monto), 0) AS total,
      COUNT(DISTINCT fd.fiado_id) AS deudores
    FROM fiados_detalle fd
    WHERE fd.fecha = date('now', 'localtime')
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
  const { fecha, hora } = ahoraLocal()
  return db
    .prepare(
      'INSERT INTO fiados_detalle (fiado_id, monto, id_usuario, fecha, hora) VALUES (?, ?, ?, ?, ?)'
    )
    .run(id, -monto, id_usuario, fecha, hora)
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

export interface VentaAdmin {
  id: number
  monto: number
  fecha: string
  hora: string
  username: string | null
}

export function getVentasAdmin(limit: number = 100): VentaAdmin[] {
  return db
    .prepare(
      `SELECT v.id, v.monto, v.fecha, v.hora, u.username
       FROM ventas v
       LEFT JOIN usuarios u ON u.id = v.id_usuario
       ORDER BY v.id DESC
       LIMIT ?`
    )
    .all(limit) as VentaAdmin[]
}

export function editarVenta(id: number, monto: number): Database.RunResult {
  return db.prepare('UPDATE ventas SET monto = ? WHERE id = ?').run(monto, id)
}

export function eliminarVenta(id: number): Database.RunResult {
  return db.transaction(() => {
    db.prepare('DELETE FROM ventas_detalle WHERE venta_id = ?').run(id)
    return db.prepare('DELETE FROM ventas WHERE id = ?').run(id)
  })()
}

export function convertirVentaAFiado(id: number, nombre: string, id_usuario: number): void {
  const venta = db.prepare('SELECT monto FROM ventas WHERE id = ?').get(id) as
    | { monto: number }
    | undefined

  if (!venta) throw new Error('Venta no encontrada')
  db.transaction(() => {
    db.prepare('DELETE FROM ventas_detalle WHERE venta_id = ?').run(id)
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
  username: string
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
    db.prepare('DELETE FROM fiados_detalle_items WHERE detalle_id = ?').run(detalle_id)
    db.prepare('DELETE FROM fiados_detalle WHERE id = ?').run(detalle_id)
    db.prepare('UPDATE fiados SET deuda_total = MAX(0, deuda_total - ?) WHERE id = ?').run(
      monto,
      fiado_id
    )
  })()
}

export function convertirFiadoAVenta(
  detalle_id: number,
  fiado_id: number,
  monto: number,
  id_usuario: number
): void {
  db.transaction(() => {
    db.prepare('DELETE FROM fiados_detalle_items WHERE detalle_id = ?').run(detalle_id)
    db.prepare('DELETE FROM fiados_detalle WHERE id = ?').run(detalle_id)
    db.prepare('UPDATE fiados SET deuda_total = MAX(0, deuda_total - ?) WHERE id = ?').run(
      monto,
      fiado_id
    )
    db.prepare('INSERT INTO ventas (monto, id_usuario) VALUES (?, ?)').run(monto, id_usuario)
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

export function buscarProductosPorNombre(query: string): Producto[] {
  return db
    .prepare(
      'SELECT * FROM productos WHERE activo = 1 AND nombre LIKE ? ORDER BY nombre ASC LIMIT 12'
    )
    .all(`%${query}%`) as Producto[]
}

export default db
