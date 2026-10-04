import { JSX, useEffect } from 'react'
import { X } from 'lucide-react'
import styles from './Dashboard.module.css'

export interface FilaDetalle {
  etiqueta: string
  valor: string
}

interface ModalDetallePuntoProps {
  titulo: string
  filas: FilaDetalle[]
  onClose: () => void
}

export default function ModalDetallePunto({
  titulo,
  filas,
  onClose
}: ModalDetallePuntoProps): JSX.Element {
  useEffect(() => {
    const alPresionar = (evento: KeyboardEvent): void => {
      if (evento.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', alPresionar)
    return () => window.removeEventListener('keydown', alPresionar)
  }, [onClose])

  return (
    <div className={styles.modalFondo} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <span className={styles.modalTitulo}>{titulo}</span>
          <button className={styles.modalCerrar} onClick={onClose} aria-label="Cerrar">
            <X size={16} />
          </button>
        </div>
        <div className={styles.modalCuerpo}>
          {filas.map((fila, i) => (
            <div key={i} className={styles.detalleFila}>
              <span>{fila.etiqueta}</span>
              <span className={styles.detalleMonto}>{fila.valor}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
