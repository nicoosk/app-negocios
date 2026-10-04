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
import type { PuntoUsuario } from '@shared/tipos'
import styles from '../Dashboard.module.css'
import { colorPorIndice, EJE, GRID, tooltipEstilo } from '../chartTheme'
import { fmt } from '@renderer/utils/formatter'

interface GraficoPorUsuarioProps {
  data: PuntoUsuario[]
}

export default function GraficoPorUsuario({ data }: GraficoPorUsuarioProps): JSX.Element {
  if (data.length === 0) {
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
          <XAxis dataKey="username" stroke={EJE} fontSize={11} tickLine={false} axisLine={false} />
          <YAxis
            stroke={EJE}
            fontSize={11}
            tickLine={false}
            axisLine={false}
            tickFormatter={(valor: number) => fmt(valor)}
            width={64}
          />
          <Tooltip {...tooltipEstilo} formatter={(valor: unknown) => fmt(Number(valor))} />
          <Bar dataKey="monto" name="Ventas" radius={[3, 3, 0, 0]}>
            {data.map((_, i) => (
              <Cell key={i} fill={colorPorIndice(i)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
