"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { useProjects } from "@/components/project/ProjectsProvider"
import { useHasHydrated } from "@/hooks/useHasHydrated"
import { ensureDailyFilesThroughToday } from "@/lib/dailyFileSync"

export function useHydratedProjectRoute(projectId, resolveItem) {
  const hasHydrated = useHasHydrated()
  const router = useRouter()
  const { getProject, syncReady, refresh, version } = useProjects()
  const resolveRef = useRef(resolveItem)
  const preparedRef = useRef(new Set())
  const lastProjectRef = useRef(null)
  const [checked, setChecked] = useState(false)

  resolveRef.current = resolveItem

  const liveProject = hasHydrated ? getProject(projectId) : null
  if (liveProject) lastProjectRef.current = liveProject

  useEffect(() => {
    if (!hasHydrated || !projectId) return

    const project = getProject(projectId)
    if (!project) {
      // Wait for cache/Postgres before treating the project as missing.
      if (!syncReady) return
      if (lastProjectRef.current?.id === projectId) {
        setChecked(true)
        return
      }
      router.replace("/")
      return
    }

    lastProjectRef.current = project

    // Rebuild calendar file lists before unlocking the route. Sync used to wipe
    // registry.files, which made daily pages call notFound() on first paint.
    if (!preparedRef.current.has(projectId)) {
      preparedRef.current.add(projectId)
      let changed = false
      try {
        changed = Boolean(ensureDailyFilesThroughToday(projectId))
      } catch {
        // Non-blocking; resolveItem / next navigation can retry.
      }
      if (changed) refresh()
    }

    setChecked(true)
    // `version` re-runs this when projects arrive from cache/Postgres.
  }, [getProject, hasHydrated, projectId, refresh, router, syncReady, version])

  const project =
    liveProject ||
    (checked && lastProjectRef.current?.id === projectId ? lastProjectRef.current : null)

  const item =
    hasHydrated && checked && project && resolveRef.current ? resolveRef.current(project) : null

  return {
    isReady: hasHydrated && checked && Boolean(project),
    syncReady,
    project,
    item,
  }
}
