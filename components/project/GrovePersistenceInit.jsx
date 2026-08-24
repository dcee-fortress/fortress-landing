"use client"

import { useEffect } from "react"

export default function GrovePersistenceInit() {
  useEffect(() => {
    const syncBeforeClose = () => {
      void import("@/lib/grovePersistence").then(({ initializeGrovePersistence }) => {
        initializeGrovePersistence()
      })
    }

    window.addEventListener("beforeunload", syncBeforeClose)
    return () => window.removeEventListener("beforeunload", syncBeforeClose)
  }, [])

  return null
}
