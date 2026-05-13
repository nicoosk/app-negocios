import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Custom APIs for renderer
const api = {
  login: (username: string, pin: string) => ipcRenderer.invoke('auth:login', username, pin),
  ventas: {
    registrar: (monto: number) => ipcRenderer.invoke('ventas:registrar', monto),
    hoy: () => ipcRenderer.invoke('ventas:hoy')
  },
  fiados: {
    buscar: (query: string) => ipcRenderer.invoke('fiados:buscar', query),
    registrar: (nombre: string, monto: number) =>
      ipcRenderer.invoke('fiados:registrar', nombre, monto),
    hoy: () => ipcRenderer.invoke('fiados:hoy')
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
