import { JSX, useEffect, useState } from 'react'
import styles from './ModalDeudores.module.css'

interface Deudor {
  id: number
  nombre: string
  deuda_total: number
}

interface ModalDeudoresProps {
  onClose: () => void
  onAbono: () => void
}

const fmt = (n: number): string => '$' + n.toLocaleString('es-CL')

export default function ModalDeudores({ onClose, onAbono }: ModalDeudoresProps): JSX.Element {
  const [deudores, setDeudores] = useState<Deudor[]>([])
  const [expandido, setExpandido] = useState<number | null>(null)
  const [abono, setAbono] = useState('')
  const [cargando, setCargando] = useState(false)

  useEffect(() => {
    window.api.fiados.todos().then(setDeudores)
  }, [])

  const toggleExpadir = (id: number): void => {
    setExpandido((prev) => (prev === id ? null : id))
    setAbono('')
  }

  const handleAbonar = async (deudor: Deudor): Promise<void> => {
    const monto = parseInt(abono)
    if (!monto || monto <= 0) return
    setCargando(true)
    try {
      const result = await window.api.fiados.abonar(deudor.id, monto)
      if (result.ok) {
        await window.api.fiados.todos().then(setDeudores)
        setExpandido(null)
        setAbono('')
        onAbono()
      }
    } finally {
      setCargando(false)
    }
  }

  const total = deudores.reduce((s, d) => s + d.deuda_total, 0)

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h3>Deudores</h3>
          <div className={styles.headerRight}>
            <span className={styles.totalLabel}>Total: {fmt(total)}</span>
            <button className={styles.btnClose} onClick={onClose}>
              ✕
            </button>
          </div>
        </div>
        <div className={styles.infoContainer}>
          <div className={styles.infoIcon}>ⓘ</div>
          <span className={styles.infoText}>
            Aquí se muestra el total de deudores histórico registrados en esta máquina. Presiona
            cada uno para gestionar su deuda
          </span>
        </div>

        <div className={styles.body}>
          {deudores.length === 0 ? (
            <p className={styles.empty}>Sin deudores registrados</p>
          ) : (
            deudores.map((d) => {
              const saldado = d.deuda_total === 0
              const isExp = expandido === d.id
              return (
                <div key={d.id}>
                  <div
                    className={`${styles.row} ${isExp ? styles.expanded : ''}`}
                    onClick={() => toggleExpadir(d.id)}
                  >
                    <span className={styles.nombre}>{d.nombre}</span>
                    <span className={`${styles.deuda} ${saldado ? styles.saldado : ''}`}>
                      {saldado ? 'Saldado ✓' : fmt(d.deuda_total)}
                    </span>
                  </div>

                  {isExp && (
                    <div className={styles.abonoPanel}>
                      <input
                        className={styles.abonoInput}
                        type="number"
                        placeholder="Monto del abono..."
                        value={abono}
                        onChange={(e) => setAbono(e.target.value)}
                        min={1}
                        max={d.deuda_total}
                        autoFocus
                      />
                      <button
                        className={styles.btnAbonar}
                        disabled={!abono || parseInt(abono) <= 0 || cargando}
                        onClick={() => handleAbonar(d)}
                      >
                        {cargando ? '...' : 'Abonar'}
                      </button>
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
