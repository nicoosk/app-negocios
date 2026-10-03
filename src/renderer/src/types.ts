export interface UpdaterPayload {
  estado: 'verificando' | 'disponible' | 'descargando' | 'listo' | 'al-dia' | 'error'
  version?: string
  porcentaje?: number
  releaseUrl?: string
}

export interface Sesion {
  id: number
  username: string
  is_admin: boolean
}
