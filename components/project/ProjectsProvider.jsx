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

  const refresh = useCallback(() => {
    setVersion((current) => current + 1)
  }, [])

  useEffect(() => {
    const stopSharedPersistence = startSharedPersistence()
    const handleSharedStorageChange = () => refresh()

    window.addEventListener("grove-shared-storage-change", handleSharedStorageChange)
    void stopSharedPersistence.ready?.then(() => refresh())
    return () => {
      stopSharedPersistence()
      window.removeEventListener("grove-shared-storage-change", handleSharedStorageChange)
    }
  }, [refresh])

  const value = useMemo(() => {
    void version

    return {
      version,
      refresh,
      projects: hasHydrated ? getAllProjects() : [],
      menuProjects: hasHydrated ? getMenuProjects() : [],
      getProject: (id) => (hasHydrated ? getProjectById(id) : null),
      createProject: async (name, options = {}) => {
        const project = createCustomProject(name, options)
        if (!project) return null

        const [{ ensureHourlyDashboardsForProject }, { ensureDailyFilesThroughToday }] = await Promise.all([
          import("@/lib/projectData"),
          import("@/lib/dailyFileSync"),
        ])

        ensureDailyFilesThroughToday(project.id)
        ensureHourlyDashboardsForProject(project.id)

        refresh()
        return project
      },
      endProject: async (projectId, endDate = null) => {
        const { endGroveProject } = await import("@/lib/groveDatabase")
        const result = endGroveProject(projectId, endDate)
        if (result.ok) refresh()
        return result
      },
    }
  }, [hasHydrated, version, refresh])

  return <ProjectsContext.Provider value={value}>{children}</ProjectsContext.Provider>
}

export function useProjects() {
  const context = useContext(ProjectsContext)
  if (!context) {
    throw new Error("useProjects must be used within ProjectsProvider")
  }
  return context
}
