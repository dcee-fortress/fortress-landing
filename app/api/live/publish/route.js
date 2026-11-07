import { readRequestJson } from "@/lib/safeJson"

export const dynamic = "force-dynamic"

export async function POST(request) {
  const body = await readRequestJson(request, {})
  const item = {
    id: body.id || `live-${Date.now()}`,
    authorId: body.authorId || "",
    authorName: body.authorName || "Fortress user",
    caption: body.caption || "",
    shelf: body.shelf || "General",
    kind: body.kind || "photo",
    photo: body.photo || "",
    video: body.video || "",
    at: Date.now(),
  }
  return Response.json({ ok: true, item })
}
