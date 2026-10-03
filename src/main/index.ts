import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import {
  abonarFiado,
  actualizarProducto,
  buscarFiados,
  buscarProductosPorNombre,
  contarAdmins,
  convertirFiadoAVenta,
  convertirVentaAFiado,
  crearProducto,
  createUser,
  deleteUser,
  editarFiadoDetalle,
  editarVenta,
  eliminarFiadoDetalle,
  eliminarProducto,
  eliminarVenta,
  findUser,
  getAuditoria,
  getFiadosDetalleAdmin,
  getFiadosHoy,
  getHistorialFiado,
  getTodosLosFiados,
  getTotalFiados,
  getTotalFiadosHoy,
  getTotalVentasHoy,
  getVentasAdmin,
  getVentasHoy,
  LineaCarrito,
  listarProductos,
  listUsers,
  registrarAuditoria,
  registrarFio,
  registrarVenta,
  usuarioTieneActividad
} from './db'
import {
  cerrarSesion,
  esAdminActual,
  iniciarSesion,
  sesionActual,
  SIN_AUTORIZACION
} from './sesion'
import { iniciarUpdater, instalarUpdate } from './updater'

function auditar(
  accion: string,
  entidad: string,
  entidadId: number | null,
  detalle?: unknown
): void {
  try {
    const usuario = sesionActual()
    registrarAuditoria({
      id_usuario: usuario?.id ?? null,
      username: usuario?.username ?? null,
      accion,
      entidad,
      entidad_id: entidadId,
      detalle: detalle === undefined ? null : JSON.stringify(detalle)
    })
  } catch (err) {
    console.error('[auditoria] No se pudo registrar la acción:', err)
  }
}

