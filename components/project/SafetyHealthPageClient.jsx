"use client"

import { useProjects } from "@/components/project/ProjectsProvider"
import SafetyHealthView from "@/components/project/SafetyHealthView"
import { useHasHydrated } from "@/hooks/useHasHydrated"

export default function SafetyHealthPageClient({ projectId }) {
  const hasHydrated = useHasHydrated()
  const { getProject } = useProjects()
  const project = getProject(projectId)
  // Avoid SSR/client name mismatch before the shared registry is available.
  const projectName = hasHydrated ? project?.name || "Project" : "\u00a0"

  return (
    <div className="app-page-frame text-zinc-900">
      <div className="app-content-shell">
        <SafetyHealthView projectId={projectId} projectName={projectName} />
      </div>
    </div>
  )
}
