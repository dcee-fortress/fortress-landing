"use client"

import { useCallback, useEffect, useState } from "react"

const AUTO_SYNC_MS = 5 * 60 * 1000

function formatMinsAgo(iso) {
  if (!iso) return "never"
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000))
  if (mins < 1) return "just now"
  if (mins === 1) return "1 min ago"
  return `${mins} mins ago`
}

export default function SyncButton() {
  const [loading, setLoading] = useState(false)
  const [lastSync, setLastSync] = useState(null)
  const [status, setStatus] = useState("")

  const syncNow = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/sync", { cache: "no-store" })
      const payload = await response.json()

      // DECODE HERE — last-sync label and status copy only; do not write back to live.
      const syncedAt = payload.lastSync || new Date().toISOString()
      setLastSync(syncedAt)

      // DECODE HERE — inspect cached project rows after a successful or fallback sync.
      const records = Array.isArray(payload.records) ? payload.records : []
      void records

      if (payload.success) {
        setStatus(`Updated ${payload.newRecords ?? 0} record(s)`)
      } else {
        setStatus(payload.message || "Using last synced data")
      }
    } catch {
      setStatus("Using last synced data")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void syncNow()
    const timer = window.setInterval(() => {
      void syncNow()
    }, AUTO_SYNC_MS)
    return () => window.clearInterval(timer)
  }, [syncNow])

  if (process.env.NEXT_PUBLIC_GROVE_CODE_CHANNEL === "live") {
    return null
  }

  return (
    <div className="fixed bottom-4 right-4 z-40 flex items-center gap-3 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700 shadow-sm">
      <p className="whitespace-nowrap text-zinc-500">
        Last synced: {formatMinsAgo(lastSync)}
      </p>
      <button
        type="button"
        onClick={() => void syncNow()}
        disabled={loading}
        className="rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-zinc-800 disabled:opacity-60"
      >
        {loading ? "Syncing…" : "Sync Now"}
      </button>
      {status ? <span className="hidden max-w-[12rem] truncate text-xs text-zinc-400 sm:inline">{status}</span> : null}
    </div>
  )
}