ipcMain.handle('auth:login', async (_event, username: string, pin: string) => {
  try {
    const user = findUser(username, pin)
    if (!user) {
      registrarAuditoria({
        id_usuario: null,
        username: username,
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

ipcMain.handle('ventas:registrar', (_e, monto: number, lineas: LineaCarrito[]) => {
  const usuario = sesionActual()
  if (!usuario) return SIN_AUTORIZACION
  try {
    const res = registrarVenta(monto, lineas, usuario.id)
    auditar('venta_registrada', 'venta', Number(res.lastInsertRowid), {
      monto,
      items: lineas.length
    })
    return { ok: true }
  } catch (err) {
    console.error(err)
    return { ok: false }
  }
})

ipcMain.handle('ventas:hoy', () => {
  if (!sesionActual()) return { ventas: [], total: 0, count: 0 }
  return {
    ventas: getVentasHoy(),
    ...getTotalVentasHoy()
  }
})

ipcMain.handle('fiados:buscar', () => {
  if (!sesionActual()) return []
  return buscarFiados()
})

ipcMain.handle('fiados:registrar', (_e, nombre: string, monto: number, lineas: LineaCarrito[]) => {
  const usuario = sesionActual()
  if (!usuario) return SIN_AUTORIZACION
  try {
    const res = registrarFio(nombre, monto, usuario.id, lineas)
    auditar('fiado_registrado', 'fiado_detalle', Number(res.lastInsertRowid), { nombre, monto })
    return { ok: true }
  } catch (err) {
    console.error(err)
    return { ok: false }
  }
})

ipcMain.handle('fiados:hoy', () => {
  if (!sesionActual()) return { fios: [], total: 0, deudores: 0 }
  return {
    fios: getFiadosHoy(),
    ...getTotalFiadosHoy()
  }
})

ipcMain.handle('fiados:total', () => {
  if (!sesionActual()) return { total: 0 }
  return getTotalFiados()
})

ipcMain.handle('fiados:todos', () => {
  if (!sesionActual()) return []
  return getTodosLosFiados()
})

ipcMain.handle('fiados:abonar', (_e, id: number, monto: number) => {
  const usuario = sesionActual()
  if (!usuario) return SIN_AUTORIZACION
  try {
    abonarFiado(id, monto, usuario.id)
    auditar('abono_registrado', 'fiado', id, { monto })
    return { ok: true }
  } catch (err) {
    console.error(err)
    return { ok: false }
  }
})

ipcMain.handle('fiados:historial', (_e, id: number) => {
  if (!sesionActual()) return []
  return getHistorialFiado(id)
})

ipcMain.handle('usuarios:listar', () => {
  if (!esAdminActual()) return { ...SIN_AUTORIZACION, usuarios: [] }
  return { ok: true, usuarios: listUsers() }
})

ipcMain.handle(
  'usuarios:registrar',
  (_e, username: string, pin: string, is_admin: boolean = false) => {
    if (!esAdminActual()) return SIN_AUTORIZACION
    try {
      const res = createUser(username, pin, is_admin)
      auditar('usuario_creado', 'usuario', Number(res.lastInsertRowid), { username, is_admin })
      return { ok: true }
    } catch (err) {
      console.error(err)
      return { ok: false }
    }
  }
)

ipcMain.handle('usuarios:eliminar', (_e, id: number) => {
  const usuario = sesionActual()
  if (!usuario || !usuario.is_admin) return SIN_AUTORIZACION
  if (usuario.id === id) {
    return { ok: false, error: 'No puedes eliminar tu propio usuario' }
  }
  if (contarAdmins() <= 1) {
    return { ok: false, error: 'Debe quedar al menos un administrador' }
  }
  if (usuarioTieneActividad(id)) {
    return {
      ok: false,
      error: 'El usuario tiene ventas o fíos registrados; no se puede eliminar'
    }
  }
  try {
    deleteUser(id)
    auditar('usuario_eliminado', 'usuario', id)
    return { ok: true }
  } catch (err) {
    console.error(err)
    return { ok: false, error: 'No se pudo eliminar el usuario' }
  }
})

ipcMain.handle('auditoria:listar', () => {
  if (!esAdminActual()) return { ...SIN_AUTORIZACION, registros: [] }
  try {
    return { ok: true, registros: getAuditoria() }
  } catch (err) {
    console.error(err)
    return { ok: false, registros: [], error: 'Error interno' }
  }
})

ipcMain.handle('updater:instalar', () => {
  instalarUpdate()
})

// Admin handlers
ipcMain.handle('admin:ventas:historial', () => {
  if (!esAdminActual()) return SIN_AUTORIZACION
  try {
    return { ok: true, ventas: getVentasAdmin() }
  } catch (err) {
    console.error(err)
    return { ok: false, error: 'Error interno' }
  }
})

ipcMain.handle('admin:ventas:editar', (_e, id_number: number, monto: number) => {
  if (!esAdminActual()) return SIN_AUTORIZACION
  try {
    editarVenta(id_number, monto)
    auditar('venta_editada', 'venta', id_number, { monto })
    return { ok: true }
  } catch (err) {
    console.error(err)
    return { ok: false, error: 'Error interno' }
  }
})

ipcMain.handle('admin:ventas:eliminar', (_e, id: number) => {
  if (!esAdminActual()) return SIN_AUTORIZACION
  try {
    eliminarVenta(id)
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
    convertirVentaAFiado(id, nombre, usuario.id)
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
    return { ok: true, fiados: getFiadosDetalleAdmin() }
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
      editarFiadoDetalle(detalle_id, fiado_id, monto_anterior, monto_nuevo)
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
      eliminarFiadoDetalle(detalle_id, fiado_id, monto)
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
      convertirFiadoAVenta(detalle_id, fiado_id, monto, usuario.id)
      auditar('fiado_convertido_a_venta', 'fiado_detalle', detalle_id, { monto })
      return { ok: true }
    } catch (err) {
      console.error(err)
      return { ok: false, error: 'Error interno' }
    }
  }
)

// Handlers para fetchs externos
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

// App specifics
ipcMain.handle('app:version', () => app.getVersion())

// Productos / Inventario
ipcMain.handle('productos:listar', () => {
  if (!sesionActual()) return { ok: false, productos: [] }
  try {
    return { ok: true, productos: listarProductos() }
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
      const res = crearProducto(nombre, codigo_barra, precio_venta, stock, unidad)
      auditar('producto_creado', 'producto', Number(res.lastInsertRowid), { nombre })
      return { ok: true }
    } catch (err) {
      console.error(err)
      return { ok: false }
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
      actualizarProducto(id, nombre, codigo_barra, precio_venta, stock, unidad)
      auditar('producto_actualizado', 'producto', id, { nombre })
      return { ok: true }
    } catch (err) {
      console.error(err)
      return { ok: false }
    }
  }
)

ipcMain.handle('productos:eliminar', (_e, id: number) => {
  if (!esAdminActual()) return SIN_AUTORIZACION
  try {
    eliminarProducto(id)
    auditar('producto_eliminado', 'producto', id)
    return { ok: true }
  } catch (err) {
    console.error(err)
    return { ok: false }
  }
})

ipcMain.handle('productos:buscar', (_e, query: string) => {
  if (!sesionActual()) return { ok: false, productos: [] }
  try {
    return { ok: true, productos: buscarProductosPorNombre(query) }
  } catch (err) {
    console.error(err)
    return { ok: false, productos: [] }
  }
})

function createWindow(): void {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    autoHideMenuBar: true,
    title: 'Mi Negocio Digital',
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
    iniciarUpdater(mainWindow)
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
