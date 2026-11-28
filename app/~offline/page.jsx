"use client"

import { useEffect } from "react"
import Link from "next/link"
import { APP_BRAND } from "@/lib/appBrand"
import { RODCROFT_CHADCOMBE_PROJECT_ID } from "@/lib/projectList"
import { hydrateGroveStoreFromSession } from "@/lib/groveClientStore"

const HOME = `/project/${RODCROFT_CHADCOMBE_PROJECT_ID}`

/**
 * Last-resort fallback when a URL was never cached. If local data exists,
 * bounce straight into the project shell so airplane mode still feels usable.
 */
export default function OfflinePage() {
  useEffect(() => {
    const hadCache = hydrateGroveStoreFromSession()
    if (!hadCache) return
    // Prefer the last project path the user visited while online.
    try {
      const last = window.sessionStorage.getItem("rodcroft-last-path")
      if (last && last.startsWith("/project/")) {
        window.location.replace(last)
        return
      }
    } catch {
      /* ignore */
    }
    window.location.replace(HOME)
  }, [])

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-zinc-100 px-6 text-center">
      <p className="text-sm font-medium uppercase tracking-wide text-zinc-500">{APP_BRAND}</p>
      <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Working offline</h1>
      <p className="max-w-md text-sm text-zinc-600">
        Opening your saved project. Valuations, BOQ, rate build-up, and site tools already on this
        device keep working in airplane mode. They sync to the live database when you reconnect.
      </p>
      <Link
        href={HOME}
        className="rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white"
      >
        Open {APP_BRAND}
      </Link>
    </main>
  )
}
