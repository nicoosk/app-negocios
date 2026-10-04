import { createContext, useContext } from 'react'
import type { EstadoEscaner } from '@shared/tipos'

export type ManejadorEscaneo = (codigo: string) => void

export interface ValorEscaner {
  estado: EstadoEscaner | null
  pendientes: number
  abrirModal: () => void
  registrarManejador: (fn: ManejadorEscaneo) => () => void
  refrescarPendientes: () => Promise<void>
}

export const EscanerContext = createContext<ValorEscaner | null>(null)

export function useEscaner(): ValorEscaner {
  const ctx = useContext(EscanerContext)
  if (!ctx) throw new Error('useEscaner debe usarse dentro de <EscanerProvider>')
  return ctx
}
