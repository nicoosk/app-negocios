import { afterEach, describe, expect, it, vi } from 'vitest'
import https from 'https'
import { tmpdir } from 'os'
import { join } from 'path'
import { crearServidorEscanner, type OpcionesServidor, type ServidorEscanner } from './servidor'
import { obtenerCertificado, type ParCertificado } from './certificado'

function crearServidorPrueba(overrides: Partial<OpcionesServidor> = {}): {
  servidor: ServidorEscanner
  onCodigo: ReturnType<typeof vi.fn>
} {
  const onCodigo = vi.fn()
  const servidor = crearServidorEscanner({
    onCodigo,
    obtenerIp: () => '192.168.1.10',
    generarPagina: () => '<html>ok</html>',
    vendorJs: '/*vendor*/',
    zxingJs: '/*zxing*/',
    zbarJs: '/*zbar*/',
    puertoPreferido: 0,
    ...overrides
  })
  return { servidor, onCodigo }
}

let certificado: ParCertificado | null = null
async function obtenerCertificadoPrueba(): Promise<ParCertificado> {
  if (!certificado) {
    certificado = await obtenerCertificado(
      join(tmpdir(), `scanner-tls-${process.pid}.json`),
      '192.168.1.10'
    )
  }
  return certificado
}

let activo: ServidorEscanner | null = null

afterEach(async () => {
  if (activo) {
    await activo.detener()
    activo = null
  }
})

describe('servidor de escáner', () => {
  it('inicia, expone la url con token y sirve la página', async () => {
    const { servidor } = crearServidorPrueba()
    activo = servidor
    const estado = await servidor.iniciar()

    expect(estado.activo).toBe(true)
    expect(estado.puerto).toBeGreaterThan(0)
    expect(estado.url).toMatch(/^http:\/\/192\.168\.1\.10:\d+\/\?t=[a-f0-9]{32}$/)

    const res = await fetch(`http://127.0.0.1:${estado.puerto}/`)
    expect(res.status).toBe(200)
    expect(await res.text()).toContain('<html>ok</html>')
  })

  it('sirve el vendor js', async () => {
    const { servidor } = crearServidorPrueba()
    activo = servidor
    const { puerto } = await servidor.iniciar()
    const res = await fetch(`http://127.0.0.1:${puerto}/vendor.js`)
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('/*vendor*/')
  })

  it('sirve el zxing js', async () => {
    const { servidor } = crearServidorPrueba()
    activo = servidor
    const { puerto } = await servidor.iniciar()
    const res = await fetch(`http://127.0.0.1:${puerto}/zxing.js`)
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('/*zxing*/')
  })

  it('sirve el zbar js', async () => {
    const { servidor } = crearServidorPrueba()
    activo = servidor
    const { puerto } = await servidor.iniciar()
    const res = await fetch(`http://127.0.0.1:${puerto}/zbar.mjs`)
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('/*zbar*/')
  })

  it('sirve el certificado cuando se provee', async () => {
    const { servidor } = crearServidorPrueba({ certPem: 'CERT-PEM' })
    activo = servidor
    const { puerto } = await servidor.iniciar()
    const res = await fetch(`http://127.0.0.1:${puerto}/certificado.crt`)
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('CERT-PEM')
  })

  it('sirve por https cuando se provee un certificado', async () => {
    const tls = await obtenerCertificadoPrueba()
    const { servidor } = crearServidorPrueba({ tls, certPem: tls.cert })
    activo = servidor
    const estado = await servidor.iniciar()

    expect(estado.url).toMatch(/^https:\/\/192\.168\.1\.10:\d+\/\?t=[a-f0-9]{32}$/)

    const cuerpo = await new Promise<string>((resolve, reject) => {
      https
        .get(
          {
            host: '127.0.0.1',
            port: estado.puerto as number,
            path: '/',
            rejectUnauthorized: false
          },
          (res) => {
            let datos = ''
            res.on('data', (trozo) => {
              datos += trozo
            })
            res.on('end', () => resolve(datos))
          }
        )
        .on('error', reject)
    })
    expect(cuerpo).toContain('<html>ok</html>')
  })

  it('rechaza un scan con token inválido y no emite el código', async () => {
    const { servidor, onCodigo } = crearServidorPrueba()
    activo = servidor
    const { puerto } = await servidor.iniciar()

    const res = await fetch(`http://127.0.0.1:${puerto}/scan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ codigo: '7801234567890', t: 'token-malo' })
    })

    expect(res.status).toBe(403)
    expect(onCodigo).not.toHaveBeenCalled()
  })

  it('emite el código con token válido', async () => {
    const { servidor, onCodigo } = crearServidorPrueba()
    activo = servidor
    const estado = await servidor.iniciar()

    const res = await fetch(`http://127.0.0.1:${estado.puerto}/scan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ codigo: ' 7801234567890 ', t: estado.token })
    })

    expect(res.status).toBe(200)
    expect(onCodigo).toHaveBeenCalledOnce()
    expect(onCodigo).toHaveBeenCalledWith('7801234567890')
  })

  it('rechaza un código vacío con token válido', async () => {
    const { servidor, onCodigo } = crearServidorPrueba()
    activo = servidor
    const estado = await servidor.iniciar()

    const res = await fetch(`http://127.0.0.1:${estado.puerto}/scan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ codigo: '   ', t: estado.token })
    })

    expect(res.status).toBe(400)
    expect(onCodigo).not.toHaveBeenCalled()
  })

  it('se detiene y deja de aceptar conexiones', async () => {
    const { servidor } = crearServidorPrueba()
    const estado = await servidor.iniciar()
    const detenido = await servidor.detener()

    expect(detenido.activo).toBe(false)
    await expect(fetch(`http://127.0.0.1:${estado.puerto}/`)).rejects.toThrow()
  })

  it('cae a un puerto libre si el preferido está ocupado', async () => {
    const primero = crearServidorPrueba()
    const estadoPrimero = await primero.servidor.iniciar()
    activo = primero.servidor

    const segundo = crearServidorPrueba({ puertoPreferido: estadoPrimero.puerto as number })
    const estadoSegundo = await segundo.servidor.iniciar()

    expect(estadoSegundo.activo).toBe(true)
    expect(estadoSegundo.puerto).not.toBe(estadoPrimero.puerto)

    await segundo.servidor.detener()
  })
})
