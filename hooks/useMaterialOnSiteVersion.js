"use client"

import { useEffect, useState } from "react"
import { subscribeMaterialOnSite } from "@/lib/materialOnSite"

export function useMaterialOnSiteVersion() {
  const [version, setVersion] = useState(0)

  useEffect(() => subscribeMaterialOnSite(() => setVersion((current) => current + 1)), [])

  return version
}
