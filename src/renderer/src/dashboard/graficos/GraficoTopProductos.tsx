import { JSX } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts'
import type { PuntoProducto } from '@shared/tipos'
import styles from '../Dashboard.module.css'
import { colorPorIndice, EJE, GRID, tooltipEstilo } from '../chartTheme'
import { fmt } from '@renderer/utils/formatter'
import type { FilaDetalle } from '../ModalDetallePunto'

export type MetricaProducto = 'monto' | 'unidades'

interface GraficoTopProductosProps {
  data: PuntoProducto[]
  metrica: MetricaProducto
  onDetalle: (titulo: string, filas: FilaDetalle[]) => void
}

export default function GraficoTopProductos({
  data,
  metrica,
  onDetalle
}: GraficoTopProductosProps): JSX.Element {
  if (data.length === 0) {
    return (
      <div className={styles.chartBox}>
        <span className={styles.sinDatos}>Sin productos en el período</span>
      </div>
    )
  }

  const formatear = (valor: unknown): string =>
    metrica === 'monto' ? fmt(Number(valor)) : `${valor} u.`

  const abrirDetalle = (estado: unknown): void => {
    const punto = (estado as { activePayload?: { payload: PuntoProducto }[] })?.activePayload?.[0]
      ?.payload
    if (!punto) return
    onDetalle(punto.nombre, [
      { etiqueta: 'Unidades', valor: String(punto.unidades) },
      { etiqueta: 'Monto', valor: fmt(punto.monto) }
    ])
  }

  const alto = Math.max(200, data.length * 36)

  return (
    <div style={{ width: '100%', height: alto }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 4, right: 12, left: 4, bottom: 4 }}
          onClick={abrirDetalle}
        >
          <CartesianGrid stroke={GRID} horizontal={false} />
          <XAxis
            type="number"
            stroke={EJE}
            fontSize={11}
            tickLine={false}
            axisLine={false}
            tickFormatter={(valor: number) => (metrica === 'monto' ? fmt(valor) : String(valor))}
          />
          <YAxis
            type="category"
            dataKey="nombre"
            stroke={EJE}
            fontSize={11}
            tickLine={false}
            axisLine={false}
            width={120}
          />
          <Tooltip {...tooltipEstilo} formatter={formatear} />
          <Bar
            dataKey={metrica}
            name={metrica === 'monto' ? 'Monto' : 'Unidades'}
            radius={[0, 3, 3, 0]}
          >
            {data.map((_, i) => (
              <Cell key={i} fill={colorPorIndice(i)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
