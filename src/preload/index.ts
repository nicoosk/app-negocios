import { contextBridge, ipcRenderer, shell } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import { UpdaterPayload } from './types'

// Custom APIs for renderer
const api = {
  login: (username: string, pin: string) => ipcRenderer.invoke('auth:login', username, pin),
  ventas: {
    registrar: (monto: number) => ipcRenderer.invoke('ventas:registrar', monto),
    hoy: () => ipcRenderer.invoke('ventas:hoy')
  },
  fiados: {
    buscar: (query: string) => ipcRenderer.invoke('fiados:buscar', query),
    registrar: (nombre: string, monto: number, id_usuario: number) =>
      ipcRenderer.invoke('fiados:registrar', nombre, monto, id_usuario),
    hoy: () => ipcRenderer.invoke('fiados:hoy'),
    total: () => ipcRenderer.invoke('fiados:total'),
    todos: () => ipcRenderer.invoke('fiados:todos'),
    abonar: (id: number, monto: number, id_usuario: number) =>
      ipcRenderer.invoke('fiados:abonar', id, monto, id_usuario),
    historial: (id: number) => ipcRenderer.invoke('fiados:historial', id)
  },
  usuarios: {
    listar: () => ipcRenderer.invoke('usuarios:listar'),
    registrar: (username: string, pin: string, is_admin: boolean = false) =>
      ipcRenderer.invoke('usuarios:registrar', username, pin, is_admin),
    eliminar: (id: number) => ipcRenderer.invoke('usuarios:eliminar', id)
  },
  updater: {
    onEstado: (cb: (payload: UpdaterPayload) => void) => {
      const handler = (_e: Electron.IpcRendererEvent, payload: UpdaterPayload): void => cb(payload)
      ipcRenderer.on('updater:estado', handler)
      return () => ipcRenderer.removeListener('updater:estado', handler)
    },
    instalar: () => ipcRenderer.invoke('updater:instalar'),
    abrirUrl: (url: string) => shell.openExternal(url)
  },
  admin: {
    ventas: {
      historial: (id_usuario: number) => ipcRenderer.invoke('admin:ventas:historial', id_usuario),
      editar: (id_usuario: number, id: number, monto: number) =>
        ipcRenderer.invoke('admin:ventas:editar', id_usuario, id, monto),
      eliminar: (id_usuario: number, id: number) =>
        ipcRenderer.invoke('admin:ventas:eliminar', id_usuario, id),
      convertir: (id_usuario: number, id: number, nombre: string) =>
        ipcRenderer.invoke('admin:ventas:convertir', id_usuario, id, nombre)
    },
    fiados: {
      historial: (id_usuario: number) => ipcRenderer.invoke('admin:fiados:historial', id_usuario),
      editar: (
        id_usuario: number,
        detalle_id: number,
        fiado_id: number,
        monto_anterior: number,
        monto_nuevo: number
      ) =>
        ipcRenderer.invoke(
          'admin:fiados:editar',
          id_usuario,
          detalle_id,
          fiado_id,
          monto_anterior,
          monto_nuevo
        ),
      eliminar: (id_usuario: number, detalle_id: number, fiado_id: number, monto: number) =>
        ipcRenderer.invoke('admin:fiados:eliminar', id_usuario, detalle_id, fiado_id, monto),
      convertir: (id_usuario: number, detalle_id: number, fiado_id: number, monto: number) =>
        ipcRenderer.invoke('admin:fiados:convertir', id_usuario, detalle_id, fiado_id, monto)
    }
  }
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
