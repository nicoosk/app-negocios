import { JSX, useEffect, useState } from 'react'
import TabVentas from './TabVentas'
import TabFiar from '../fiados/TabFiar'
import styles from './PanelVentas.module.css'
import ModalDeudores from '../fiados/ModalDeudores'
const fmt = (n: number): string => '$' + n.toLocaleString('es-CL')

interface Venta {
  monto: number
  hora: string
}

interface Fio {
  nombre: string
  monto: number
  hora: string
}

interface DashboardProps {
  userId: number
  username: string
}

type tabs = 'ventas' | 'fiar'

export default function PanelVentas({ userId, username }: DashboardProps): JSX.Element {
  const [tab, setTab] = useState<tabs>('ventas')
  const [totalVentas, setTotalVentas] = useState(0)
  const [countVentas, setCountVentas] = useState(0)
  const [ventas, setVentas] = useState<Venta[]>([])
  const [totalFios, setTotalFios] = useState(0)
  const [deudores, setDeudores] = useState(0)
  const [fios, setFios] = useState<Fio[]>([])
  const [modalDeudores, setModalDeudores] = useState<boolean>(false)

  const fecha = new Date().toLocaleDateString('es-CL', {
    weekday: 'long',
    day: 'numeric',
    month: 'long'
  })

  const recargarVentas = async (): Promise<void> => {
    const data = await window.api.ventas.hoy()
    setTotalVentas(data.total)
    setCountVentas(data.count)
    setVentas(data.ventas)
  }

  const recargarFios = async (): Promise<void> => {
    const [data, fiosTotales] = await Promise.all([
      window.api.fiados.hoy(),
      window.api.fiados.total()
    ])
    setTotalFios(data.total)
    setDeudores(fiosTotales.total)
    setFios(data.fios)
  }

  useEffect(() => {
    const cargar = async (): Promise<void> => {
      const [dataVentas, dataFios, dataFiosTotales] = await Promise.all([
        window.api.ventas.hoy(),
        window.api.fiados.hoy(),
        window.api.fiados.total()
      ])
      setTotalVentas(dataVentas.total)
      setCountVentas(dataVentas.count)
      setVentas(dataVentas.ventas)
      setTotalFios(dataFios.total)
      setDeudores(dataFiosTotales.total)
      setFios(dataFios.fios)
    }

    cargar()
  }, [])

  return (
    <div className={styles.app}>
      <div className={styles.left}>
        <div className={styles.topbar}>
          <div>
            <h2>Mi Almacén</h2>
            <span>{fecha}</span>
          </div>
          <button className={styles.badge}>{username}</button>
        </div>

        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${tab === 'ventas' ? styles.active : ''}`}
            onClick={() => setTab('ventas')}
          >
            Ventas
          </button>
          <button
            className={`${styles.tab} ${tab === 'fiar' ? styles.active : ''}`}
            onClick={() => setTab('fiar')}
          >
            Fiar
          </button>
        </div>

        {tab === 'ventas' && <TabVentas onVentaRegistrada={recargarVentas} />}
        {tab === 'fiar' && <TabFiar userId={userId} onFioRegistrado={recargarFios} />}
      </div>

      <div className={styles.right}>
        <div className={styles.stats}>
          <div className={styles.stat}>
            <span className={styles.statLabel}>VENTAS HOY</span>
            <span className={`${styles.statValue} ${styles.green}`}>{fmt(totalVentas)}</span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statLabel}>TRANSACCIONES</span>
            <span className={styles.statValue}>{countVentas}</span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statLabel}>FIADO HOY</span>
            <span className={`${styles.statValue} ${styles.purple}`}>{fmt(totalFios)}</span>
          </div>
          <div
            className={`${styles.stat} ${styles.clickable}`}
            onClick={() => setModalDeudores(true)}
          >
            <span className={styles.statLabel}>DEUDORES</span>
            <span className={`${styles.statValue} ${styles.red}`}>{deudores}</span>
          </div>
        </div>

        <hr className={styles.divider} />
        <span className={styles.sectionLabel}>ÚLTIMAS VENTAS</span>
        <div className={styles.historial}>
          {ventas.length === 0 ? (
            <span className={styles.empty}>Sin ventas aún</span>
          ) : (
            ventas.slice(0, 6).map((v, i) => (
              <div key={i} className={styles.row}>
                <span className={styles.hora}>{v.hora.slice(0, 5)}</span>
                <span className={`${styles.rowMonto} ${styles.green}`}>{fmt(v.monto)}</span>
              </div>
            ))
          )}
        </div>

        <hr className={styles.divider} />
        <span className={styles.sectionLabel}>ÚLTIMOS FÍOS</span>
        <div className={styles.historial}>
          {fios.length === 0 ? (
            <span className={styles.empty}>Sin fíos aún</span>
          ) : (
            fios.slice(0, 4).map((f, i) => (
              <div key={i} className={styles.row}>
                <div className={styles.rowLeft}>
                  <span className={styles.hora}>{f.hora.slice(0, 5)}</span>
                  <span className={styles.rowName}>{f.nombre}</span>
                </div>
                <span className={`${styles.rowMonto} ${styles.purple}`}>{fmt(f.monto)}</span>
              </div>
            ))
          )}
        </div>
      </div>
      {modalDeudores && (
        <ModalDeudores
          onClose={() => setModalDeudores(false)}
          onAbono={() => console.log('Abonado!')}
        />
      )}
    </div>
  )
}
