import { contextBridge, ipcRenderer, shell } from 'electron'
import { UpdaterPayload, LineaCarrito } from './types'

// Custom APIs for renderer
const api = {
  login: (username: string, pin: string) => ipcRenderer.invoke('auth:login', username, pin),
  logout: () => ipcRenderer.invoke('auth:logout'),
  ventas: {
    registrar: (monto: number, lineas: LineaCarrito[]) =>
      ipcRenderer.invoke('ventas:registrar', monto, lineas),
    hoy: () => ipcRenderer.invoke('ventas:hoy')
  },
  fiados: {
    buscar: (query: string) => ipcRenderer.invoke('fiados:buscar', query),
    registrar: (nombre: string, monto: number, lineas: LineaCarrito[]) =>
      ipcRenderer.invoke('fiados:registrar', nombre, monto, lineas),
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
    instalar: () => ipcRenderer.invoke('updater:instalar'),
    abrirUrl: (url: string) => shell.openExternal(url),
    notas: (version: string) => ipcRenderer.invoke('updater:notas', version)
  },
  admin: {
    ventas: {
      historial: () => ipcRenderer.invoke('admin:ventas:historial'),
      editar: (id: number, monto: number) => ipcRenderer.invoke('admin:ventas:editar', id, monto),
      eliminar: (id: number) => ipcRenderer.invoke('admin:ventas:eliminar', id),
      convertir: (id: number, nombre: string) =>
        ipcRenderer.invoke('admin:ventas:convertir', id, nombre)
    },
    fiados: {
      historial: () => ipcRenderer.invoke('admin:fiados:historial'),
      editar: (detalle_id: number, fiado_id: number, monto_anterior: number, monto_nuevo: number) =>
        ipcRenderer.invoke(
          'admin:fiados:editar',
          detalle_id,
          fiado_id,
          monto_anterior,
          monto_nuevo
        ),
      eliminar: (detalle_id: number, fiado_id: number, monto: number) =>
        ipcRenderer.invoke('admin:fiados:eliminar', detalle_id, fiado_id, monto),
      convertir: (detalle_id: number, fiado_id: number, monto: number) =>
        ipcRenderer.invoke('admin:fiados:convertir', detalle_id, fiado_id, monto)
    },
    auditoria: {
      listar: () => ipcRenderer.invoke('auditoria:listar')
    }
  },
  app: {
    version: () => ipcRenderer.invoke('app:version')
  },
  productos: {
    listar: () => ipcRenderer.invoke('productos:listar'),
    crear: (
      nombre: string,
      codigo_barra: string | null,
      precio_venta: number,
      stock: number,
      unidad: string
    ) => ipcRenderer.invoke('productos:crear', nombre, codigo_barra, precio_venta, stock, unidad),
    actualizar: (
      id: number,
      nombre: string,
      codigo_barra: string | null,
      precio_venta: number,
      stock: number,
      unidad: string
    ) =>
      ipcRenderer.invoke(
        'productos:actualizar',
        id,
        nombre,
        codigo_barra,
        precio_venta,
        stock,
        unidad
      ),
    eliminar: (id: number) => ipcRenderer.invoke('productos:eliminar', id),
    buscar: (query: string) => ipcRenderer.invoke('productos:buscar', query)
  }
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.api = api
}
