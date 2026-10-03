import { afterEach, describe, expect, it, vi } from 'vitest'
import { crearServidorEscanner, type ServidorEscanner } from './servidor'

function crearServidorPrueba(overrides: Partial<{ puertoPreferido: number }> = {}): {
  servidor: ServidorEscanner
  onCodigo: ReturnType<typeof vi.fn>
} {
  const onCodigo = vi.fn()
  const servidor = crearServidorEscanner({
    onCodigo,
    obtenerIp: () => '192.168.1.10',
    generarPagina: () => '<html>ok</html>',
    vendorJs: '/*vendor*/',
    puertoPreferido: 0,
    ...overrides
  })
  return { servidor, onCodigo }
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
