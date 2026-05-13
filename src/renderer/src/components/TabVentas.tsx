import { JSX, useState } from 'react'
import styles from './TabVentas.module.css'

interface TabVentasProps {
  onVentaRegistrada: () => void
}

export default function TabVentas({ onVentaRegistrada }: TabVentasProps): JSX.Element {
  const [raw, setRaw] = useState('')

  const display = raw ? Number(raw).toLocaleString('es-CL') : '0'
  const ready = raw.length > 0 && raw !== '0'

  const press = (k: string): void => {
    if (raw.length >= 9) return
    setRaw((r) => r + k)
  }

  const del = (): void => setRaw((r) => r.slice(0, -1))
  const clear = (): void => setRaw('')

  const registrarVenta = async (): Promise<void> => {
    if (!ready) return
    const result = await window.api.ventas.registrar(parseInt(raw))
    if (result.ok) {
      setRaw('')
      onVentaRegistrada()
    }
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.montoCard}>
        <span className={styles.label}>MONTO DE VENTA</span>
        <div className={styles.montoDisplay}>
          <span className={styles.prefix}>$</span>
          <span className={styles.value}>{display}</span>
          <div className={styles.cursor} />
        </div>
      </div>

      <div className={styles.numpad}>
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((k) => (
          <button key={k} onClick={() => press(k)}>
            {k}
          </button>
        ))}
        <button className={styles.muted} onClick={del}>
          ⌫
        </button>
        <button onClick={() => press('0')}>0</button>
        <button className={styles.muted} onClick={clear}>
          C
        </button>
      </div>

      <button className={styles.btnVenta} disabled={!ready} onClick={registrarVenta}>
        Registrar venta
      </button>
    </div>
  )
}
