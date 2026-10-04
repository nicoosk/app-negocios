import { contextBridge, ipcRenderer, shell, type IpcRendererEvent } from 'electron'
import type {
  EstadoEscaner,
  FiadoDetalleAdmin,
  FiadoHoy,
  HistorialFiado,
  LineaCarrito,
  Producto,
  RegistroAuditoria,
  ResumenFiado,
  Sesion,
  UpdaterPayload,
  Usuario,
  VentaAdmin,
  VentaHoy
} from '../shared/tipos'

type RespuestaApi = { ok: boolean; error?: string }

export interface Api {
  login: (username: string, pin: string) => Promise<{ ok: boolean; user?: Sesion; error?: string }>
  logout: () => Promise<{ ok: boolean }>
  ventas: {
    registrar: (monto: number, lineas: LineaCarrito[]) => Promise<RespuestaApi>
    hoy: () => Promise<{ ventas: VentaHoy[]; total: number; count: number }>
  }
  fiados: {
    buscar: (query: string) => Promise<ResumenFiado[]>
    registrar: (nombre: string, monto: number, lineas: LineaCarrito[]) => Promise<RespuestaApi>
    hoy: () => Promise<{ fiados: FiadoHoy[]; total: number; deudores: number }>
    total: () => Promise<{ total: number }>
    todos: () => Promise<ResumenFiado[]>
    abonar: (id: number, monto: number) => Promise<RespuestaApi>
    historial: (id: number) => Promise<HistorialFiado[]>
  }
  usuarios: {
    listar: () => Promise<{ ok: boolean; usuarios: Usuario[]; error?: string }>
    registrar: (username: string, pin: string, is_admin?: boolean) => Promise<RespuestaApi>
    eliminar: (id: number) => Promise<RespuestaApi>
  }
  updater: {
    onEstado: (cb: (payload: UpdaterPayload) => void) => () => void
    instalar: () => Promise<void>
    abrirUrl: (url: string) => void
    notas: (version: string) => Promise<string | null>
  }
  admin: {
    ventas: {
      historial: () => Promise<{ ok: boolean; ventas?: VentaAdmin[]; error?: string }>
      editar: (id: number, monto: number) => Promise<RespuestaApi>
      eliminar: (id: number) => Promise<RespuestaApi>
      convertir: (id: number, nombre: string) => Promise<RespuestaApi>
    }
    fiados: {
      historial: () => Promise<{ ok: boolean; fiados?: FiadoDetalleAdmin[]; error?: string }>
      editar: (
        detalle_id: number,
        fiado_id: number,
        monto_anterior: number,
        monto_nuevo: number
      ) => Promise<RespuestaApi>
      eliminar: (detalle_id: number, fiado_id: number, monto: number) => Promise<RespuestaApi>
      convertir: (detalle_id: number, fiado_id: number, monto: number) => Promise<RespuestaApi>
    }
    auditoria: {
      listar: () => Promise<{ ok: boolean; registros: RegistroAuditoria[]; error?: string }>
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
    ) => Promise<RespuestaApi>
    actualizar: (
      id: number,
      nombre: string,
      codigo_barra: string | null,
      precio_venta: number,
      stock: number,
      unidad: string
    ) => Promise<RespuestaApi>
    eliminar: (id: number) => Promise<RespuestaApi>
    buscar: (query: string) => Promise<{ ok: boolean; productos: Producto[] }>
    escanear: (codigo: string) => Promise<{
      ok: boolean
      producto?: Producto
      nuevo?: boolean
      error?: string
    }>
    contarNuevos: () => Promise<{ ok: boolean; count: number }>
    resolverNuevo: (
      id: number,
      nombre: string,
      precio_venta: number,
      stock: number,
      unidad: string
    ) => Promise<RespuestaApi>
  }
  scanner: {
    estado: () => Promise<EstadoEscaner>
    iniciar: () => Promise<EstadoEscaner>
    detener: () => Promise<EstadoEscaner>
    onCodigo: (cb: (codigo: string) => void) => () => void
  }
}

