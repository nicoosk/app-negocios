import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import {
  buscarFiados,
  findUser,
  getFiadosHoy,
  getTotalFiadosHoy,
  getTotalVentasHoy,
  getVentasHoy,
  registrarFio,
  registrarVenta
} from './db'

ipcMain.handle('auth:login', async (_event, username: string, pin: string) => {
  try {
    const user = findUser(username, pin)
    if (user) return { ok: true }
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

ipcMain.handle('fiados:buscar', (_e, query: string) => {
  return buscarFiados(query)
})

ipcMain.handle('fiados:registrar', (_e, nombre: string, monto: number) => {
  try {
    registrarFio(nombre, monto)
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

function createWindow(): void {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    autoHideMenuBar: true,
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
