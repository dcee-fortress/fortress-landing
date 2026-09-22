import { readRequestJson } from "@/lib/safeJson"
import {
  deleteProgressPhotosByIds,
  getProgressPhotoById,
  getProgressPhotosByIds,
  upsertProgressPhotos,
} from "@/lib/progressPhotoServer"
import { postgresAvailable } from "@/lib/postgres"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

function withCors(response) {
  response.headers.set("Access-Control-Allow-Origin", "*")
  response.headers.set("Access-Control-Allow-Methods", "GET,POST,DELETE,OPTIONS")
  response.headers.set("Access-Control-Allow-Headers", "Content-Type")
  response.headers.set("Cache-Control", "no-store")
  return response
}

function parseIds(searchParams) {
  const single = searchParams.get("id")
  const many = searchParams.get("ids")
  const ids = []
  if (single) ids.push(single)
  if (many) {
    for (const part of many.split(",")) {
      const trimmed = part.trim()
      if (trimmed) ids.push(trimmed)
    }
  }
  return [...new Set(ids)]
}

function dataUrlToResponse(photo) {
  const dataUrl = String(photo?.data || "")
  const match = dataUrl.match(/^data:([^;,]+)?(?:;charset=[^;,]+)?;base64,(.+)$/i)
  if (!match) {
    return withCors(Response.json({ error: "Photo payload is invalid." }, { status: 500 }))
  }
  const mime = match[1] || photo.type || "image/jpeg"
  const buffer = Buffer.from(match[2], "base64")
  return withCors(
    new Response(buffer, {
      status: 200,
      headers: {
        "Content-Type": mime,
        "Content-Length": String(buffer.length),
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    })
  )
}

export async function OPTIONS() {
  return withCors(new Response(null, { status: 204 }))
}

export async function GET(request) {
  try {
    if (!postgresAvailable()) {
      return withCors(Response.json({ error: "Photo storage is unavailable." }, { status: 503 }))
    }

    const { searchParams } = new URL(request.url)
    const ids = parseIds(searchParams)
    const asJson = searchParams.get("format") === "json"

    if (ids.length === 0) {
      return withCors(Response.json({ error: "Missing photo id." }, { status: 400 }))
    }

    if (ids.length === 1 && !asJson) {
      const photo = await getProgressPhotoById(ids[0])
      if (!photo?.data) {
        return withCors(Response.json({ error: "Photo not found." }, { status: 404 }))
      }
      return dataUrlToResponse(photo)
    }

    const photos = await getProgressPhotosByIds(ids)
    return withCors(Response.json({ ok: true, photos }))
  } catch (error) {
    return withCors(
      Response.json(
        { error: error instanceof Error ? error.message : "Could not load photos." },
        { status: 500 }
      )
    )
  }
}

export async function POST(request) {
  try {
    if (!postgresAvailable()) {
      return withCors(Response.json({ error: "Photo storage is unavailable." }, { status: 503 }))
    }

    const body = await readRequestJson(request, {})
    const photos = Array.isArray(body?.photos) ? body.photos : body?.photo ? [body.photo] : []
    if (photos.length === 0) {
      return withCors(Response.json({ error: "No photos to save." }, { status: 400 }))
    }

    const saved = await upsertProgressPhotos(photos)
    return withCors(Response.json({ ok: true, saved }))
  } catch (error) {
    return withCors(
      Response.json(
        { error: error instanceof Error ? error.message : "Could not save photos." },
        { status: 500 }
      )
    )
  }
}

export async function DELETE(request) {
  try {
    if (!postgresAvailable()) {
      return withCors(Response.json({ error: "Photo storage is unavailable." }, { status: 503 }))
    }

    const body = await readRequestJson(request, {})
    const ids = Array.isArray(body?.ids) ? body.ids : body?.id ? [body.id] : []
    const deleted = await deleteProgressPhotosByIds(ids)
    return withCors(Response.json({ ok: true, deleted }))
  } catch (error) {
    return withCors(
      Response.json(
        { error: error instanceof Error ? error.message : "Could not delete photos." },
        { status: 500 }
      )
    )
  }
}
