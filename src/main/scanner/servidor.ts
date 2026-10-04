import {
  createServer,
  type IncomingMessage,
  type Server as HttpServer,
  type ServerResponse
} from 'http'
import { createServer as createHttpsServer, type Server as HttpsServer } from 'https'
import type { AddressInfo } from 'net'
import { randomBytes, timingSafeEqual } from 'crypto'
import type { ParCertificado } from './certificado'

// Servidor HTTP(S) local que sirve la página de escaneo al celular y recibe los
// códigos. Es HTTP nativo de Node: no depende de Electron, por lo que se puede
// testear en aislamiento levantándolo en un puerto efímero (puerto 0).
export interface EstadoServidor {
  activo: boolean
  puerto: number | null
  url: string | null
  token: string | null
  conectados: number
}

export interface OpcionesServidor {
  onCodigo: (codigo: string) => void
  obtenerIp: () => string | null
  generarPagina: (token: string) => string
  vendorJs: string
  zxingJs: string
  zbarJs: string
  tls?: ParCertificado
  certPem?: string
  puertoPreferido?: number
}

export interface ServidorEscanner {
  iniciar: () => Promise<EstadoServidor>
  detener: () => Promise<EstadoServidor>
  estado: () => EstadoServidor
}

const LIMITE_CUERPO = 64 * 1024

export function crearServidorEscanner(opciones: OpcionesServidor): ServidorEscanner {
  const {
    onCodigo,
    obtenerIp,
    generarPagina,
    vendorJs,
    zxingJs,
    zbarJs,
    tls,
    certPem,
    puertoPreferido = 8787
  } = opciones

  let server: HttpServer | HttpsServer | null = null
  let token: string | null = null
  let puerto: number | null = null
  const clientes = new Set<ServerResponse>()

  function estado(): EstadoServidor {
    const ip = obtenerIp()
    const esquema = tls ? 'https' : 'http'
    return {
      activo: server !== null,
      puerto,
      token,
      conectados: clientes.size,
      url: ip && puerto && token ? `${esquema}://${ip}:${puerto}/?t=${token}` : null
    }
  }

  function responder(
    res: ServerResponse,
    codigo: number,
    cuerpo: string,
    tipo = 'application/json; charset=utf-8'
  ): void {
    res.writeHead(codigo, { 'Content-Type': tipo, 'Cache-Control': 'no-store' })
    res.end(cuerpo)
  }

  function tokenValido(candidato: string | null): boolean {
    if (!token || !candidato) return false
    const esperado = Buffer.from(token)
    const recibido = Buffer.from(candidato)
    return esperado.length === recibido.length && timingSafeEqual(esperado, recibido)
  }

  function leerCuerpo(req: IncomingMessage): Promise<string> {
    return new Promise((resolve, reject) => {
      let datos = ''
      req.on('data', (trozo: Buffer) => {
        datos += trozo.toString('utf8')
        if (datos.length > LIMITE_CUERPO) req.destroy()
      })
      req.on('end', () => resolve(datos))
      req.on('error', reject)
    })
  }

  async function manejar(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const url = new URL(req.url ?? '/', 'http://localhost')

    if (req.method === 'GET' && url.pathname === '/') {
      responder(res, 200, generarPagina(token ?? ''), 'text/html; charset=utf-8')
      return
    }

    if (req.method === 'GET' && url.pathname === '/vendor.js') {
      responder(res, 200, vendorJs, 'application/javascript; charset=utf-8')
      return
    }

    if (req.method === 'GET' && url.pathname === '/zxing.js') {
      responder(res, 200, zxingJs, 'application/javascript; charset=utf-8')
      return
    }

    if (req.method === 'GET' && url.pathname === '/zbar.mjs') {
      responder(res, 200, zbarJs, 'application/javascript; charset=utf-8')
      return
    }

    if (req.method === 'GET' && url.pathname === '/certificado.crt' && certPem) {
      responder(res, 200, certPem, 'application/x-x509-ca-cert')
      return
    }

    if (req.method === 'GET' && url.pathname === '/estado') {
      responder(res, 200, JSON.stringify({ ok: true }))
      return
    }

    if (req.method === 'GET' && url.pathname === '/eventos') {
      if (!tokenValido(url.searchParams.get('t'))) {
        responder(res, 403, JSON.stringify({ ok: false, error: 'Token inválido' }))
        return
      }
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-store',
        Connection: 'keep-alive'
      })
      res.write('event: listo\ndata: {}\n\n')
      clientes.add(res)
      req.on('close', () => {
        clientes.delete(res)
      })
      return
    }

    if (req.method === 'POST' && url.pathname === '/scan') {
      const cuerpo = await leerCuerpo(req)
      let datos: { codigo?: unknown; t?: unknown }
      try {
        datos = JSON.parse(cuerpo) as { codigo?: unknown; t?: unknown }
      } catch {
        responder(res, 400, JSON.stringify({ ok: false, error: 'JSON inválido' }))
        return
      }
      if (!tokenValido(typeof datos.t === 'string' ? datos.t : null)) {
        responder(res, 403, JSON.stringify({ ok: false, error: 'Token inválido' }))
        return
      }
      const codigo = typeof datos.codigo === 'string' ? datos.codigo.trim() : ''
      if (!codigo) {
        responder(res, 400, JSON.stringify({ ok: false, error: 'Código vacío' }))
        return
      }
      onCodigo(codigo)
      responder(res, 200, JSON.stringify({ ok: true }))
      return
    }

    responder(res, 404, JSON.stringify({ ok: false, error: 'No encontrado' }))
  }

  function escuchar(puertoEscucha: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const s = server as HttpServer | HttpsServer
      const onError = (err: NodeJS.ErrnoException): void => {
        s.off('listening', onListening)
        reject(err)
      }
      const onListening = (): void => {
        s.off('error', onError)
        resolve()
      }
      s.once('error', onError)
      s.once('listening', onListening)
      s.listen(puertoEscucha, '0.0.0.0')
    })
  }

  async function iniciar(): Promise<EstadoServidor> {
    if (server) return estado()
    token = randomBytes(16).toString('hex')
    const manejador = (req: IncomingMessage, res: ServerResponse): void => {
      void manejar(req, res).catch((err) => {
        console.error('[scanner] Error manejando petición:', err)
        if (!res.headersSent) responder(res, 500, JSON.stringify({ ok: false, error: 'Error' }))
      })
    }
    server = tls
      ? createHttpsServer({ key: tls.key, cert: tls.cert }, manejador)
      : createServer(manejador)

    try {
      await escuchar(puertoPreferido)
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'EADDRINUSE') {
        await escuchar(0)
      } else {
        server = null
        token = null
        throw err
      }
    }

    puerto = (server.address() as AddressInfo).port
    return estado()
  }

  async function detener(): Promise<EstadoServidor> {
    for (const cliente of clientes) cliente.end()
    clientes.clear()
    if (server) {
      await new Promise<void>((resolve) => {
        ;(server as HttpServer | HttpsServer).close(() => resolve())
      })
      server = null
    }
    puerto = null
    token = null
    return estado()
  }

  return { iniciar, detener, estado }
}
