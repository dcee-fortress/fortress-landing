"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { useProjects } from "@/components/project/ProjectsProvider"
import { useHasHydrated } from "@/hooks/useHasHydrated"
import { ensureDailyFilesThroughToday } from "@/lib/dailyFileSync"

export function useHydratedProjectRoute(projectId, resolveItem) {
  const hasHydrated = useHasHydrated()
  const router = useRouter()
  const { getProject, version } = useProjects()
  const resolveRef = useRef(resolveItem)
  const [item, setItem] = useState(null)
  const [checked, setChecked] = useState(false)

  resolveRef.current = resolveItem

  useEffect(() => {
    if (!hasHydrated || !projectId) return

    ensureDailyFilesThroughToday(projectId)
    const project = getProject(projectId)
    if (!project) {
      router.replace("/")
      return
    }

    setItem(resolveRef.current ? resolveRef.current(project) : true)
    setChecked(true)
  }, [getProject, hasHydrated, projectId, router, version])

  return {
    isReady: hasHydrated && checked,
    project: hasHydrated ? getProject(projectId) : null,
    item,
  }
}
