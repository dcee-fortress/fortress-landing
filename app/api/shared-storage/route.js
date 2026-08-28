import { sql } from "@vercel/postgres"

export const dynamic = "force-dynamic"

const allowedKeys = new Set([
  "grove-primary-project-data",
  "grove-material-schedules",
  "grove-material-schedule-drafts",
  "grove-projects-registry",
  "grove-deleted-saved-projects",
  "grove-boq",
  "grove-boq-description-memory",
  "grove-plant-cost",
  "grove-plant-hours",
  "grove-equipment-hours",
  "grove-plant-operator-registers",
])

async function ensureStorageTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS grove_shared_storage (
      storage_key TEXT PRIMARY KEY,
      storage_value TEXT NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `
}

export async function GET() {
  try {
    await ensureStorageTable()
    const result = await sql`
      SELECT storage_key, storage_value
      FROM grove_shared_storage
    `
    const storage = Object.fromEntries(
      result.rows.map(({ storage_key, storage_value }) => [storage_key, storage_value])
    )

    return Response.json(storage, {
      headers: { "Cache-Control": "no-store" },
    })
  } catch {
    return Response.json(
      { error: "Shared database is not configured. Connect POSTGRES_URL in Vercel." },
      { status: 503 }
    )
  }
}

export async function POST(request) {
  try {
    const payload = await request.json()
    if (!allowedKeys.has(payload?.key) || typeof payload.value !== "string") {
      return Response.json({ error: "Invalid shared storage payload." }, { status: 400 })
    }

    await ensureStorageTable()
    await sql`
      INSERT INTO grove_shared_storage (storage_key, storage_value, updated_at)
      VALUES (${payload.key}, ${payload.value}, NOW())
      ON CONFLICT (storage_key)
      DO UPDATE SET storage_value = EXCLUDED.storage_value, updated_at = NOW()
    `

    return Response.json({ ok: true })
  } catch {
    return Response.json(
      { error: "Could not update shared storage. Check the Vercel Postgres connection." },
      { status: 503 }
    )
  }
}

export async function DELETE(request) {
  try {
    const { key } = await request.json()
    if (!allowedKeys.has(key)) {
      return Response.json({ error: "Invalid shared storage key." }, { status: 400 })
    }

    await ensureStorageTable()
    await sql`DELETE FROM grove_shared_storage WHERE storage_key = ${key}`
    return Response.json({ ok: true })
  } catch {
    return Response.json({ error: "Could not clear shared storage." }, { status: 503 })
  }
}