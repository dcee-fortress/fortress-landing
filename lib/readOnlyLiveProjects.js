import { parseRegistryJson } from "@/lib/projectCalendarEnsure"
import { PROJECTS_REGISTRY_KEY } from "@/lib/sharedStorageMerge"

function projectUpdatedAt(project) {
  return (
    project?.updatedAt ||
    project?.updated_at ||
    project?.createdAt ||
    project?.created_at ||
    "1970-01-01T00:00:00.000Z"
  )
}

/** Shape live shared storage into the SQLite-friendly project rows localhost caches. */
export function projectsFromSharedStorage(storage = {}) {
  const registry = parseRegistryJson(storage[PROJECTS_REGISTRY_KEY])
  return (registry.projects ?? [])
    .filter((project) => project?.id)
    .map((project) => ({
      id: String(project.id),
      data: project,
      updatedAt: projectUpdatedAt(project),
    }))
}
