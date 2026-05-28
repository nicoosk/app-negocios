import { JSX, useState } from 'react'
import PanelVentas from './PanelVentas'
import Dashboard from './Dashboard'
import styles from './AppShell.module.css'
import Sidebar, { PaginaActiva } from './Sidebar'
import PanelUsuarios from './PanelUsuarios'

interface AppShellProps {
  username: string
  isAdmin: boolean
  onLogout: () => void
}

export default function AppShell({ username, isAdmin, onLogout }: AppShellProps): JSX.Element {
  const [paginaActiva, setPaginaActiva] = useState<PaginaActiva>('ventas')

  const renderContenido = (): JSX.Element => {
    switch (paginaActiva) {
      case 'dashboard':
        return <Dashboard />
      case 'ventas':
        return <PanelVentas username={username} />
      case 'usuarios':
        return <PanelUsuarios />
      default:
        return <PanelVentas username={username} />
    }
  }

  return (
    <div className={styles.shell}>
      <Sidebar
        paginaActiva={paginaActiva}
        onNavegar={setPaginaActiva}
        isAdmin={isAdmin}
        onLogout={onLogout}
      />

      <main className={styles.contenido}>{renderContenido()}</main>
    </div>
  )
}
