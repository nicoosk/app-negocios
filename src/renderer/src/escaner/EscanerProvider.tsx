import { useCallback, useEffect, useRef, useState, type JSX, type ReactNode } from 'react'
import type { EstadoEscaner } from '@shared/tipos'
import { EscanerContext, type ManejadorEscaneo, type ValorEscaner } from './contexto'
import ModalEscaner from './ModalEscaner'

const INTERVALO_ESTADO = 4000

// Provee el estado del escáner y enruta los códigos recibidos al manejador que
// registre la pantalla activa. El evento llega del proceso main vía IPC.
export function EscanerProvider({ children }: { children: ReactNode }): JSX.Element {
  const [estado, setEstado] = useState<EstadoEscaner | null>(null)
  const [pendientes, setPendientes] = useState(0)
  const [modalAbierto, setModalAbierto] = useState(false)
  const manejadorRef = useRef<ManejadorEscaneo | null>(null)

  const refrescarEstado = useCallback(async (): Promise<void> => {
    try {
      setEstado(await window.api.scanner.estado())
    } catch (err) {
      console.error('[escaner] No se pudo obtener el estado:', err)
    }
  }, [])

  const refrescarPendientes = useCallback(async (): Promise<void> => {
    const res = await window.api.productos.contarNuevos()
    if (res.ok) setPendientes(res.count)
  }, [])

  useEffect(() => {
    let activo = true
    const refrescar = async (): Promise<void> => {
      try {
        const e = await window.api.scanner.estado()
        if (activo) setEstado(e)
      } catch (err) {
        console.error('[escaner] No se pudo obtener el estado:', err)
      }
    }
    const cargarPendientes = async (): Promise<void> => {
      const res = await window.api.productos.contarNuevos()
      if (activo && res.ok) setPendientes(res.count)
    }
    void refrescar()
    void cargarPendientes()
    const quitar = window.api.scanner.onCodigo((codigo) => {
      manejadorRef.current?.(codigo)
    })
    const timer = setInterval(() => void refrescar(), INTERVALO_ESTADO)
    return () => {
      activo = false
      quitar()
      clearInterval(timer)
    }
  }, [])

  const registrarManejador = useCallback((fn: ManejadorEscaneo): (() => void) => {
    manejadorRef.current = fn
    return () => {
      if (manejadorRef.current === fn) manejadorRef.current = null
    }
  }, [])

  const valor: ValorEscaner = {
    estado,
    pendientes,
    abrirModal: () => setModalAbierto(true),
    registrarManejador,
    refrescarPendientes
  }

  return (
    <EscanerContext.Provider value={valor}>
      {children}
      {modalAbierto && (
        <ModalEscaner
          estado={estado}
          onCerrar={() => setModalAbierto(false)}
          onRefrescar={refrescarEstado}
        />
      )}
    </EscanerContext.Provider>
  )
}
