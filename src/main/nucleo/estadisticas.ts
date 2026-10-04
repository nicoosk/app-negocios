import type { Database as DatabaseType } from 'better-sqlite3'
import type {
  EstadoFiados,
  PuntoDia,
  PuntoDispersion,
  PuntoHora,
  PuntoProducto,
  PuntoUsuario,
  ResumenEstadisticas
} from '../../shared/tipos'

// Contrato público de las consultas agregadas del dashboard.
export interface Estadisticas {
  resumen: (desde: string, hasta: string) => ResumenEstadisticas
  ventasPorDia: (desde: string, hasta: string) => PuntoDia[]
  ventasPorHora: (desde: string, hasta: string) => PuntoHora[]
  topProductos: (
    desde: string,
    hasta: string,
    metrica?: 'monto' | 'unidades',
    limit?: number
  ) => PuntoProducto[]
  mixProductos: (
    desde: string,
    hasta: string,
    limit?: number
  ) => { items: PuntoProducto[]; total: number }
  dispersion: (desde: string, hasta: string, limit?: number) => PuntoDispersion[]
  porUsuario: (desde: string, hasta: string) => PuntoUsuario[]
  estadoFiados: (desde: string, hasta: string) => EstadoFiados
}

// Ranking de productos que combina lo vendido al contado y lo fiado (ítems reales),
// para reflejar el movimiento real de mercadería.
const PRODUCTOS_SQL = `
  SELECT nombre, SUM(cantidad) AS unidades, SUM(subtotal) AS monto FROM (
    SELECT vd.nombre_producto AS nombre, vd.cantidad AS cantidad, vd.subtotal AS subtotal
    FROM ventas_detalle vd
    JOIN ventas v ON v.id = vd.venta_id
    WHERE v.fecha BETWEEN ? AND ?
    UNION ALL
    SELECT fdi.nombre_producto, fdi.cantidad, fdi.subtotal
    FROM fiados_detalle_items fdi
    JOIN fiados_detalle fd ON fd.id = fdi.detalle_id
    WHERE fd.fecha BETWEEN ? AND ? AND fd.monto > 0
  )
`

function formatearFecha(d: Date): string {
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0')
  ].join('-')
}

// Lista de días entre dos fechas (inclusive) para ejes continuos, incluso sin datos.
function fechasEntre(desde: string, hasta: string): string[] {
  const fechas: string[] = []
  const cursor = new Date(`${desde}T12:00:00`)
  const fin = new Date(`${hasta}T12:00:00`)
  let guarda = 0
  while (cursor <= fin && guarda < 400) {
    fechas.push(formatearFecha(cursor))
    cursor.setDate(cursor.getDate() + 1)
    guarda++
  }
  return fechas
}

