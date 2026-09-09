"use client"

import { useEffect, useState } from "react"

function decodeLivePayload(raw) {
  // Decoding/formatting belongs here on the client, after /api/sync returns JSON.
  // Live storage values are often JSON strings keyed by grove-* names.
  if (!raw || typeof raw !== "object") {
    return { projects: [], keys: [] }
  }

  let projects = []
  const registryRaw = raw["grove-projects-registry"]
  if (typeof registryRaw === "string") {
    try {
      const registry = JSON.parse(registryRaw)
      projects = Array.isArray(registry.projects) ? registry.projects : []
    } catch {
      projects = []
    }
  }

  return {
    keys: Object.keys(raw),
    projects,
  }
}

export default function LiveSyncExample() {
  const [status, setStatus] = useState("loading")
  const [source, setSource] = useState("")
  const [decoded, setDecoded] = useState({ projects: [], keys: [] })
  const [error, setError] = useState("")

  useEffect(() => {
    const controller = new AbortController()

    async function loadLiveData() {
      try {
        const response = await fetch("/api/sync?endpoint=shared-storage", {
          cache: "no-store",
          signal: controller.signal,
        })
        const payload = await response.json()

        if (!response.ok || payload?.ok !== true) {
          setStatus("error")
          setError(payload?.error || "Could not sync live data.")
          return
        }

        setSource(payload.source || "")
        setDecoded(decodeLivePayload(payload.data))
        setStatus("ready")
      } catch (caught) {
        if (caught?.name === "AbortError") return
        setStatus("error")
        setError("Could not reach the local sync route.")
      }
    }

    void loadLiveData()
    return () => controller.abort()
  }, [])

  return (
    <div className="app-page-frame text-zinc-900">
      <div className="app-content-shell space-y-4">
        <header className="space-y-1">
          <p className="text-sm font-medium uppercase tracking-wide text-zinc-500">Live sync</p>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Read-only live data</h1>
          <p className="text-sm text-zinc-500">
            This page calls <code className="rounded bg-zinc-100 px-1">/api/sync</code> on localhost. The
            browser never talks to Vercel directly, and API tokens stay on the server.
          </p>
        </header>

        {status === "loading" ? <p className="text-sm text-zinc-500">Loading live data…</p> : null}

        {status === "error" ? <p className="text-sm text-red-600">{error}</p> : null}

        {status === "ready" ? (
          <section className="space-y-3 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
            <p className="text-xs text-zinc-500">Source: {source}</p>
            <p className="text-sm text-zinc-700">
              {decoded.projects.length === 0
                ? "No projects in the live store."
                : `${decoded.projects.length} live project${decoded.projects.length === 1 ? "" : "s"}.`}
            </p>
            <ul className="space-y-2">
              {decoded.projects.map((project) => (
                <li key={project.id || project.name} className="text-sm text-zinc-800">
                  <span className="font-medium">{project.name || "Untitled"}</span>
                  {project.startDate ? (
                    <span className="ml-2 text-zinc-500">Started {project.startDate}</span>
                  ) : null}
                </li>
              ))}
            </ul>
            <p className="text-xs text-zinc-400">Keys: {decoded.keys.join(", ") || "none"}</p>
          </section>
        ) : null}
      </div>
    </div>
  )
}
