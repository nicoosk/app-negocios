import { JSX } from 'react'
import {
  Area,
  AreaChart,
  Brush,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts'
import type { PuntoDia } from '@shared/tipos'
import styles from '../Dashboard.module.css'
import { EJE, GRID, formatearFechaCorta, tooltipEstilo } from '../chartTheme'
import { fmt } from '@renderer/utils/formatter'
import type { FilaDetalle } from '../ModalDetallePunto'

interface GraficoVentasTiempoProps {
  data: PuntoDia[]
  onDetalle: (titulo: string, filas: FilaDetalle[]) => void
}

export default function GraficoVentasTiempo({
  data,
  onDetalle
}: GraficoVentasTiempoProps): JSX.Element {
  const vacio = data.every((punto) => punto.monto === 0 && punto.fiado === 0)

  if (vacio) {
    return (
      <div className={`${styles.chartBox} ${styles.chartBoxAlto}`}>
        <span className={styles.sinDatos}>Sin ventas en el período</span>
      </div>
    )
  }

  const abrirDetalle = (estado: unknown): void => {
    const punto = (estado as { activePayload?: { payload: PuntoDia }[] })?.activePayload?.[0]
      ?.payload
    if (!punto) return
    onDetalle(`Día ${formatearFechaCorta(punto.fecha)}`, [
      { etiqueta: 'Ventas', valor: fmt(punto.monto) },
      { etiqueta: 'Transacciones', valor: String(punto.transacciones) },
      {
        etiqueta: 'Ticket promedio',
        valor: punto.transacciones > 0 ? fmt(Math.round(punto.monto / punto.transacciones)) : '—'
      },
      { etiqueta: 'Fiado', valor: fmt(punto.fiado) }
    ])
  }

  return (
    <div className={`${styles.chartBox} ${styles.chartBoxAlto}`}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
          onClick={abrirDetalle}
        >
          <defs>
            <linearGradient id="gradVentas" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#4ade80" stopOpacity={0.35} />
              <stop offset="100%" stopColor="#4ade80" stopOpacity={0.02} />
            </linearGradient>
            <linearGradient id="gradFiado" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#a78bfa" stopOpacity={0.3} />
              <stop offset="100%" stopColor="#a78bfa" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke={GRID} vertical={false} />
          <XAxis
            dataKey="fecha"
            tickFormatter={formatearFechaCorta}
            stroke={EJE}
            fontSize={11}
            tickLine={false}
            axisLine={false}
            minTickGap={24}
          />
          <YAxis
            stroke={EJE}
            fontSize={11}
            tickLine={false}
            axisLine={false}
            tickFormatter={(valor: number) => fmt(valor)}
            width={64}
          />
          <Tooltip
            {...tooltipEstilo}
            formatter={(valor: unknown) => fmt(Number(valor))}
            labelFormatter={(etiqueta: unknown) => `Día ${formatearFechaCorta(String(etiqueta))}`}
          />
          <Area
            type="monotone"
            dataKey="monto"
            name="Ventas"
            stroke="#4ade80"
            strokeWidth={2}
            fill="url(#gradVentas)"
          />
          <Area
            type="monotone"
            dataKey="fiado"
            name="Fiado"
            stroke="#a78bfa"
            strokeWidth={2}
            fill="url(#gradFiado)"
          />
          <Brush
            dataKey="fecha"
            height={20}
            stroke="#333"
            fill="#0d0d0d"
            travellerWidth={8}
            tickFormatter={formatearFechaCorta}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
