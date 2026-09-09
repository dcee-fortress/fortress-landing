"use client"

import { useEffect, useRef, useState } from "react"
import { SYNC_STATUS_EVENT } from "@/lib/syncStatus"

const HIDE_AFTER_MS = 4000

function formatAgo(iso) {
  if (!iso) return "never"
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000))
  if (mins < 1) return "just now"
  if (mins === 1) return "1 min ago"
  return `${mins} mins ago`
}

const STATE_STYLES = {
  syncing: "bg-amber-50 text-amber-800 border-amber-200",
  synced: "bg-emerald-50 text-emerald-800 border-emerald-200",
  offline: "bg-zinc-100 text-zinc-600 border-zinc-200",
  idle: "bg-zinc-50 text-zinc-600 border-zinc-200",
}

export default function SyncStatusBar() {
  const [status, setStatus] = useState({
    state: "idle",
    source: "Postgres",
    message: "Waiting for Postgres…",
    lastSync: null,
  })
  const [visible, setVisible] = useState(false)
  const hideTimerRef = useRef(0)
  const visibleRef = useRef(false)

  useEffect(() => {
    const setBarVisible = (nextVisible) => {
      visibleRef.current = nextVisible
      setVisible(nextVisible)
    }

    const hideSoon = () => {
      window.clearTimeout(hideTimerRef.current)
      hideTimerRef.current = window.setTimeout(() => {
        setBarVisible(false)
      }, HIDE_AFTER_MS)
    }

    const onStatus = (event) => {
      const next = event.detail || {}
      setStatus(next)

      if (next.silent) return

      if (next.state === "syncing") {
        window.clearTimeout(hideTimerRef.current)
        setBarVisible(true)
        return
      }

      if (next.state === "synced" || next.state === "offline") {
        setBarVisible(true)
        hideSoon()
      }
    }

    window.addEventListener(SYNC_STATUS_EVENT, onStatus)
    if (window.__groveSyncStatus) onStatus({ detail: window.__groveSyncStatus })
    return () => {
      window.removeEventListener(SYNC_STATUS_EVENT, onStatus)
      window.clearTimeout(hideTimerRef.current)
    }
  }, [])

  if (!visible) return null

  const tone = STATE_STYLES[status.state] || STATE_STYLES.idle

  return (
    <div className={`app-sync-status-bar border-b px-3 py-1.5 text-xs sm:text-sm ${tone}`}>
      <div className="mx-auto flex w-full max-w-[90rem] flex-wrap items-center gap-x-3 gap-y-1">
        <p className="font-medium">Sync status</p>
        <p>
          {status.state === "syncing"
            ? "Syncing…"
            : status.state === "offline"
              ? "Offline — using localStorage cache"
              : "Connected to Postgres"}
        </p>
        <p className="text-zinc-500">Last synced: {formatAgo(status.lastSync)}</p>
        {status.message ? <p className="truncate text-zinc-500">{status.message}</p> : null}
      </div>
    </div>
  )
}
