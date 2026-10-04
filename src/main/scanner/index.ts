import { BrowserWindow } from 'electron'
import { toDataURL } from 'qrcode'
import type { EstadoEscaner } from '../../shared/tipos'
import { crearServidorEscanner, type ServidorEscanner } from './servidor'
import { obtenerIpLan } from './red'
import { generarPaginaEscanner } from './pagina'
import html5QrcodeJs from '../../../node_modules/html5-qrcode/html5-qrcode.min.js?raw'
import zxingJs from '../../../node_modules/html5-qrcode/third_party/zxing-js.umd.js?raw'

// Servicio del escáner por celular: levanta el servidor HTTP local y reenvía los
// códigos recibidos a la ventana. El QR de conexión se genera acá (proceso main).
let servidor: ServidorEscanner | null = null

function ventanaPrincipal(): BrowserWindow | undefined {
  return BrowserWindow.getAllWindows()[0]
}

async function estadoPublico(): Promise<EstadoEscaner> {
  if (!servidor) {
    return { activo: false, conectado: false, conectados: 0, url: null, qr: null }
  }
  const estado = servidor.estado()
  const qr = estado.url ? await toDataURL(estado.url, { margin: 1, width: 260 }) : null
  return {
    activo: estado.activo,
    conectado: estado.conectados > 0,
    conectados: estado.conectados,
    url: estado.url,
    qr
  }
}

export async function iniciarEscaner(): Promise<EstadoEscaner> {
  if (!servidor) {
    servidor = crearServidorEscanner({
      onCodigo: (codigo) => ventanaPrincipal()?.webContents.send('scanner:codigo', codigo),
      obtenerIp: obtenerIpLan,
      generarPagina: generarPaginaEscanner,
      vendorJs: html5QrcodeJs,
      zxingJs
    })
  }
  await servidor.iniciar()
  return estadoPublico()
}

export async function estadoEscaner(): Promise<EstadoEscaner> {
  return estadoPublico()
}

export async function detenerEscaner(): Promise<EstadoEscaner> {
  if (servidor) await servidor.detener()
  return estadoPublico()
}
