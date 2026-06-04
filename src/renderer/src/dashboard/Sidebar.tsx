import { JSX, SetStateAction } from 'react'
import styles from './Sidebar.module.css'
import UpdaterBanner from './UpdateBanner'

export type PaginaActiva = 'dashboard' | 'ventas' | 'inventario' | 'usuarios' | 'admin'

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
  proximamente?: boolean
}

const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icono: '▦' },
  { id: 'ventas', label: 'Panel de ventas', icono: '⊟' },
  { id: 'inventario', label: 'Inventario', icono: '⊞', proximamente: true }
]

const ADMIN_ITEMS: NavItem[] = [
  { id: 'usuarios', label: 'Usuarios', icono: '◎' },
  { id: 'admin', label: 'Administrar ventas', icono: '⚙' }
]

interface NavButtonProps {
  item: NavItem
  activo: boolean
  onNavegar: React.Dispatch<SetStateAction<PaginaActiva>>
}

function NavButton({ item, activo, onNavegar }: NavButtonProps): JSX.Element {
  const clases = [
    styles.navItem,
    activo ? styles.activo : '',
    item.proximamente ? styles.proximamente : ''
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <li className={styles.navItemWrapper}>
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
}

export default function Sidebar({
  paginaActiva,
  isAdmin,
  onNavegar,
  onLogout
}: SidebarProps): JSX.Element {
  return (
    <div className={styles.sidebar}>
      <div className={styles.logo}>
        <span className={styles.logoIcon}>◈</span>
        <span className={styles.logoText}>Mi Almacén</span>
      </div>

      <ul className={styles.nav}>
        {NAV_ITEMS.map((item) => (
          <NavButton
            key={item.id}
            item={item}
            activo={paginaActiva === item.id}
            onNavegar={onNavegar}
          />
        ))}

        {isAdmin ? (
          <>
            <li className={styles.seccionLabel}>Administración</li>

            {ADMIN_ITEMS.map((item) => (
              <NavButton
                key={item.id}
                item={item}
                activo={paginaActiva === item.id}
                onNavegar={onNavegar}
              />
            ))}
          </>
        ) : undefined}
      </ul>

      <div className={styles.footer}>
        <UpdaterBanner onSidebar={true} />
        <button className={styles.btnLogout} onClick={onLogout}>
          <span className={styles.navIcono}>⏻</span>
          <span className={styles.navLabel}>Cerrar sesión</span>
        </button>
      </div>
    </div>
  )
}
