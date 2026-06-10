export interface UpdaterPayload {
  estado: 'verificando' | 'disponible' | 'descargando' | 'listo' | 'al-dia' | 'error'
  version?: string
  porcentaje?: number
  releaseUrl?: string
}

export interface LineaCarrito {
  producto_id: number | null
  nombre: string
  precio_unitario: number
  cantidad: number
  subtotal: number
}

export interface ItemVenta {
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

export interface ItemFiado {
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
