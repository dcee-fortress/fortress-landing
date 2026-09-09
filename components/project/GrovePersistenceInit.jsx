"use client"

import { useEffect } from "react"

export default function GrovePersistenceInit() {
  useEffect(() => {
    const syncBeforeClose = () => {
      void Promise.all([
        import("@/lib/sharedPersistence"),
        import("@/lib/grovePersistence"),
      ]).then(([{ runSystemStorageWrite }, { initializeGrovePersistence }]) => {
        runSystemStorageWrite(() => {
          initializeGrovePersistence()
        })
      })
    }

    window.addEventListener("beforeunload", syncBeforeClose)
    return () => window.removeEventListener("beforeunload", syncBeforeClose)
  }, [])

  return null
}
