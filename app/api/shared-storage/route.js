import {
  removeSharedValue,
  readSharedStorage,
  writeSharedValue,
} from "@/lib/serverSharedStore"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const allowedKeys = new Set([
  "grove-primary-project-data",
  "grove-material-schedules",
  "grove-material-schedule-drafts",
  "grove-projects-registry",
  "grove-boq",
  "grove-boq-description-memory",
  "grove-plant-cost",
  "grove-plant-hours",
  "grove-equipment-hours",
  "grove-plant-operator-registers",
])

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
    const payload = await request.json()
    if (!allowedKeys.has(payload?.key) || typeof payload.value !== "string") {
      return Response.json({ error: "Invalid shared storage payload." }, { status: 400 })
    }

    const value = await writeSharedValue(payload.key, payload.value)
    return Response.json({ ok: true, value })
  } catch {
    return Response.json(
      { error: "Could not update shared storage." },
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

    await removeSharedValue(key)
    return Response.json({ ok: true })
  } catch {
    return Response.json({ error: "Could not clear shared storage." }, { status: 503 })
  }
}
