import { contextBridge, ipcRenderer } from 'electron'
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
    abonar: (id: number, monto: number) => ipcRenderer.invoke('fiados:abonar', id, monto),
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
    instalar: () => ipcRenderer.invoke('updater:instalar')
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
