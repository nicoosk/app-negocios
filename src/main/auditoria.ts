import type { Nucleo } from './nucleo'
import { sesionActual } from './sesion'

// Crea el helper de auditoría ligado a un núcleo. Toma el usuario de la sesión
// vigente en el proceso main: el renderer nunca provee el autor de la acción.
export function crearAuditar(nucleo: Nucleo) {
  return function auditar(
    accion: string,
    entidad: string,
    entidadId: number | null,
    detalle?: unknown
  ): void {
    try {
      const usuario = sesionActual()
      nucleo.auditoria.registrar({
        id_usuario: usuario?.id ?? null,
        username: usuario?.username ?? null,
        accion,
        entidad,
        entidad_id: entidadId,
        detalle: detalle === undefined ? null : JSON.stringify(detalle)
      })
    } catch (err) {
      console.error('[auditoria] No se pudo registrar la acción:', err)
    }
  }
}

export type Auditar = ReturnType<typeof crearAuditar>
