import Database, { type Database as DatabaseType } from 'better-sqlite3'
import { aplicarEsquema } from './esquema'

// Abre (o crea) la base y aplica el esquema y las migraciones. No depende de
// Electron: la ruta la decide quien llama, lo que permite testear con ':memory:'.
export function crearDb(rutaArchivo: string): DatabaseType {
  const db = new Database(rutaArchivo)
  db.pragma('foreign_keys = ON')
  aplicarEsquema(db)
  return db
}
