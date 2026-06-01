import { UpdaterPayload } from '@renderer/types'
import { JSX, useEffect, useState } from 'react'
import styles from './UpdateBanner.module.css'

export default function UpdaterBanner(): JSX.Element | null {
  const [payload, setPayload] = useState<UpdaterPayload | null>(null)
  const [descartado, setDescartado] = useState(false)

  useEffect(() => {
    const cleanup = window.api.updater.onEstado((p) => {
      if (p.estado == 'al-dia' || p.estado === 'verificando') return
      setPayload(p)
      setDescartado(false)
    })

    return cleanup
  }, [])

  if (!payload || descartado) return null

  const handleInstalar = (): void => {
    if (payload.releaseUrl) {
      window.api.updater.abrirUrl(payload.releaseUrl)
    } else {
      window.api.updater.instalar()
    }
  }

  const config: Record<
    Exclude<UpdaterPayload['estado'], 'verificando' | 'al-dia'>,
    { texto: string; sub?: string; accion?: string; clase: string }
  > = {
    disponible: {
      texto: `v${payload.version} disponible`,
      sub: 'Descargando...',
      clase: styles.bannerDisponible
    },
    descargando: {
      texto: `Descargando ${payload.porcentaje ?? 0}%`,
      sub: 'Actualización en progreso',
      clase: styles.bannerDescargado
    },
    listo: {
      texto: `v${payload.version} disponible`,
      sub: payload.releaseUrl ? 'Descarga requerida en MacOS' : 'Reinicia para aplicar',
      accion: payload.releaseUrl ? 'Ver descarga' : 'Instalar ahora',
      clase: styles.bannerListo
    },
    error: {
      texto: 'Error al actualizar',
      sub: 'Intenta más tarde',
      clase: styles.bannerError
    }
  }

  const info = config[payload.estado as keyof typeof config]
  if (!info) return null
  return (
    <div className={`${styles.banner} ${info.clase}`}>
      <div className={styles.bannerTextos}>
        <span className={styles.bannerTitulo}>{info.texto}</span>
        {info.sub && <span className={styles.bannerSub}>{info.sub}</span>}
      </div>

      <div className={styles.bannerAcciones}>
        {info.accion && (
          <button className={styles.bannerBtn} onClick={handleInstalar}>
            {info.accion}
          </button>
        )}
        {payload.estado !== 'descargando' && payload.estado !== 'disponible' && (
          <button className={styles.bannerDescartar} onClick={() => setDescartado(true)}>
            ✕
          </button>
        )}
      </div>
    </div>
  )
}
