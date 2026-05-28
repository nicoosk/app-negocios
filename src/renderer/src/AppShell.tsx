import { JSX, useState } from 'react'
import PanelVentas from './PanelVentas'
import Dashboard from './Dashboard'
import styles from './AppShell.module.css'
import Sidebar, { PaginaActiva } from './Sidebar'
import PanelUsuarios, { Usuario } from './PanelUsuarios'

interface AppShellProps {
  user: Usuario
  onLogout: () => void
}

export default function AppShell({ user, onLogout }: AppShellProps): JSX.Element {
  const [paginaActiva, setPaginaActiva] = useState<PaginaActiva>('ventas')

  const renderContenido = (): JSX.Element => {
    switch (paginaActiva) {
      case 'dashboard':
        return <Dashboard />
      case 'ventas':
        return <PanelVentas userId={user.id} username={user.username} />
      case 'usuarios':
        return <PanelUsuarios />
      default:
        return <PanelVentas userId={user.id} username={user.username} />
    }
  }

  return (
    <div className={styles.shell}>
      <Sidebar
        paginaActiva={paginaActiva}
        onNavegar={setPaginaActiva}
        isAdmin={user.is_admin}
        onLogout={onLogout}
      />

      <main className={styles.contenido}>{renderContenido()}</main>
    </div>
  )
}
