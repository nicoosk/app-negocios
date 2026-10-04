import { beforeEach, describe, expect, it } from 'vitest'
import type { Database as DatabaseType } from 'better-sqlite3'
import { crearDb } from './db'
import { crearNucleo, type Nucleo } from './nucleo'

// Las estadísticas se prueban con una base en memoria y datos sembrados con
// fechas explícitas, para que las series sean deterministas.
let db: DatabaseType
let nucleo: Nucleo

beforeEach(() => {
  db = crearDb(':memory:')
  nucleo = crearNucleo(db)
})

function insertarVenta(monto: number, fecha: string, hora: string, idUsuario = 1): number {
  const res = db
    .prepare('INSERT INTO ventas (monto, id_usuario, fecha, hora) VALUES (?, ?, ?, ?)')
    .run(monto, idUsuario, fecha, hora)
  return Number(res.lastInsertRowid)
}

function insertarItemVenta(
  ventaId: number,
  nombre: string,
  cantidad: number,
  precio: number
): void {
  db.prepare(
    `INSERT INTO ventas_detalle (venta_id, producto_id, nombre_producto, precio_unitario, cantidad, subtotal)
     VALUES (?, NULL, ?, ?, ?, ?)`
  ).run(ventaId, nombre, precio, cantidad, precio * cantidad)
}

function insertarFiado(nombre: string, deuda: number): number {
  const res = db
    .prepare('INSERT INTO fiados (nombre, deuda_total) VALUES (?, ?)')
    .run(nombre, deuda)
  return Number(res.lastInsertRowid)
}

function insertarDetalleFiado(fiadoId: number, monto: number, fecha: string, hora: string): number {
  const res = db
    .prepare(
      'INSERT INTO fiados_detalle (fiado_id, monto, id_usuario, fecha, hora) VALUES (?, ?, 1, ?, ?)'
    )
    .run(fiadoId, monto, fecha, hora)
  return Number(res.lastInsertRowid)
}

function insertarItemFiado(
  detalleId: number,
  nombre: string,
  cantidad: number,
  precio: number
): void {
  db.prepare(
    `INSERT INTO fiados_detalle_items (detalle_id, producto_id, nombre_producto, precio_unitario, cantidad, subtotal)
     VALUES (?, NULL, ?, ?, ?, ?)`
  ).run(detalleId, nombre, precio, cantidad, precio * cantidad)
}

describe('estadisticas.resumen', () => {
  it('agrega ventas, ticket, unidades, fiado, deuda e inventario', () => {
    const v1 = insertarVenta(1000, '2026-01-01', '10:00:00')
    const v2 = insertarVenta(2000, '2026-01-02', '11:00:00')
    insertarItemVenta(v1, 'Pan', 2, 500)
    insertarItemVenta(v2, 'Leche', 1, 2000)

    const fiadoId = insertarFiado('Vecina', 500)
    insertarDetalleFiado(fiadoId, 500, '2026-01-02', '12:00:00')

    nucleo.productos.crear('Arroz', null, 1000, 5, 'kg')

    const resumen = nucleo.estadisticas.resumen('2026-01-01', '2026-01-03')
    expect(resumen.ventas).toBe(3000)
    expect(resumen.transacciones).toBe(2)
    expect(resumen.ticketPromedio).toBe(1500)
    expect(resumen.unidades).toBe(3)
    expect(resumen.fiado).toBe(500)
    expect(resumen.deudaTotal).toBe(500)
    expect(resumen.deudoresActivos).toBe(1)
    expect(resumen.valorInventario).toBe(5000)
    expect(resumen.productosActivos).toBe(1)
  })

  it('compara con el período anterior de igual duración', () => {
    insertarVenta(1000, '2026-01-01', '10:00:00')
    insertarVenta(3000, '2026-01-04', '10:00:00')

    const resumen = nucleo.estadisticas.resumen('2026-01-04', '2026-01-06')
    expect(resumen.ventas).toBe(3000)
    expect(resumen.anterior.ventas).toBe(1000)
    expect(resumen.anterior.transacciones).toBe(1)
  })

  it('devuelve ceros sin datos', () => {
    const resumen = nucleo.estadisticas.resumen('2026-01-01', '2026-01-03')
    expect(resumen).toMatchObject({ ventas: 0, transacciones: 0, ticketPromedio: 0 })
  })
})

