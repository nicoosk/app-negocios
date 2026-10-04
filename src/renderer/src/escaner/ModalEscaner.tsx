import { useState, type JSX } from 'react'
import { Copy, QrCode, RefreshCw, Smartphone, Wifi, WifiOff } from 'lucide-react'
import type { EstadoEscaner } from '@shared/tipos'
import styles from './Escaner.module.css'

interface ModalEscanerProps {
  estado: EstadoEscaner | null
  onCerrar: () => void
  onRefrescar: () => Promise<void>
}

// Modal de conexión: muestra el QR con la URL local que debe abrir el celular.
export default function ModalEscaner({
  estado,
  onCerrar,
  onRefrescar
}: ModalEscanerProps): JSX.Element {
  const [copiado, setCopiado] = useState(false)

  const conectado = estado?.conectado ?? false
  const url = estado?.url ?? null

  const copiar = async (): Promise<void> => {
    if (!url) return
    await navigator.clipboard.writeText(url)
    setCopiado(true)
    setTimeout(() => setCopiado(false), 1500)
  }

  return (
    <div className={styles.overlay} onClick={onCerrar}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.encabezado}>
          <QrCode size={18} className={styles.icono} />
          <h3>Conectar escáner</h3>
        </div>
        <p className={styles.subtitulo}>
          Abre la cámara del celular y apunta al código de barras del producto. El celular y este
          equipo deben estar en la misma red Wi-Fi.
        </p>

        <div className={styles.estadoFila}>
          {conectado ? (
            <Wifi size={15} className={styles.iconoOk} />
          ) : (
            <WifiOff size={15} className={styles.iconoGris} />
          )}
          <span className={conectado ? styles.estadoOk : styles.estadoGris}>
            {conectado
              ? `${estado?.conectados ?? 0} celular(es) conectado(s)`
              : 'Esperando conexión del celular'}
          </span>
        </div>

        {url ? (
          <>
            <div className={styles.qrWrap}>
              {estado?.qr ? (
                <img className={styles.qr} src={estado.qr} alt="QR de conexión" />
              ) : null}
            </div>
            <div className={styles.urlFila}>
              <code className={styles.url}>{url}</code>
              <button className={styles.btnIcono} onClick={copiar} title="Copiar enlace">
                <Copy size={14} />
              </button>
            </div>
            <p className={styles.hint}>
              <Smartphone size={13} /> Escanea el QR con la cámara del celular para abrir el lector.
              {copiado ? ' Enlace copiado.' : ''}
            </p>
          </>
        ) : (
          <div className={styles.sinRed}>
            No se detectó una red local. Conéctate a un Wi-Fi para poder escanear desde el celular.
          </div>
        )}

        <div className={styles.acciones}>
          <button className={styles.btnSecundario} onClick={() => void onRefrescar()}>
            <RefreshCw size={14} /> Actualizar
          </button>
          <button className={styles.btnPrimario} onClick={onCerrar}>
            Listo
          </button>
        </div>
      </div>
    </div>
  )
}
