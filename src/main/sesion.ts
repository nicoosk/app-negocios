export interface Sesion {
  id: number
  username: string
  is_admin: boolean
}

export interface RespuestaDenegada {
  ok: false
  error: string
}

export const SIN_AUTORIZACION: RespuestaDenegada = { ok: false, error: 'No autorizado' }

let sesion: Sesion | null = null

export function iniciarSesion(usuario: Sesion): void {
  sesion = usuario
}

export function cerrarSesion(): void {
  sesion = null
}

export function sesionActual(): Sesion | null {
  return sesion
}

export function tieneSesion(): boolean {
  return sesion !== null
}

export function usuarioActual(): Sesion {
  if (!sesion) throw new Error('No hay sesión activa')
  return sesion
}

export function esAdminActual(): boolean {
  return sesion !== null && sesion.is_admin
}