// Puente seguro: única superficie que el renderer ve como `window.api`.
const api: Api = {
  login: (username, pin) => ipcRenderer.invoke('auth:login', username, pin),
  logout: () => ipcRenderer.invoke('auth:logout'),
  ventas: {
    registrar: (monto, lineas) => ipcRenderer.invoke('ventas:registrar', monto, lineas),
    hoy: () => ipcRenderer.invoke('ventas:hoy')
  },
  fiados: {
    buscar: (query) => ipcRenderer.invoke('fiados:buscar', query),
    registrar: (nombre, monto, lineas) =>
      ipcRenderer.invoke('fiados:registrar', nombre, monto, lineas),
    hoy: () => ipcRenderer.invoke('fiados:hoy'),
    total: () => ipcRenderer.invoke('fiados:total'),
    todos: () => ipcRenderer.invoke('fiados:todos'),
    abonar: (id, monto) => ipcRenderer.invoke('fiados:abonar', id, monto),
    historial: (id) => ipcRenderer.invoke('fiados:historial', id)
  },
  usuarios: {
    listar: () => ipcRenderer.invoke('usuarios:listar'),
    registrar: (username, pin, is_admin = false) =>
      ipcRenderer.invoke('usuarios:registrar', username, pin, is_admin),
    eliminar: (id) => ipcRenderer.invoke('usuarios:eliminar', id)
  },
  updater: {
    onEstado: (cb) => {
      const handler = (_e: IpcRendererEvent, payload: UpdaterPayload): void => cb(payload)
      ipcRenderer.on('updater:estado', handler)
      return () => ipcRenderer.removeListener('updater:estado', handler)
    },
    instalar: () => ipcRenderer.invoke('updater:instalar'),
    abrirUrl: (url) => shell.openExternal(url),
    notas: (version) => ipcRenderer.invoke('updater:notas', version)
  },
  admin: {
    ventas: {
      historial: () => ipcRenderer.invoke('admin:ventas:historial'),
      editar: (id, monto) => ipcRenderer.invoke('admin:ventas:editar', id, monto),
      eliminar: (id) => ipcRenderer.invoke('admin:ventas:eliminar', id),
      convertir: (id, nombre) => ipcRenderer.invoke('admin:ventas:convertir', id, nombre)
    },
    fiados: {
      historial: () => ipcRenderer.invoke('admin:fiados:historial'),
      editar: (detalle_id, fiado_id, monto_anterior, monto_nuevo) =>
        ipcRenderer.invoke(
          'admin:fiados:editar',
          detalle_id,
          fiado_id,
          monto_anterior,
          monto_nuevo
        ),
      eliminar: (detalle_id, fiado_id, monto) =>
        ipcRenderer.invoke('admin:fiados:eliminar', detalle_id, fiado_id, monto),
      convertir: (detalle_id, fiado_id, monto) =>
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
    crear: (nombre, codigo_barra, precio_venta, stock, unidad) =>
      ipcRenderer.invoke('productos:crear', nombre, codigo_barra, precio_venta, stock, unidad),
    actualizar: (id, nombre, codigo_barra, precio_venta, stock, unidad) =>
      ipcRenderer.invoke(
        'productos:actualizar',
        id,
        nombre,
        codigo_barra,
        precio_venta,
        stock,
        unidad
      ),
    eliminar: (id) => ipcRenderer.invoke('productos:eliminar', id),
    buscar: (query) => ipcRenderer.invoke('productos:buscar', query),
    escanear: (codigo) => ipcRenderer.invoke('productos:escanear', codigo),
    contarNuevos: () => ipcRenderer.invoke('productos:contarNuevos'),
    resolverNuevo: (id, nombre, precio_venta, stock, unidad) =>
      ipcRenderer.invoke('productos:resolverNuevo', id, nombre, precio_venta, stock, unidad)
  },
  scanner: {
    estado: () => ipcRenderer.invoke('scanner:estado'),
    iniciar: () => ipcRenderer.invoke('scanner:iniciar'),
    detener: () => ipcRenderer.invoke('scanner:detener'),
    onCodigo: (cb) => {
      const handler = (_e: IpcRendererEvent, codigo: string): void => cb(codigo)
      ipcRenderer.on('scanner:codigo', handler)
      return () => ipcRenderer.removeListener('scanner:codigo', handler)
    }
  }
}

export function exponerApi(): void {
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
}
