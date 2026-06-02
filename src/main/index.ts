import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import {
  abonarFiado,
  buscarFiados,
  convertirFiadoAVenta,
  convertirVentaAFiado,
  createUser,
  deleteUser,
  editarFiadoDetalle,
  editarVenta,
  eliminarFiadoDetalle,
  eliminarVenta,
  esAdmin,
  findUser,
  getFiadosDetalleAdmin,
  getFiadosHoy,
  getHistorialFiado,
  getTodosLosFiados,
  getTotalFiados,
  getTotalFiadosHoy,
  getTotalVentasHoy,
  getVentasAdmin,
  getVentasHoy,
  listUsers,
  registrarFio,
  registrarVenta
} from './db'
import { iniciarUpdater, instalarUpdate } from './updater'

ipcMain.handle('auth:login', async (_event, username: string, pin: string) => {
  try {
    const user = findUser(username, pin)
    if (user) return { ok: true, user }
    return { ok: false, error: 'Usuario o PIN incorrecto' }
  } catch (err) {
    console.error('Error en auth:login: ', err)
    return { ok: false, error: 'Error interno' }
  }
})

ipcMain.handle('ventas:registrar', (_e, monto: number) => {
  try {
    registrarVenta(monto)
    return { ok: true }
  } catch (err) {
    console.error(err)
    return { ok: false }
  }
})

ipcMain.handle('ventas:hoy', () => ({
  ventas: getVentasHoy(),
  ...getTotalVentasHoy()
}))

ipcMain.handle('fiados:buscar', () => {
  return buscarFiados()
})

ipcMain.handle('fiados:registrar', (_e, nombre: string, monto: number, id_usuario: number) => {
  try {
    registrarFio(nombre, monto, id_usuario)
    return { ok: true }
  } catch (err) {
    console.error(err)
    return { ok: false }
  }
})

ipcMain.handle('fiados:hoy', () => ({
  fios: getFiadosHoy(),
  ...getTotalFiadosHoy()
}))

ipcMain.handle('fiados:total', () => {
  return getTotalFiados()
})

ipcMain.handle('fiados:todos', () => {
  return getTodosLosFiados()
})

ipcMain.handle('fiados:abonar', (_e, id: number, monto: number) => {
  try {
    abonarFiado(id, monto)
    return { ok: true }
  } catch (err) {
    console.error(err)
    return { ok: false }
  }
})

ipcMain.handle('fiados:historial', (_e, id: number) => {
  return getHistorialFiado(id)
})

ipcMain.handle('usuarios:listar', () => {
  return listUsers()
})

ipcMain.handle(
  'usuarios:registrar',
  (_e, username: string, pin: string, is_admin: boolean = false) => {
    try {
      createUser(username, pin, is_admin)
      return { ok: true }
    } catch (err) {
      console.error(err)
      return { ok: false }
    }
  }
)

ipcMain.handle('usuarios:eliminar', (_e, id: number) => {
  try {
    deleteUser(id)
    return { ok: true }
  } catch (err) {
    console.error(err)
    return { ok: false }
  }
})

ipcMain.handle('updater:instalar', () => {
  instalarUpdate()
})

// Admin handlers
ipcMain.handle('admin:ventas:historial', (_e, id_usuario: number) => {
  if (!esAdmin(id_usuario)) return { ok: false, error: 'No autorizado' }
  try {
    return { ok: true, ventas: getVentasAdmin() }
  } catch (err) {
    console.error(err)
    return { ok: false, error: 'Error interno' }
  }
})

ipcMain.handle('admin:ventas:editar', (_e, id_usuario: number, id_number, monto: number) => {
  if (!esAdmin(id_usuario)) return { ok: false, error: 'No autorizado' }
  try {
    editarVenta(id_number, monto)
    return { ok: true }
  } catch (err) {
    console.error(err)
    return { ok: false, error: 'Error interno' }
  }
})

ipcMain.handle('admin:ventas:eliminar', (_e, id_usuario: number, id: number) => {
  if (!esAdmin(id_usuario)) return { ok: false, error: 'No autorizado' }
  try {
    eliminarVenta(id)
    return { ok: true }
  } catch (err) {
    console.error(err)
    return { ok: false, error: 'Error interno' }
  }
})

ipcMain.handle('admin:ventas:convertir', (_e, id_usuario: number, id: number, nombre: string) => {
  if (!esAdmin(id_usuario)) return { ok: false, error: 'No autorizado' }
  try {
    convertirVentaAFiado(id, nombre, id_usuario)
    return { ok: true }
  } catch (err) {
    console.error(err)
    return { ok: false, error: 'Error interno' }
  }
})

ipcMain.handle('admin:fiados:historial', (_e, id_usuario: number) => {
  if (!esAdmin(id_usuario)) return { ok: false, error: 'No autorizado' }
  try {
    return { ok: true, fiados: getFiadosDetalleAdmin() }
  } catch (err) {
    console.error(err)
    return { ok: false, error: 'Error interno' }
  }
})

ipcMain.handle(
  'admin:fiados:editar',
  (
    _e,
    id_usuario: number,
    detalle_id: number,
    fiado_id: number,
    monto_anterior: number,
    monto_nuevo: number
  ) => {
    if (!esAdmin(id_usuario)) return { ok: false, error: 'No autorizado' }
    try {
      editarFiadoDetalle(detalle_id, fiado_id, monto_anterior, monto_nuevo)
      return { ok: true }
    } catch (err) {
      console.error(err)
      return { ok: false, error: 'Error interno' }
    }
  }
)

ipcMain.handle(
  'admin:fiados:eliminar',
  (_e, id_usuario: number, detalle_id: number, fiado_id: number, monto: number) => {
    if (!esAdmin(id_usuario)) return { ok: false, error: 'No autorizado' }
    try {
      eliminarFiadoDetalle(detalle_id, fiado_id, monto)
      return { ok: true }
    } catch (err) {
      console.error(err)
      return { ok: false, error: 'Error interno' }
    }
  }
)

ipcMain.handle(
  'admin:fiados:convertir',
  (_e, id_usuario: number, detalle_id: number, fiados_id: number, monto: number) => {
    if (!esAdmin(id_usuario)) return { ok: false, error: 'No autorizado' }
    try {
      convertirFiadoAVenta(detalle_id, fiados_id, monto)
      return { ok: true }
    } catch (err) {
      console.error(err)
      return { ok: false, error: 'Error interno' }
    }
  }
)

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
      sandbox: false,
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

  // IPC test
  ipcMain.on('ping', () => console.log('pong'))

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
