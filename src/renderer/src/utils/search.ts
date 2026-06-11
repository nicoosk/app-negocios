export function similar(a: string, b: string): boolean {
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
