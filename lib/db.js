import { Pool, types } from 'pg'

// A DATE column is a calendar date, not an instant. Left alone, the driver
// turns it into a JS Date at the *server's* midnight, which serialises to an
// ISO timestamp and renders as the previous day for any user west of the
// server. Hand these back as plain 'YYYY-MM-DD' strings so the day stored is
// the day shown, wherever either end happens to be.
types.setTypeParser(types.builtins.DATE, (value) => value)

let pool = null

function getPool() {
  if (!pool) {
    if (!process.env.POSTGRES_URL) {
      throw new Error('POSTGRES_URL is not set')
    }
    pool = new Pool({ connectionString: process.env.POSTGRES_URL })
  }
  return pool
}

// Tagged template function matching @vercel/postgres sql`` API
// Returns { rows, rowCount } — same shape as @vercel/postgres
export function sql(strings, ...values) {
  const text = strings.reduce((prev, curr, i) => prev + '$' + i + curr)
  return getPool().query(text, values)
}

sql.query = function (text, params) {
  return getPool().query(text, params)
}

// Convert ? placeholders to $1, $2, etc. for PostgreSQL
function convertPlaceholders(query, params) {
  let index = 0
  const convertedQuery = query.replace(/\?/g, () => `$${++index}`)
  return convertedQuery
}

export async function query(sqlQuery, params = []) {
  try {
    const convertedQuery = convertPlaceholders(sqlQuery, params)
    const result = await getPool().query(convertedQuery, params)
    return result.rows
  } catch (error) {
    console.error('Query error:', error, sqlQuery)
    throw error
  }
}

export async function run(sqlQuery, params = []) {
  try {
    let convertedQuery = convertPlaceholders(sqlQuery, params)

    // Auto-append RETURNING id to INSERT statements if not already present
    const isInsert = sqlQuery.trim().toUpperCase().startsWith('INSERT')
    const hasReturning = sqlQuery.toUpperCase().includes('RETURNING')
    if (isInsert && !hasReturning) {
      convertedQuery = convertedQuery.trimEnd().replace(/;?\s*$/, '') + ' RETURNING id'
    }

    const result = await getPool().query(convertedQuery, params)
    return {
      lastInsertRowid: result.rows[0]?.id,
      changes: result.rowCount
    }
  } catch (error) {
    console.error('Run error:', error, sqlQuery)
    throw error
  }
}

export async function get(sqlQuery, params = []) {
  const results = await query(sqlQuery, params)
  return results[0] || null
}

export async function all(sqlQuery, params = []) {
  return query(sqlQuery, params)
}
