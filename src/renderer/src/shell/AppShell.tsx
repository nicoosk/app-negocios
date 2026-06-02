import { JSX, useState } from 'react'
import PanelVentas from '../ventas/PanelVentas'
import Dashboard from '../dashboard/Dashboard'
import styles from './AppShell.module.css'
import Sidebar, { PaginaActiva } from '../dashboard/Sidebar'
import PanelUsuarios, { Usuario } from '../usuarios/PanelUsuarios'
import PanelAdmin from '@renderer/admin/PanelAdmin'

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
      case 'admin':
        return <PanelAdmin userId={user.id} />
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
