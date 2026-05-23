import { ElectronAPI } from '@electron-toolkit/preload'

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      login: (
        username: string,
        pin: string
      ) => Promise<{ ok: boolean; username: string; error?: string }>
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
        registrar: (nombre: string, monto: number) => Promise<{ ok: boolean }>
        hoy: () => Promise<{
          fios: { nombre: string; monto: number; hora: string }[]
          total: number
          deudores: number
        }>
        total: () => Promise<{ total: number }>
        todos: () => Promise<{ id: number; nombre: string; deuda_total: number }[]>
        abonar: (id: number, monto: number) => Promise<{ ok: boolean }>
      }
    }
  }
}
