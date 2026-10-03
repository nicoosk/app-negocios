import { beforeEach, describe, expect, it } from 'vitest'
import type { Database as DatabaseType } from 'better-sqlite3'
import { crearDb } from './db'
import { crearNucleo, type Nucleo } from './nucleo'
import { ahoraLocal } from './fecha'

// La capa núcleo recibe la conexión por inyección, así que se prueba con una
// base en memoria: sin Electron, sin rutas del sistema y sin mocks.
let db: DatabaseType
let nucleo: Nucleo

beforeEach(() => {
  db = crearDb(':memory:')
  nucleo = crearNucleo(db)
})

describe('esquema y migraciones', () => {
  it('aplica las migraciones hasta user_version 3', () => {
    expect(db.pragma('user_version', { simple: true })).toBe(3)
  })

  it('crea el admin bootstrap con id 1', () => {
    const admin = nucleo.usuarios.encontrar('admin', '1234')
    expect(admin?.id).toBe(1)
    expect(admin?.is_admin).toBe(1)
  })

  it('enforza las foreign keys', () => {
    expect(() =>
      db.prepare('INSERT INTO ventas (monto, id_usuario) VALUES (?, ?)').run(500, 9999)
    ).toThrow(/FOREIGN KEY/i)
  })
})

describe('integridad de datos', () => {
  it('registra ventas con id_usuario y devuelve el username', () => {
    const id = nucleo.ventas.registrar(1000, [], 1)
    const venta = db.prepare('SELECT id_usuario FROM ventas WHERE id = ?').get(id) as {
      id_usuario: number
    }
    expect(venta.id_usuario).toBe(1)
    expect(nucleo.ventas.admin()[0].username).toBe('admin')
  })

  it('detecta si un usuario tiene actividad', () => {
    nucleo.ventas.registrar(1000, [], 1)
    expect(nucleo.usuarios.tieneActividad(1)).toBe(true)
    expect(nucleo.usuarios.tieneActividad(99999)).toBe(false)
  })

  it('registra y lee entradas de auditoría', () => {
    nucleo.auditoria.registrar({
      id_usuario: 1,
      username: 'admin',
      accion: 'prueba',
      entidad: 'venta',
      entidad_id: 42
    })
    expect(nucleo.auditoria.listar()[0]).toMatchObject({
      username: 'admin',
      accion: 'prueba',
      entidad: 'venta',
      entidad_id: 42
    })
  })

  it('convertirAVenta no deja items huérfanos', () => {
    const detalleId = nucleo.fiados.registrar('Deudor Test', 2000, 1, [
      { producto_id: null, nombre: 'Pan', precio_unitario: 1000, cantidad: 2, subtotal: 2000 }
    ])
    const fiado = db.prepare('SELECT id FROM fiados WHERE nombre = ?').get('Deudor Test') as {
      id: number
    }

    nucleo.fiados.convertirAVenta(detalleId, fiado.id, 2000, 1)

    const items = db
      .prepare('SELECT COUNT(*) as c FROM fiados_detalle_items WHERE detalle_id = ?')
      .get(detalleId) as { c: number }
    expect(items.c).toBe(0)

    const detalles = db
      .prepare('SELECT COUNT(*) as c FROM fiados_detalle WHERE id = ?')
      .get(detalleId) as { c: number }
    expect(detalles.c).toBe(0)

    const venta = db.prepare('SELECT id_usuario FROM ventas ORDER BY id DESC LIMIT 1').get() as {
      id_usuario: number
    }
    expect(venta.id_usuario).toBe(1)
  })
})

describe('fechas y horas en zona local', () => {
  it('ahoraLocal devuelve el formato esperado', () => {
    const { fecha, hora } = ahoraLocal()
    expect(fecha).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(hora).toMatch(/^\d{2}:\d{2}:\d{2}$/)
  })

  it('las ventas se guardan con la fecha local de hoy', () => {
    nucleo.ventas.registrar(1000, [], 1)
    const { fecha } = ahoraLocal()
    const fila = db.prepare('SELECT MAX(fecha) as fecha FROM ventas').get() as { fecha: string }
    expect(fila.fecha).toBe(fecha)
    expect(nucleo.ventas.totalHoy().count).toBeGreaterThan(0)
    expect(nucleo.ventas.hoy().length).toBeGreaterThan(0)
  })

  it('los fiados se guardan con la fecha local de hoy', () => {
    const { fecha } = ahoraLocal()
    nucleo.fiados.registrar('Deudor Fecha', 500, 1)
    const fila = db.prepare('SELECT fecha FROM fiados_detalle ORDER BY id DESC LIMIT 1').get() as {
      fecha: string
    }
    expect(fila.fecha).toBe(fecha)
    expect(nucleo.fiados.hoy().some((f) => f.nombre === 'Deudor Fecha')).toBe(true)
  })

  it('la auditoría guarda fecha y hora locales', () => {
    nucleo.auditoria.registrar({
      id_usuario: 1,
      username: 'admin',
      accion: 'prueba',
      entidad: 'venta'
    })
    const filas = nucleo.auditoria.listar()
    expect(filas[0].fecha).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(filas[0].hora).toMatch(/^\d{2}:\d{2}:\d{2}$/)
  })
})

describe('códigos de barra', () => {
  it('escanear un código desconocido crea un producto pendiente, no una fila vacía', () => {
    const resultado = nucleo.productos.escanear('7801234567890')
    expect(resultado.nuevo).toBe(true)
    expect(resultado.producto.codigo_barra).toBe('7801234567890')
    expect(resultado.producto.es_nuevo).toBe(1)
    expect(resultado.producto.nombre.trim()).not.toBe('')
    expect(resultado.producto.precio_venta).toBe(0)
    expect(nucleo.productos.contarNuevos()).toBe(1)
  })

  it('escanear dos veces el mismo código no duplica y deja de ser nuevo', () => {
    const primero = nucleo.productos.escanear('111')
    const segundo = nucleo.productos.escanear('111')
    expect(primero.nuevo).toBe(true)
    expect(segundo.nuevo).toBe(false)
    expect(segundo.producto.id).toBe(primero.producto.id)
    expect(nucleo.productos.contarNuevos()).toBe(1)
  })

  it('resolver un producto nuevo limpia el flag y actualiza sus datos', () => {
    const { producto } = nucleo.productos.escanear('222')
    nucleo.productos.resolverNuevo(producto.id, 'Pan integral', 1500, 10, 'unidad')
    expect(nucleo.productos.buscarPorCodigoBarra('222')).toMatchObject({
      nombre: 'Pan integral',
      precio_venta: 1500,
      stock: 10,
      es_nuevo: 0
    })
    expect(nucleo.productos.contarNuevos()).toBe(0)
  })

  it('escanear el código de un producto eliminado lo reactiva como pendiente', () => {
    const id = nucleo.productos.crear('Pan', '333', 1000, 5, 'unidad')
    nucleo.productos.eliminar(id)
    const resultado = nucleo.productos.escanear('333')
    expect(resultado.nuevo).toBe(true)
    expect(resultado.producto.id).toBe(id)
    expect(resultado.producto.es_nuevo).toBe(1)
  })

  it('buscarPorCodigoBarra no matchea contra el nombre', () => {
    nucleo.productos.crear('12345', null, 1000, 5, 'unidad')
    expect(nucleo.productos.buscarPorCodigoBarra('12345')).toBeUndefined()
  })
})
