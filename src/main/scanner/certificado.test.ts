import { afterEach, describe, expect, it } from 'vitest'
import { existsSync, rmSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { obtenerCertificado } from './certificado'

const ruta = join(tmpdir(), `certificado-prueba-${process.pid}.json`)

afterEach(() => {
  if (existsSync(ruta)) rmSync(ruta)
})

describe('certificado autofirmado', () => {
  it('genera un certificado con clave y cert PEM', async () => {
    const par = await obtenerCertificado(ruta, '192.168.1.10')
    expect(par.key).toContain('BEGIN')
    expect(par.cert).toContain('BEGIN CERTIFICATE')
    expect(existsSync(ruta)).toBe(true)
  })

  it('reutiliza el certificado guardado para la misma IP', async () => {
    const primero = await obtenerCertificado(ruta, '192.168.1.10')
    const segundo = await obtenerCertificado(ruta, '192.168.1.10')
    expect(segundo.cert).toBe(primero.cert)
    expect(segundo.key).toBe(primero.key)
  })

  it('regenera el certificado cuando cambia la IP', async () => {
    const primero = await obtenerCertificado(ruta, '192.168.1.10')
    const segundo = await obtenerCertificado(ruta, '192.168.1.20')
    expect(segundo.cert).not.toBe(primero.cert)
  })
})
