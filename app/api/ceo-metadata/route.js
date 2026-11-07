import {
  DEFAULT_PRIXBURG_METADATA,
  DEFAULT_RODCROFT_METADATA,
} from "@/components/fortress/fortressMetadata"

export const dynamic = "force-dynamic"

export async function GET() {
  return Response.json(
    {
      platform: "Fortress Landing Page",
      subdomainRoot: "fortress.vercel.app",
      templates: {
        rodcroft: DEFAULT_RODCROFT_METADATA,
        prixburg: DEFAULT_PRIXBURG_METADATA,
      },
    },
    { headers: { "Cache-Control": "no-store" } }
  )
}
