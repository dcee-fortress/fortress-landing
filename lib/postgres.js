import pg from "pg"

let pool = null

export function postgresAvailable() {
  return Boolean(
    process.env.POSTGRES_URL ||
      process.env.POSTGRES_URL_NON_POOLING ||
      process.env.DATABASE_URL
  )
}

function connectionString() {
  return (
    process.env.POSTGRES_URL_NON_POOLING ||
    process.env.POSTGRES_URL ||
    process.env.DATABASE_URL ||
    ""
  )
}

export function getPostgresPool() {
  if (!postgresAvailable()) return null
  if (!pool) {
    pool = new pg.Pool({
      connectionString: connectionString(),
      ssl: { rejectUnauthorized: false },
      max: 1,
    })
  }
  return pool
}

export async function query(text, params = []) {
  const client = getPostgresPool()
  if (!client) throw new Error("Postgres is not configured.")
  return client.query(text, params)
}
