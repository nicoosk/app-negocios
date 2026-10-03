import { describe, expect, it } from 'vitest'
import { validarProducto } from './validacion'

const base = {
  nombre: 'Pan',
  precio_venta: 1000,
  stock: 5,
  unidad: 'unidad'
}

describe('validarProducto', () => {
  it('acepta datos correctos', () => {
    expect(validarProducto(base)).toBeNull()
  })

  it('rechaza nombre vacío o con solo espacios', () => {
    expect(validarProducto({ ...base, nombre: '   ' })).toMatch(/nombre/i)
  })

  it('rechaza precios inválidos', () => {
    expect(validarProducto({ ...base, precio_venta: -1 })).toMatch(/precio/i)
    expect(validarProducto({ ...base, precio_venta: NaN })).toMatch(/precio/i)
    expect(validarProducto({ ...base, precio_venta: '1000' })).toMatch(/precio/i)
  })

  it('exige precio positivo al resolver un pendiente', () => {
    expect(validarProducto({ ...base, precio_venta: 0, exigirPrecioPositivo: true })).toMatch(
      /mayor a 0/i
    )
    expect(validarProducto({ ...base, exigirPrecioPositivo: true })).toBeNull()
  })

  it('rechaza stock negativo o no entero', () => {
    expect(validarProducto({ ...base, stock: -1 })).toMatch(/stock/i)
    expect(validarProducto({ ...base, stock: 1.5 })).toMatch(/stock/i)
  })

  it('rechaza unidades fuera de la lista', () => {
    expect(validarProducto({ ...base, unidad: 'caja' })).toMatch(/unidad/i)
    expect(validarProducto({ ...base, unidad: '' })).toMatch(/unidad/i)
  })
})
