import { ElectronAPI } from '@electron-toolkit/preload'
import { Usuario } from '@renderer/usuarios/PanelUsuarios'
import { UpdaterPayload } from './types'

type DefaultResponse = {
  ok: boolean
  error?: string
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      login: (
        username: string,
        pin: string
      ) => Promise<{ ok: boolean; user: Usuario; error?: string }>
      ventas: {
        registrar: (monto: number) => Promise<{ ok: boolean }>
        hoy: () => Promise<{
          ventas: { monto: number; hora: string }[]
          total: number
          count: number
        }>
      }
      fiados: {
        buscar: (query: string) => Promise<{ id: number; nombre: string; deuda_total: number }[]>
        registrar: (nombre: string, monto: number, id_usuario: number) => Promise<{ ok: boolean }>
        hoy: () => Promise<{
          fios: { nombre: string; monto: number; hora: string }[]
          total: number
          deudores: number
        }>
        total: () => Promise<{ total: number }>
        todos: () => Promise<{ id: number; nombre: string; deuda_total: number }[]>
        abonar: (id: number, monto: number, id_usuario: number) => Promise<{ ok: boolean }>
        historial: (id: number) => Promise<{ monto: number; fecha: string; hora: string }[]>
      }
      usuarios: {
        listar: () => Promise<
          { id: number; username: string; creado_en: string; is_admin: boolean }[]
        >
        registrar: (
          username: string,
          pin: string,
          is_admin: boolean = false
        ) => Promise<{ ok: boolean }>
        eliminar: (id: number) => Promise<{ ok: boolean }>
      }
      updater: {
        onEstado: (cb: (payload: UpdaterPayload) => void) => void
        instalar: () => Promise<void>
        abrirUrl: (url: string) => void
      }
      admin: {
        ventas: {
          historial: (id_usuario: number) => Promise<{
            ok: boolean
            ventas?: { id: number; monto: number; fecha: string; hora: string }[]
            error?: string
          }>
          editar: (id_usuario: number, id: number, monto: number) => Promise<DefaultResponse>
          eliminar: (id_usuario: number, id: number) => Promise<DefaultResponse>
          convertir: (id_usuario: number, id: number, nombre: string) => Promise<DefaultResponse>
        }
        fiados: {
          historial: (id_usuario: number) => Promise<{
            ok: boolea
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
            id_usuario: number,
            detalle_id: number,
            fiado_id: number,
            monto_anterior: number,
            monto_nuevo: number
          ) => Promise<DefaultResponse>
          eliminar: (
            id_usuario: number,
            detalle_id: number,
            fiado_id: number,
            monto: number
          ) => Promise<DefaultResponse>
          convertir: (
            id_usuario: number,
            detalle_id: number,
            fiado_id: number,
            monto: number
          ) => Promise<DefaultResponse>
        }
      }
    }
  }
}
