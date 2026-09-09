import { getCustomProjectById, getCustomProjects, isDeletedProjectId, isEndedProject, PROJECT_STATUS } from "@/lib/projectRegistry"

export const DEFAULT_PROJECT_ID = null

export const PROJECTS = []

export function getProjectById(id) {
  const seeded = PROJECTS.find((project) => project.id === id)
  if (seeded) return seeded

  if (typeof window !== "undefined") {
    if (isDeletedProjectId(id)) return null
    return getCustomProjectById(id)
  }

  return null
}

export function getProjectForRoute(id) {
  const project = getProjectById(id)
  if (project) return project

  // Server pages cannot read the live registry. Allow the client shell to load
  // without inventing a menu project named "Project".
  if (typeof window === "undefined" && typeof id === "string" && id.startsWith("p-")) {
    return { id, name: "", seeded: false, routePlaceholder: true }
  }

  return null
}

export function getMenuProjects() {
  return getAllProjects().filter((project) => {
    if (!project?.id || project.routePlaceholder) return false
    if (isDeletedProjectId(project.id)) return false
    if (isEndedProject(project)) return false
    return project.status !== PROJECT_STATUS.ENDED && project.active !== false
  })
}

export function getAllProjects() {
  const custom = typeof window !== "undefined" ? getCustomProjects() : []
  return [...PROJECTS, ...custom].filter((project) => project?.id && !isDeletedProjectId(project.id))
}

export function isSeededProject(projectId) {
  return PROJECTS.some((project) => project.id === projectId)
}

export function isActiveProject(projectId) {
  if (PROJECTS.some((project) => project.id === projectId)) {
    return true
  }

  if (typeof window !== "undefined") {
    if (isDeletedProjectId(projectId)) return false
    return Boolean(getCustomProjectById(projectId))
  }

  return typeof projectId === "string" && projectId.startsWith("p-")
}
