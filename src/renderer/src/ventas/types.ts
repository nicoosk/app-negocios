export interface Producto {
  id: number
  nombre: string
  precio_venta: number
  stock: number
}

export interface ItemCarrito {
  producto_id: number | null
  nombre: string
  precio_base: number
  precio_unitario: number
  precio_modificado: boolean
  cantidad: number
  subtotal: number
}
