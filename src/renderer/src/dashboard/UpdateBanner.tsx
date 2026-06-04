import { UpdaterPayload } from '@renderer/types'
import { JSX, useEffect, useState } from 'react'
import styles from './UpdateBanner.module.css'

function renderMarkdown(texto: string): JSX.Element {
  const lineas = texto.split('\n')

  return (
    <div>
      {lineas.map((linea, i) => {
        if (linea.startsWith('## '))
          return (
            <h3 key={i} className={styles.mdH2}>
              {linea.slice(3)}
            </h3>
          )
        if (linea.startsWith('# '))
          return (
            <h2 key={i} className={styles.mdH1}>
              {linea.slice(2)}
            </h2>
          )
        if (linea.startsWith('- ') || linea.startsWith('* '))
          return (
            <li key={i} className={styles.mdLi}>
              {renderInLine(linea.slice(2))}
            </li>
          )
        if (linea.trim() === '') return <br key={i} />
        if (linea.startsWith('---')) return <hr key={i} className={styles.mdHr} />
        return (
          <p key={i} className={styles.mdP}>
            {renderInLine(linea)}
          </p>
        )
      })}
    </div>
  )
}

function renderInLine(texto: string): React.ReactNode {
  const partes = texto.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g)
  return partes.map((parte, i) => {
    if (parte.startsWith('**') && parte.endsWith('**'))
      return <strong key={i}>{parte.slice(2, -2)}</strong>
    if (parte.startsWith('*') && parte.endsWith('*')) return <em key={i}>{parte.slice(1, -1)}</em>
    return parte
  })
}

interface UpdaterBannerProps {
  onSidebar: boolean
}

export default function UpdaterBanner({ onSidebar }: UpdaterBannerProps): JSX.Element | null {
  const [payload, setPayload] = useState<UpdaterPayload | null>({
    estado: 'listo',
    version: '0.3.0-alpha',
    releaseUrl: 'https://github.com/nicoosk/app-negocios/releases/tag/v0.3.0-alpha'
  })
  const [descartado, setDescartado] = useState(false)
  const [notas, setNotas] = useState<string | null>(null)
  const [mostrarNotas, setMostrarNotas] = useState(false)

  useEffect(() => {
    const cleanup = window.api.updater.onEstado((p) => {
      if (p.estado == 'al-dia' || p.estado === 'verificando') return
      setPayload(p)
      setDescartado(false)
      setNotas(null)
      setMostrarNotas(false)
    })

    return cleanup
  }, [])

  useEffect(() => {
    if (!payload?.version) return
    window.api.updater.notas(payload.version).then((body) => {
      if (body) setNotas(body)
    })
  }, [payload?.version])

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

  const puedeDescartar = payload.estado !== 'descargando' && payload.estado !== 'disponible'

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
        {notas && !onSidebar && (
          <button className={styles.bannerBtnSecundario} onClick={() => setMostrarNotas((v) => !v)}>
            {mostrarNotas ? 'Ocultar notas' : 'Ver novedades'}
          </button>
        )}
        {puedeDescartar && (
          <button className={styles.bannerDescartar} onClick={() => setDescartado(true)}>
            ✕
          </button>
        )}
      </div>

      {mostrarNotas && notas && !onSidebar && (
        <div className={styles.bannerNotas}>{renderMarkdown(notas)}</div>
      )}
    </div>
  )
}
