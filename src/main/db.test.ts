import { afterAll, describe, expect, it, vi } from 'vitest'
import fs from 'node:fs'

const { userDataDir } = await vi.hoisted(async () => {
  const fsv = await import('node:fs')
  const osv = await import('node:os')
  const pathv = await import('node:path')
  return { userDataDir: fsv.mkdtempSync(pathv.join(osv.tmpdir(), 'negocio-db-')) }
})

vi.mock('electron', () => ({
  app: {
    getPath: () => userDataDir
  }
}))

import db, * as dbApi from './db'

afterAll(() => {
  db.close()
  fs.rmSync(userDataDir, { recursive: true, force: true })
})

describe('integridad de la base de datos', () => {
  it('aplica las migraciones hasta user_version 2', () => {
    const version = db.pragma('user_version', { simple: true }) as number
    expect(version).toBe(2)
  })

  it('crea el admin bootstrap con id 1', () => {
    const admin = dbApi.findUser('admin', '1234')
    expect(admin?.id).toBe(1)
    expect(admin?.is_admin).toBe(1)
  })

  it('registra ventas con id_usuario y devuelve el username', () => {
    const res = dbApi.registrarVenta(1000, [], 1)
    const venta = db
      .prepare('SELECT id_usuario FROM ventas WHERE id = ?')
      .get(res.lastInsertRowid) as { id_usuario: number }
    expect(venta.id_usuario).toBe(1)

    const historial = dbApi.getVentasAdmin()
    expect(historial[0].username).toBe('admin')
  })

  it('enforza las foreign keys', () => {
    expect(() =>
      db.prepare('INSERT INTO ventas (monto, id_usuario) VALUES (?, ?)').run(500, 9999)
    ).toThrow(/FOREIGN KEY/i)
  })

  it('detecta si un usuario tiene actividad', () => {
    expect(dbApi.usuarioTieneActividad(1)).toBe(true)
    expect(dbApi.usuarioTieneActividad(99999)).toBe(false)
  })

  it('registra y lee entradas de auditoría', () => {
    dbApi.registrarAuditoria({
      id_usuario: 1,
      username: 'admin',
      accion: 'prueba',
      entidad: 'venta',
      entidad_id: 42
    })
    const filas = dbApi.getAuditoria()
    expect(filas[0]).toMatchObject({
      username: 'admin',
      accion: 'prueba',
      entidad: 'venta',
      entidad_id: 42
    })
  })

  it('convertirFiadoAVenta no deja items huérfanos', () => {
    dbApi.registrarFio('Deudor Test', 2000, 1, [
      { producto_id: null, nombre: 'Pan', precio_unitario: 1000, cantidad: 2, subtotal: 2000 }
    ])
    const fiado = db.prepare('SELECT id FROM fiados WHERE nombre = ?').get('Deudor Test') as {
      id: number
    }
    const detalle = db
      .prepare('SELECT id FROM fiados_detalle WHERE fiado_id = ? ORDER BY id DESC LIMIT 1')
      .get(fiado.id) as { id: number }

    dbApi.convertirFiadoAVenta(detalle.id, fiado.id, 2000, 1)

    const items = db
      .prepare('SELECT COUNT(*) as c FROM fiados_detalle_items WHERE detalle_id = ?')
      .get(detalle.id) as { c: number }
    expect(items.c).toBe(0)

    const detalles = db
      .prepare('SELECT COUNT(*) as c FROM fiados_detalle WHERE id = ?')
      .get(detalle.id) as { c: number }
    expect(detalles.c).toBe(0)

    const venta = db.prepare('SELECT id_usuario FROM ventas ORDER BY id DESC LIMIT 1').get() as {
      id_usuario: number
    }
    expect(venta.id_usuario).toBe(1)
  })
})

describe('fechas y horas en zona local', () => {
  it('ahoraLocal devuelve el formato esperado', () => {
    const { fecha, hora } = dbApi.ahoraLocal()
    expect(fecha).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(hora).toMatch(/^\d{2}:\d{2}:\d{2}$/)
  })

  it('las ventas se guardan con la fecha local de hoy', () => {
    const { fecha } = dbApi.ahoraLocal()
    const fila = db.prepare('SELECT MAX(fecha) as fecha FROM ventas').get() as { fecha: string }
    expect(fila.fecha).toBe(fecha)
    expect(dbApi.getTotalVentasHoy().count).toBeGreaterThan(0)
    expect(dbApi.getVentasHoy().length).toBeGreaterThan(0)
  })

  it('los fiados se guardan con la fecha local de hoy', () => {
    const { fecha } = dbApi.ahoraLocal()
    dbApi.registrarFio('Deudor Fecha', 500, 1)
    const fila = db.prepare('SELECT fecha FROM fiados_detalle ORDER BY id DESC LIMIT 1').get() as {
      fecha: string
    }
    expect(fila.fecha).toBe(fecha)
    expect(dbApi.getFiadosHoy().some((f) => f.nombre === 'Deudor Fecha')).toBe(true)
  })

  it('la auditoría guarda fecha y hora locales', () => {
    const filas = dbApi.getAuditoria()
    expect(filas[0].fecha).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(filas[0].hora).toMatch(/^\d{2}:\d{2}:\d{2}$/)
  })
})
