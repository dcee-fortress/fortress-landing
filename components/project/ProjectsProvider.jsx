"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react"
import { getAllProjects, getMenuProjects, getProjectById } from "@/lib/projectList"
import { createCustomProject } from "@/lib/projectRegistry"
import { startSharedPersistence } from "@/lib/sharedPersistence"
import { useHasHydrated } from "@/hooks/useHasHydrated"

const ProjectsContext = createContext(null)

export function ProjectsProvider({ children }) {
  const hasHydrated = useHasHydrated()
  const [version, setVersion] = useState(0)
  const [syncReady, setSyncReady] = useState(false)

  const refresh = useCallback(() => {
    setVersion((current) => current + 1)
  }, [])

  useEffect(() => {
    const stopSharedPersistence = startSharedPersistence()
    let refreshTimer = 0
    const handleSharedStorageChange = () => {
      window.clearTimeout(refreshTimer)
      refreshTimer = window.setTimeout(() => refresh(), 80)
    }

    window.addEventListener("grove-shared-storage-change", handleSharedStorageChange)
    const timeoutId = window.setTimeout(() => {
      setSyncReady(true)
      refresh()
    }, 8000)
    void stopSharedPersistence.ready?.then(() => {
      window.clearTimeout(timeoutId)
      setSyncReady(true)
      refresh()
    })
    return () => {
      window.clearTimeout(timeoutId)
      window.clearTimeout(refreshTimer)
      stopSharedPersistence()
      window.removeEventListener("grove-shared-storage-change", handleSharedStorageChange)
    }
  }, [refresh])

  const value = useMemo(() => {
    void version

    return {
      version,
      refresh,
      syncReady: hasHydrated && syncReady,
      projects: hasHydrated ? getAllProjects() : [],
      menuProjects: hasHydrated ? getMenuProjects() : [],
      getProject: (id) => (hasHydrated ? getProjectById(id) : null),
      createProject: async (name, options = {}) => {
        try {
          const project = await createCustomProject(name, options)
          if (!project) return null

          const [{ ensureHourlyDashboardsForProject }, { ensureDailyFilesThroughToday }] = await Promise.all([
            import("@/lib/projectData"),
            import("@/lib/dailyFileSync"),
          ])

          ensureDailyFilesThroughToday(project.id)
          ensureHourlyDashboardsForProject(project.id)

          const { isLiveCodeChannel } = await import("@/lib/liveDataConfig")
          if (isLiveCodeChannel()) {
            const { publishSharedKeys } = await import("@/lib/sharedPersistence")
            await publishSharedKeys({ replace: true }).catch(() => {})
          }

          refresh()
          return project
        } finally {
          refresh()
        }
      },
      endProject: async (projectId, endDate = null) => {
        const { endGroveProject } = await import("@/lib/groveDatabase")
        const result = endGroveProject(projectId, endDate)
        if (result.ok) refresh()
        return result
      },
    }
  }, [hasHydrated, syncReady, version, refresh])

  return <ProjectsContext.Provider value={value}>{children}</ProjectsContext.Provider>
}

export function useProjects() {
  const context = useContext(ProjectsContext)
  if (!context) {
    throw new Error("useProjects must be used within ProjectsProvider")
  }
  return context
}
