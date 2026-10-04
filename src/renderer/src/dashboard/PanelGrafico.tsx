import { JSX, ReactNode } from 'react'
import styles from './Dashboard.module.css'

interface PanelGraficoProps {
  titulo: string
  ancho?: boolean
  acciones?: ReactNode
  children: ReactNode
}

export default function PanelGrafico({
  titulo,
  ancho,
  acciones,
  children
}: PanelGraficoProps): JSX.Element {
  return (
    <section className={`${styles.panel} ${ancho ? styles.panelAncho : ''}`}>
      <div className={styles.panelHeader}>
        <span className={styles.panelTitulo}>{titulo}</span>
        {acciones}
      </div>
      {children}
    </section>
  )
}
