import { beforeEach, describe, expect, it } from 'vitest'
import {
  cerrarSesion,
  esAdminActual,
  iniciarSesion,
  sesionActual,
  tieneSesion,
  usuarioActual
} from './sesion'

const admin = { id: 1, username: 'admin', is_admin: true }
const cajero = { id: 2, username: 'cajero', is_admin: false }

describe('sesion', () => {
  beforeEach(() => {
    cerrarSesion()
  })

  it('no tiene sesión al inicio', () => {
    expect(tieneSesion()).toBe(false)
    expect(sesionActual()).toBeNull()
    expect(esAdminActual()).toBe(false)
  })

  it('inicia sesión y expone el usuario', () => {
    iniciarSesion(cajero)
    expect(tieneSesion()).toBe(true)
    expect(sesionActual()).toEqual(cajero)
    expect(usuarioActual()).toEqual(cajero)
  })

  it('solo marca admin cuando is_admin es true', () => {
    iniciarSesion(cajero)
    expect(esAdminActual()).toBe(false)
    iniciarSesion(admin)
    expect(esAdminActual()).toBe(true)
  })

  it('cerrar sesión la deja sin usuario', () => {
    iniciarSesion(admin)
    cerrarSesion()
    expect(tieneSesion()).toBe(false)
    expect(esAdminActual()).toBe(false)
  })

  it('usuarioActual lanza si no hay sesión', () => {
    expect(() => usuarioActual()).toThrow('No hay sesión activa')
  })
})
