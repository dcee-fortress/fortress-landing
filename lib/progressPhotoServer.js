import { postgresAvailable, query } from "@/lib/postgres"

let tableReady = null

async function ensurePhotoTable() {
  if (!postgresAvailable()) return false
  if (!tableReady) {
    tableReady = query(
      `CREATE TABLE IF NOT EXISTS grove_progress_photos (
        photo_id TEXT PRIMARY KEY,
        name TEXT,
        mime_type TEXT,
        size_bytes INTEGER,
        uploaded_at TIMESTAMPTZ,
        data_url TEXT NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`
    ).then(() => true)
  }
  await tableReady
  return true
}

function rowToPhoto(row) {
  if (!row) return null
  return {
    id: row.photo_id,
    name: row.name || "",
    type: row.mime_type || "image/jpeg",
    size: Number(row.size_bytes) || 0,
    uploadedAt: row.uploaded_at ? new Date(row.uploaded_at).toISOString() : "",
    data: row.data_url,
  }
}

export async function upsertProgressPhotos(photos = []) {
  if (!(await ensurePhotoTable())) {
    throw new Error("Postgres is not configured for photo storage.")
  }

  const list = (photos || []).filter((photo) => photo?.id && photo?.data)
  for (const photo of list) {
    await query(
      `INSERT INTO grove_progress_photos
        (photo_id, name, mime_type, size_bytes, uploaded_at, data_url, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())
       ON CONFLICT (photo_id)
       DO UPDATE SET
         name = EXCLUDED.name,
         mime_type = EXCLUDED.mime_type,
         size_bytes = EXCLUDED.size_bytes,
         uploaded_at = EXCLUDED.uploaded_at,
         data_url = EXCLUDED.data_url,
         updated_at = NOW()`,
      [
        String(photo.id),
        String(photo.name || ""),
        String(photo.type || "image/jpeg"),
        Number(photo.size) || 0,
        photo.uploadedAt ? new Date(photo.uploadedAt) : new Date(),
        String(photo.data),
      ]
    )
  }
  return list.length
}

export async function getProgressPhotosByIds(ids = []) {
  if (!(await ensurePhotoTable())) return []
  const photoIds = [...new Set((ids || []).map((id) => String(id || "")).filter(Boolean))]
  if (photoIds.length === 0) return []

  const result = await query(
    `SELECT photo_id, name, mime_type, size_bytes, uploaded_at, data_url
     FROM grove_progress_photos
     WHERE photo_id = ANY($1::text[])`,
    [photoIds]
  )
  return result.rows.map(rowToPhoto)
}

export async function getProgressPhotoById(id) {
  if (!id) return null
  const rows = await getProgressPhotosByIds([id])
  return rows[0] || null
}

export async function deleteProgressPhotosByIds(ids = []) {
  if (!(await ensurePhotoTable())) return 0
  const photoIds = [...new Set((ids || []).map((id) => String(id || "")).filter(Boolean))]
  if (photoIds.length === 0) return 0

  const result = await query(
    `DELETE FROM grove_progress_photos WHERE photo_id = ANY($1::text[])`,
    [photoIds]
  )
  return result.rowCount || 0
}
