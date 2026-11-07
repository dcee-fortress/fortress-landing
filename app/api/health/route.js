export const dynamic = "force-dynamic"

export async function GET() {
  return Response.json({ ok: true, service: "fortress-unified-platform", at: Date.now() })
}
