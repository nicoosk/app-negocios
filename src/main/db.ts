import path from 'path'
import { app } from 'electron'
import { crearDb, crearNucleo } from './nucleo'

// Único punto donde la capa núcleo se conecta al entorno de Electron: resuelve
// la ruta de datos del usuario y ensambla el núcleo con su conexión ya abierta.
const db = crearDb(path.join(app.getPath('userData'), 'negocio.db'))

export const nucleo = crearNucleo(db)

export default db
