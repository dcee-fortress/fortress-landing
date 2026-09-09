import { readSharedStorage } from "@/lib/serverSharedStore"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

/** Debug ping — does not write SQLite. Live data is Postgres only. */
export async function GET() {
  try {
    await readSharedStorage()
    return Response.json({
      success: true,
      newRecords: 0,
      lastSync: new Date().toISOString(),
      message: "Postgres reachable",
    })
  } catch {
    return Response.json({
      success: false,
      message: "Using last synced data",
    })
  }
}

export async function POST() {
  return GET()
}
