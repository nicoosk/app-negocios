export interface UpdaterPayload {
  estado: 'verificando' | 'disponible' | 'descargando' | 'listo' | 'al-dia' | 'error'
  version?: string
  porcentaje?: number
}
