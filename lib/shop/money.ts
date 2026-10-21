export function formatGBP(pence: number): string {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(pence / 100)
}

export function formatGBPOrNull(pence: number | null | undefined): string | null {
  return typeof pence === 'number' ? formatGBP(pence) : null
}

/** £ amount typed by an admin ("19.99") → integer pence, or null if invalid. */
export function poundsToPence(input: string | number): number | null {
  const n = typeof input === 'number' ? input : Number(String(input).replace(/[£,\s]/g, ''))
  if (!Number.isFinite(n) || n <= 0) return null
  return Math.round(n * 100)
}
