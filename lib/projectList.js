import { getCustomProjectById, getCustomProjects } from "@/lib/projectRegistry"

export const DEFAULT_PROJECT_ID = null

export const PROJECTS = []

export function getProjectById(id) {
  const seeded = PROJECTS.find((project) => project.id === id)
  if (seeded) return seeded

  if (typeof window !== "undefined") {
    return getCustomProjectById(id)
  }

  return null
}

export function getProjectForRoute(id) {
  const project = getProjectById(id)
  if (project) return project

  if (id.startsWith("p-")) {
    return { id, name: "Project", active: true, seeded: false }
  }

  return null
}

export function getAllProjects() {
  const custom = typeof window !== "undefined" ? getCustomProjects() : []
  return [...PROJECTS, ...custom]
}

export function isSeededProject(projectId) {
  return PROJECTS.some((project) => project.id === projectId)
}

export function isActiveProject(projectId) {
  if (PROJECTS.some((project) => project.id === projectId)) {
    return true
  }

  if (typeof window !== "undefined") {
    return Boolean(getCustomProjectById(projectId))
  }

  return projectId.startsWith("p-")
}
