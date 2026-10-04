export function fmt(n: number): string {
  return '$' + n.toLocaleString('es-CL')
}

export function fmtAbs(n: number): string {
  return fmt(Math.abs(n))
}
