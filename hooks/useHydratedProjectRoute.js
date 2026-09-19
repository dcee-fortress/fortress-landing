"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { useProjects } from "@/components/project/ProjectsProvider"
import { useHasHydrated } from "@/hooks/useHasHydrated"
import { ensureDailyFilesThroughToday } from "@/lib/dailyFileSync"

export function useHydratedProjectRoute(projectId, resolveItem) {
  const hasHydrated = useHasHydrated()
  const router = useRouter()
  const { getProject, syncReady } = useProjects()
  const resolveRef = useRef(resolveItem)
  const preparedRef = useRef(new Set())
  const [checked, setChecked] = useState(false)

  resolveRef.current = resolveItem

  useEffect(() => {
    if (!hasHydrated || !projectId) return

    const project = getProject(projectId)
    if (!project) {
      // Wait for cache/Postgres before treating the project as missing.
      if (!syncReady) return
      router.replace("/")
      return
    }

    // Unlock the page immediately; calendar ensure can finish after first paint.
    setChecked(true)

    if (!preparedRef.current.has(projectId)) {
      preparedRef.current.add(projectId)
      queueMicrotask(() => {
        try {
          ensureDailyFilesThroughToday(projectId)
        } catch {
          // Non-blocking; next navigation can retry.
        }
      })
    }
  }, [getProject, hasHydrated, projectId, router, syncReady])

  const project = hasHydrated ? getProject(projectId) : null
  const item =
    hasHydrated && checked && project && resolveRef.current ? resolveRef.current(project) : null

  return {
    isReady: hasHydrated && (checked || Boolean(project)),
    project,
    item,
  }
}
