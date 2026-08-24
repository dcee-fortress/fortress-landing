"use client"

import { createContext, useCallback, useContext, useMemo, useState } from "react"
import { getAllProjects, getProjectById } from "@/lib/projectList"
import { createCustomProject } from "@/lib/projectRegistry"

const ProjectsContext = createContext(null)

export function ProjectsProvider({ children }) {
  const [version, setVersion] = useState(0)

  const refresh = useCallback(() => {
    setVersion((current) => current + 1)
  }, [])

  const value = useMemo(() => {
    void version

    return {
      version,
      refresh,
      projects: getAllProjects(),
      getProject: (id) => getProjectById(id),
      createProject: async (name, options = {}) => {
        const project = createCustomProject(name, options)
        if (!project) return null

        const [{ ensureHourlyDashboardsForDay }, { ensurePeriodFilesForDay }] = await Promise.all([
          import("@/lib/projectData"),
          import("@/lib/periodFiles"),
        ])

        if (ensureHourlyDashboardsForDay(project.id, project.startDate)) {
          ensurePeriodFilesForDay(project.id, project.startDate)
        }

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
  }, [version, refresh])

  return <ProjectsContext.Provider value={value}>{children}</ProjectsContext.Provider>
}

export function useProjects() {
  const context = useContext(ProjectsContext)
  if (!context) {
    throw new Error("useProjects must be used within ProjectsProvider")
  }
  return context
}
