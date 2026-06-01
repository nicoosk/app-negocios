import { useRef, useState } from 'react'
import styles from './Login.module.css'
import { JSX } from 'react/jsx-runtime'
import { Usuario } from '../usuarios/PanelUsuarios'

interface LoginProps {
  onSuccess: (user: Usuario) => void
}

export default function Login({ onSuccess }: LoginProps): JSX.Element {
  const [username, setUsername] = useState('')
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const [focusedOnUserInput, setFocusedOnUserInput] = useState<boolean>(false)

  const pressKey = (k: string): void => {
    if (pin.length < 4) {
      setPin((p) => p + k)
      inputRef.current?.focus()
    }
    inputRef.current?.focus()
  }

  const delKey = (): void => {
    setPin((p) => p.slice(0, -1))
    inputRef.current?.focus()
  }

  const handleLogin = async (): Promise<void> => {
    console.log(`Buscando usuario '${username.trim()}' en bd...`)
    const result = await window.api.login(username.trim(), pin)
    console.log(`¿Login correcto? ${result.ok}`)
    console.log(`Usuario: ${result.user}`)
    if (result.ok) {
      onSuccess(result.user)
    } else {
      console.error('Error al intentar hacer login')
      setError(result.error ?? 'Error desconocido')
      setPin('')
    }
  }

  const ready = username.trim().length > 0 && pin.length === 4

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    e.preventDefault()
    if (e.key >= '0' && e.key <= '9') pressKey(e.key)
    else if (e.key === 'Backspace') delKey()
    else if (e.key === 'Enter') handleLogin()
  }

  return (
    <div
      className={styles.screen}
      onClick={() => {
        if (!focusedOnUserInput) inputRef.current?.focus()
      }}
    >
      <input
        ref={inputRef}
        className={styles.inputHidden}
        onKeyDown={handleKeyDown}
        autoFocus
        readOnly
      />
      <div className={styles.card}>
        <h1>Mi Almacén</h1>

        <input
          type="text"
          placeholder="Usuario"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          onFocus={() => setFocusedOnUserInput(true)}
          onBlur={() => setFocusedOnUserInput(false)}
          onClick={(e) => e.stopPropagation()}
        />

        <div className={styles.dots}>
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className={`${styles.dot} ${i < pin.length ? styles.filled : ''}`} />
          ))}
        </div>

        <div className={styles.numpad}>
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((k) => (
            <button key={k} onMouseDown={(e) => e.preventDefault()} onClick={() => pressKey(k)}>
              {k}
            </button>
          ))}
          <div />
          <button onMouseDown={(e) => e.preventDefault()} onClick={() => pressKey('0')}>
            0
          </button>
          <button className={styles.del} onMouseDown={(e) => e.preventDefault()} onClick={delKey}>
            ⌫
          </button>
        </div>

        {error && <p className={styles.error}>{error}</p>}

        <button disabled={!ready} onClick={handleLogin}>
          Ingresar
        </button>
      </div>
    </div>
  )
}
