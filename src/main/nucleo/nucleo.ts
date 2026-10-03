import type { Database as DatabaseType } from 'better-sqlite3'
import type {
  EntradaAuditoria,
  FiadoDetalleAdmin,
  FiadoHoy,
  HistorialFiado,
  ItemVenta,
  LineaCarrito,
  Producto,
  RegistroAuditoria,
  ResultadoEscaneo,
  ResumenFiado,
  Usuario,
  UsuarioRow,
  VentaAdmin,
  VentaHoy
} from '../../shared/tipos'
import { ahoraLocal } from './fecha'

// Contrato público de la capa núcleo, agrupado por dominio.
export interface Nucleo {
  usuarios: {
    encontrar: (username: string, pin: string) => UsuarioRow | undefined
    crear: (username: string, pin: string, isAdmin?: boolean) => number
    listar: () => Usuario[]
    eliminar: (id: number) => void
    contarAdmins: () => number
    tieneActividad: (id: number) => boolean
  }
  ventas: {
    registrar: (monto: number, lineas: LineaCarrito[], id_usuario: number) => number
    hoy: () => VentaHoy[]
    totalHoy: () => { total: number; count: number }
    admin: (limit?: number) => VentaAdmin[]
    editar: (id: number, monto: number) => void
    eliminar: (id: number) => void
    convertirAFiado: (id: number, nombre: string, id_usuario: number) => void
  }
  fiados: {
    buscar: () => ResumenFiado[]
    registrar: (
      nombre: string,
      monto: number,
      id_usuario: number,
      lineas?: LineaCarrito[]
    ) => number
    hoy: () => FiadoHoy[]
    totalHoy: () => { total: number; deudores: number }
    total: () => { total: number }
    todos: () => ResumenFiado[]
    abonar: (id: number, monto: number, id_usuario: number) => void
    historial: (id: number) => HistorialFiado[]
    detalleAdmin: (limit?: number) => FiadoDetalleAdmin[]
    editarDetalle: (
      detalle_id: number,
      fiado_id: number,
      monto_anterior: number,
      monto_nuevo: number
    ) => void
    eliminarDetalle: (detalle_id: number, fiado_id: number, monto: number) => void
    convertirAVenta: (
      detalle_id: number,
      fiado_id: number,
      monto: number,
      id_usuario: number
    ) => void
  }
  productos: {
    listar: () => Producto[]
    crear: (
      nombre: string,
      codigo_barra: string | null,
      precio_venta: number,
      stock: number,
      unidad: string
    ) => number
    actualizar: (
      id: number,
      nombre: string,
      codigo_barra: string | null,
      precio_venta: number,
      stock: number,
      unidad: string
    ) => void
    eliminar: (id: number) => void
    buscarPorNombre: (query: string) => Producto[]
    buscarPorCodigoBarra: (codigo: string) => Producto | undefined
    escanear: (codigo: string) => ResultadoEscaneo
    contarNuevos: () => number
    resolverNuevo: (
      id: number,
      nombre: string,
      precio_venta: number,
      stock: number,
      unidad: string
    ) => void
  }
  auditoria: {
    registrar: (entrada: EntradaAuditoria) => void
    listar: (limit?: number) => RegistroAuditoria[]
  }
}

