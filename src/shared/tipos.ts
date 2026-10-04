// Tipos de dominio e IPC compartidos entre main, preload y renderer.
// Esta es la única fuente de verdad: evita duplicar interfaces en cada capa.

export interface Sesion {
  id: number
  username: string
  is_admin: boolean
}

export interface Usuario {
  id: number
  username: string
  creado_en: string
  is_admin: boolean
}

export interface UsuarioRow {
  id: number
  username: string
  creado_en: string
  is_admin: number
}

export interface Producto {
  id: number
  nombre: string
  codigo_barra: string | null
  precio_venta: number
  stock: number
  unidad: string
  activo: number
  es_nuevo: number
  creado_en: string
}

export interface ResultadoEscaneo {
  producto: Producto
  nuevo: boolean
}

// Estado del servidor local que sirve la página de escaneo al celular.
export interface EstadoEscaner {
  activo: boolean
  conectado: boolean
  conectados: number
  url: string | null
  qr: string | null
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

export interface FiadoHoy {
  nombre: string
  monto: number
  hora: string
  items: ItemVenta[]
}

export interface ResumenFiado {
  id: number
  nombre: string
  deuda_total: number
}

export interface HistorialFiado {
  monto: number
  fecha: string
  hora: string
}

export interface VentaAdmin {
  id: number
  monto: number
  fecha: string
  hora: string
  username: string | null
}

export interface FiadoDetalleAdmin {
  id: number
  fiado_id: number
  nombre: string
  monto: number
  fecha: string
  hora: string
  username: string
}

export interface EntradaAuditoria {
  id_usuario: number | null
  username: string | null
  accion: string
  entidad?: string | null
  entidad_id?: number | null
  detalle?: string | null
}

export interface RegistroAuditoria {
  id: number
  fecha: string
  hora: string
  username: string | null
  accion: string
  entidad: string | null
  entidad_id: number | null
  detalle: string | null
}

export type EstadoUpdater =
  | 'verificando'
  | 'disponible'
  | 'descargando'
  | 'listo'
  | 'al-dia'
  | 'error'

export interface UpdaterPayload {
  estado: EstadoUpdater
  version?: string
  porcentaje?: number
  releaseUrl?: string
}

// Contrato de respuestas IPC: unifica el patrón { ok, error? }.
export interface RespuestaError {
  ok: false
  error: string
}

export type Respuesta<T = Record<string, never>> = ({ ok: true } & T) | RespuestaError
