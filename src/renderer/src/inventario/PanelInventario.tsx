import { JSX, useCallback, useEffect, useState } from 'react'
import styles from './PanelInventario.module.css'
import {
  Package,
  PackagePlus,
  Pencil,
  Plus,
  ScanLine,
  Search,
  Trash2,
  TriangleAlert
} from 'lucide-react'
import { fmt } from '@renderer/utils/formatter'
import { UNIDADES } from '@shared/constantes'
import type { Producto } from '@shared/tipos'
import { useEscaner } from '../escaner/contexto'
import ModalResolverProducto from '../escaner/ModalResolverProducto'

interface FormState {
  nombre: string
  codigo_barra: string
  precio_venta: string
  stock: string
  unidad: string
}

const UMBRAL_STOCK_BAJO = 5

const formVacio = (): FormState => ({
  nombre: '',
  codigo_barra: '',
  precio_venta: '',
  stock: '',
  unidad: 'unidad'
})

interface PanelInventarioProps {
  isAdmin: boolean
}

async function consultarProductos(): Promise<Producto[]> {
  const res = await window.api.productos.listar()
  return res.ok && res.productos ? res.productos : []
}

export default function PanelInventario({ isAdmin }: PanelInventarioProps): JSX.Element {
  const [productos, setProductos] = useState<Producto[]>([])
  const [busqueda, setBusqueda] = useState('')
  const [modalAbierto, setModalAbierto] = useState(false)
  const [editando, setEditando] = useState<Producto | null>(null)
  const [form, setForm] = useState<FormState>(formVacio())
  const [confirmEliminar, setConfirmEliminar] = useState<number | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const [resolviendo, setResolviendo] = useState<Producto | null>(null)
  const [soloPendientes, setSoloPendientes] = useState(false)

  const { abrirModal, pendientes, refrescarPendientes, registrarManejador } = useEscaner()

  const cargarProductos = useCallback(async (): Promise<void> => {
    setProductos(await consultarProductos())
  }, [])

  useEffect(() => {
    const cargar = async (): Promise<void> => {
      setProductos(await consultarProductos())
    }
    void cargar()
  }, [])

  const procesarCodigo = useCallback(async (codigo: string): Promise<void> => {
    const res = await window.api.productos.escanear(codigo)
    if (!res.ok || !res.producto) return
    if (res.producto.es_nuevo === 1) {
      setResolviendo(res.producto)
      return
    }
    setBusqueda(codigo)
  }, [])

  useEffect(
    () => registrarManejador((codigo) => void procesarCodigo(codigo)),
    [registrarManejador, procesarCodigo]
  )

  const abrirCrear = (): void => {
    setEditando(null)
    setForm(formVacio())
    setModalAbierto(true)
  }

  const abrirEditar = (p: Producto): void => {
    setEditando(p)
    setForm({
      nombre: p.nombre,
      codigo_barra: p.codigo_barra ?? '',
      precio_venta: String(p.precio_venta),
      stock: String(p.stock),
      unidad: p.unidad
    })
    setModalAbierto(true)
  }

  const cerrarModal = (): void => {
    setModalAbierto(false)
    setEditando(null)
    setForm(formVacio())
  }

  const handleGuardar = async (): Promise<void> => {
    if (!form.nombre.trim() || !form.precio_venta.trim() || !form.stock.trim()) {
      setError('Debes completar todos los campos obligatorios')
      return
    }
    setError('')
    setGuardando(true)

    const codigo = form.codigo_barra.trim() || null
    const precio = parseInt(form.precio_venta) || 0
    const stock = parseInt(form.stock) || 0

    const res = editando
      ? await window.api.productos.actualizar(
          editando.id,
          form.nombre.trim(),
          codigo,
          precio,
          stock,
          form.unidad
        )
      : await window.api.productos.crear(form.nombre.trim(), codigo, precio, stock, form.unidad)

    setGuardando(false)
    if (res.ok) {
      await cargarProductos()
      cerrarModal()
    }
  }

  const handleEliminar = async (id: number): Promise<void> => {
    const res = await window.api.productos.eliminar(id)
    if (res.ok) {
      setConfirmEliminar(null)
      await cargarProductos()
    }
  }

  const filtrados = productos
    .filter((p) => (soloPendientes ? p.es_nuevo === 1 : true))
    .filter(
      (p) =>
        p.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
        (p.codigo_barra ?? '').includes(busqueda)
    )

  const stockBajo = productos.filter((p) => p.stock <= UMBRAL_STOCK_BAJO && p.es_nuevo === 0).length

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.titleRow}>
          <Package size={20} />
          <h2>Inventario</h2>
          {stockBajo > 0 && (
            <div className={styles.alertaBadge}>
              <TriangleAlert size={14} className={styles.icon} />
              <span className={styles.alertaLabel}>{stockBajo} con stock bajo</span>
            </div>
          )}
          {pendientes > 0 && (
            <button className={styles.pendientesBadge} onClick={() => setSoloPendientes(true)}>
              <PackagePlus size={14} />
              <span>{pendientes} por completar</span>
            </button>
          )}
          <span className={styles.badge}>Beta</span>
        </div>
        <div className={styles.acciones}>
          <div className={styles.searchWrap}>
            <Search size={14} />
            <input
              className={styles.searchInput}
              placeholder="Buscar por nombre o código..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
          </div>
          <button
            className={`${styles.togglePendientes} ${soloPendientes ? styles.toggleActivo : ''}`}
            onClick={() => setSoloPendientes((v) => !v)}
          >
            <PackagePlus size={14} />
            Pendientes{pendientes > 0 ? ` (${pendientes})` : ''}
          </button>
          <button className={styles.btnEscaner} onClick={abrirModal} title="Conectar escáner">
            <ScanLine size={15} />
          </button>
          <button className={styles.btnNuevo} onClick={abrirCrear}>
            <Plus size={16} />
            Nuevo producto
          </button>
        </div>
      </div>

      {filtrados.length === 0 ? (
        <div className={styles.empty}>
          {busqueda
            ? 'Sin resultados para esa búsqueeda'
            : 'No hay productos aún. ¡Agrega el primero!'}
        </div>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Producto</th>
                <th>Código de barra</th>
                <th>Precio</th>
                <th>Stock</th>
                <th>Unidad</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.map((p) => (
                <tr key={p.id} className={p.stock <= UMBRAL_STOCK_BAJO ? styles.rowLow : ''}>
                  <td className={styles.tdNombre}>
                    <span className={styles.nombreConTag}>
                      {p.nombre}
                      {p.es_nuevo === 1 && <span className={styles.tagPendiente}>Pendiente</span>}
                    </span>
                  </td>
                  <td className={styles.tdMono}>
                    {p.codigo_barra ?? <span className={styles.noData}>-</span>}
                  </td>
                  <td className={styles.tdPrecio}>{fmt(p.precio_venta)}</td>
                  <td
                    className={p.stock <= UMBRAL_STOCK_BAJO ? styles.tdStockBajo : styles.tdStock}
                  >
                    <div className={styles.contentContainer}>
                      {p.stock}
                      {p.es_nuevo === 0 && p.stock <= UMBRAL_STOCK_BAJO && (
                        <TriangleAlert size={14} className={styles.icon} />
                      )}
                    </div>
                  </td>
                  <td className={styles.tdUnidad}>{p.unidad}</td>
                  <td className={styles.tdAcciones}>
                    {p.es_nuevo === 1 ? (
                      <button
                        className={styles.btnCompletar}
                        onClick={() => setResolviendo(p)}
                        title="Completar datos"
                      >
                        <PackagePlus size={14} />
                        Completar
                      </button>
                    ) : undefined}
                    <button
                      className={styles.btnEdit}
                      onClick={() => abrirEditar(p)}
                      title="Editar"
                    >
                      <Pencil size={14} />
                    </button>
                    {isAdmin ? (
                      <button
                        className={styles.btnDel}
                        onClick={() => setConfirmEliminar(p.id)}
                        title="Eliminar"
                      >
                        <Trash2 size={14} />
                      </button>
                    ) : undefined}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modalAbierto && (
        <div className={styles.overlay} onClick={cerrarModal}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3>{editando ? 'Editar producto' : 'Nuevo producto'}</h3>
            <div className={styles.field}>
              <label>
                Nombre <span className={styles.obligatorio}>*</span>
              </label>
              <input
                className={styles.input}
                value={form.nombre}
                onChange={(e) => {
                  setError('')
                  setForm((f) => ({ ...f, nombre: e.target.value }))
                }}
              />
            </div>
            <div className={styles.field}>
              <label>Código de barra</label>
              <input
                className={styles.input}
                value={form.codigo_barra}
                onChange={(e) => {
                  setError('')
                  setForm((f) => ({ ...f, codigo_barra: e.target.value }))
                }}
                placeholder="Opcional. Se autocompleta al escanear."
              />
            </div>
            <div className={styles.fieldRow}>
              <div className={styles.field}>
                <label>
                  Precio de venta ($) <span className={styles.obligatorio}>*</span>
                </label>
                <input
                  className={styles.input}
                  type="number"
                  min="0"
                  value={form.precio_venta}
                  onChange={(e) => {
                    setError('')
                    setForm((f) => ({ ...f, precio_venta: e.target.value }))
                  }}
                  placeholder="0"
                />
              </div>
              <div className={styles.field}>
                <label>
                  Stock <span className={styles.obligatorio}>*</span>
                </label>
                <input
                  className={styles.input}
                  type="number"
                  min="0"
                  value={form.stock}
                  onChange={(e) => {
                    setError('')
                    setForm((f) => ({ ...f, stock: e.target.value }))
                  }}
                />
              </div>
              <div className={styles.field}>
                <label>Unidad</label>
                <select
                  className={styles.select}
                  value={form.unidad}
                  onChange={(e) => {
                    setError('')
                    setForm((f) => ({ ...f, unidad: e.target.value }))
                  }}
                >
                  {UNIDADES.map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className={styles.modalAcciones}>
              <button className={styles.btnCancelar} onClick={cerrarModal}>
                Cancelar
              </button>
              <button
                className={styles.btnGuardar}
                onClick={handleGuardar}
                disabled={!form.nombre.trim() || guardando}
              >
                {guardando ? 'Guardando...' : editando ? 'Guardar cambios' : 'Crear producto'}
              </button>
            </div>
            {error && <span className={styles.error}>{error}</span>}
          </div>
        </div>
      )}

      {confirmEliminar !== null && (
        <div className={styles.overlay} onClick={() => setConfirmEliminar(null)}>
          <div className={styles.modalChico} onClick={(e) => e.stopPropagation()}>
            <div className={styles.warningText}>
              <p>¿Eliminar este producto? </p>
              <span className={styles.deleteWarning}>Esta acción no se puede deshacer.</span>
            </div>
            <div className={styles.modalAcciones}>
              <button className={styles.btnCancelar} onClick={() => setConfirmEliminar(null)}>
                Cancelar
              </button>
              <button
                className={styles.btnEliminar}
                onClick={() => handleEliminar(confirmEliminar)}
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {resolviendo && (
        <ModalResolverProducto
          producto={resolviendo}
          onResuelto={(p) => {
            setResolviendo(null)
            void cargarProductos()
            void refrescarPendientes()
            setBusqueda(p.nombre)
          }}
          onCancelar={() => setResolviendo(null)}
        />
      )}
    </div>
  )
}
