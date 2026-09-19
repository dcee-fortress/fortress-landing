"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import ChoiceCard from "@/components/project/ChoiceCard"
import PageLoadingShell from "@/components/project/PageLoadingShell"
import { useProjects } from "@/components/project/ProjectsProvider"
import { useHasHydrated } from "@/hooks/useHasHydrated"
import { isDeletedProjectId } from "@/lib/projectRegistry"
import { PROJECT_HOME_HUBS, getDashboardHref } from "@/lib/projectRoutes"

export default function HomeMenu({ projectId }) {
  const hasHydrated = useHasHydrated()
  const router = useRouter()
  const { getProject } = useProjects()
  const project = getProject(projectId)
  const deleted = hasHydrated && isDeletedProjectId(projectId)

  useEffect(() => {
    if (!projectId) return
    // Warm hub routes so Finance / QS / Safety open without a compile wait.
    for (const hub of PROJECT_HOME_HUBS) {
      try {
        router.prefetch(getDashboardHref(projectId, hub.view))
      } catch {
        // Prefetch is best-effort.
      }
    }
  }, [projectId, router])

  if (deleted) {
    return (
      <div className="app-content-shell">
        <p className="text-sm text-zinc-500">This project was permanently deleted and will not return.</p>
      </div>
    )
  }

  if (!hasHydrated) {
    return <PageLoadingShell />
  }

  if (!project) {
    return (
      <div className="app-content-shell">
        <p className="text-sm text-zinc-500">This project is not available.</p>
      </div>
    )
  }

  return (
    <div className="app-content-shell flex flex-col gap-6">
      <header className="space-y-1">
        <p className="text-sm font-medium uppercase tracking-wide text-zinc-500">{project.name}</p>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 sm:text-3xl lg:text-4xl">
          Select a department
        </h1>
        <p className="text-sm text-zinc-500 sm:text-base">
          Open QS &amp; Engineering for current project tools, or Finance and Safety &amp; Health for
          upcoming modules.
        </p>
      </header>

      <div className="app-choice-grid">
        {PROJECT_HOME_HUBS.map((hub) => (
          <ChoiceCard
            key={hub.view}
            href={getDashboardHref(projectId, hub.view)}
            icon={hub.icon}
            iconClassName={hub.iconClassName}
            title={hub.label}
            description={hub.description}
          />
        ))}
      </div>
    </div>
  )
}
