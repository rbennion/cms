import initSqlJs from 'sql.js'
import fs from 'fs'
import path from 'path'

const DB_PATH = path.join(process.cwd(), 'database.sqlite')

let db = null
let SQL = null

async function getDb() {
  if (db) return db

  if (!SQL) {
    SQL = await initSqlJs()
  }

  try {
    if (fs.existsSync(DB_PATH)) {
      const buffer = fs.readFileSync(DB_PATH)
      db = new SQL.Database(buffer)
    } else {
      db = new SQL.Database()
    }

    db.run('PRAGMA foreign_keys = ON')

    return db
  } catch (error) {
    console.error('Database initialization error:', error)
    throw error
  }
}

function saveDb() {
  if (db) {
    const data = db.export()
    const buffer = Buffer.from(data)
    fs.writeFileSync(DB_PATH, buffer)
  }
}

export async function query(sql, params = []) {
  const database = await getDb()
  try {
    const stmt = database.prepare(sql)
    if (params.length > 0) {
      stmt.bind(params)
    }
    const results = []
    while (stmt.step()) {
      const row = stmt.getAsObject()
      results.push(row)
    }
    stmt.free()
    return results
  } catch (error) {
    console.error('Query error:', error, sql)
    throw error
  }
}

export async function run(sql, params = []) {
  const database = await getDb()
  try {
    database.run(sql, params)
    saveDb()
    const lastId = database.exec('SELECT last_insert_rowid() as id')[0]?.values[0]?.[0]
    const changes = database.getRowsModified()
    return { lastInsertRowid: lastId, changes }
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

export { getDb, saveDb }
