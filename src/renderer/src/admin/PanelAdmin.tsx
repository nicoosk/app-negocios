import { JSX, useCallback, useEffect, useState } from 'react'
import styles from '@renderer/admin/PanelAdmin.module.css'
type TabActiva = 'ventas' | 'fiados'

interface VentaAdmin {
  id: number
  monto: number
  fecha: string
  hora: string
}

interface FiadoDetalleAdmin {
  id: number
  fiado_id: number
  nombre: string
  monto: number
  fecha: string
  hora: string
}

type EstadoEdicion =
  | { tipo: 'ninguno' }
  | { tipo: 'venta'; registro: VentaAdmin }
  | { tipo: 'fiado'; registro: FiadoDetalleAdmin }

interface PanelAdminProps {
  userId: number
}

const fmt = (n: number): string => n.toLocaleString('es-CL', { style: 'currency', currency: 'CLP' })

export default function PanelAdmin({ userId }: PanelAdminProps): JSX.Element {
  const [tab, setTab] = useState<TabActiva>('ventas')
  const [ventas, setVentas] = useState<VentaAdmin[]>([])
  const [fiados, setFiados] = useState<FiadoDetalleAdmin[]>([])
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [edicion, setEdicion] = useState<EstadoEdicion>({ tipo: 'ninguno' })
  const [montoEdicion, setMontoEdicion] = useState('')
  const [nombreConversion, setNombreConversion] = useState('')
  const [deudores, setDeudores] = useState<{ id: number; nombre: string }[]>([])

  const cargarVentas = useCallback(async (): Promise<void> => {
    setCargando(true)
    setError(null)
    const res = await window.api.admin.ventas.historial(userId)
    console.log('[PanelAdmin : CargarVentas] Raw response:', res)
    if (res.ok && res.ventas) setVentas(res.ventas)
    else setError(res.error ?? 'Error al cargar ventas')
    setCargando(false)
  }, [userId])

  const cargarFiados = useCallback(async (): Promise<void> => {
    setCargando(true)
    setError(null)
    const res = await window.api.admin.fiados.historial(userId)
    if (res.ok && res.fiados) setFiados(res.fiados)
    else setError(res.error ?? 'Error al cargar fiados')
    setCargando(false)
  }, [userId])

  const cargarDeudores = useCallback(async (): Promise<void> => {
    const lista = await window.api.fiados.todos()
    setDeudores(lista.map((f) => ({ id: f.id, nombre: f.nombre })))
  }, [])

  useEffect(() => {
    if (tab === 'ventas') cargarVentas()
    else cargarFiados()
  }, [tab, cargarVentas, cargarFiados])

  const abrirEdicion = (registro: VentaAdmin | FiadoDetalleAdmin, tipo: TabActiva): void => {
    setMontoEdicion(String(registro.monto))
    setNombreConversion('')
    if (tipo === 'ventas') {
      setEdicion({ tipo: 'venta', registro: registro as VentaAdmin })
    } else {
      setEdicion({ tipo: 'fiado', registro: registro as FiadoDetalleAdmin })
    }
  }

  const cerrarEdicion = (): void => setEdicion({ tipo: 'ninguno' })

  const confirmarEdicion = async (): Promise<void> => {
    const monto = parseInt(montoEdicion)
    if (!monto || monto <= 0) return
    if (edicion.tipo === 'venta') {
      await window.api.admin.ventas.editar(userId, edicion.registro.id, monto)
      cargarVentas()
    } else if (edicion.tipo === 'fiado') {
      await window.api.admin.fiados.editar(
        userId,
        edicion.registro.id,
        edicion.registro.fiado_id,
        edicion.registro.monto,
        monto
      )
      cargarFiados()
    }
    cerrarEdicion()
  }

  const eliminar = async (
    registro: VentaAdmin | FiadoDetalleAdmin,
    tipo: TabActiva
  ): Promise<void> => {
    if (tipo === 'ventas') {
      await window.api.admin.ventas.eliminar(userId, (registro as VentaAdmin).id)
      cargarVentas()
    } else {
      const f = registro as FiadoDetalleAdmin
      await window.api.admin.fiados.eliminar(userId, f.id, f.fiado_id, f.monto)
      cargarFiados()
    }
  }

  const confirmarConversion = async (): Promise<void> => {
    if (edicion.tipo === 'venta') {
      if (!nombreConversion.trim()) return
      await window.api.admin.ventas.convertir(userId, edicion.registro.id, nombreConversion.trim())
      cargarVentas()
    } else if (edicion.tipo === 'fiado') {
      const f = edicion.registro
      await window.api.admin.fiados.convertir(userId, f.id, f.fiado_id, f.monto)
      cargarFiados()
    }
    cerrarEdicion()
  }

  const abrirConversion = async (
    registro: VentaAdmin | FiadoDetalleAdmin,
    tipo: TabActiva
  ): Promise<void> => {
    if (tipo === 'fiados') await cargarDeudores()
    setMontoEdicion(String(registro.monto))
    setNombreConversion('')
    if (tipo === 'ventas') setEdicion({ tipo: 'venta', registro: registro as VentaAdmin })
    else setEdicion({ tipo: 'fiado', registro: registro as FiadoDetalleAdmin })
  }

  return (
    <div className={styles.panel}>
      <h2 className={styles.titulo}>Administrar registros</h2>

      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${tab === 'ventas' ? styles.tabActivo : ''}`}
          onClick={() => setTab('ventas')}
        >
          Ventas
        </button>
        <button
          className={`${styles.tab} ${tab === 'fiados' ? styles.tabActivo : ''}`}
          onClick={() => setTab('fiados')}
        >
          Fiados
        </button>
      </div>

      {error && <p className={styles.error}>{error}</p>}
      {cargando && <p className={styles.cargando}>Cargando...</p>}

      {!cargando && !error && (
        <div className={styles.tablaWrapper}>
          <table className={styles.tabla}>
            <thead>
              <tr>
                {tab === 'fiados' && <th>Deudor</th>}
                <th>Monto</th>
                <th>Fecha</th>
                <th>Hora</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {tab === 'ventas' &&
                ventas.map((v) => (
                  <tr key={v.id}>
                    <td>{fmt(v.monto)}</td>
                    <td>{v.fecha}</td>
                    <td>{v.hora}</td>
                    <td className={styles.acciones}>
                      <button
                        className={styles.btnEditar}
                        onClick={() => abrirEdicion(v, 'ventas')}
                      >
                        Editar
                      </button>
                      <button
                        className={styles.btnConvertir}
                        onClick={() => abrirConversion(v, 'ventas')}
                      >
                        → Fiado
                      </button>
                      <button className={styles.btnEliminar} onClick={() => eliminar(v, 'ventas')}>
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))}
              {tab === 'fiados' &&
                fiados.map((f) => (
                  <tr key={f.id}>
                    <td>{f.nombre}</td>
                    <td>{fmt(f.monto)}</td>
                    <td>{f.fecha}</td>
                    <td>{f.hora}</td>
                    <td className={styles.acciones}>
                      <button
                        className={styles.btnEditar}
                        onClick={() => abrirEdicion(f, 'fiados')}
                      >
                        Editar
                      </button>
                      <button
                        className={styles.btnConvertir}
                        onClick={() => abrirConversion(f, 'fiados')}
                      >
                        → Venta
                      </button>
                      <button className={styles.btnEliminar} onClick={() => eliminar(f, 'fiados')}>
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
          {tab === 'ventas' && ventas.length === 0 && (
            <p className={styles.empty}>Sin registros de ventas</p>
          )}
          {tab === 'fiados' && fiados.length === 0 && (
            <p className={styles.empty}>Sin registros de fiados</p>
          )}
        </div>
      )}

      {edicion.tipo !== 'ninguno' && (
        <div className={styles.modalOverlay} onClick={cerrarEdicion}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.modalTitulo}>
              {edicion.tipo === 'venta' ? 'Editar / Convertir venta' : 'Editar / Convertir fiado'}
            </h3>

            <label className={styles.label}>Monto</label>
            <input
              className={styles.input}
              type="number"
              value={montoEdicion}
              onChange={(e) => setMontoEdicion(e.target.value)}
              autoFocus
            />

            {edicion.tipo === 'venta' && (
              <>
                <label className={styles.label}>Convertir a fiado - deudor</label>
                <input
                  className={styles.input}
                  type="text"
                  placeholder="Nombre del deudor"
                  value={nombreConversion}
                  list="deudores-lista"
                  onChange={(e) => setNombreConversion(e.target.value)}
                />
                <datalist id="deudores-lista">
                  {deudores.map((d) => (
                    <option key={d.id} value={d.nombre} />
                  ))}
                </datalist>
              </>
            )}

            <div className={styles.modalAcciones}>
              <button className={styles.btnCancelar} onClick={cerrarEdicion}>
                Cancelar
              </button>
              {edicion.tipo === 'venta' && nombreConversion.trim() ? (
                <button className={styles.btnConvertir} onClick={confirmarConversion}>
                  Convertir a fiado
                </button>
              ) : edicion.tipo === 'fiado' && !nombreConversion ? (
                <button className={styles.btnConvertir} onClick={confirmarConversion}>
                  Convertir a venta
                </button>
              ) : null}
              <button className={styles.btnGuardar} onClick={confirmarEdicion}>
                Guardar monto
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
