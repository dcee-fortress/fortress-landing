export const dynamic = "force-dynamic"

const memoryFeed = []

export async function GET() {
  return Response.json(
    { items: memoryFeed, at: Date.now() },
    { headers: { "Cache-Control": "no-store" } }
  )
}
