import {
  readSharedStorage,
  writeSharedValue,
  writeSharedValues,
} from "@/lib/serverSharedStore"
import { SHARED_STORAGE_KEYS, STORAGE_UPDATED_AT_KEY } from "@/lib/sharedStorageMerge"
import { projectsFromSharedStorage } from "@/lib/readOnlyLiveProjects"
import { readRequestJson } from "@/lib/safeJson"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const allowedKeys = new Set(SHARED_STORAGE_KEYS)

function withCors(response) {
  response.headers.set("Access-Control-Allow-Origin", "*")
  response.headers.set("Access-Control-Allow-Methods", "GET,POST,OPTIONS")
  response.headers.set("Access-Control-Allow-Headers", "Content-Type")
  response.headers.set("Cache-Control", "no-store")
  return response
}

export async function OPTIONS() {
  return withCors(new Response(null, { status: 204 }))
}

export async function GET() {
  try {
    const storage = await readSharedStorage()
        return withCors(
      Response.json({
        ok: true,
        primary: "postgres",
        projects: projectsFromSharedStorage(storage),
        storage,
        updatedAt: (() => {
          try {
            const raw = storage[STORAGE_UPDATED_AT_KEY]
            return raw ? JSON.parse(raw).updatedAt ?? null : null
          } catch {
            return null
          }
        })(),
      })
    )
  } catch {
    return withCors(
      Response.json({ error: "Could not read Postgres." }, { status: 503 })
    )
  }
}

export async function POST(request) {
  try {
    const payload = await readRequestJson(request, {})

    if (payload?.keys && typeof payload.keys === "object" && !Array.isArray(payload.keys)) {
      const updates = {}
      for (const [key, value] of Object.entries(payload.keys)) {
        if (!allowedKeys.has(key) || typeof value !== "string") {
          return withCors(Response.json({ error: "Invalid project payload." }, { status: 400 }))
        }
        updates[key] = value
      }
      const storage = await writeSharedValues(updates, {
        replaceKeys: Array.isArray(payload.replaceKeys) ? payload.replaceKeys : Object.keys(updates),
      })
      return withCors(
        Response.json({
          ok: true,
          storage,
          updatedAt: storage[STORAGE_UPDATED_AT_KEY]
            ? JSON.parse(storage[STORAGE_UPDATED_AT_KEY]).updatedAt
            : new Date().toISOString(),
        })
      )
    }

    if (!allowedKeys.has(payload?.key) || typeof payload.value !== "string") {
      return withCors(Response.json({ error: "Invalid project payload." }, { status: 400 }))
    }

    const value = await writeSharedValue(payload.key, payload.value, {
      replace: payload.replace !== false,
    })
    return withCors(
      Response.json({
        ok: true,
        value,
        updatedAt: new Date().toISOString(),
      })
    )
  } catch (error) {
    const message =
      error instanceof Error && error.message && !/postgres:\/\//i.test(error.message)
        ? error.message
        : "Could not save to Postgres."
    return withCors(Response.json({ error: message }, { status: 503 }))
  }
}
