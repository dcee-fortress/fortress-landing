"use client"

import { useEffect, useState } from "react"
import { initCapacitorShell, isCapacitorNative } from "@/lib/capacitorApp"
import { applyPendingUpdateWhenOnline, readOnline } from "@/components/fortress/offline"
import { SYNC_STATUS_EVENT } from "@/lib/syncStatus"
import { hasOfflineQueue } from "@/lib/offlineSync"

/**
 * Registers the offline service worker, Capacitor shell, and Add-to-Home-Screen prompt
 * so Rodcroft can be installed from a link and used fully without signal.
 */
export default function OfflineAppBootstrap() {
  const [installEvent, setInstallEvent] = useState(null)
  const [showInstall, setShowInstall] = useState(false)
  const [offline, setOffline] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [pendingOffline, setPendingOffline] = useState(false)

  useEffect(() => {
    const refresh = () => {
      setOffline(!readOnline())
      setPendingOffline(hasOfflineQueue())
    }
    const rememberPath = () => {
      try {
        if (window.location.pathname.startsWith("/project/")) {
          window.sessionStorage.setItem("rodcroft-last-path", window.location.pathname)
        }
      } catch {
        /* ignore */
      }
    }
    refresh()
    rememberPath()
    window.addEventListener("online", refresh)
    window.addEventListener("offline", refresh)
    window.addEventListener("grove-offline-sync", refresh)
    window.addEventListener("popstate", rememberPath)
    return () => {
      window.removeEventListener("online", refresh)
      window.removeEventListener("offline", refresh)
      window.removeEventListener("grove-offline-sync", refresh)
      window.removeEventListener("popstate", rememberPath)
    }
  }, [])

  useEffect(() => {
    const onStatus = (event) => {
      const state = event?.detail?.state
      setSyncing(state === "syncing")
      if (state === "synced" || state === "offline") {
        setPendingOffline(hasOfflineQueue())
      }
    }
    window.addEventListener(SYNC_STATUS_EVENT, onStatus)
    return () => window.removeEventListener(SYNC_STATUS_EVENT, onStatus)
  }, [])

  useEffect(() => {
    void initCapacitorShell()
  }, [])

  useEffect(() => {
    if (isCapacitorNative()) return undefined
    if (!("serviceWorker" in navigator)) return undefined

    let registration
    let updateSW = null
    let cancelled = false

    const onControllerChange = () => {
      // New SW took over — refresh once online so the shell stays current.
      if (readOnline()) window.location.reload()
    }

    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange)

    /** Warm the page cache while online so airplane-mode hops stay instant. */
    const prefetchShell = () => {
      if (!readOnline() || cancelled) return
      const paths = new Set([
        window.location.pathname,
        window.location.pathname.replace(/\/$/, "") || "/",
      ])
      const match = window.location.pathname.match(/^(\/project\/[^/]+)/)
      if (match) {
        const root = match[1]
        ;[
          root,
          `${root}/dashboard/daily-value`,
          `${root}/dashboard/rate-analysis`,
          `${root}/dashboard/site-reports/daily`,
          `${root}/dashboard/safety-health/plant-register`,
        ].forEach((path) => paths.add(path))
      }
      for (const path of paths) {
        void fetch(path, { credentials: "same-origin", cache: "reload" }).catch(() => {})
      }
    }

    void navigator.serviceWorker
      .register("/sw.js", { scope: "/", updateViaCache: "none" })
      .then((reg) => {
        registration = reg
        updateSW = () => {
          if (reg.waiting) {
            reg.waiting.postMessage({ type: "SKIP_WAITING" })
          }
        }
        const tryUpdate = () => applyPendingUpdateWhenOnline(updateSW)
        window.addEventListener("online", tryUpdate)
        window.addEventListener("online", prefetchShell)
        if (reg.waiting && readOnline()) tryUpdate()
        // Prefetch after first paint so installable offline shell fills quietly.
        window.setTimeout(prefetchShell, 2500)
      })
      .catch(() => {
        /* SW missing until production build generates public/sw.js */
      })

    return () => {
      cancelled = true
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange)
      window.removeEventListener("online", prefetchShell)
      if (registration) {
        /* keep SW registered */
      }
    }
  }, [])

  useEffect(() => {
    if (isCapacitorNative()) return undefined
    if (window.matchMedia("(display-mode: standalone)").matches) return undefined
    if (window.navigator.standalone) return undefined

    const onBeforeInstall = (event) => {
      event.preventDefault()
      setInstallEvent(event)
      setShowInstall(true)
    }

    window.addEventListener("beforeinstallprompt", onBeforeInstall)

    // iOS Safari has no beforeinstallprompt — show Share → Add to Home Screen tip once.
    const isIos =
      /iphone|ipad|ipod/i.test(window.navigator.userAgent) &&
      !window.MSStream
    if (isIos && !window.sessionStorage.getItem("rodcroft-ios-install-tip")) {
      window.sessionStorage.setItem("rodcroft-ios-install-tip", "1")
      setShowInstall(true)
    }

    return () => window.removeEventListener("beforeinstallprompt", onBeforeInstall)
  }, [])

  const handleInstall = async () => {
    if (!installEvent) return
    installEvent.prompt()
    try {
      await installEvent.userChoice
    } catch {
      /* dismissed */
    }
    setInstallEvent(null)
    setShowInstall(false)
  }

  const banner =
    offline ? (
      <div
        role="status"
        className="fixed inset-x-0 top-0 z-[80] bg-amber-500 px-3 py-1.5 text-center text-xs font-medium text-zinc-900"
      >
        Airplane / offline mode — full Rodcroft on this device. Changes save locally and sync when
        you reconnect.
      </div>
    ) : syncing ? (
      <div
        role="status"
        className="fixed inset-x-0 top-0 z-[80] bg-sky-600 px-3 py-1.5 text-center text-xs font-medium text-white"
      >
        Syncing live data… New files and entries from other users appear automatically.
      </div>
    ) : pendingOffline ? (
      <div
        role="status"
        className="fixed inset-x-0 top-0 z-[80] bg-emerald-600 px-3 py-1.5 text-center text-xs font-medium text-white"
      >
        Uploading offline edits to the live database (last edit wins)…
      </div>
    ) : null

  return (
    <>
      {banner}

      {showInstall ? (
        <div className="fixed inset-x-3 bottom-3 z-[90] mx-auto flex max-w-md flex-col gap-2 rounded-2xl border border-zinc-200 bg-white p-4 shadow-lg sm:inset-x-auto sm:right-4 sm:bottom-4">
          <p className="text-sm font-semibold text-zinc-900">Install Rodcroft</p>
          <p className="text-xs text-zinc-600">
            {installEvent
              ? "Add Rodcroft to your home screen. After it opens once online, valuations and QS tools keep working in airplane mode."
              : "On iPhone: tap Share, then Add to Home Screen. Open it once online so pages are saved for offline use."}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setShowInstall(false)}
              className="flex-1 rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700"
            >
              {installEvent ? "Not now" : "Got it"}
            </button>
            {installEvent ? (
              <button
                type="button"
                onClick={() => void handleInstall()}
                className="flex-1 rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white"
              >
                Install
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  )
}
