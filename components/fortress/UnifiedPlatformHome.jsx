"use client"

import AppShell from "@/components/project/AppShell"
import GroveLanding from "@/components/project/GroveLanding"
import FortressApp from "@/components/fortress/App"

export default function UnifiedPlatformHome({ initialHost = "" }) {
  const host =
    typeof window !== "undefined"
      ? window.location.hostname.toLowerCase()
      : String(initialHost || "").toLowerCase().split(":")[0]

  const isLegacyRodcroftDirect =
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("mode") === "rodcroft-native"

  if (isLegacyRodcroftDirect) {
    return (
      <AppShell>
        <GroveLanding />
      </AppShell>
    )
  }

  return <FortressApp />
}
