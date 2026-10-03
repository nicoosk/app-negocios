import { JSX, useState } from 'react'
import PanelVentas from '../ventas/PanelVentas'
import Dashboard from '../dashboard/Dashboard'
import styles from './AppShell.module.css'
import Sidebar, { PaginaActiva } from '../dashboard/Sidebar'
import PanelUsuarios from '../usuarios/PanelUsuarios'
import PanelAdmin from '@renderer/admin/PanelAdmin'
import PanelInventario from '@renderer/inventario/PanelInventario'
import { Sesion } from '@renderer/types'

interface AppShellProps {
  user: Sesion
  onLogout: () => void
}

export default function AppShell({ user, onLogout }: AppShellProps): JSX.Element {
  const [paginaActiva, setPaginaActiva] = useState<PaginaActiva>('ventas')

  const renderContenido = (): JSX.Element => {
    switch (paginaActiva) {
      case 'dashboard':
        return <Dashboard />
      case 'ventas':
        return <PanelVentas username={user.username} />
      case 'usuarios':
        return <PanelUsuarios />
      case 'admin':
        return <PanelAdmin />
      case 'inventario':
        return <PanelInventario isAdmin={user.is_admin} />
      default:
        return <PanelVentas username={user.username} />
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
