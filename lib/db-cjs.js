const { Pool } = require("pg");

if (!process.env.POSTGRES_URL) {
  throw new Error("POSTGRES_URL is not set");
}

const pool = new Pool({ connectionString: process.env.POSTGRES_URL });
const sql = Object.assign(
  (strings, ...values) => {
    const text = strings.reduce((prev, curr, i) => prev + "$" + i + curr);
    return pool.query(text, values);
  },
  { query: (text, params) => pool.query(text, params) }
);

module.exports = { pool, sql };
