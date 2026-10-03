// Fecha y hora en la zona horaria local del equipo (no UTC) para que "hoy"
// coincida con el día real del negocio. Se usan valores explícitos en los INSERT
// para que también apliquen a bases existentes cuyos DEFAULT originales eran UTC.
export function ahoraLocal(): { fecha: string; hora: string } {
  const ahora = new Date()
  const fecha = [
    ahora.getFullYear(),
    String(ahora.getMonth() + 1).padStart(2, '0'),
    String(ahora.getDate()).padStart(2, '0')
  ].join('-')
  const hora = [
    String(ahora.getHours()).padStart(2, '0'),
    String(ahora.getMinutes()).padStart(2, '0'),
    String(ahora.getSeconds()).padStart(2, '0')
  ].join(':')
  return { fecha, hora }
}
