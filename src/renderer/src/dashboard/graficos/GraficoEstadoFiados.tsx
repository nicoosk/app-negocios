import { JSX } from 'react'
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { EstadoFiados } from '@shared/tipos'
import styles from '../Dashboard.module.css'
import { EJE, tooltipEstilo } from '../chartTheme'
import { fmt } from '@renderer/utils/formatter'

interface GraficoEstadoFiadosProps {
  estado: EstadoFiados
}

export default function GraficoEstadoFiados({ estado }: GraficoEstadoFiadosProps): JSX.Element {
  const datos = [
    { nombre: 'Fiado', monto: estado.fiado },
    { nombre: 'Abonos', monto: estado.abonos }
  ]
  const porcentaje = Math.round(estado.recuperacion * 100)

  return (
    <div className={styles.fiadosWrap}>
      <div className={styles.recuperacion}>
        <span className={styles.recuperacionValor}>{porcentaje}%</span>
        <span className={styles.recuperacionLabel}>recuperado en el período</span>
      </div>

      <div className={styles.chartBoxChico}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={datos}
            layout="vertical"
            margin={{ top: 0, right: 8, left: 0, bottom: 0 }}
          >
            <XAxis type="number" hide />
            <YAxis
              type="category"
              dataKey="nombre"
              stroke={EJE}
              fontSize={11}
              tickLine={false}
              axisLine={false}
              width={64}
            />
            <Tooltip {...tooltipEstilo} formatter={(valor: unknown) => fmt(Number(valor))} />
            <Bar dataKey="monto" name="Monto" radius={[0, 3, 3, 0]}>
              <Cell fill="#a78bfa" />
              <Cell fill="#4ade80" />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <span className={styles.panelTitulo}>DEUDORES CON SALDO</span>
      <div className={styles.lista}>
        {estado.topDeudores.length === 0 ? (
          <span className={styles.empty}>Sin deudas pendientes</span>
        ) : (
          estado.topDeudores.map((deudor) => (
            <div key={deudor.id} className={styles.filaDeudor}>
              <span className={styles.nombre}>{deudor.nombre}</span>
              <span className={`${styles.monto} ${styles.red}`}>{fmt(deudor.deuda_total)}</span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
