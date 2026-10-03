import { FiadoHoy, LineaCarrito, UpdaterPayload, VentaHoy } from './types'

type DefaultResponse = {
  ok: boolean
  error?: string
}

interface Producto {
  id: number
  nombre: string
  codigo_barra: string | null
  precio_venta: number
  stock: number
  unidad: string
  activo: number
  creado_en: string
}

interface SesionUsuario {
  id: number
  username: string
  is_admin: boolean
}

interface UsuarioListado {
  id: number
  username: string
  creado_en: string
  is_admin: boolean
}

declare global {
  interface Window {
    api: {
      login: (
        username: string,
        pin: string
      ) => Promise<{ ok: boolean; user?: SesionUsuario; error?: string }>
      logout: () => Promise<{ ok: boolean }>
      ventas: {
        registrar: (monto: number, lineas: LineaCarrito[]) => Promise<DefaultResponse>
        hoy: () => Promise<{
          ventas: VentaHoy[]
          total: number
          count: number
        }>
      }
      fiados: {
        buscar: (query: string) => Promise<{ id: number; nombre: string; deuda_total: number }[]>
        registrar: (
          nombre: string,
          monto: number,
          lineas: LineaCarrito[]
        ) => Promise<DefaultResponse>
        hoy: () => Promise<{
          fios: FiadoHoy[]
          total: number
          deudores: number
        }>
        total: () => Promise<{ total: number }>
        todos: () => Promise<{ id: number; nombre: string; deuda_total: number }[]>
        abonar: (id: number, monto: number) => Promise<DefaultResponse>
        historial: (id: number) => Promise<{ monto: number; fecha: string; hora: string }[]>
      }
      usuarios: {
        listar: () => Promise<{ ok: boolean; usuarios: UsuarioListado[]; error?: string }>
        registrar: (username: string, pin: string, is_admin?: boolean) => Promise<DefaultResponse>
        eliminar: (id: number) => Promise<DefaultResponse>
      }
      updater: {
        onEstado: (cb: (payload: UpdaterPayload) => void) => void
        instalar: () => Promise<void>
        abrirUrl: (url: string) => void
        notas: (version: string) => Promise<string | null>
      }
      admin: {
        ventas: {
          historial: () => Promise<{
            ok: boolean
            ventas?: {
              id: number
              monto: number
              fecha: string
              hora: string
              username: string | null
            }[]
            error?: string
          }>
          editar: (id: number, monto: number) => Promise<DefaultResponse>
          eliminar: (id: number) => Promise<DefaultResponse>
          convertir: (id: number, nombre: string) => Promise<DefaultResponse>
        }
        fiados: {
          historial: () => Promise<{
            ok: boolean
            fiados?: {
              id: number
              fiado_id: number
              nombre: string
              monto: number
              fecha: string
              hora: string
              username: string
            }[]
            error?: string
          }>
          editar: (
            detalle_id: number,
            fiado_id: number,
            monto_anterior: number,
            monto_nuevo: number
          ) => Promise<DefaultResponse>
          eliminar: (
            detalle_id: number,
            fiado_id: number,
            monto: number
          ) => Promise<DefaultResponse>
          convertir: (
            detalle_id: number,
            fiado_id: number,
            monto: number
          ) => Promise<DefaultResponse>
        }
        auditoria: {
          listar: () => Promise<{
            ok: boolean
            registros: {
              id: number
              fecha: string
              hora: string
              username: string | null
              accion: string
              entidad: string | null
              entidad_id: number | null
              detalle: string | null
            }[]
            error?: string
          }>
        }
      }
      app: {
        version: () => Promise<string>
      }
      productos: {
        listar: () => Promise<{ ok: boolean; productos: Producto[] }>
        crear: (
          nombre: string,
          codigo_barra: string | null,
          precio_venta: number,
          stock: number,
          unidad: string
        ) => Promise<DefaultResponse>
        actualizar: (
          id: number,
          nombre: string,
          codigo_barra: string | null,
          precio_venta: number,
          stock: number,
          unidad: string
        ) => Promise<DefaultResponse>
        eliminar: (id: number) => Promise<DefaultResponse>
        buscar: (query: string) => Promise<{ ok: boolean; productos: Producto[] }>
      }
    }
  }
}
