import { useState, type JSX } from 'react'
import { PackagePlus } from 'lucide-react'
import { UNIDADES } from '@shared/constantes'
import type { Producto } from '@shared/tipos'
import styles from './Escaner.module.css'

interface ModalResolverProductoProps {
  producto: Producto
  onResuelto: (producto: Producto) => void
  onCancelar: () => void
}

// Pide los datos reales de un producto recién escaneado antes de venderlo.
// Guardar con precio y stock lo saca de la lista de pendientes.
export default function ModalResolverProducto({
  producto,
  onResuelto,
  onCancelar
}: ModalResolverProductoProps): JSX.Element {
  const [nombre, setNombre] = useState('')
  const [precio, setPrecio] = useState('')
  const [stock, setStock] = useState('')
  const [unidad, setUnidad] = useState('unidad')
  const [error, setError] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)

  const precioNum = Number(precio)
  const stockNum = Number(stock)
  const valido =
    nombre.trim().length > 0 &&
    precio.trim() !== '' &&
    Number.isFinite(precioNum) &&
    precioNum > 0 &&
    stock.trim() !== '' &&
    Number.isFinite(stockNum) &&
    stockNum >= 0

  const guardar = async (): Promise<void> => {
    if (!valido || guardando) return
    setGuardando(true)
    setError(null)
    const res = await window.api.productos.resolverNuevo(
      producto.id,
      nombre.trim(),
      precioNum,
      stockNum,
      unidad
    )
    if (!res.ok) {
      setError(res.error ?? 'No se pudo guardar el producto')
      setGuardando(false)
      return
    }
    if (producto.codigo_barra) {
      const reEscaneo = await window.api.productos.escanear(producto.codigo_barra)
      if (reEscaneo.ok && reEscaneo.producto) {
        onResuelto(reEscaneo.producto)
        return
      }
    }
    onResuelto({
      ...producto,
      nombre: nombre.trim(),
      precio_venta: precioNum,
      stock: stockNum,
      unidad,
      es_nuevo: 0
    })
  }

  return (
    <div className={styles.overlay} onClick={onCancelar}>
      <div className={styles.resolverModal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.resolverTitulo}>
          <PackagePlus size={18} className={styles.icono} />
          <h3>Producto nuevo</h3>
        </div>
        <div className={styles.codigo}>{producto.codigo_barra ?? 'Sin código'}</div>

        <div className={styles.campo}>
          <label className={styles.etiqueta}>
            Nombre <span className={styles.requerido}>*</span>
          </label>
          <input
            className={styles.input}
            value={nombre}
            autoFocus
            placeholder="Ej: Coca-Cola 350ml"
            onChange={(e) => setNombre(e.target.value)}
          />
        </div>

        <div className={styles.fila}>
          <div className={styles.campo}>
            <label className={styles.etiqueta}>
              Precio de venta <span className={styles.requerido}>*</span>
              <span
                className={styles.tooltip}
                title="El precio debe ser mayor a 0 para quitar el producto de la lista de pendientes."
              >
                ?
              </span>
            </label>
            <input
              className={styles.input}
              value={precio}
              inputMode="decimal"
              placeholder="0"
              onChange={(e) => setPrecio(e.target.value)}
            />
          </div>
          <div className={styles.campo}>
            <label className={styles.etiqueta}>
              Stock <span className={styles.requerido}>*</span>
              <span
                className={styles.tooltip}
                title="Cuántas unidades tienes. Si aún no tienes, puedes dejarlo en 0."
              >
                ?
              </span>
            </label>
            <input
              className={styles.input}
              value={stock}
              inputMode="decimal"
              placeholder="0"
              onChange={(e) => setStock(e.target.value)}
            />
          </div>
        </div>

        <div className={styles.campo}>
          <label className={styles.etiqueta}>Unidad</label>
          <select
            className={styles.select}
            value={unidad}
            onChange={(e) => setUnidad(e.target.value)}
          >
            {UNIDADES.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>
        </div>

        <p className={styles.ayuda}>
          Completar el precio y el stock es lo que saca al producto de la lista de pendientes. Si el
          stock es 0, el producto queda registrado pero marcado sin existencias.
        </p>

        {error ? <div className={styles.error}>{error}</div> : null}

        <div className={styles.resolverAcciones}>
          <button className={styles.btnSecundario} onClick={onCancelar}>
            Cancelar
          </button>
          <button
            className={styles.btnPrimario}
            onClick={() => void guardar()}
            disabled={!valido || guardando}
          >
            {guardando ? 'Guardando…' : 'Guardar y usar'}
          </button>
        </div>
      </div>
    </div>
  )
}
