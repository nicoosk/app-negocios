// Paleta y estilos compartidos por los gráficos del dashboard (tema oscuro).
export const PALETA = [
  '#4ade80',
  '#a78bfa',
  '#60a5fa',
  '#fbbf24',
  '#f472b6',
  '#22d3ee',
  '#f87171',
  '#34d399'
]

export const EJE = '#555'
export const GRID = '#1e1e1e'

export function colorPorIndice(indice: number): string {
  return PALETA[indice % PALETA.length]
}

// Estilos del tooltip por defecto de Recharts, unificados para todos los gráficos.
export const tooltipEstilo = {
  contentStyle: {
    background: '#0a0a0a',
    border: '1px solid #2d2d2d',
    borderRadius: 8,
    fontSize: 12,
    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.5)'
  },
  labelStyle: {
    color: '#777',
    fontSize: 11,
    marginBottom: 4,
    textTransform: 'capitalize' as const
  },
  itemStyle: { color: '#ccc', fontSize: 12 },
  cursor: { fill: 'rgba(255, 255, 255, 0.04)' }
}

export function formatearFechaCorta(fecha: string): string {
  const partes = fecha.split('-')
  return partes.length === 3 ? `${partes[2]}/${partes[1]}` : fecha
}
