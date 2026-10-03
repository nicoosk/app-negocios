import { app, ipcMain } from 'electron'
import type { LineaCarrito } from '../../shared/tipos'
import type { Nucleo } from '../nucleo'
import { crearAuditar } from '../auditoria'
import {
  cerrarSesion,
  esAdminActual,
  iniciarSesion,
  sesionActual,
  SIN_AUTORIZACION
} from '../sesion'
import { instalarUpdate } from '../updater'

// Registra todos los canales IPC. La autorización por rol y la auditoría viven
// acá, en el proceso main: el renderer nunca decide quién es el usuario.
export function registrarIpc(nucleo: Nucleo): void {
  const auditar = crearAuditar(nucleo)

  // ===== Autenticación =====
  ipcMain.handle('auth:login', async (_event, username: string, pin: string) => {
    try {
      const user = nucleo.usuarios.encontrar(username, pin)
      if (!user) {
        nucleo.auditoria.registrar({
          id_usuario: null,
          username,
          accion: 'login_fallido',
          entidad: 'usuario',
          entidad_id: null,
          detalle: null
        })
        return { ok: false, error: 'Usuario o PIN incorrecto' }
      }
      const sesion = { id: user.id, username: user.username, is_admin: user.is_admin === 1 }
      iniciarSesion(sesion)
      auditar('login', 'usuario', user.id)
      return { ok: true, user: sesion }
    } catch (err) {
      console.error('Error en auth:login: ', err)
      return { ok: false, error: 'Error interno' }
    }
  })

  ipcMain.handle('auth:logout', () => {
    const usuario = sesionActual()
    if (usuario) auditar('logout', 'usuario', usuario.id)
    cerrarSesion()
    return { ok: true }
  })

  // ===== Ventas =====
  ipcMain.handle('ventas:registrar', (_e, monto: number, lineas: LineaCarrito[]) => {
    const usuario = sesionActual()
    if (!usuario) return SIN_AUTORIZACION
    try {
      const id = nucleo.ventas.registrar(monto, lineas, usuario.id)
      auditar('venta_registrada', 'venta', id, { monto, items: lineas.length })
      return { ok: true }
    } catch (err) {
      console.error(err)
      return { ok: false, error: 'Error interno' }
    }
  })

  ipcMain.handle('ventas:hoy', () => {
    if (!sesionActual()) return { ventas: [], total: 0, count: 0 }
    return { ventas: nucleo.ventas.hoy(), ...nucleo.ventas.totalHoy() }
  })

  // ===== Fiados =====
  ipcMain.handle('fiados:buscar', () => {
    if (!sesionActual()) return []
    return nucleo.fiados.buscar()
  })

  ipcMain.handle(
    'fiados:registrar',
    (_e, nombre: string, monto: number, lineas: LineaCarrito[]) => {
      const usuario = sesionActual()
      if (!usuario) return SIN_AUTORIZACION
      try {
        const id = nucleo.fiados.registrar(nombre, monto, usuario.id, lineas)
        auditar('fiado_registrado', 'fiado_detalle', id, { nombre, monto })
        return { ok: true }
      } catch (err) {
        console.error(err)
        return { ok: false, error: 'Error interno' }
      }
    }
  )

  ipcMain.handle('fiados:hoy', () => {
    if (!sesionActual()) return { fios: [], total: 0, deudores: 0 }
    return { fios: nucleo.fiados.hoy(), ...nucleo.fiados.totalHoy() }
  })

  ipcMain.handle('fiados:total', () => {
    if (!sesionActual()) return { total: 0 }
    return nucleo.fiados.total()
  })

  ipcMain.handle('fiados:todos', () => {
    if (!sesionActual()) return []
    return nucleo.fiados.todos()
  })

  ipcMain.handle('fiados:abonar', (_e, id: number, monto: number) => {
    const usuario = sesionActual()
    if (!usuario) return SIN_AUTORIZACION
    try {
      nucleo.fiados.abonar(id, monto, usuario.id)
      auditar('abono_registrado', 'fiado', id, { monto })
      return { ok: true }
    } catch (err) {
      console.error(err)
      return { ok: false, error: 'Error interno' }
    }
  })

  ipcMain.handle('fiados:historial', (_e, id: number) => {
    if (!sesionActual()) return []
    return nucleo.fiados.historial(id)
  })

  // ===== Usuarios =====
  ipcMain.handle('usuarios:listar', () => {
    if (!esAdminActual()) return { ...SIN_AUTORIZACION, usuarios: [] }
    return { ok: true, usuarios: nucleo.usuarios.listar() }
  })

  ipcMain.handle(
    'usuarios:registrar',
    (_e, username: string, pin: string, is_admin: boolean = false) => {
      if (!esAdminActual()) return SIN_AUTORIZACION
      try {
        const id = nucleo.usuarios.crear(username, pin, is_admin)
        auditar('usuario_creado', 'usuario', id, { username, is_admin })
        return { ok: true }
      } catch (err) {
        console.error(err)
        return { ok: false, error: 'Error interno' }
      }
    }
  )

  ipcMain.handle('usuarios:eliminar', (_e, id: number) => {
    const usuario = sesionActual()
    if (!usuario || !usuario.is_admin) return SIN_AUTORIZACION
    if (usuario.id === id) {
      return { ok: false, error: 'No puedes eliminar tu propio usuario' }
    }
    if (nucleo.usuarios.contarAdmins() <= 1) {
      return { ok: false, error: 'Debe quedar al menos un administrador' }
    }
    if (nucleo.usuarios.tieneActividad(id)) {
      return {
        ok: false,
        error: 'El usuario tiene ventas o fíos registrados; no se puede eliminar'
      }
    }
    try {
      nucleo.usuarios.eliminar(id)
      auditar('usuario_eliminado', 'usuario', id)
      return { ok: true }
    } catch (err) {
      console.error(err)
      return { ok: false, error: 'No se pudo eliminar el usuario' }
    }
  })

  // ===== Administración de ventas y fíos =====
  ipcMain.handle('admin:ventas:historial', () => {
    if (!esAdminActual()) return SIN_AUTORIZACION
    try {
      return { ok: true, ventas: nucleo.ventas.admin() }
    } catch (err) {
      console.error(err)
      return { ok: false, error: 'Error interno' }
    }
  })

  ipcMain.handle('admin:ventas:editar', (_e, id: number, monto: number) => {
    if (!esAdminActual()) return SIN_AUTORIZACION
    try {
      nucleo.ventas.editar(id, monto)
      auditar('venta_editada', 'venta', id, { monto })
      return { ok: true }
    } catch (err) {
      console.error(err)
      return { ok: false, error: 'Error interno' }
    }
  })

  ipcMain.handle('admin:ventas:eliminar', (_e, id: number) => {
    if (!esAdminActual()) return SIN_AUTORIZACION
    try {
      nucleo.ventas.eliminar(id)
      auditar('venta_eliminada', 'venta', id)
      return { ok: true }
    } catch (err) {
      console.error(err)
      return { ok: false, error: 'Error interno' }
    }
  })

  ipcMain.handle('admin:ventas:convertir', (_e, id: number, nombre: string) => {
    const usuario = sesionActual()
    if (!usuario || !usuario.is_admin) return SIN_AUTORIZACION
    try {
      nucleo.ventas.convertirAFiado(id, nombre, usuario.id)
      auditar('venta_convertida_a_fiado', 'venta', id, { nombre })
      return { ok: true }
    } catch (err) {
      console.error(err)
      return { ok: false, error: 'Error interno' }
    }
  })

  ipcMain.handle('admin:fiados:historial', () => {
    if (!esAdminActual()) return SIN_AUTORIZACION
    try {
      return { ok: true, fiados: nucleo.fiados.detalleAdmin() }
    } catch (err) {
      console.error(err)
      return { ok: false, error: 'Error interno' }
    }
  })

  ipcMain.handle(
    'admin:fiados:editar',
    (_e, detalle_id: number, fiado_id: number, monto_anterior: number, monto_nuevo: number) => {
      if (!esAdminActual()) return SIN_AUTORIZACION
      try {
        nucleo.fiados.editarDetalle(detalle_id, fiado_id, monto_anterior, monto_nuevo)
        auditar('fiado_editado', 'fiado_detalle', detalle_id, { monto_anterior, monto_nuevo })
        return { ok: true }
      } catch (err) {
        console.error(err)
        return { ok: false, error: 'Error interno' }
      }
    }
  )

  ipcMain.handle(
    'admin:fiados:eliminar',
    (_e, detalle_id: number, fiado_id: number, monto: number) => {
      if (!esAdminActual()) return SIN_AUTORIZACION
      try {
        nucleo.fiados.eliminarDetalle(detalle_id, fiado_id, monto)
        auditar('fiado_eliminado', 'fiado_detalle', detalle_id, { monto })
        return { ok: true }
      } catch (err) {
        console.error(err)
        return { ok: false, error: 'Error interno' }
      }
    }
  )

  ipcMain.handle(
    'admin:fiados:convertir',
    (_e, detalle_id: number, fiado_id: number, monto: number) => {
      const usuario = sesionActual()
      if (!usuario || !usuario.is_admin) return SIN_AUTORIZACION
      try {
        nucleo.fiados.convertirAVenta(detalle_id, fiado_id, monto, usuario.id)
        auditar('fiado_convertido_a_venta', 'fiado_detalle', detalle_id, { monto })
        return { ok: true }
      } catch (err) {
        console.error(err)
        return { ok: false, error: 'Error interno' }
      }
    }
  )

  // ===== Auditoría =====
  ipcMain.handle('auditoria:listar', () => {
    if (!esAdminActual()) return { ...SIN_AUTORIZACION, registros: [] }
    try {
      return { ok: true, registros: nucleo.auditoria.listar() }
    } catch (err) {
      console.error(err)
      return { ok: false, registros: [], error: 'Error interno' }
    }
  })

  // ===== Productos / Inventario =====
  ipcMain.handle('productos:listar', () => {
    if (!sesionActual()) return { ok: false, productos: [] }
    try {
      return { ok: true, productos: nucleo.productos.listar() }
    } catch (err) {
      console.error(err)
      return { ok: false, productos: [] }
    }
  })

  ipcMain.handle(
    'productos:crear',
    (
      _e,
      nombre: string,
      codigo_barra: string | null,
      precio_venta: number,
      stock: number,
      unidad: string
    ) => {
      if (!sesionActual()) return SIN_AUTORIZACION
      try {
        const id = nucleo.productos.crear(nombre, codigo_barra, precio_venta, stock, unidad)
        auditar('producto_creado', 'producto', id, { nombre })
        return { ok: true }
      } catch (err) {
        console.error(err)
        return { ok: false, error: 'Error interno' }
      }
    }
  )

  ipcMain.handle(
    'productos:actualizar',
    (
      _e,
      id: number,
      nombre: string,
      codigo_barra: string | null,
      precio_venta: number,
      stock: number,
      unidad: string
    ) => {
      if (!sesionActual()) return SIN_AUTORIZACION
      try {
        nucleo.productos.actualizar(id, nombre, codigo_barra, precio_venta, stock, unidad)
        auditar('producto_actualizado', 'producto', id, { nombre })
        return { ok: true }
      } catch (err) {
        console.error(err)
        return { ok: false, error: 'Error interno' }
      }
    }
  )

  ipcMain.handle('productos:eliminar', (_e, id: number) => {
    if (!esAdminActual()) return SIN_AUTORIZACION
    try {
      nucleo.productos.eliminar(id)
      auditar('producto_eliminado', 'producto', id)
      return { ok: true }
    } catch (err) {
      console.error(err)
      return { ok: false, error: 'Error interno' }
    }
  })

  ipcMain.handle('productos:buscar', (_e, query: string) => {
    if (!sesionActual()) return { ok: false, productos: [] }
    try {
      return { ok: true, productos: nucleo.productos.buscarPorNombre(query) }
    } catch (err) {
      console.error(err)
      return { ok: false, productos: [] }
    }
  })

  // ===== App y actualizaciones =====
  ipcMain.handle('app:version', () => app.getVersion())

  ipcMain.handle('updater:instalar', () => {
    instalarUpdate()
  })

  ipcMain.handle('updater:notas', async (_e, version: string) => {
    try {
      const res = await fetch(
        `https://api.github.com/repos/nicoosk/app-negocios/releases/tags/v${version}`
      )
      if (!res.ok) return null
      const data = await res.json()
      return typeof data.body === 'string' ? data.body : null
    } catch {
      return null
    }
  })
}
