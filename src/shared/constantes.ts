// Constantes de dominio compartidas entre main, preload y renderer.

// Unidades de venta permitidas para un producto. Fuente única: la validación del
// proceso main y los selects del renderer deben coincidir.
export const UNIDADES = ['unidad', 'gr', 'kg', 'ml', 'litro', 'docena'] as const

export type Unidad = (typeof UNIDADES)[number]

export function esUnidadValida(valor: unknown): valor is Unidad {
  return typeof valor === 'string' && (UNIDADES as readonly string[]).includes(valor)
}
