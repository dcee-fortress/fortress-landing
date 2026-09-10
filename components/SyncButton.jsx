"use client"

import { useCallback, useEffect, useState } from "react"
import { pullFromLivePostgres } from "@/lib/sharedPersistence"
import { isLocalCodeChannel } from "@/lib/liveDataConfig"

export default function SyncButton() {
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState("")

  const syncNow = useCallback(async () => {
    setLoading(true)
    try {
      const remote = await pullFromLivePostgres()
      const count = (() => {
        try {
          const parsed = JSON.parse(remote?.["grove-projects-registry"] || "{}")
          return Array.isArray(parsed.projects) ? parsed.projects.length : 0
        } catch {
          return 0
        }
      })()
      setStatus(count ? `Loaded ${count} live project(s)` : "Live Postgres is empty")
    } catch {
      setStatus("Could not pull live Postgres")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("pull") === "live") {
      void syncNow()
    }
  }, [syncNow])

  if (typeof window !== "undefined" && !isLocalCodeChannel()) {
    return null
  }

  return (
    <div className="fixed bottom-4 right-4 z-40 flex items-center gap-3 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700 shadow-sm">
      <p className="whitespace-nowrap text-zinc-500">Postgres is live. Pull when you ask.</p>
      <button
        type="button"
        onClick={() => void syncNow()}
        disabled={loading}
        className="rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-zinc-800 disabled:opacity-60"
      >
        {loading ? "Pulling…" : "Sync Now"}
      </button>
      {status ? <span className="hidden max-w-[12rem] truncate text-xs text-zinc-400 sm:inline">{status}</span> : null}
    </div>
  )
}
