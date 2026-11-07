import { headers } from "next/headers"
import UnifiedPlatformHome from "@/components/fortress/UnifiedPlatformHome"

export default async function Home() {
  const hdrs = await headers()
  const host = hdrs.get("host") || ""
  return <UnifiedPlatformHome initialHost={host} />
}
