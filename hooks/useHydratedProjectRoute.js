"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { useProjects } from "@/components/project/ProjectsProvider"
import { useHasHydrated } from "@/hooks/useHasHydrated"
import { ensureDailyFilesThroughToday } from "@/lib/dailyFileSync"

export function useHydratedProjectRoute(projectId, resolveItem) {
  const hasHydrated = useHasHydrated()
  const router = useRouter()
  const { getProject } = useProjects()
  const resolveRef = useRef(resolveItem)
  const preparedRef = useRef(new Set())
  const [checked, setChecked] = useState(false)

  resolveRef.current = resolveItem

  useEffect(() => {
    if (!hasHydrated || !projectId) return

    if (!preparedRef.current.has(projectId)) {
      ensureDailyFilesThroughToday(projectId)
      preparedRef.current.add(projectId)
    }

    const project = getProject(projectId)
    if (!project) {
      router.replace("/")
      return
    }

    setChecked(true)
  }, [getProject, hasHydrated, projectId, router])

  const project = hasHydrated ? getProject(projectId) : null
  const item =
    hasHydrated && checked && project && resolveRef.current ? resolveRef.current(project) : null

  return {
    isReady: hasHydrated && checked,
    project,
    item,
  }
}
