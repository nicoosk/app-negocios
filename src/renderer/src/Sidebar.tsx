import { JSX, SetStateAction, useEffect, useState } from 'react'
import styles from './Sidebar.module.css'
import { UpdaterPayload } from './types'

export type PaginaActiva = 'dashboard' | 'ventas' | 'inventario' | 'usuarios'

interface SidebarProps {
  paginaActiva: PaginaActiva
  isAdmin: boolean
  onNavegar: React.Dispatch<SetStateAction<PaginaActiva>>
  onLogout: () => void
}

interface NavItem {
  id: PaginaActiva
  label: string
  icono: string
  soloAdmin?: boolean
  proximamente?: boolean
}

const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icono: '▦' },
  { id: 'ventas', label: 'Panel de ventas', icono: '⊟' },
  { id: 'inventario', label: 'Inventario', icono: '⊞', proximamente: true },
  { id: 'usuarios', label: 'Usuarios', icono: '◎', soloAdmin: true }
]

function UpdaterBanner(): JSX.Element | null {
  const [payload, setPayload] = useState<UpdaterPayload | null>(null)
  const [descartado, setDescartado] = useState(false)

  useEffect(() => {
    window.api.updater.onEstado((p) => {
      if (p.estado === 'al-dia' || p.estado === 'verificando') return
      setPayload(p)
      setDescartado(false)
    })
  }, [])

  if (!payload || descartado) return null

  const handleInstalar = (): void => {
    window.api.updater.instalar()
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
      texto: `v${payload.version} lista`,
      sub: 'Reinicia para aplicar',
      accion: 'Instalar ahora',
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

export default function Sidebar({
  paginaActiva,
  isAdmin,
  onNavegar,
  onLogout
}: SidebarProps): JSX.Element {
  const itemsVisibles = NAV_ITEMS.filter((item) => !item.soloAdmin || isAdmin)

  return (
    <div className={styles.sidebar}>
      <div className={styles.logo}>
        <span className={styles.logoIcon}>◈</span>
        <span className={styles.logoText}>Mi Almacén</span>
      </div>

      <ul className={styles.nav}>
        {itemsVisibles.map((item) => {
          const activo = paginaActiva === item.id
          const clases = [
            styles.navItem,
            activo ? styles.activo : '',
            item.proximamente ? styles.proximamente : ''
          ]
            .filter(Boolean)
            .join(' ')

          return (
            <li key={item.id} className={styles.navItemWrapper}>
              <button
                className={clases}
                onClick={() => !item.proximamente && onNavegar(item.id)}
                disabled={item.proximamente}
                title={item.proximamente ? 'Próximamente' : undefined}
              >
                <span className={styles.navIcono}>{item.icono}</span>
                <span className={styles.navLabel}>{item.label}</span>
                {item.proximamente && <span className={styles.badge}>Próximamente</span>}
              </button>
            </li>
          )
        })}
      </ul>

      <div className={styles.footer}>
        <UpdaterBanner />
        <button className={styles.btnLogout} onClick={onLogout}>
          <span className={styles.navIcono}>⏻</span>
          <span className={styles.navLabel}>Cerrar sesión</span>
        </button>
      </div>
    </div>
  )
}
