import { ItemCarrito } from './types'
import styles from './ItemCarrito.module.css'
import { fmt } from '@renderer/utils/formatter'
import { JSX } from 'react'
import { Check, Minus, Pencil, Plus, X } from 'lucide-react'

interface ItemCarritoProps {
  idx: number
  item: ItemCarrito
  editandoPrecio: number | null
  precioTemp: string
  precioInputRef: React.Ref<HTMLInputElement>
  onCambiarCantidad: (idx: number, delta: number) => void
  onQuitar: (idx: number) => void
  onIniciarEdit: (idx: number) => void
  onConfirmarEdit: (idx: number) => void
  onCancelarEdit: () => void
  onSetPrecioTemp: (val: string) => void
}

export default function CartItem({
  idx,
  item,
  editandoPrecio,
  precioTemp,
  precioInputRef,
  onCambiarCantidad,
  onQuitar,
  onIniciarEdit,
  onConfirmarEdit,
  onCancelarEdit,
  onSetPrecioTemp
}: ItemCarritoProps): JSX.Element {
  const estaEditando = editandoPrecio === idx

  return (
    <div
      className={`${styles.item} ${item.producto_id === null ? styles.itemLibre : ''} ${estaEditando ? styles.itemEditing : ''}`}
    >
      <div className={styles.itemInfo}>
        <span className={styles.itemNombre}>{item.nombre}</span>
        <div className={styles.itemPrecioRow}>
          {estaEditando ? (
            <>
              <span className={styles.itemPrecioBaseGris}>base {fmt(item.precio_base)} →</span>
              <span className={styles.itemPrecioPrefix}>$</span>
              <input
                ref={precioInputRef}
                className={styles.itemPrecioInput}
                value={precioTemp}
                onChange={(e) => onSetPrecioTemp(e.target.value.replace(/\D/g, ''))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') onConfirmarEdit(idx)
                  if (e.key === 'Escape') onCancelarEdit()
                }}
                onBlur={() => onConfirmarEdit(idx)}
              />
              <button
                className={styles.btnConfirm}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => onConfirmarEdit(idx)}
              >
                <Check size={10} />
              </button>
            </>
          ) : item.producto_id === null ? (
            <span className={styles.libreTag}>monto libre</span>
          ) : (
            <>
              {item.precio_modificado ? (
                <>
                  <span className={styles.itemPrecioTachado}>{fmt(item.precio_base)}</span>
                  <span className={styles.itemPrecioTemp}>
                    {fmt(item.precio_unitario)} temporal
                  </span>
                </>
              ) : (
                <span className={styles.itemPrecioBase}>{fmt(item.precio_unitario)} c/u</span>
              )}
              <button
                className={`${styles.btnLapiz} ${item.precio_modificado ? styles.btnLapizActive : ''}`}
                onClick={() => onIniciarEdit(idx)}
                title="Modificar precio para esta venta"
              >
                <Pencil size={10} />
              </button>
            </>
          )}
        </div>
      </div>

      {item.producto_id !== null && (
        <div className={styles.quantityWrap}>
          <button className={styles.quantityBtn} onClick={() => onCambiarCantidad(idx, -1)}>
            <Minus size={10} />
          </button>
          <span className={styles.quantityVal}>{item.cantidad}</span>
          <button className={styles.quantityBtn} onClick={() => onCambiarCantidad(idx, 1)}>
            <Plus size={10} />
          </button>
        </div>
      )}

      <span className={`${styles.itemSub} ${item.producto_id === null ? styles.itemSubLibre : ''}`}>
        {fmt(item.subtotal)}
      </span>
      <button className={styles.btnDel} onClick={() => onQuitar(idx)}>
        <X size={12} />
      </button>
    </div>
  )
}
