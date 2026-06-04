import { JSX, useEffect, useState } from 'react'
import styles from './PanelUsuarios.module.css'

export interface Usuario {
  id: number
  username: string
  creado_en: string
  is_admin: boolean
}

export default function PanelUsuarios(): JSX.Element {
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [nuevoUsername, setNuevoUsername] = useState('')
  const [nuevoPin, setNuevoPin] = useState('')
  const [nuevoAdmin, setNuevoAdmin] = useState(false)
  const [error, setError] = useState('')
  const [exito, setExito] = useState('')
  const [deleteError, setDeleteError] = useState('')
  const [deleteExito, setDeleteExito] = useState('')
  const [cargando, setCargando] = useState(false)

  const cargarUsuarios = async (): Promise<void> => {
    const data = await window.api.usuarios.listar()
    setUsuarios(data)
  }

  useEffect(() => {
    let isMounted = true

    const cargar = async (): Promise<void> => {
      const data = await window.api.usuarios.listar()
      if (isMounted) {
        setUsuarios(data)
      }
    }

    void cargar()

    return () => {
      isMounted = false
    }
  }, [])

  const registrar = async (): Promise<void> => {
    setError('')
    setExito('')
    if (!nuevoUsername.trim()) {
      setError('El nombre de usuario es obligatorio.')
      return
    }
    if (nuevoPin.length < 4) {
      setError('El PIN debe tener al menos 4 dígitos.')
      return
    }
    setCargando(true)

    try {
      const result = await window.api.usuarios.registrar(nuevoUsername, nuevoPin, nuevoAdmin)
      if (result.ok) {
        setNuevoUsername('')
        setNuevoPin('')
        setNuevoAdmin(false)
        setExito('Usuario registrado correctamente.')
        await cargarUsuarios()
      } else {
        setError('No se puso registrar el usuario.')
      }
    } finally {
      setCargando(false)
    }
  }

  const eliminar = async (id: number): Promise<void> => {
    setDeleteError('')
    setDeleteExito('')
    setCargando(true)

    try {
      const result = await window.api.usuarios.eliminar(id)
      if (result.ok) {
        setDeleteExito('Usuario eliminado con éxito.')
        await cargarUsuarios()
      } else {
        setDeleteError('Error al intentar eliminar el usuario.')
      }
    } finally {
      setCargando(false)
    }
  }

  return (
    <div className={styles.pagina}>
      <div className={styles.header}>
        <h1 className={styles.titulo}>Gestión de usuarios</h1>
        <span className={styles.sub}>Registra y administra los accesos a la aplicación.</span>
      </div>

      <div className={styles.contenido}>
        <div className={styles.bloque}>
          <span className={styles.bloqueLabel}>USUARIOS REGISTRADOS</span>
          <div className={styles.listaUsuarios}>
            {usuarios.length === 0 ? (
              <span className={styles.empty}>Sin usuarios (no deberías ver este mensaje)</span>
            ) : (
              usuarios.map((u) => (
                <div key={u.id} className={styles.filaUsuario}>
                  <span className={styles.nombreUsuario}>{u.username}</span>
                  <div className={styles.dataWrapper}>
                    {u.is_admin ? <span className={styles.badgeAdmin}>Admin</span> : ''}
                    <button className={styles.btnEliminarUsuario} onClick={() => eliminar(u.id)}>
                      ✕
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
          {deleteError && <span className={styles.error}>{deleteError}</span>}
          {deleteExito && <span className={styles.exito}>{deleteExito}</span>}
        </div>

        <div className={styles.bloque}>
          <span className={styles.bloqueLabel}>REGISTRAR NUEVO USUARIO</span>
          <div className={styles.form}>
            <div className={styles.campo}>
              <label className={styles.label}>Nombre de usuario</label>
              <input
                className={styles.input}
                type="text"
                placeholder="ej: cajero1"
                value={nuevoUsername}
                onChange={(e) => setNuevoUsername(e.target.value)}
                autoComplete="off"
              />
            </div>
            <div className={styles.campo}>
              <label className={styles.label}>PIN</label>
              <input
                className={styles.input}
                type="password"
                placeholder="Mínimo 4 dígitos"
                value={nuevoPin}
                onChange={(e) => setNuevoPin(e.target.value)}
                autoComplete="new-password"
                inputMode="numeric"
              />
            </div>
            <div className={styles.campoCheck}>
              <input
                id="esAdmin"
                type="checkbox"
                checked={nuevoAdmin}
                onChange={(e) => setNuevoAdmin(e.target.checked)}
                className={styles.checkbox}
              />
              <label htmlFor="esAdmin" className={styles.labelCheck}>
                Permisos de administrador
              </label>
            </div>

            {error && <span className={styles.error}>{error}</span>}
            {exito && <span className={styles.exito}>{exito}</span>}

            <button className={styles.btnRegistrar} onClick={registrar} disabled={cargando}>
              {cargando ? 'Registrando...' : 'Registrar usuario'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
