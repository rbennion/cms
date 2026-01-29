import { createClient } from '@libsql/client'

const db = createClient({
  url: process.env.TURSO_DATABASE_URL || 'file:local.db',
  authToken: process.env.TURSO_AUTH_TOKEN,
})

export async function query(sql, params = []) {
  try {
    const result = await db.execute({ sql, args: params })
    return result.rows
  } catch (error) {
    console.error('Query error:', error, sql)
    throw error
  }
}

export async function run(sql, params = []) {
  try {
    const result = await db.execute({ sql, args: params })
    return {
      lastInsertRowid: result.lastInsertRowid,
      changes: result.rowsAffected
    }
  } catch (error) {
    console.error('Run error:', error, sql)
    throw error
  }
}

export async function get(sql, params = []) {
  const results = await query(sql, params)
  return results[0] || null
}

export async function all(sql, params = []) {
  return query(sql, params)
}

export { db }
