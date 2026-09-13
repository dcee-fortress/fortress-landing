import fs from "node:fs"
import pg from "pg"

function loadEnv(path) {
  const env = {}
  for (const line of fs.readFileSync(path, "utf8").split(/\r?\n/)) {
    if (!line || line.startsWith("#")) continue
    const i = line.indexOf("=")
    if (i < 0) continue
    let value = line.slice(i + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    env[line.slice(0, i)] = value
  }
  return env
}

function normalize(raw) {
  if (!raw) return ""
  const url = new URL(raw)
  url.searchParams.delete("sslmode")
  return url.toString()
}

const env = loadEnv(".env")
const candidates = [
  ["NON_POOLING", env.POSTGRES_URL_NON_POOLING],
  ["DIRECT", env.DIRECT_URL],
  ["DATABASE", env.DATABASE_URL],
  ["POSTGRES_USER", env.POSTGRES_USER],
]

for (const [name, raw] of candidates) {
  const url = normalize(raw)
  if (!url) {
    console.log(`${name}: missing`)
    continue
  }
  const parsed = new URL(url)
  console.log(`${name}: user=${parsed.username} host=${parsed.hostname} port=${parsed.port}`)
  const pool = new pg.Pool({
    connectionString: url,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 20_000,
  })
  try {
    const result = await pool.query(
      "select current_user as u, (select count(*)::int from grove_shared_storage) as keys"
    )
    console.log(`${name}: OK`, result.rows[0])
  } catch (error) {
    console.log(`${name}: FAIL`, error.message)
  } finally {
    await pool.end().catch(() => {})
  }
}
