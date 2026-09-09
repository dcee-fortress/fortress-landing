import { readSharedStorage } from "@/lib/serverSharedStore"
import { projectsFromSharedStorage } from "@/lib/readOnlyLiveProjects"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

/** Read-only snapshot for localhost debugging. Never accepts writes. */
export async function GET() {
  try {
    const storage = await readSharedStorage()
    return Response.json(
      { projects: projectsFromSharedStorage(storage) },
      { headers: { "Cache-Control": "no-store" } }
    )
  } catch {
    return Response.json({ error: "Live data is unavailable." }, { status: 503 })
  }
}
