import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { dirname } from 'path'
import { generate } from 'selfsigned'

// Certificado autofirmado para servir la página del escáner por HTTPS. Es
// necesario porque los navegadores móviles solo exponen la cámara
// (getUserMedia) en contextos seguros (HTTPS o localhost). El certificado se
// guarda en disco y se reutiliza mientras la IP de la LAN no cambie.
export interface ParCertificado {
  key: string
  cert: string
}

interface CertificadoGuardado extends ParCertificado {
  ip: string
}

export async function obtenerCertificado(ruta: string, ip: string): Promise<ParCertificado> {
  try {
    if (existsSync(ruta)) {
      const datos = JSON.parse(readFileSync(ruta, 'utf8')) as CertificadoGuardado
      if (datos.ip === ip && datos.key && datos.cert) {
        return { key: datos.key, cert: datos.cert }
      }
    }
  } catch {
    // Si el archivo está corrupto, se regenera abajo.
  }

  const pems = await generate([{ name: 'commonName', value: ip }], {
    algorithm: 'sha256',
    keySize: 2048,
    notBeforeDate: new Date(),
    notAfterDate: new Date(Date.now() + 3650 * 24 * 60 * 60 * 1000),
    extensions: [
      { name: 'basicConstraints', cA: true },
      { name: 'keyUsage', digitalSignature: true, keyEncipherment: true, keyCertSign: true },
      { name: 'extKeyUsage', serverAuth: true },
      {
        name: 'subjectAltName',
        altNames: [
          { type: 7, ip },
          { type: 7, ip: '127.0.0.1' },
          { type: 2, value: 'localhost' }
        ]
      }
    ]
  })

  const par: ParCertificado = { key: pems.private, cert: pems.cert }
  try {
    mkdirSync(dirname(ruta), { recursive: true })
    writeFileSync(ruta, JSON.stringify({ ...par, ip }), { mode: 0o600 })
  } catch {
    // Si no se puede persistir, funciona igual: se pedirá aceptar de nuevo.
  }
  return par
}
