import { sql } from '@vercel/postgres'

// Convert ? placeholders to $1, $2, etc. for PostgreSQL
function convertPlaceholders(query, params) {
  let index = 0
  const convertedQuery = query.replace(/\?/g, () => `$${++index}`)
  return convertedQuery
}

export async function query(sqlQuery, params = []) {
  try {
    const convertedQuery = convertPlaceholders(sqlQuery, params)
    const result = await sql.query(convertedQuery, params)
    return result.rows
  } catch (error) {
    console.error('Query error:', error, sqlQuery)
    throw error
  }
}

export async function run(sqlQuery, params = []) {
  try {
    const convertedQuery = convertPlaceholders(sqlQuery, params)
    const result = await sql.query(convertedQuery, params)
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
