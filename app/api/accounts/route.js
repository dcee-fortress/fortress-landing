import { runAccountsRequest } from "@/lib/accountsStore"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const corsHeaders = {
  "Cache-Control": "no-store",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
}

const readBody = async (request) => {
  try {
    const payload = await request.json()
    return payload && typeof payload === "object" ? payload : {}
  } catch {
    return {}
  }
}

const respond = async (request) => {
  const url = new URL(request.url)
  const query = Object.fromEntries(url.searchParams.entries())
  const body = request.method === "GET" || request.method === "HEAD" ? {} : await readBody(request)
  const result = runAccountsRequest({ method: request.method, query, body })
  if (result.status === 204) {
    return new Response(null, { status: 204, headers: corsHeaders })
  }
  return Response.json(result.json, { status: result.status, headers: corsHeaders })
}

export function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders })
}

export function GET(request) {
  return respond(request)
}

export function POST(request) {
  return respond(request)
}

export function PUT(request) {
  return respond(request)
}

export function DELETE(request) {
  return respond(request)
}
