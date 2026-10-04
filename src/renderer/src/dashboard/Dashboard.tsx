import { JSX, useEffect, useState } from 'react'
import styles from './Dashboard.module.css'
import ModalDeudores from '@renderer/fiados/ModalDeudores'
import { LayoutDashboard } from 'lucide-react'
import { fmt } from '@renderer/utils/formatter'
import { fechaLocal, haceDias } from '@renderer/utils/fechas'
import type { PanelEstadisticas } from '@shared/tipos'
import SelectorPeriodo, { type Periodo } from './SelectorPeriodo'
import PanelGrafico from './PanelGrafico'
import ModalDetallePunto, { type FilaDetalle } from './ModalDetallePunto'
import GraficoVentasTiempo from './graficos/GraficoVentasTiempo'
import GraficoVentasHora from './graficos/GraficoVentasHora'
import GraficoTopProductos, { type MetricaProducto } from './graficos/GraficoTopProductos'
import GraficoMixProductos from './graficos/GraficoMixProductos'
import GraficoPorUsuario from './graficos/GraficoPorUsuario'
import GraficoDispersion from './graficos/GraficoDispersion'
import GraficoEstadoFiados from './graficos/GraficoEstadoFiados'

// Compara la métrica con el período anterior de igual duración.
function Delta({ actual, anterior }: { actual: number; anterior: number }): JSX.Element {
  if (anterior === 0) {
    return (
      <span className={`${styles.delta} ${styles.deltaNeutro}`}>
        {actual === 0 ? 'sin movimientos' : 'nuevo vs anterior'}
      </span>
    )
  }
  const cambio = Math.round(((actual - anterior) / anterior) * 100)
  const clase = cambio > 0 ? styles.deltaPos : cambio < 0 ? styles.deltaNeg : styles.deltaNeutro
  return (
    <span className={`${styles.delta} ${clase}`}>
      {cambio > 0 ? '+' : ''}
      {cambio}% vs período anterior
    </span>
  )
}

