import { networkInterfaces } from 'os'

// Devuelve la primera IP IPv4 de la red local (no loopback) para que el celular
// pueda alcanzar el servidor del escáner. En redes con varias interfaces puede
// no ser la correcta, pero es la heurística estándar.
export function obtenerIpLan(): string | null {
  const interfaces = networkInterfaces()
  for (const tarjeta of Object.keys(interfaces)) {
    for (const info of interfaces[tarjeta] ?? []) {
      if (info.family === 'IPv4' && !info.internal) return info.address
    }
  }
  return null
}
