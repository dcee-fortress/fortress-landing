import pg from "pg"

let pool = null

function stripWrappingQuotes(value) {
  const raw = String(value ?? "").trim()
  if (
    (raw.startsWith('"') && raw.endsWith('"')) ||
    (raw.startsWith("'") && raw.endsWith("'"))
  ) {
    return raw.slice(1, -1)
  }
  return raw
}

function normalizeConnectionString(raw) {
  const value = stripWrappingQuotes(raw)
  if (!value || !/^postgres(ql)?:\/\//i.test(value)) return ""

  try {
    const url = new URL(value)
    // Newer pg treats sslmode=require as verify-full; we terminate TLS ourselves.
    url.searchParams.delete("sslmode")
    return url.toString()
  } catch {
    return value
  }
}

export function postgresAvailable() {
  return Boolean(connectionString())
}

/**
 * Prefer a direct/session Postgres URL for writes.
 * Pooler (6543 / pgbouncer) can auth or transaction-mode fail on Vercel.
 */
function connectionString() {
  const candidates = [
    process.env.POSTGRES_URL_NON_POOLING,
    process.env.DIRECT_URL,
    process.env.POSTGRES_URL,
    process.env.DATABASE_URL,
  ]

  for (const candidate of candidates) {
    const value = normalizeConnectionString(candidate)
    if (value) return value
  }

  return ""
}

export function getPostgresPool() {
  if (!postgresAvailable()) return null
  if (!pool) {
    pool = new pg.Pool({
      connectionString: connectionString(),
      ssl: { rejectUnauthorized: false },
      max: 5,
      connectionTimeoutMillis: 8_000,
      idleTimeoutMillis: 10_000,
    })
  }
  return pool
}

export async function query(text, params = []) {
  const client = getPostgresPool()
  if (!client) throw new Error("Postgres is not configured.")
  try {
    return await client.query(text, params)
  } catch (error) {
    // Drop a bad pool after auth/network failure so the next request retries cleanly.
    try {
      await pool?.end()
    } catch {
      // ignore
    }
    pool = null
    throw error
  }
}