describe('estadisticas.ventasPorDia', () => {
  it('incluye los días sin datos y cruza el fiado', () => {
    insertarVenta(1000, '2026-01-01', '10:00:00')
    insertarVenta(500, '2026-01-01', '11:00:00')
    insertarVenta(2000, '2026-01-03', '09:00:00')
    const fiadoId = insertarFiado('Cliente', 300)
    insertarDetalleFiado(fiadoId, 300, '2026-01-03', '12:00:00')

    const serie = nucleo.estadisticas.ventasPorDia('2026-01-01', '2026-01-03')
    expect(serie.map((p) => p.fecha)).toEqual(['2026-01-01', '2026-01-02', '2026-01-03'])
    expect(serie[0]).toMatchObject({ monto: 1500, transacciones: 2, fiado: 0 })
    expect(serie[1]).toMatchObject({ monto: 0, transacciones: 0, fiado: 0 })
    expect(serie[2]).toMatchObject({ monto: 2000, transacciones: 1, fiado: 300 })
  })
})

describe('estadisticas.ventasPorHora', () => {
  it('devuelve las 24 horas y agrupa por hora', () => {
    insertarVenta(1000, '2026-01-01', '10:15:00')
    insertarVenta(500, '2026-01-01', '10:45:00')
    insertarVenta(2000, '2026-01-02', '18:00:00')

    const serie = nucleo.estadisticas.ventasPorHora('2026-01-01', '2026-01-02')
    expect(serie).toHaveLength(24)
    expect(serie[10]).toMatchObject({ hora: 10, monto: 1500, transacciones: 2 })
    expect(serie[18]).toMatchObject({ hora: 18, monto: 2000, transacciones: 1 })
    expect(serie[0]).toMatchObject({ monto: 0, transacciones: 0 })
  })
})

describe('estadisticas.topProductos y mixProductos', () => {
  it('ordena por monto y por unidades, incluyendo lo fiado', () => {
    const v1 = insertarVenta(4000, '2026-01-01', '10:00:00')
    insertarItemVenta(v1, 'Producto A', 4, 1000)
    insertarItemVenta(v1, 'Producto B', 1, 3000)
    const fiadoId = insertarFiado('Cliente', 2500)
    const detalleId = insertarDetalleFiado(fiadoId, 2500, '2026-01-01', '13:00:00')
    insertarItemFiado(detalleId, 'Producto C', 5, 500)

    const porMonto = nucleo.estadisticas.topProductos('2026-01-01', '2026-01-01', 'monto')
    expect(porMonto[0].nombre).toBe('Producto A')
    expect(porMonto.map((p) => p.nombre)).toContain('Producto C')

    const porUnidades = nucleo.estadisticas.topProductos('2026-01-01', '2026-01-01', 'unidades')
    expect(porUnidades[0].nombre).toBe('Producto C')

    const mix = nucleo.estadisticas.mixProductos('2026-01-01', '2026-01-01', 2)
    expect(mix.items).toHaveLength(2)
    expect(mix.total).toBe(9500)
  })
})

describe('estadisticas.porUsuario y estadoFiados', () => {
  it('agrupa las ventas por usuario', () => {
    nucleo.usuarios.crear('cajero', '1111')
    const cajero = nucleo.usuarios.encontrar('cajero', '1111')
    insertarVenta(1000, '2026-01-01', '10:00:00', 1)
    insertarVenta(2000, '2026-01-01', '11:00:00', cajero?.id ?? 1)

    const porUsuario = nucleo.estadisticas.porUsuario('2026-01-01', '2026-01-01')
    const admin = porUsuario.find((u) => u.username === 'admin')
    const cajeroFila = porUsuario.find((u) => u.username === 'cajero')
    expect(admin).toMatchObject({ monto: 1000, transacciones: 1 })
    expect(cajeroFila).toMatchObject({ monto: 2000, transacciones: 1 })
  })

  it('calcula la tasa de recuperación y el top de deudores', () => {
    const fiadoId = insertarFiado('Deudor Uno', 1000)
    insertarDetalleFiado(fiadoId, 1000, '2026-01-01', '10:00:00')
    insertarDetalleFiado(fiadoId, -250, '2026-01-02', '10:00:00')
    insertarFiado('Deudor Dos', 2000)

    const estado = nucleo.estadisticas.estadoFiados('2026-01-01', '2026-01-02')
    expect(estado.fiado).toBe(1000)
    expect(estado.abonos).toBe(250)
    expect(estado.recuperacion).toBeCloseTo(0.25)
    expect(estado.topDeudores[0].nombre).toBe('Deudor Dos')
  })
})
