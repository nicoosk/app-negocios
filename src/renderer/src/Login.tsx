import { useState } from 'react'
import styles from './Login.module.css'
import { JSX } from 'react/jsx-runtime'

interface LoginProps {
  onSuccess: (username: string) => void
}

export default function Login({ onSuccess }: LoginProps): JSX.Element {
  const [username, setUsername] = useState('')
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')

  const pressKey = (k: string): void => {
    if (pin.length < 4) setPin((p) => p + k)
  }

  const delKey = (): void => setPin((p) => p.slice(0, -1))

  const handleLogin = async (): Promise<void> => {
    console.log(`Buscando usuario '${username.trim()}' en bd...`)
    const result = await window.api.login(username.trim(), pin)
    console.log(`¿Login correcto? ${result.ok}`)
    if (result.ok) {
      onSuccess(username)
    } else {
      console.error('Error al intentar hacer login')
      setError(result.error ?? 'Error desconocido')
      setPin('')
    }
  }

  const ready = username.trim().length > 0 && pin.length === 4

  return (
    <div className={styles.screen}>
      <div className={styles.card}>
        <h1>Mi Almacén</h1>

        <input
          type="text"
          placeholder="Usuario"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />

        <div className={styles.dots}>
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className={`${styles.dot} ${i < pin.length ? styles.filled : ''}`} />
          ))}
        </div>

        <div className={styles.numpad}>
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((k) => (
            <button key={k} onClick={() => pressKey(k)}>
              {k}
            </button>
          ))}
          <div />
          <button onClick={() => pressKey('0')}>0</button>
          <button className={styles.del} onClick={delKey}>
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
