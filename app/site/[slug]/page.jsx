"use client"

import { useEffect, useState } from "react"
import FortressApp from "@/components/fortress/App"

export default function TenantSitePage() {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    setReady(true)
  }, [])

  if (!ready) return null
  return <FortressApp />
}
