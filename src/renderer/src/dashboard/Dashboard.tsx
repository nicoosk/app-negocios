import { JSX, useEffect, useState } from 'react'
import styles from './Dashboard.module.css'
import ModalDeudores from '@renderer/fiados/ModalDeudores'
import { LayoutDashboard } from 'lucide-react'
import { fmt } from '@renderer/utils/formatter'

interface ItemVenta {
  nombre_producto: string
  cantidad: number
  subtotal: number
}

interface Venta {
  id: number
  monto: number
  hora: string
  items: ItemVenta[]
}

interface Fio {
  nombre: string
  monto: number
  hora: string
}

interface Deudor {
  id: number
  nombre: string
  deuda_total: number
}

interface DashboardProps {
  userId: number
}

export default function Dashboard({ userId }: DashboardProps): JSX.Element {
  const [totalVentas, setTotalVentas] = useState(0)
  const [countVentas, setCountVentas] = useState(0)
  const [ventas, setVentas] = useState<Venta[]>([])
  const [totalFiosHoy, setTotalFiosHoy] = useState(0)
  const [fios, setFios] = useState<Fio[]>([])
  const [deudores, setDeudores] = useState<Deudor[]>([])
  const [totalDeuda, setTotalDeuda] = useState(0)
  const [modalDeudores, setModalDeudores] = useState<boolean>(false)

  const fecha = new Date().toLocaleDateString('es-CL', {
    weekday: 'long',
    day: 'numeric',
    month: 'long'
  })

  useEffect(() => {
    const cargar = async (): Promise<void> => {
      const [dataVentas, dataFios, dataDeudores] = await Promise.all([
        window.api.ventas.hoy(),
        window.api.fiados.hoy(),
        window.api.fiados.todos()
      ])

      setTotalVentas(dataVentas.total)
      setCountVentas(dataVentas.count)
      setVentas(dataVentas.ventas)
      setTotalFiosHoy(dataFios.total)
      setFios(dataFios.fios)
      setDeudores(dataDeudores)
      setTotalDeuda(dataDeudores.reduce((s: number, d: Deudor) => s + d.deuda_total, 0))
    }

    cargar()
  }, [])

  const deudoresActivos = deudores.filter((d) => d.deuda_total > 0)

  return (
    <div className={styles.pagina}>
      <div className={styles.header}>
        <div className={styles.tituloWrapper}>
          <LayoutDashboard className={styles.icon} />
          <h1 className={styles.titulo}>Dashboard</h1>
        </div>
        <span className={styles.fecha}>{fecha}</span>
      </div>

      <div className={styles.statsGrid}>
        <div className={`${styles.statCard} ${styles.green}`}>
          <span className={styles.statLabel}>VENTAS HOY</span>
          <span className={styles.statValor}>{fmt(totalVentas)}</span>
          <span className={styles.statSub}>{countVentas} transacciones</span>
        </div>

        <div className={`${styles.statCard} ${styles.purple}`}>
          <span className={styles.statLabel}>FIADO HOY</span>
          <span className={styles.statValor}>{fmt(totalFiosHoy)}</span>
          <span className={styles.statSub}>{fios.length} fíos registrados</span>
        </div>

        <div
          className={`${styles.statCard} ${styles.red} ${styles.deudoresClickeable}`}
          onClick={() => setModalDeudores(true)}
        >
          <span className={styles.statLabel}>DEUDA TOTAL</span>
          <span className={styles.statValor}>{fmt(totalDeuda)}</span>
          <span className={styles.statSub}>
            {deudoresActivos.length} deudor{deudoresActivos.length > 1 ? 'es' : ''} activo
            {deudoresActivos.length > 1 ? 's' : ''}
          </span>
        </div>

        <div className={styles.statCard}>
          <span className={styles.statLabel}>PROMEDIO VENDIDO</span>
          <span className={styles.statValor}>
            {countVentas > 0 ? fmt(Math.round(totalVentas / countVentas)) : '$0'}
          </span>
          <span className={styles.statSub}>promedio por venta</span>
        </div>
      </div>

      <div className={styles.grids}>
        <div className={styles.bloque}>
          <span className={styles.bloqueLabel}>ÚLTIMAS VENTAS DE HOY</span>
          <div className={styles.row}>
            {ventas.length === 0 ? (
              <span className={styles.empty}>Sin ventas aún hoy</span>
            ) : (
              ventas.slice(0, 6).map((v, i) => (
                <div key={i} className={styles.metaInfo}>
                  <span className={styles.hora}>{v.hora.slice(0, 5)}</span>
                  <div className={styles.rowItems}>
                    {v.items.length > 0 ? (
                      <span>
                        {v.items
                          .map((it) =>
                            it.cantidad > 1
                              ? `${it.nombre_producto} ×${it.cantidad}`
                              : it.nombre_producto
                          )
                          .join(' · ')}
                      </span>
                    ) : (
                      <span className={styles.rowEmpty}>No hay items asociados</span>
                    )}
                  </div>
                  <span className={`${styles.rowMonto} ${styles.green}`}>{fmt(v.monto)}</span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className={styles.bloque}>
          <span className={styles.bloqueLabel}>FÍOS DE HOY</span>
          <div className={styles.lista}>
            {fios.length === 0 ? (
              <span className={styles.empty}>Sin fíos hoy</span>
            ) : (
              fios.slice(0, 8).map((f, i) => (
                <div key={i} className={styles.filaFio}>
                  <div className={styles.fioLeft}>
                    <span className={styles.hora}>{f.hora.slice(0, 5)}</span>
                    <span className={styles.nombre}>{f.nombre}</span>
                  </div>
                  <span className={`${styles.monto} ${styles.purple}`}>{fmt(f.monto)}</span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className={styles.bloque}>
          <span className={styles.bloqueLabel}>DEUDORES CON SALDO</span>
          <div className={styles.lista}>
            {deudoresActivos.length === 0 ? (
              <span className={styles.empty}>Sin deudas pendientes</span>
            ) : (
              deudoresActivos.slice(0, 8).map((d) => (
                <div key={d.id} className={styles.filaDeudor}>
                  <span className={styles.nombre}>{d.nombre}</span>
                  <span className={`${styles.monto} ${styles.red}`}>{fmt(d.deuda_total)}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {modalDeudores && (
        <ModalDeudores
          userId={userId}
          onClose={() => setModalDeudores(false)}
          onAbono={() => console.log('Abonado!')}
        />
      )}
    </div>
  )
}