export function crearEstadisticas(db: DatabaseType): Estadisticas {
  function resumen(desde: string, hasta: string): ResumenEstadisticas {
    const ventas = db
      .prepare(
        'SELECT COALESCE(SUM(monto), 0) AS total, COUNT(*) AS transacciones FROM ventas WHERE fecha BETWEEN ? AND ?'
      )
      .get(desde, hasta) as { total: number; transacciones: number }

    const unidades = db
      .prepare(
        `SELECT COALESCE(SUM(vd.cantidad), 0) AS unidades
         FROM ventas_detalle vd
         JOIN ventas v ON v.id = vd.venta_id
         WHERE v.fecha BETWEEN ? AND ?`
      )
      .get(desde, hasta) as { unidades: number }

    const fiado = db
      .prepare(
        'SELECT COALESCE(SUM(monto), 0) AS total FROM fiados_detalle WHERE fecha BETWEEN ? AND ? AND monto > 0'
      )
      .get(desde, hasta) as { total: number }

    const deuda = db.prepare('SELECT COALESCE(SUM(deuda_total), 0) AS total FROM fiados').get() as {
      total: number
    }

    const inventario = db
      .prepare(
        'SELECT COALESCE(SUM(precio_venta * stock), 0) AS total FROM productos WHERE activo = 1'
      )
      .get() as { total: number }

    return {
      ventas: ventas.total,
      transacciones: ventas.transacciones,
      ticketPromedio:
        ventas.transacciones > 0 ? Math.round(ventas.total / ventas.transacciones) : 0,
      unidades: unidades.unidades,
      fiado: fiado.total,
      deudaTotal: deuda.total,
      valorInventario: inventario.total
    }
  }

  function ventasPorDia(desde: string, hasta: string): PuntoDia[] {
    const ventas = db
      .prepare(
        `SELECT fecha, SUM(monto) AS monto, COUNT(*) AS transacciones
         FROM ventas WHERE fecha BETWEEN ? AND ? GROUP BY fecha`
      )
      .all(desde, hasta) as { fecha: string; monto: number; transacciones: number }[]

    const fiados = db
      .prepare(
        `SELECT fecha, SUM(monto) AS fiado
         FROM fiados_detalle WHERE fecha BETWEEN ? AND ? AND monto > 0 GROUP BY fecha`
      )
      .all(desde, hasta) as { fecha: string; fiado: number }[]

    const porFecha = new Map<string, PuntoDia>()
    for (const fecha of fechasEntre(desde, hasta)) {
      porFecha.set(fecha, { fecha, monto: 0, transacciones: 0, fiado: 0 })
    }
    for (const v of ventas) {
      const punto = porFecha.get(v.fecha)
      if (punto) {
        punto.monto = v.monto
        punto.transacciones = v.transacciones
      }
    }
    for (const f of fiados) {
      const punto = porFecha.get(f.fecha)
      if (punto) punto.fiado = f.fiado
    }
    return [...porFecha.values()]
  }

  function ventasPorHora(desde: string, hasta: string): PuntoHora[] {
    const filas = db
      .prepare(
        `SELECT CAST(substr(hora, 1, 2) AS INTEGER) AS hora, SUM(monto) AS monto, COUNT(*) AS transacciones
         FROM ventas WHERE fecha BETWEEN ? AND ? GROUP BY substr(hora, 1, 2)`
      )
      .all(desde, hasta) as { hora: number; monto: number; transacciones: number }[]

    const porHora = new Map<number, PuntoHora>()
    for (let h = 0; h < 24; h++) porHora.set(h, { hora: h, monto: 0, transacciones: 0 })
    for (const fila of filas) {
      const punto = porHora.get(fila.hora)
      if (punto) {
        punto.monto = fila.monto
        punto.transacciones = fila.transacciones
      }
    }
    return [...porHora.values()]
  }

  function topProductos(
    desde: string,
    hasta: string,
    metrica: 'monto' | 'unidades' = 'monto',
    limit = 8
  ): PuntoProducto[] {
    const orden = metrica === 'unidades' ? 'unidades' : 'monto'
    return db
      .prepare(`${PRODUCTOS_SQL} GROUP BY nombre ORDER BY ${orden} DESC LIMIT ?`)
      .all(desde, hasta, desde, hasta, limit) as PuntoProducto[]
  }

  function mixProductos(
    desde: string,
    hasta: string,
    limit = 8
  ): { items: PuntoProducto[]; total: number } {
    const filas = db
      .prepare(`${PRODUCTOS_SQL} GROUP BY nombre ORDER BY monto DESC`)
      .all(desde, hasta, desde, hasta) as PuntoProducto[]
    const total = filas.reduce((suma, f) => suma + f.monto, 0)
    return { items: filas.slice(0, limit), total }
  }

  function dispersion(desde: string, hasta: string, limit = 500): PuntoDispersion[] {
    const filas = db
      .prepare(
        `SELECT v.id AS venta_id, v.hora AS hora, v.monto AS monto,
           (SELECT COUNT(*) FROM ventas_detalle vd WHERE vd.venta_id = v.id) AS items
         FROM ventas v WHERE v.fecha BETWEEN ? AND ? ORDER BY v.id DESC LIMIT ?`
      )
      .all(desde, hasta, limit) as {
      venta_id: number
      hora: string
      monto: number
      items: number
    }[]

    return filas.map((f) => {
      const [hh = '0', mm = '0', ss = '0'] = f.hora.split(':')
      return {
        venta_id: f.venta_id,
        hora: Number(hh) + Number(mm) / 60 + Number(ss) / 3600,
        horaTexto: f.hora.slice(0, 5),
        monto: f.monto,
        items: f.items
      }
    })
  }

  function porUsuario(desde: string, hasta: string): PuntoUsuario[] {
    return db
      .prepare(
        `SELECT COALESCE(u.username, 'Sin usuario') AS username, SUM(v.monto) AS monto, COUNT(*) AS transacciones
         FROM ventas v
         LEFT JOIN usuarios u ON u.id = v.id_usuario
         WHERE v.fecha BETWEEN ? AND ?
         GROUP BY v.id_usuario
         ORDER BY monto DESC`
      )
      .all(desde, hasta) as PuntoUsuario[]
  }

  function estadoFiados(desde: string, hasta: string): EstadoFiados {
    const totales = db
      .prepare(
        `SELECT
           COALESCE(SUM(CASE WHEN monto > 0 THEN monto ELSE 0 END), 0) AS fiado,
           COALESCE(SUM(CASE WHEN monto < 0 THEN -monto ELSE 0 END), 0) AS abonos
         FROM fiados_detalle WHERE fecha BETWEEN ? AND ?`
      )
      .get(desde, hasta) as { fiado: number; abonos: number }

    const topDeudores = db
      .prepare(
        'SELECT id, nombre, deuda_total FROM fiados WHERE deuda_total > 0 ORDER BY deuda_total DESC LIMIT 6'
      )
      .all() as { id: number; nombre: string; deuda_total: number }[]

    return {
      fiado: totales.fiado,
      abonos: totales.abonos,
      recuperacion: totales.fiado > 0 ? totales.abonos / totales.fiado : 0,
      topDeudores
    }
  }

  return {
    resumen,
    ventasPorDia,
    ventasPorHora,
    topProductos,
    mixProductos,
    dispersion,
    porUsuario,
    estadoFiados
  }
}
