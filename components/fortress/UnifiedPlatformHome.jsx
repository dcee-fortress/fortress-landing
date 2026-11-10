"use client"

import { useEffect } from "react"
import AppShell from "@/components/project/AppShell"
import GroveLanding from "@/components/project/GroveLanding"
import FortressApp from "@/components/fortress/App"
import { RODCROFT_CHADCOMBE_PROJECT_ID } from "@/components/fortress/fortressMetadata"

const RODCROFT_HOSTS = new Set([
  "rodcroft-fortress.vercel.app",
  "rodcroft.fortress.vercel.app",
  "rodcroft.vercel.app",
])

export default function UnifiedPlatformHome({ initialHost = "" }) {
  const host =
    typeof window !== "undefined"
      ? window.location.hostname.toLowerCase()
      : String(initialHost || "").toLowerCase().split(":")[0]

  const isRodcroftHost = RODCROFT_HOSTS.has(host)
  const isLegacyRodcroftDirect =
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("mode") === "rodcroft-native"

  useEffect(() => {
    if (!isRodcroftHost && !isLegacyRodcroftDirect) return
    const projectPath = `/project/${RODCROFT_CHADCOMBE_PROJECT_ID}`
    if (window.location.pathname === projectPath) return
    window.location.replace(projectPath)
  }, [isRodcroftHost, isLegacyRodcroftDirect])

  if (isRodcroftHost || isLegacyRodcroftDirect) {
    return (
      <AppShell>
        <GroveLanding />
      </AppShell>
    )
  }

  return <FortressApp />
}
