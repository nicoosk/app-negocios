import { JSX, useEffect, useState } from 'react'
import styles from './ModalDeudores.module.css'
import { ChevronDown } from 'lucide-react'

interface Deudor {
  id: number
  nombre: string
  deuda_total: number
}

interface Movimiento {
  monto: number
  fecha: string
  hora: string
}

interface ModalDeudoresProps {
  userId: number
  onClose: () => void
  onAbono: () => void
}

const fmt = (n: number): string => '$' + Math.abs(n).toLocaleString('es-CL')

function calcularSaldos(historial: Movimiento[]): number[] {
  const rev = [...historial].reverse()
  let saldo = 0
  const saldos = rev.map((h) => {
    saldo += h.monto
    return saldo
  })
  return saldos.reverse()
}

export default function ModalDeudores({
  userId,
  onClose,
  onAbono
}: ModalDeudoresProps): JSX.Element {
  const [deudores, setDeudores] = useState<Deudor[]>([])
  const [expandido, setExpandido] = useState<number | null>(null)
  const [abono, setAbono] = useState('')
  const [historial, setHistorial] = useState<Movimiento[]>([])
  const [cargando, setCargando] = useState(false)

  useEffect(() => {
    window.api.fiados.todos().then(setDeudores)
  }, [])

  const toggleExpandir = async (id: number): Promise<void> => {
    if (expandido === id) {
      setExpandido(null)
      setHistorial([])
      setAbono('')
      return
    }
    setExpandido(id)
    setAbono('')
    const data = await window.api.fiados.historial(id)
    setHistorial(data)
  }

  const handleAbonar = async (deudor: Deudor): Promise<void> => {
    const monto = parseInt(abono)
    if (!monto || monto <= 0) return
    setCargando(true)
    try {
      const result = await window.api.fiados.abonar(deudor.id, monto, userId)
      if (result.ok) {
        const [actualizados, data] = await Promise.all([
          window.api.fiados.todos(),
          window.api.fiados.historial(deudor.id)
        ])
        setDeudores(actualizados)
        setHistorial(data)
        setAbono('')
        onAbono()
      }
    } finally {
      setCargando(false)
    }
  }

  const total = deudores.reduce((s, d) => s + d.deuda_total, 0)
  const saldos = calcularSaldos(historial)

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h3>Deudores</h3>
          <div className={styles.headerRight}>
            <span className={styles.totalLabel}>Total adeudado: {fmt(total)}</span>
            <button className={styles.btnClose} onClick={onClose}>
              ✕
            </button>
          </div>
        </div>

        <div className={styles.infoContainer}>
          <span className={styles.infoIcon}>ⓘ</span>
          <span className={styles.infoText}>
            Historial completo de deudores. Presiona cada uno para gestionar su deuda.
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
                    onClick={() => toggleExpandir(d.id)}
                  >
                    <span className={styles.nombre}>{d.nombre}</span>
                    <div className={styles.rowRight}>
                      <span className={`${styles.deuda} ${saldado ? styles.saldado : ''}`}>
                        {saldado ? 'Sin deuda' : fmt(d.deuda_total)}
                      </span>
                      <ChevronDown
                        className={`${styles.chevron} ${isExp ? styles.open : ''}`}
                        size={20}
                      />
                    </div>
                  </div>

                  {isExp && (
                    <div className={styles.detailPanel}>
                      <div className={styles.abonoRow}>
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

                      <div className={styles.historialWrap}>
                        <span className={styles.historialLabel}>HISTORIAL DE MOVIMIENTOS</span>
                        {historial.length === 0 ? (
                          <span className={styles.empty}>Sin movimientos</span>
                        ) : (
                          historial.map((h, i) => (
                            <div key={i} className={styles.histItem}>
                              <div className={styles.histLeft}>
                                <span className={styles.histFecha}>
                                  {h.fecha} · {h.hora.slice(0, 5)}
                                </span>
                                <span
                                  className={`${styles.histTipo} ${h.monto > 0 ? styles.fio : styles.abonoTipo}`}
                                >
                                  {h.monto > 0 ? 'Fío' : 'Abono'}
                                </span>
                              </div>
                              <div className={styles.histRight}>
                                <span
                                  className={`${styles.histMonto} ${h.monto > 0 ? styles.fio : styles.abonoTipo}`}
                                >
                                  {h.monto > 0 ? '+' : '-'}
                                  {fmt(h.monto)}
                                </span>
                                <span className={styles.histSaldo}>Saldo: {fmt(saldos[i])}</span>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
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
