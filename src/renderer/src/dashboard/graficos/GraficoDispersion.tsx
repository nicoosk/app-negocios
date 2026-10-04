import { JSX } from 'react'
import {
  CartesianGrid,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis
} from 'recharts'
import type { PuntoDispersion } from '@shared/tipos'
import styles from '../Dashboard.module.css'
import { EJE, GRID, tooltipEstilo } from '../chartTheme'
import { fmt } from '@renderer/utils/formatter'
import type { FilaDetalle } from '../ModalDetallePunto'

interface GraficoDispersionProps {
  data: PuntoDispersion[]
  onDetalle: (titulo: string, filas: FilaDetalle[]) => void
}

export default function GraficoDispersion({
  data,
  onDetalle
}: GraficoDispersionProps): JSX.Element {
  if (data.length === 0) {
    return (
      <div className={styles.chartBox}>
        <span className={styles.sinDatos}>Sin ventas en el período</span>
      </div>
    )
  }

  const abrirDetalle = (estado: unknown): void => {
    const punto = (estado as { activePayload?: { payload: PuntoDispersion }[] })?.activePayload?.[0]
      ?.payload
    if (!punto) return
    onDetalle(`Venta #${punto.venta_id}`, [
      { etiqueta: 'Hora', valor: punto.horaTexto.slice(0, 5) },
      { etiqueta: 'Monto', valor: fmt(punto.monto) },
      { etiqueta: 'Ítems', valor: String(punto.items) }
    ])
  }

  return (
    <div className={styles.chartBox}>
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={{ top: 8, right: 12, left: 0, bottom: 0 }} onClick={abrirDetalle}>
          <CartesianGrid stroke={GRID} />
          <XAxis
            type="number"
            dataKey="hora"
            name="Hora"
            domain={[0, 23]}
            stroke={EJE}
            fontSize={11}
            tickLine={false}
            axisLine={false}
            tickFormatter={(hora: number) => `${hora}h`}
          />
          <YAxis
            type="number"
            dataKey="monto"
            name="Monto"
            stroke={EJE}
            fontSize={11}
            tickLine={false}
            axisLine={false}
            tickFormatter={(valor: number) => fmt(valor)}
            width={64}
          />
          <ZAxis type="number" dataKey="items" range={[40, 220]} />
          <Tooltip
            {...tooltipEstilo}
            cursor={{ strokeDasharray: '3 3', stroke: '#333' }}
            formatter={(valor: unknown, nombre: unknown) =>
              nombre === 'Monto' ? fmt(Number(valor)) : String(valor)
            }
          />
          <Scatter data={data} fill="#60a5fa" fillOpacity={0.65} />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  )
}
