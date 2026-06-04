import { JSX, useEffect, useRef, useState } from 'react'
import styles from './TabFiar.module.css'

interface Fiado {
  id: number
  nombre: string
  deuda_total: number
}

interface TabFiarProps {
  userId: number
  onFioRegistrado: () => void
}

const fmt = (n: number): string => '$' + n.toLocaleString('es-CL')

function similar(a: string, b: string): boolean {
  const norm = (s: string): string =>
    s
      .toLocaleLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')

  const na = norm(a)
  const nb = norm(b)
  if (nb.includes(na) || na.includes(nb)) return true
  let matches = 0
  for (const c of na) if (nb.includes(c)) matches++
  return matches / Math.max(na.length, 1) > 0.55
}

export default function TabFiar({ userId, onFioRegistrado }: TabFiarProps): JSX.Element {
  const [raw, setRaw] = useState('')
  const [nombre, setNombre] = useState('')
  const [, setTodos] = useState<Fiado[]>([])
  const [sugerencias, setSugerencias] = useState<Fiado[]>([])
  const [seleccionado, setSeleccionado] = useState<{ nombre: string; deuda_total: number } | null>(
    null
  )
  const [cargando, setCargando] = useState<boolean>(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const [focusNombre, setFocusNombre] = useState<boolean>(false)

  const display = raw ? Number(raw).toLocaleString('es-CL') : '0'
  const ready = raw.length > 0 && seleccionado !== null

  useEffect(() => {
    window.api.fiados.buscar('').then(setTodos)
  }, [])

  const press = (k: string): void => {
    if (raw.length >= 9) return
    setRaw((r) => r + k)
    inputRef.current?.focus()
  }
  const del = (): void => {
    setRaw((r) => r.slice(0, -1))
    inputRef.current?.focus()
  }
  const clear = (): void => {
    setRaw('')
    inputRef.current?.focus()
  }

  const buscar = async (val: string): Promise<void> => {
    setNombre(val)
    setSeleccionado(null)
    if (val.length < 2) {
      setSugerencias([])
      return
    }
    const actualizados = await window.api.fiados.buscar('')
    setTodos(actualizados)
    setSugerencias(actualizados.filter((p) => similar(val, p.nombre)))
  }

  const elegir = (fiado: Fiado): void => {
    setSeleccionado(fiado)
    setNombre(fiado.nombre)
    setSugerencias([])
    inputRef.current?.focus()
  }

  const elegirNuevo = (): void => {
    setSeleccionado({ nombre, deuda_total: 0 })
    setSugerencias([])
    inputRef.current?.focus()
  }

  const registrar = async (): Promise<void> => {
    if (!ready || !seleccionado) return
    const nombreGuardado = seleccionado.nombre
    const montoGuardado = parseInt(raw)

    setRaw('')
    setNombre('')
    setSeleccionado(null)
    setSugerencias([])
    setCargando(true)
    try {
      const result = await window.api.fiados.registrar(nombreGuardado, montoGuardado, userId)
      if (result.ok) {
        const actualizados = await window.api.fiados.buscar('')
        setTodos(actualizados)
        onFioRegistrado()
      } else {
        setNombre(nombreGuardado)
        setSeleccionado({ nombre: nombreGuardado, deuda_total: 0 })
        setRaw(String(montoGuardado))
      }
    } finally {
      setCargando(false)
      inputRef.current?.focus()
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    e.preventDefault()
    if (e.key >= '0' && e.key <= '9') press(e.key)
    else if (e.key === 'Backspace') del()
    else if (e.key === 'Escape') clear()
    else if (e.key === 'Enter' && ready) registrar()
  }

  return (
    <div
      className={styles.wrap}
      onClick={() => {
        if (!focusNombre) inputRef.current?.focus()
      }}
    >
      <input
        ref={inputRef}
        className={styles.inputHidden}
        onKeyDown={handleKeyDown}
        autoFocus
        readOnly
      />
      <div className={styles.fioMonto}>
        <span>Monto a fiar</span>
        <span>${display}</span>
      </div>

      <div className={styles.numpad}>
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((k) => (
          <button key={k} onMouseDown={(e) => e.preventDefault()} onClick={() => press(k)}>
            {k}
          </button>
        ))}
        <button className={styles.muted} onMouseDown={(e) => e.preventDefault()} onClick={del}>
          ⌫
        </button>
        <button onMouseDown={(e) => e.preventDefault()} onClick={() => press('0')}>
          0
        </button>
        <button className={styles.muted} onMouseDown={(e) => e.preventDefault()} onClick={clear}>
          C
        </button>
      </div>

      <input
        className={styles.input}
        type="text"
        placeholder="Nombre de la persona..."
        value={nombre}
        onChange={(e) => buscar(e.target.value)}
        onFocus={() => setFocusNombre(true)}
        onBlur={() => setFocusNombre(false)}
        onClick={(e) => e.stopPropagation()}
        autoComplete="off"
      />

      {(sugerencias.length > 0 || (nombre.length >= 2 && !seleccionado)) && (
        <div className={styles.sugerencias}>
          <span className={styles.sugerenciasLabel}>SUGERENCIAS</span>

          {sugerencias.map((p) => (
            <div
              key={p.id}
              className={`${styles.sugerenciasItem} ${seleccionado?.nombre === p.nombre ? styles.sel : ''}`}
              onClick={() => elegir(p)}
            >
              <span className={styles.sugerenciasNombre}>{p.nombre}</span>
              <span className={styles.sugerenciasDeuda}>
                {' '}
                {p.deuda_total > 0 ? `Debe ${fmt(p.deuda_total)}` : 'Sin deuda'}
              </span>
            </div>
          ))}

          {nombre.length >= 2 && (
            <div
              className={`${styles.sugerenciasItem} ${seleccionado?.nombre === nombre && !sugerencias.find((s) => s.nombre === nombre) ? styles.sel : ''}`}
              onClick={elegirNuevo}
            >
              <span className={styles.sugerenciasNombre}>{nombre}</span>
              <span className={styles.sugerenciasNew}>+ Crear nuevo</span>
            </div>
          )}
        </div>
      )}

      <button className={styles.btnFio} disabled={!ready || cargando} onClick={registrar}>
        {cargando ? 'Registrando...' : 'Registrar fío'}
      </button>
    </div>
  )
}
