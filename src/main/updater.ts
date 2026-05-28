import { is } from '@electron-toolkit/utils'
import { BrowserWindow } from 'electron'
import { autoUpdater } from 'electron-updater'

export function iniciarUpdater(window: BrowserWindow): void {
  if (is.dev) return

  autoUpdater.autoDownload = false
  autoUpdater.autoInstallOnAppQuit = true

  const enviar = (canal: string, payload?: unknown): void => {
    if (!window.isDestroyed()) {
      window.webContents.send(canal, payload)
    }
  }

  autoUpdater.on('checking-for-update', () => {
    console.log('[updater] verificando...')
    enviar('updater:estado', { estado: 'verificando' })
  })

  autoUpdater.on('update-available', (info) => {
    console.log('[updater] update disponible: ', info.version)
    enviar('updater:estado', { estado: 'disponible', version: info.version })
    autoUpdater.downloadUpdate()
  })

  autoUpdater.on('update-not-available', (info) => {
    console.log('[updater] al día, versión actual:', info.version)
    enviar('updater:estado', { estado: 'al-dia' })
  })

  autoUpdater.on('download-progress', (progress) => {
    console.log('[updater] descargando actualización, progreso: ', Math.round(progress.percent))
    enviar('updater:estado', {
      estado: 'descargando',
      porcentaje: Math.round(progress.percent)
    })
  })

  autoUpdater.on('update-downloaded', (info) => {
    console.log('[updater] actualización lista, version descargada:', info.version)
    enviar('updater:estado', {
      estado: 'listo',
      version: info.version
    })
  })

  autoUpdater.on('error', (err) => {
    console.error('updater error:', err)
    enviar('updater:estado', { estado: 'error' })
  })

  autoUpdater.checkForUpdates()
}

export function instalarUpdate(): void {
  autoUpdater.quitAndInstall()
}
