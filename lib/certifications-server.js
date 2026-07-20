import { get } from './db'

const DEFAULT_BG_VALID_YEARS = 2

export async function getBgValidYears() {
  const row = await get('SELECT value FROM app_settings WHERE key = ?', [
    'background_check_valid_years',
  ])
  const years = parseInt(row?.value, 10)
  return Number.isFinite(years) && years > 0 ? years : DEFAULT_BG_VALID_YEARS
}

export function bgExpiryDate(checkDate, years) {
  if (!checkDate) return null
  const d = new Date(checkDate)
  if (isNaN(d)) return null
  d.setFullYear(d.getFullYear() + years)
  return d.toISOString().slice(0, 10)
}

// Adds background_check_expires_at (check date + policy years) to a
// certification row or array of rows.
export async function attachBgExpiry(rows) {
  const years = await getBgValidYears()
  const enrich = (c) =>
    c
      ? { ...c, background_check_expires_at: bgExpiryDate(c.background_check_date, years) }
      : c
  return Array.isArray(rows) ? rows.map(enrich) : enrich(rows)
}
