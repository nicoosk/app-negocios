import { esUnidadValida } from '../../shared/constantes'

// Validación de datos de producto en el borde IPC. El renderer no es de fiar:
// el proceso main vuelve a comprobar todo antes de tocar la base.
export function validarProducto(datos: {
  nombre: unknown
  precio_venta: unknown
  stock: unknown
  unidad: unknown
  exigirPrecioPositivo?: boolean
}): string | null {
  const { nombre, precio_venta, stock, unidad, exigirPrecioPositivo = false } = datos

  if (typeof nombre !== 'string' || nombre.trim().length === 0) {
    return 'El nombre es obligatorio'
  }

  if (typeof precio_venta !== 'number' || !Number.isFinite(precio_venta) || precio_venta < 0) {
    return 'El precio es inválido'
  }

  if (exigirPrecioPositivo && precio_venta <= 0) {
    return 'El precio debe ser mayor a 0'
  }

  if (typeof stock !== 'number' || !Number.isInteger(stock) || stock < 0) {
    return 'El stock es inválido'
  }

  if (!esUnidadValida(unidad)) {
    return 'La unidad es inválida'
  }

  return null
}
