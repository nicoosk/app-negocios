import { JSX } from 'react'
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import type { PuntoProducto } from '@shared/tipos'
import styles from '../Dashboard.module.css'
import { colorPorIndice, tooltipEstilo } from '../chartTheme'
import { fmt } from '@renderer/utils/formatter'

interface GraficoMixProductosProps {
  items: PuntoProducto[]
  total: number
}

export default function GraficoMixProductos({
  items,
  total
}: GraficoMixProductosProps): JSX.Element {
  if (items.length === 0 || total === 0) {
    return (
      <div className={styles.chartBox}>
        <span className={styles.sinDatos}>Sin datos en el período</span>
      </div>
    )
  }

  return (
    <div className={styles.mixWrap}>
      <div className={styles.chartBox}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={items}
              dataKey="monto"
              nameKey="nombre"
              innerRadius={52}
              outerRadius={82}
              paddingAngle={2}
              stroke="none"
            >
              {items.map((_, i) => (
                <Cell key={i} fill={colorPorIndice(i)} />
              ))}
            </Pie>
            <Tooltip {...tooltipEstilo} formatter={(valor: unknown) => fmt(Number(valor))} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className={styles.leyenda}>
        {items.map((producto, i) => (
          <span key={i} className={styles.leyendaItem}>
            <span className={styles.leyendaPunto} style={{ background: colorPorIndice(i) }} />
            {producto.nombre} · {Math.round((producto.monto / total) * 100)}%
          </span>
        ))}
      </div>
    </div>
  )
}
