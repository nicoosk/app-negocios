import { JSX, useEffect, useRef, useState } from 'react'
import styles from './TabVentas.module.css'
import { Plus, Search, ShoppingBag } from 'lucide-react'
import { fmt } from '@renderer/utils/formatter'
import { Fiado, ItemCarrito, Producto } from './types'
import CartItem from './ItemCarrito'
import { similar } from '@renderer/utils/search'

interface TabVentasProps {
  userId: number
  onVentaRegistrada: () => void
  onFioRegistrado: () => void
}

export default function TabVentas({
  userId,
  onVentaRegistrada,
  onFioRegistrado
}: TabVentasProps): JSX.Element {
  const [carrito, setCarrito] = useState<ItemCarrito[]>([])
  const [busqueda, setBusqueda] = useState('')
  const [resultados, setResultados] = useState<Producto[]>([])
  const [editandoPrecio, setEditandoPrecio] = useState<number | null>(null)
  const [precioTemp, setPrecioTemp] = useState('')
  const [modalLibre, setModalLibre] = useState(false)
  const [libreNombre, setLibreNombre] = useState('')
  const [libreMonto, setLibreMonto] = useState('')
  const [registrando, setRegistrando] = useState(false)

  const [modalFio, setModalFio] = useState(false)
  const [nombreFio, setNombreFio] = useState('')
  const [todosDeudores, setTodosDeudores] = useState<Fiado[]>([])
  const [sugerenciasFio, setSugerenciasFio] = useState<Fiado[]>([])
  const [seleccionadoFio, setSeleccionadoFio] = useState<{
    nombre: string
    deuda_total: number
  } | null>(null)
  const [registrandoFio, setRegistrandoFio] = useState(false)
  const fioInputRef = useRef<HTMLInputElement>(null)

  const searchRef = useRef<HTMLInputElement>(null)
  const precioInputRef = useRef<HTMLInputElement>(null)
  const libreNombreRef = useRef<HTMLInputElement>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const total = carrito.reduce((acc, it) => acc + it.subtotal, 0)
  const totalItems = carrito.reduce((acc, it) => acc + it.cantidad, 0)
  const tieneTemporales = carrito.some((it) => it.precio_modificado)

  useEffect(() => {
    timerRef.current = setTimeout(async () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      if (busqueda.trim().length < 2) {
        setResultados([])
        return
      }
      const res = await window.api.productos.buscar(busqueda.trim())
      if (res.ok) setResultados(res.productos)
    }, 200)
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [busqueda])

  useEffect(() => {
    if (editandoPrecio !== null) {
      setTimeout(() => precioInputRef.current?.focus(), 30)
    }
  }, [editandoPrecio])

  useEffect(() => {
    if (modalLibre) {
      setTimeout(() => libreNombreRef.current?.focus(), 30)
    }
  }, [modalLibre])

  useEffect(() => {
    if (modalFio) {
      setTimeout(() => fioInputRef.current?.focus(), 30)
    }
  }, [modalFio])

  // ─── Handlers del carrito ───────────────────────────────────────────────────

  const agregarProducto = (p: Producto): void => {
    setCarrito((prev) => {
      const idx = prev.findIndex((it) => it.producto_id === p.id)
      if (idx !== -1) {
        return prev.map((it, i) =>
          i === idx
            ? { ...it, cantidad: it.cantidad + 1, subtotal: (it.cantidad + 1) * it.precio_unitario }
            : it
        )
      }
      return [
        ...prev,
        {
          producto_id: p.id,
          nombre: p.nombre,
          precio_base: p.precio_venta,
          precio_unitario: p.precio_venta,
          precio_modificado: false,
          cantidad: 1,
          subtotal: p.precio_venta
        }
      ]
    })
    setBusqueda('')
    setResultados([])
    searchRef.current?.focus()
  }

  const cambiarCantidad = (idx: number, delta: number): void => {
    setCarrito((prev) => {
      const nuevaCantidad = prev[idx].cantidad + delta
      if (nuevaCantidad <= 0) return prev.filter((_, i) => i !== idx)
      return prev.map((it, i) =>
        i === idx
          ? { ...it, cantidad: nuevaCantidad, subtotal: nuevaCantidad * it.precio_unitario }
          : it
      )
    })
    if (editandoPrecio === idx) setEditandoPrecio(null)
  }

  const quitarItem = (idx: number): void => {
    setCarrito((prev) => prev.filter((_, i) => i !== idx))
    if (editandoPrecio === idx) setEditandoPrecio(null)
  }

  const iniciarEditPrecio = (idx: number): void => {
    setEditandoPrecio(idx)
    setPrecioTemp(String(carrito[idx].precio_unitario))
  }

  const confirmarEditPrecio = (idx: number): void => {
    const nuevo = parseInt(precioTemp) || 0
    setCarrito((prev) =>
      prev.map((it, i) =>
        i === idx
          ? {
              ...it,
              precio_unitario: nuevo,
              precio_modificado: nuevo !== it.precio_base,
              subtotal: nuevo * it.cantidad
            }
          : it
      )
    )
    setEditandoPrecio(null)
  }

  const agregarMontoLibre = (): void => {
    const monto = parseInt(libreMonto) || 0
    if (!libreNombre.trim() || monto <= 0) return
    setCarrito((prev) => [
      ...prev,
      {
        producto_id: null,
        nombre: libreNombre.trim(),
        precio_base: monto,
        precio_unitario: monto,
        precio_modificado: false,
        cantidad: 1,
        subtotal: monto
      }
    ])
    setLibreNombre('')
    setLibreMonto('')
    setModalLibre(false)
    searchRef.current?.focus()
  }

  const registrarVenta = async (): Promise<void> => {
    if (carrito.length === 0 || registrando) return
    setRegistrando(true)
    const lineas = carrito.map((it) => ({
      producto_id: it.producto_id,
      nombre: it.nombre,
      precio_unitario: it.precio_unitario,
      cantidad: it.cantidad,
      subtotal: it.subtotal
    }))
    const result = await window.api.ventas.registrar(total, lineas)
    if (result.ok) {
      setCarrito([])
      setBusqueda('')
      setResultados([])
      onVentaRegistrada()
    }
    setRegistrando(false)
    searchRef.current?.focus()
  }

  const abrirModalFio = async (): Promise<void> => {
    const deudores = await window.api.fiados.buscar('')
    setTodosDeudores(deudores)
    setNombreFio('')
    setSugerenciasFio([])
    setSeleccionadoFio(null)
    setModalFio(true)
  }

  const cerrarModalFio = (): void => {
    setModalFio(false)
    setNombreFio('')
    setSugerenciasFio([])
    setSeleccionadoFio(null)
  }

  const buscarDeudor = (val: string): void => {
    setNombreFio(val)
    setSeleccionadoFio(null)
    if (val.length < 2) {
      setSugerenciasFio([])
      return
    }
    setSugerenciasFio(todosDeudores.filter((d) => similar(val, d.nombre)))
  }

  const registrarFio = async (): Promise<void> => {
    if (!seleccionadoFio || registrandoFio) return
    setRegistrandoFio(true)
    const lineas = carrito.map((it) => ({
      producto_id: it.producto_id,
      nombre: it.nombre,
      precio_unitario: it.precio_unitario,
      cantidad: it.cantidad,
      subtotal: it.subtotal
    }))
    const result = await window.api.fiados.registrar(seleccionadoFio.nombre, total, userId, lineas)
    if (result.ok) {
      setCarrito([])
      setBusqueda('')
      setResultados([])
      cerrarModalFio()
      onFioRegistrado()
    }
    setRegistrandoFio(false)
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.searchRow}>
        <div className={styles.searchWrap}>
          <Search size={14} className={styles.searchIcon} />
          <input
            ref={searchRef}
            className={styles.searchInput}
            placeholder="Buscar producto por nombre..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            autoComplete="off"
            autoFocus
          />
          {resultados.length > 0 && (
            <div className={styles.dropdown}>
              {resultados.map((p) => (
                <div
                  key={p.id}
                  className={styles.dropdownItem}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => agregarProducto(p)}
                >
                  <span className={styles.dropdownNombre}>{p.nombre}</span>
                  <div className={styles.dropdownMeta}>
                    <span className={styles.dropdownPrecio}>{fmt(p.precio_venta)}</span>
                    <span
                      className={p.stock <= 5 ? styles.dropdownStockBajo : styles.dropdownStock}
                    >
                      {p.stock} en stock
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <button className={styles.btnLibre} onClick={() => setModalLibre(true)}>
          <Plus size={13} />
          Monto libre
        </button>
      </div>

      <div className={styles.cartArea}>
        {carrito.length === 0 ? (
          <div className={styles.cartEmpty}>
            <ShoppingBag size={26} className={styles.cartEmptyIcon} />
            <span className={styles.cartEmptyTitle}>El carrito está vacío</span>
            <span className={styles.cartEmptyHint}>
              Busca un producto arriba o agrega un monto libre para empezar
            </span>
          </div>
        ) : (
          <div className={styles.cartList}>
            {carrito.map((item, idx) => (
              <CartItem
                key={idx}
                idx={idx}
                item={item}
                editandoPrecio={editandoPrecio}
                precioTemp={precioTemp}
                precioInputRef={precioInputRef}
                onCambiarCantidad={cambiarCantidad}
                onQuitar={quitarItem}
                onIniciarEdit={iniciarEditPrecio}
                onConfirmarEdit={confirmarEditPrecio}
                onCancelarEdit={() => setEditandoPrecio(null)}
                onSetPrecioTemp={setPrecioTemp}
              />
            ))}
          </div>
        )}
      </div>

      {carrito.length > 0 && (
        <div className={styles.bottom}>
          <hr className={styles.divider} />
          <div className={styles.totalRow}>
            <div className={styles.totalLeft}>
              <span className={styles.totalLabel}>TOTAL</span>
              {tieneTemporales && (
                <span className={styles.totalHint}>Incluye precios ajustados</span>
              )}
            </div>
            <div className={styles.totalRight}>
              <span className={styles.itemsCount}>{totalItems} ítems</span>
              <span className={styles.totalVal}>{fmt(total)}</span>
            </div>
          </div>
          <div className={styles.botonesAccion}>
            <button className={styles.btnVenta} disabled={registrando} onClick={registrarVenta}>
              {registrando ? 'Registrando...' : 'Registrar venta'}
            </button>
            <button className={styles.btnFio} onClick={abrirModalFio}>
              Fiar
            </button>
          </div>
        </div>
      )}

      {modalLibre && (
        <div className={styles.overlay} onClick={() => setModalLibre(false)}>
          <div className={styles.modalLibre} onClick={(e) => e.stopPropagation()}>
            <span className={styles.modalLibreTitle}>Agregar monto libre</span>
            <div className={styles.modalField}>
              <label className={styles.modalLabel}>DESCRIPCIÓN</label>
              <input
                ref={libreNombreRef}
                className={styles.modalInput}
                placeholder="Ej: Bolsa plástica"
                value={libreNombre}
                onChange={(e) => setLibreNombre(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') agregarMontoLibre()
                  if (e.key === 'Escape') setModalLibre(false)
                }}
              />
            </div>
            <div className={styles.modalField}>
              <label className={styles.modalLabel}>MONTO ($)</label>
              <input
                className={styles.modalInput}
                placeholder="0"
                value={libreMonto}
                onChange={(e) => setLibreMonto(e.target.value.replace(/\D/g, ''))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') agregarMontoLibre()
                  if (e.key === 'Escape') setModalLibre(false)
                }}
              />
            </div>
            <div className={styles.modalBtns}>
              <button className={styles.btnCancelar} onClick={() => setModalLibre(false)}>
                Cancelar
              </button>
              <button
                className={styles.btnAgregar}
                disabled={!libreNombre.trim() || !libreMonto || parseInt(libreMonto) <= 0}
                onClick={agregarMontoLibre}
              >
                Agregar al carrito
              </button>
            </div>
          </div>
        </div>
      )}

      {modalFio && (
        <div className={styles.overlay} onClick={cerrarModalFio}>
          <div className={styles.modalFio} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalFioHeader}>
              <span className={styles.modalFioTitulo}>Registrar como fío</span>
              <span className={styles.modalFioTotal}>{fmt(total)}</span>
            </div>

            <div className={styles.modalField}>
              <label className={styles.modalLabel}>FIADO A</label>
              {seleccionadoFio ? (
                <div className={styles.deudorSel}>
                  <div className={styles.deudorSelInfo}>
                    <span className={styles.deudorNombre}>{seleccionadoFio.nombre}</span>
                    <span className={styles.deudorDeuda}>
                      {seleccionadoFio.deuda_total > 0
                        ? `Debe ${fmt(seleccionadoFio.deuda_total)} → quedará en ${fmt(seleccionadoFio.deuda_total + total)}`
                        : `Sin deuda → quedará en ${fmt(total)}`}
                    </span>
                  </div>
                  <button className={styles.btnCambiar} onClick={() => setSeleccionadoFio(null)}>
                    Cambiar
                  </button>
                </div>
              ) : (
                <input
                  ref={fioInputRef}
                  className={styles.modalInputFio}
                  placeholder="Nombre de la persona..."
                  value={nombreFio}
                  onChange={(e) => buscarDeudor(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') cerrarModalFio()
                  }}
                  autoComplete="off"
                />
              )}
            </div>

            {!seleccionadoFio && nombreFio.length >= 2 && (
              <div className={styles.sugerencias}>
                {sugerenciasFio.map((d) => (
                  <div
                    key={d.id}
                    className={styles.sugerenciaItem}
                    onClick={() => setSeleccionadoFio(d)}
                  >
                    <span className={styles.sugerenciaNombre}>{d.nombre}</span>
                    <span className={styles.sugerenciaDeuda}>
                      {d.deuda_total > 0 ? `Debe ${fmt(d.deuda_total)}` : 'Sin deuda'}
                    </span>
                  </div>
                ))}
                {nombreFio.length >= 2 && (
                  <div
                    className={styles.sugerenciaItem}
                    onClick={() => setSeleccionadoFio({ nombre: nombreFio, deuda_total: 0 })}
                  >
                    <span className={styles.sugerenciaNombre}>{nombreFio}</span>
                    <span className={styles.sugerenciaNuevo}>+ Crear nuevo</span>
                  </div>
                )}
              </div>
            )}

            <div className={styles.modalBtns}>
              <button className={styles.btnCancelar} onClick={cerrarModalFio}>
                Cancelar
              </button>
              <button
                className={styles.btnRegistrarFio}
                disabled={!seleccionadoFio || registrandoFio}
                onClick={registrarFio}
              >
                {registrandoFio ? 'Registrando...' : 'Registrar fío'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