// Capa núcleo: toda la lógica de negocio y el acceso a SQLite, agrupados por
// dominio. Recibe la conexión por inyección, así que no depende de Electron ni
// de rutas del sistema y es testeable con una base ':memory:'.
export function crearNucleo(db: DatabaseType): Nucleo {
  // ===== Usuarios =====
  function encontrarUsuario(username: string, pin: string): UsuarioRow | undefined {
    return db
      .prepare(
        'SELECT id, username, creado_en, is_admin FROM usuarios WHERE username = ? AND pin = ?'
      )
      .get(username, pin) as UsuarioRow | undefined
  }

  function crearUsuario(username: string, pin: string, isAdmin = false): number {
    const res = db
      .prepare('INSERT INTO usuarios (username, pin, is_admin) VALUES (?, ?, ?)')
      .run(username, pin, isAdmin ? 1 : 0)
    return Number(res.lastInsertRowid)
  }

  function listarUsuarios(): Usuario[] {
    const filas = db
      .prepare('SELECT id, username, creado_en, is_admin FROM usuarios ORDER BY username')
      .all() as UsuarioRow[]
    return filas.map((u) => ({ ...u, is_admin: u.is_admin === 1 }))
  }

  function eliminarUsuario(id: number): void {
    db.prepare('DELETE FROM usuarios WHERE id = ?').run(id)
  }

  function contarAdmins(): number {
    const res = db.prepare('SELECT COUNT(*) as c FROM usuarios WHERE is_admin = 1').get() as {
      c: number
    }
    return res.c
  }

  function usuarioTieneActividad(id: number): boolean {
    const fiados = db
      .prepare('SELECT COUNT(*) as c FROM fiados_detalle WHERE id_usuario = ?')
      .get(id) as { c: number }
    if (fiados.c > 0) return true
    const ventas = db.prepare('SELECT COUNT(*) as c FROM ventas WHERE id_usuario = ?').get(id) as {
      c: number
    }
    return ventas.c > 0
  }

  // ===== Ventas =====
  function registrarVenta(monto: number, lineas: LineaCarrito[], id_usuario: number): number {
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

      return Number(ventaId)
    })()
  }

  function getVentasHoy(): VentaHoy[] {
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

  function getTotalVentasHoy(): { total: number; count: number } {
    return db
      .prepare(
        "SELECT COALESCE(SUM(monto), 0) AS total, COUNT(*) as count FROM ventas WHERE fecha = date('now', 'localtime')"
      )
      .get() as { total: number; count: number }
  }

  function getVentasAdmin(limit = 100): VentaAdmin[] {
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

  function editarVenta(id: number, monto: number): void {
    db.prepare('UPDATE ventas SET monto = ? WHERE id = ?').run(monto, id)
  }

  function eliminarVenta(id: number): void {
    db.transaction(() => {
      db.prepare('DELETE FROM ventas_detalle WHERE venta_id = ?').run(id)
      db.prepare('DELETE FROM ventas WHERE id = ?').run(id)
    })()
  }

  function convertirVentaAFiado(id: number, nombre: string, id_usuario: number): void {
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

  // ===== Fiados =====
  function buscarFiados(): ResumenFiado[] {
    return db
      .prepare('SELECT id, nombre, deuda_total FROM fiados ORDER BY nombre ASC')
      .all() as ResumenFiado[]
  }

  function registrarFio(
    nombre: string,
    monto: number,
    id_usuario: number,
    lineas: LineaCarrito[] = []
  ): number {
    return db.transaction(() => {
      const { fecha, hora } = ahoraLocal()
      const existing = db.prepare('SELECT id FROM fiados WHERE nombre = ?').get(nombre) as
        | { id: number }
        | undefined

      let fiadoId: number | bigint
      let detalleId: number | bigint

      if (existing) {
        db.prepare('UPDATE fiados SET deuda_total = deuda_total + ? WHERE id = ?').run(
          monto,
          existing.id
        )
        const result = db
          .prepare(
            'INSERT INTO fiados_detalle (fiado_id, monto, id_usuario, fecha, hora) VALUES (?, ?, ?, ?, ?)'
          )
          .run(existing.id, monto, id_usuario, fecha, hora)
        fiadoId = existing.id
        detalleId = result.lastInsertRowid
      } else {
        const fiado = db
          .prepare('INSERT INTO fiados (nombre, deuda_total) VALUES (?, ?)')
          .run(nombre, monto)
        fiadoId = fiado.lastInsertRowid
        const result = db
          .prepare(
            'INSERT INTO fiados_detalle (fiado_id, monto, id_usuario, fecha, hora) VALUES (?, ?, ?, ?, ?)'
          )
          .run(fiadoId, monto, id_usuario, fecha, hora)
        detalleId = result.lastInsertRowid
      }

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

      return Number(detalleId)
    })()
  }

  function getFiadosHoy(): FiadoHoy[] {
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
      items: stmtItems.all(f.detalle_id) as ItemVenta[]
    }))
  }

  function getTotalFiadosHoy(): { total: number; deudores: number } {
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

  function getTotalFiados(): { total: number } {
    return db
      .prepare(`SELECT COALESCE(COUNT(*), 0) AS total FROM fiados f WHERE f.deuda_total > 0`)
      .get() as { total: number }
  }

  function abonarFiado(id: number, monto: number, id_usuario: number): void {
    const deudor = db.prepare('SELECT deuda_total FROM fiados WHERE id = ?').get(id) as
      | { deuda_total: number }
      | undefined
    if (!deudor) throw new Error('Deudor no encontrado')
    const nuevaDeuda = Math.max(0, deudor.deuda_total - monto)
    db.prepare('UPDATE fiados SET deuda_total = ? WHERE id = ?').run(nuevaDeuda, id)
    const { fecha, hora } = ahoraLocal()
    db.prepare(
      'INSERT INTO fiados_detalle (fiado_id, monto, id_usuario, fecha, hora) VALUES (?, ?, ?, ?, ?)'
    ).run(id, -monto, id_usuario, fecha, hora)
  }

  function getHistorialFiado(id: number): HistorialFiado[] {
    return db
      .prepare(`SELECT monto, fecha, hora FROM fiados_detalle WHERE fiado_id = ? ORDER BY id DESC`)
      .all(id) as HistorialFiado[]
  }

  function getTodosLosFiados(): ResumenFiado[] {
    return db
      .prepare('SELECT id, nombre, deuda_total FROM fiados ORDER BY deuda_total DESC')
      .all() as ResumenFiado[]
  }

  function getFiadosDetalleAdmin(limit = 100): FiadoDetalleAdmin[] {
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
      .all(limit) as FiadoDetalleAdmin[]
  }

  function editarFiadoDetalle(
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

  function eliminarFiadoDetalle(detalle_id: number, fiado_id: number, monto: number): void {
    db.transaction(() => {
      db.prepare('DELETE FROM fiados_detalle_items WHERE detalle_id = ?').run(detalle_id)
      db.prepare('DELETE FROM fiados_detalle WHERE id = ?').run(detalle_id)
      db.prepare('UPDATE fiados SET deuda_total = MAX(0, deuda_total - ?) WHERE id = ?').run(
        monto,
        fiado_id
      )
    })()
  }

  function convertirFiadoAVenta(
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

  // ===== Productos / Inventario =====
  function listarProductos(): Producto[] {
    return db
      .prepare('SELECT * FROM productos WHERE activo = 1 ORDER BY nombre ASC')
      .all() as Producto[]
  }

  function crearProducto(
    nombre: string,
    codigo_barra: string | null,
    precio_venta: number,
    stock: number,
    unidad: string
  ): number {
    const res = db
      .prepare(
        'INSERT INTO productos (nombre, codigo_barra, precio_venta, stock, unidad) VALUES (?, ?, ?, ?, ?)'
      )
      .run(nombre, codigo_barra, precio_venta, stock, unidad)
    return Number(res.lastInsertRowid)
  }

  function actualizarProducto(
    id: number,
    nombre: string,
    codigo_barra: string | null,
    precio_venta: number,
    stock: number,
    unidad: string
  ): void {
    db.prepare(
      'UPDATE productos SET nombre = ?, codigo_barra = ?, precio_venta = ?, stock = ?, unidad = ? WHERE id = ?'
    ).run(nombre, codigo_barra, precio_venta, stock, unidad, id)
  }

  function eliminarProducto(id: number): void {
    db.prepare('UPDATE productos SET activo = 0 WHERE id = ?').run(id)
  }

  function buscarProductosPorNombre(query: string): Producto[] {
    return db
      .prepare(
        'SELECT * FROM productos WHERE activo = 1 AND nombre LIKE ? ORDER BY nombre ASC LIMIT 12'
      )
      .all(`%${query}%`) as Producto[]
  }

  function buscarProductoPorCodigoBarra(codigo: string): Producto | undefined {
    return db
      .prepare('SELECT * FROM productos WHERE codigo_barra = ? AND activo = 1')
      .get(codigo) as Producto | undefined
  }

  // Al escanear un código desconocido se crea un producto pendiente marcado con
  // `es_nuevo = 1`, nunca una fila vacía: el nombre provisional deriva del código.
  // El upsert reactiva el código si pertenecía a un producto eliminado.
  function crearProductoPendiente(codigo: string): Producto {
    db.prepare(
      `INSERT INTO productos (nombre, codigo_barra, es_nuevo)
       VALUES (?, ?, 1)
       ON CONFLICT(codigo_barra) DO UPDATE SET activo = 1, es_nuevo = 1`
    ).run(`Producto ${codigo}`, codigo)
    return buscarProductoPorCodigoBarra(codigo) as Producto
  }

  function escanearCodigo(codigo: string): ResultadoEscaneo {
    const existente = buscarProductoPorCodigoBarra(codigo)
    if (existente) return { producto: existente, nuevo: false }
    return { producto: crearProductoPendiente(codigo), nuevo: true }
  }

  function contarProductosNuevos(): number {
    const res = db
      .prepare('SELECT COUNT(*) as c FROM productos WHERE activo = 1 AND es_nuevo = 1')
      .get() as { c: number }
    return res.c
  }

  function resolverProductoNuevo(
    id: number,
    nombre: string,
    precio_venta: number,
    stock: number,
    unidad: string
  ): void {
    db.prepare(
      'UPDATE productos SET nombre = ?, precio_venta = ?, stock = ?, unidad = ?, es_nuevo = 0 WHERE id = ?'
    ).run(nombre, precio_venta, stock, unidad, id)
  }

  // ===== Auditoría =====
  function registrarAuditoria(entrada: EntradaAuditoria): void {
    const { fecha, hora } = ahoraLocal()
    db.prepare(
      `INSERT INTO auditoria (id_usuario, username, accion, entidad, entidad_id, detalle, fecha, hora)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
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

  function getAuditoria(limit = 200): RegistroAuditoria[] {
    return db
      .prepare(
        `SELECT id, fecha, hora, username, accion, entidad, entidad_id, detalle
         FROM auditoria
         ORDER BY id DESC
         LIMIT ?`
      )
      .all(limit) as RegistroAuditoria[]
  }

  return {
    usuarios: {
      encontrar: encontrarUsuario,
      crear: crearUsuario,
      listar: listarUsuarios,
      eliminar: eliminarUsuario,
      contarAdmins,
      tieneActividad: usuarioTieneActividad
    },
    ventas: {
      registrar: registrarVenta,
      hoy: getVentasHoy,
      totalHoy: getTotalVentasHoy,
      admin: getVentasAdmin,
      editar: editarVenta,
      eliminar: eliminarVenta,
      convertirAFiado: convertirVentaAFiado
    },
    fiados: {
      buscar: buscarFiados,
      registrar: registrarFio,
      hoy: getFiadosHoy,
      totalHoy: getTotalFiadosHoy,
      total: getTotalFiados,
      todos: getTodosLosFiados,
      abonar: abonarFiado,
      historial: getHistorialFiado,
      detalleAdmin: getFiadosDetalleAdmin,
      editarDetalle: editarFiadoDetalle,
      eliminarDetalle: eliminarFiadoDetalle,
      convertirAVenta: convertirFiadoAVenta
    },
    productos: {
      listar: listarProductos,
      crear: crearProducto,
      actualizar: actualizarProducto,
      eliminar: eliminarProducto,
      buscarPorNombre: buscarProductosPorNombre,
      buscarPorCodigoBarra: buscarProductoPorCodigoBarra,
      escanear: escanearCodigo,
      contarNuevos: contarProductosNuevos,
      resolverNuevo: resolverProductoNuevo
    },
    auditoria: {
      registrar: registrarAuditoria,
      listar: getAuditoria
    }
  }
}
