import { JSX } from 'react'
import styles from './Dashboard.module.css'
import { fechaLocal } from '@renderer/utils/fechas'

export type Periodo = 'hoy' | '7d' | '30d' | 'personalizado'

const OPCIONES: { id: Periodo; label: string }[] = [
  { id: 'hoy', label: 'Hoy' },
  { id: '7d', label: '7 días' },
  { id: '30d', label: '30 días' },
  { id: 'personalizado', label: 'Personalizado' }
]

interface SelectorPeriodoProps {
  periodo: Periodo
  desde: string
  hasta: string
  onPeriodo: (periodo: Periodo) => void
  onDesde: (desde: string) => void
  onHasta: (hasta: string) => void
}

export default function SelectorPeriodo({
  periodo,
  desde,
  hasta,
  onPeriodo,
  onDesde,
  onHasta
}: SelectorPeriodoProps): JSX.Element {
  return (
    <div className={styles.toolbar}>
      <div className={styles.selector}>
        {OPCIONES.map((opcion) => (
          <button
            key={opcion.id}
            className={`${styles.selectorBoton} ${
              periodo === opcion.id ? styles.selectorBotonActivo : ''
            }`}
            onClick={() => onPeriodo(opcion.id)}
          >
            {opcion.label}
          </button>
        ))}
      </div>
      {periodo === 'personalizado' && (
        <div className={styles.rangoCustom}>
          <input
            type="date"
            className={styles.inputFecha}
            value={desde}
            max={hasta}
            onChange={(e) => onDesde(e.target.value)}
          />
          <span className={styles.fecha}>—</span>
          <input
            type="date"
            className={styles.inputFecha}
            value={hasta}
            min={desde}
            max={fechaLocal()}
            onChange={(e) => onHasta(e.target.value)}
          />
        </div>
      )}
    </div>
  )
}
