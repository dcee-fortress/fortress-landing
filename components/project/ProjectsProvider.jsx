"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react"
import { getAllProjects, getMenuProjects, getProjectById } from "@/lib/projectList"
import { createCustomProject } from "@/lib/projectRegistry"
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
    let cancelled = false
    let stopSharedPersistence = () => {}
    let refreshTimer = 0
    let timeoutId = 0

    const handleSharedStorageChange = () => {
      window.clearTimeout(refreshTimer)
      refreshTimer = window.setTimeout(() => refresh(), 80)
    }

    void import("@/lib/sharedPersistence").then(({ startSharedPersistence }) => {
      if (cancelled) return
      // Refresh immediately so session-cache projects appear without waiting.
      refresh()
      stopSharedPersistence = startSharedPersistence()
      window.addEventListener("grove-shared-storage-change", handleSharedStorageChange)
      timeoutId = window.setTimeout(() => {
        setSyncReady(true)
        refresh()
      }, 2500)
      void stopSharedPersistence.ready?.then(() => {
        window.clearTimeout(timeoutId)
        setSyncReady(true)
        refresh()
      })
    })

    return () => {
      cancelled = true
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
        // Fast path: wait only for the project registry write, then return.
        // Calendar/dashboard bootstrap happens in the background so the modal
        // does not sit on "Creating…" for many sequential Postgres posts.
        const project = await createCustomProject(name, options)
        if (!project) return null

        refresh()

        void (async () => {
          try {
            const [
              { ensureHourlyDashboardsForProject },
              { ensureDailyFilesThroughToday },
              { publishProjectListKeys },
            ] = await Promise.all([
              import("@/lib/projectData"),
              import("@/lib/dailyFileSync"),
              import("@/lib/sharedPersistence"),
            ])

            ensureDailyFilesThroughToday(project.id)
            ensureHourlyDashboardsForProject(project.id)
            await publishProjectListKeys()
            refresh()
          } catch {
            // Project already exists in the registry; background sync can retry.
          }
        })()

        return project
      },
      endProject: async (projectId, endDate = null) => {
        const { endGroveProject } = await import("@/lib/groveDatabase")
        const result = await endGroveProject(projectId, endDate)
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
