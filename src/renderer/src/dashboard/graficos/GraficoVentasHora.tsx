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
import type { PuntoHora } from '@shared/tipos'
import styles from '../Dashboard.module.css'
import { EJE, GRID, tooltipEstilo } from '../chartTheme'
import { fmt } from '@renderer/utils/formatter'

interface GraficoVentasHoraProps {
  data: PuntoHora[]
}

export default function GraficoVentasHora({ data }: GraficoVentasHoraProps): JSX.Element {
  const maximo = Math.max(...data.map((punto) => punto.monto), 0)
  const vacio = maximo === 0

  if (vacio) {
    return (
      <div className={styles.chartBox}>
        <span className={styles.sinDatos}>Sin ventas en el período</span>
      </div>
    )
  }

  return (
    <div className={styles.chartBox}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke={GRID} vertical={false} />
          <XAxis
            dataKey="hora"
            stroke={EJE}
            fontSize={11}
            tickLine={false}
            axisLine={false}
            interval={2}
            tickFormatter={(hora: number) => `${hora}h`}
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
            labelFormatter={(hora: unknown) => `${hora}:00 hrs`}
          />
          <Bar dataKey="monto" name="Ventas" radius={[3, 3, 0, 0]}>
            {data.map((punto, i) => (
              <Cell key={i} fill={punto.monto === maximo && maximo > 0 ? '#4ade80' : '#2f7d52'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