export default function Dashboard(): JSX.Element {
  const [periodo, setPeriodo] = useState<Periodo>('hoy')
  const [desdeCustom, setDesdeCustom] = useState(haceDias(29))
  const [hastaCustom, setHastaCustom] = useState(fechaLocal())
  const [panel, setPanel] = useState<PanelEstadisticas | null>(null)
  const [metricaTop, setMetricaTop] = useState<MetricaProducto>('monto')
  const [modalDeudores, setModalDeudores] = useState(false)
  const [detalle, setDetalle] = useState<{ titulo: string; filas: FilaDetalle[] } | null>(null)

  const fecha = new Date().toLocaleDateString('es-CL', {
    weekday: 'long',
    day: 'numeric',
    month: 'long'
  })

  useEffect(() => {
    let activo = true
    const desde =
      periodo === 'hoy'
        ? fechaLocal()
        : periodo === '7d'
          ? haceDias(6)
          : periodo === '30d'
            ? haceDias(29)
            : desdeCustom
    const hasta = periodo === 'personalizado' ? hastaCustom : fechaLocal()

    const cargar = async (): Promise<void> => {
      const data = await window.api.estadisticas.panel(desde, hasta)
      if (activo) setPanel(data)
    }
    cargar()

    return () => {
      activo = false
    }
  }, [periodo, desdeCustom, hastaCustom])

  const abrirDetalle = (titulo: string, filas: FilaDetalle[]): void => setDetalle({ titulo, filas })

  const resumen = panel?.resumen
  const anterior = resumen?.anterior
  const transacciones = resumen?.transacciones ?? 0
  const unidades = resumen?.unidades ?? 0
  const itemsPorVenta = transacciones > 0 ? unidades / transacciones : 0
  const itemsPorVentaAnterior =
    anterior && anterior.transacciones > 0 ? anterior.unidades / anterior.transacciones : 0
  const tasaFiado = resumen && resumen.ventas > 0 ? resumen.fiado / resumen.ventas : 0
  const tasaFiadoAnterior = anterior && anterior.ventas > 0 ? anterior.fiado / anterior.ventas : 0

  return (
    <div className={styles.pagina}>
      <div className={styles.header}>
        <div className={styles.tituloWrapper}>
          <LayoutDashboard className={styles.icon} />
          <h1 className={styles.titulo}>Dashboard</h1>
        </div>
        <span className={styles.fecha}>{fecha}</span>
        <SelectorPeriodo
          periodo={periodo}
          desde={desdeCustom}
          hasta={hastaCustom}
          onPeriodo={setPeriodo}
          onDesde={setDesdeCustom}
          onHasta={setHastaCustom}
        />
      </div>

      <div className={styles.statsGrid}>
        <div className={`${styles.statCard} ${styles.green}`}>
          <span className={styles.statLabel}>VENTAS</span>
          <span className={styles.statValor}>{fmt(resumen?.ventas ?? 0)}</span>
          <span className={styles.statSub}>{transacciones} transacciones</span>
          <Delta actual={resumen?.ventas ?? 0} anterior={anterior?.ventas ?? 0} />
        </div>

        <div className={styles.statCard}>
          <span className={styles.statLabel}>TICKET PROMEDIO</span>
          <span className={styles.statValor}>{fmt(resumen?.ticketPromedio ?? 0)}</span>
          <span className={styles.statSub}>promedio por venta</span>
          <Delta actual={resumen?.ticketPromedio ?? 0} anterior={anterior?.ticketPromedio ?? 0} />
        </div>

        <div className={styles.statCard}>
          <span className={styles.statLabel}>ÍTEMS POR VENTA</span>
          <span className={styles.statValor}>{itemsPorVenta.toFixed(1)}</span>
          <span className={styles.statSub}>{unidades} unidades vendidas</span>
          <Delta actual={itemsPorVenta} anterior={itemsPorVentaAnterior} />
        </div>

        <div className={`${styles.statCard} ${styles.purple}`}>
          <span className={styles.statLabel}>TASA DE FIADO</span>
          <span className={styles.statValor}>{Math.round(tasaFiado * 100)}%</span>
          <span className={styles.statSub}>{fmt(resumen?.fiado ?? 0)} fiado en el período</span>
          <Delta actual={tasaFiado} anterior={tasaFiadoAnterior} />
        </div>

        <div
          className={`${styles.statCard} ${styles.red} ${styles.deudoresClickeable}`}
          onClick={() => setModalDeudores(true)}
        >
          <span className={styles.statLabel}>DEUDA TOTAL</span>
          <span className={styles.statValor}>{fmt(resumen?.deudaTotal ?? 0)}</span>
          <span className={styles.statSub}>{resumen?.deudoresActivos ?? 0} deudores con saldo</span>
        </div>

        <div className={styles.statCard}>
          <span className={styles.statLabel}>INVENTARIO</span>
          <span className={styles.statValor}>{fmt(resumen?.valorInventario ?? 0)}</span>
          <span className={styles.statSub}>{resumen?.productosActivos ?? 0} productos activos</span>
        </div>
      </div>

      {panel ? (
        <div className={styles.chartsGrid}>
          <PanelGrafico titulo="VENTAS EN EL TIEMPO" ancho>
            <GraficoVentasTiempo data={panel.porDia} onDetalle={abrirDetalle} />
          </PanelGrafico>

          <PanelGrafico titulo="VENTAS POR HORA">
            <GraficoVentasHora data={panel.porHora} />
          </PanelGrafico>

          <PanelGrafico titulo="VENTAS POR USUARIO">
            <GraficoPorUsuario data={panel.porUsuario} />
          </PanelGrafico>

          <PanelGrafico
            titulo="TOP PRODUCTOS"
            acciones={
              <div className={styles.panelAcciones}>
                <button
                  className={`${styles.toggleBoton} ${
                    metricaTop === 'monto' ? styles.toggleBotonActivo : ''
                  }`}
                  onClick={() => setMetricaTop('monto')}
                >
                  Monto
                </button>
                <button
                  className={`${styles.toggleBoton} ${
                    metricaTop === 'unidades' ? styles.toggleBotonActivo : ''
                  }`}
                  onClick={() => setMetricaTop('unidades')}
                >
                  Unidades
                </button>
              </div>
            }
          >
            <GraficoTopProductos
              data={metricaTop === 'monto' ? panel.topPorMonto : panel.topPorUnidades}
              metrica={metricaTop}
              onDetalle={abrirDetalle}
            />
          </PanelGrafico>

          <PanelGrafico titulo="MIX DE PRODUCTOS">
            <GraficoMixProductos items={panel.mix} total={panel.mixTotal} />
          </PanelGrafico>

          <PanelGrafico titulo="DISPERSIÓN MONTO × HORA" ancho>
            <GraficoDispersion data={panel.dispersion} onDetalle={abrirDetalle} />
          </PanelGrafico>

          <PanelGrafico titulo="ESTADO DE FIADOS" ancho>
            <GraficoEstadoFiados estado={panel.estadoFiados} />
          </PanelGrafico>
        </div>
      ) : (
        <div className={styles.panel}>
          <span className={styles.empty}>Cargando estadísticas…</span>
        </div>
      )}

      {modalDeudores && <ModalDeudores onClose={() => setModalDeudores(false)} />}
      {detalle && (
        <ModalDetallePunto
          titulo={detalle.titulo}
          filas={detalle.filas}
          onClose={() => setDetalle(null)}
        />
      )}
    </div>
  )
}
