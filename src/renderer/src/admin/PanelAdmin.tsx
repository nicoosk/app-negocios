import { JSX, useCallback, useEffect, useState } from 'react'
import styles from '@renderer/admin/PanelAdmin.module.css'
import { Settings } from 'lucide-react'
import { fmt } from '@renderer/utils/formatter'
import { similar } from '@renderer/utils/search'
import type { FiadoDetalleAdmin, RegistroAuditoria, ResumenFiado, VentaAdmin } from '@shared/tipos'

type TabActiva = 'ventas' | 'fiados' | 'auditoria'
type TipoRegistro = 'ventas' | 'fiados'

type EstadoEdicion =
  | { tipo: 'ninguno' }
  | { tipo: 'venta'; registro: VentaAdmin }
  | { tipo: 'fiado'; registro: FiadoDetalleAdmin }

export default function PanelAdmin(): JSX.Element {
  const [tab, setTab] = useState<TabActiva>('ventas')
  const [ventas, setVentas] = useState<VentaAdmin[]>([])
  const [fiados, setFiados] = useState<FiadoDetalleAdmin[]>([])
  const [auditoria, setAuditoria] = useState<RegistroAuditoria[]>([])
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [edicion, setEdicion] = useState<EstadoEdicion>({ tipo: 'ninguno' })
  const [montoEdicion, setMontoEdicion] = useState('')
  const [nombreConversion, setNombreConversion] = useState('')
  const [deudores, setDeudores] = useState<ResumenFiado[]>([])
  const [sugerenciasConversion, setSugerenciasConversion] = useState<ResumenFiado[]>([])
  const [seleccionado, setSeleccionado] = useState(false)

  const cargarVentas = useCallback(async (): Promise<void> => {
    setCargando(true)
    setError(null)
    const res = await window.api.admin.ventas.historial()
    if (res.ok && res.ventas) setVentas(res.ventas)
    else setError(res.error ?? 'Error al cargar ventas')
    setCargando(false)
  }, [])

  const cargarFiados = useCallback(async (): Promise<void> => {
    setCargando(true)
    setError(null)
    const res = await window.api.admin.fiados.historial()
    if (res.ok && res.fiados) setFiados(res.fiados)
    else setError(res.error ?? 'Error al cargar fiados')
    setCargando(false)
  }, [])

  const cargarDeudores = useCallback(async (): Promise<void> => {
    const lista = await window.api.fiados.todos()
    setDeudores(lista)
  }, [])

  const cargarAuditoria = useCallback(async (): Promise<void> => {
    setCargando(true)
    setError(null)
    const res = await window.api.admin.auditoria.listar()
    if (res.ok) setAuditoria(res.registros)
    else setError(res.error ?? 'Error al cargar la auditoría')
    setCargando(false)
  }, [])

  useEffect(() => {
    const cargar = async (): Promise<void> => {
      if (tab === 'ventas') cargarVentas()
      else if (tab === 'fiados') cargarFiados()
      else cargarAuditoria()
    }
    cargar()
  }, [tab, cargarVentas, cargarFiados, cargarAuditoria])

  const abrirEdicion = (registro: VentaAdmin | FiadoDetalleAdmin, tipo: TipoRegistro): void => {
    setMontoEdicion(String(registro.monto))
    cambiarNombreConversion('')
    if (tipo === 'ventas') {
      setEdicion({ tipo: 'venta', registro: registro as VentaAdmin })
    } else {
      setEdicion({ tipo: 'fiado', registro: registro as FiadoDetalleAdmin })
    }
  }

  const cerrarEdicion = (): void => {
    setEdicion({ tipo: 'ninguno' })
    setSugerenciasConversion([])
  }

  const confirmarEdicion = async (): Promise<void> => {
    const monto = parseInt(montoEdicion)
    if (!monto || monto <= 0) return
    if (edicion.tipo === 'venta') {
      await window.api.admin.ventas.editar(edicion.registro.id, monto)
      cargarVentas()
    } else if (edicion.tipo === 'fiado') {
      await window.api.admin.fiados.editar(
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
    tipo: TipoRegistro
  ): Promise<void> => {
    if (tipo === 'ventas') {
      await window.api.admin.ventas.eliminar((registro as VentaAdmin).id)
      cargarVentas()
    } else {
      const f = registro as FiadoDetalleAdmin
      await window.api.admin.fiados.eliminar(f.id, f.fiado_id, f.monto)
      cargarFiados()
    }
  }

  const confirmarConversion = async (): Promise<void> => {
    if (edicion.tipo === 'venta') {
      if (!nombreConversion.trim()) return
      await window.api.admin.ventas.convertir(edicion.registro.id, nombreConversion.trim())
      cargarVentas()
    } else if (edicion.tipo === 'fiado') {
      const f = edicion.registro
      await window.api.admin.fiados.convertir(f.id, f.fiado_id, f.monto)
      cargarFiados()
    }
    cerrarEdicion()
  }

  const abrirConversion = async (
    registro: VentaAdmin | FiadoDetalleAdmin,
    tipo: TipoRegistro
  ): Promise<void> => {
    await cargarDeudores()
    setMontoEdicion(String(registro.monto))
    cambiarNombreConversion('')
    if (tipo === 'ventas') setEdicion({ tipo: 'venta', registro: registro as VentaAdmin })
    else setEdicion({ tipo: 'fiado', registro: registro as FiadoDetalleAdmin })
  }

  const cambiarNombreConversion = (val: string): void => {
    setNombreConversion(val)
    if (val.length < 2) {
      setSugerenciasConversion([])
      return
    }
    setSugerenciasConversion(deudores.filter((d) => similar(val, d.nombre)))
  }

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <Settings />
        <h2 className={styles.titulo}>Administrar registros</h2>
      </div>
      <span className={styles.descripcion}>
        En este panel puedes administrar todas tus ventas y fíos históricos. Cada registro puede ser
        editado, convertido a otro tipo o eliminarse. Cada acción necesita ser realizada por un
        admin autorizado.
      </span>
      <div className={styles.tabs}>
        <div className={styles.tabsWrapper}>
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
          <button
            className={`${styles.tab} ${tab === 'auditoria' ? styles.tabActivo : ''}`}
            onClick={() => setTab('auditoria')}
          >
            Auditoría
          </button>
        </div>
        <button
          className={styles.btnRecargar}
          onClick={() => {
            if (tab === 'ventas') cargarVentas()
            else if (tab === 'fiados') cargarFiados()
            else cargarAuditoria()
          }}
        >
          Recargar
        </button>
      </div>

      {error && <p className={styles.error}>{error}</p>}
      {cargando && <p className={styles.cargando}>Cargando...</p>}

      {!cargando && !error && tab === 'auditoria' && (
        <div className={styles.tablaWrapper}>
          <table className={styles.tabla}>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Hora</th>
                <th>Usuario</th>
                <th>Acción</th>
                <th>Entidad</th>
                <th>Detalle</th>
              </tr>
            </thead>
            <tbody>
              {auditoria.map((a) => (
                <tr key={a.id}>
                  <td>{a.fecha}</td>
                  <td>{a.hora}</td>
                  <td>{a.username ?? '—'}</td>
                  <td>{a.accion}</td>
                  <td>{a.entidad ? `${a.entidad} #${a.entidad_id ?? '—'}` : '—'}</td>
                  <td>{a.detalle ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {auditoria.length === 0 && <p className={styles.empty}>Sin registros de auditoría</p>}
        </div>
      )}

      {!cargando && !error && tab !== 'auditoria' && (
        <div className={styles.tablaWrapper}>
          <table className={styles.tabla}>
            <thead>
              <tr>
                {tab === 'fiados' && <th>Deudor</th>}
                {tab === 'fiados' && <th>Fiado por</th>}
                {tab === 'ventas' && <th>Registrada por</th>}
                <th>{tab === 'fiados' ? 'Monto fiado' : 'Venta registrada'}</th>
                <th>Fecha</th>
                <th>Hora</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {tab === 'ventas' &&
                ventas.map((v) => (
                  <tr key={v.id}>
                    <td>{v.username ?? '—'}</td>
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
                    <td>{f.username}</td>
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
                  autoComplete="off"
                  onChange={(e) => cambiarNombreConversion(e.target.value)}
                />
                {(sugerenciasConversion.length > 0 ||
                  (nombreConversion.length >= 2 && !seleccionado)) && (
                  <div className={styles.sugerencias}>
                    <span className={styles.sugerenciasLabel}>SUGERENCIAS</span>
                    {sugerenciasConversion.map((d) => (
                      <div
                        key={d.id}
                        className={`${styles.sugerenciasItem} ${nombreConversion === d.nombre ? styles.sugerenciasItemSel : ''}`}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => {
                          setNombreConversion(d.nombre)
                          setSeleccionado(true)
                          setSugerenciasConversion([])
                        }}
                      >
                        <span className={styles.sugerenciasNombre}>{d.nombre}</span>
                        <span className={styles.sugerenciasDeuda}>
                          {d.deuda_total > 0 ? `Debe ${fmt(d.deuda_total)}` : 'Sin deuda'}
                        </span>
                      </div>
                    ))}
                    {nombreConversion.length >= 2 &&
                      !sugerenciasConversion.find((d) => d.nombre === nombreConversion) && (
                        <div
                          className={styles.sugerenciasItem}
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => setSugerenciasConversion([])}
                        >
                          <span className={styles.sugerenciasNombre}>{nombreConversion}</span>
                          <span className={styles.sugerenciasNew}>+ Crear nuevo</span>
                        </div>
                      )}
                  </div>
                )}
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
