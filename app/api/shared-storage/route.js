import {
  removeSharedValue,
  readSharedStorage,
  replaceSharedStorage,
  writeSharedValue,
  writeSharedValues,
} from "@/lib/serverSharedStore"
import { SHARED_STORAGE_KEYS } from "@/lib/sharedStorageMerge"
import { readRequestJson } from "@/lib/safeJson"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const allowedKeys = new Set(SHARED_STORAGE_KEYS)

export async function GET() {
  try {
    const storage = await readSharedStorage()
    return Response.json(storage, {
      headers: { "Cache-Control": "no-store" },
    })
  } catch {
    return Response.json(
      { error: "Shared storage is temporarily unavailable." },
      { status: 503 }
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
          return Response.json({ error: "Invalid shared storage payload." }, { status: 400 })
        }
        updates[key] = value
      }
      const storage = await writeSharedValues(updates, {
        replaceKeys: Array.isArray(payload.replaceKeys) ? payload.replaceKeys : [],
      })
      return Response.json({ ok: true, storage })
    }

    if (!allowedKeys.has(payload?.key) || typeof payload.value !== "string") {
      return Response.json({ error: "Invalid shared storage payload." }, { status: 400 })
    }

    const value = await writeSharedValue(payload.key, payload.value, {
      replace: payload.replace === true,
    })
    return Response.json({ ok: true, value })
  } catch {
    return Response.json(
      { error: "Could not update shared storage." },
      { status: 503 }
    )
  }
}

export async function PUT(request) {
  try {
    const payload = await readRequestJson(request, {})
    if (payload?.replace !== true || !payload.storage || typeof payload.storage !== "object") {
      return Response.json({ error: "Invalid shared storage replacement." }, { status: 400 })
    }

    const storage = await replaceSharedStorage(payload.storage, {
      forceEmpty: payload.forceEmpty === true,
    })
    return Response.json({ ok: true, storage })
  } catch {
    return Response.json(
      { error: "Could not replace shared storage." },
      { status: 503 }
    )
  }
}

export async function DELETE(request) {
  try {
    const payload = await readRequestJson(request, {})
    if (!allowedKeys.has(payload?.key)) {
      return Response.json({ error: "Invalid shared storage key." }, { status: 400 })
    }

    await removeSharedValue(payload.key)
    return Response.json({ ok: true })
  } catch {
    return Response.json({ error: "Could not clear shared storage." }, { status: 503 })
  }
}
