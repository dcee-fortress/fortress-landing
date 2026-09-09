"use client"

import ChoiceCard from "@/components/project/ChoiceCard"
import PageLoadingShell from "@/components/project/PageLoadingShell"
import { useProjects } from "@/components/project/ProjectsProvider"
import { useHasHydrated } from "@/hooks/useHasHydrated"
import { isDeletedProjectId } from "@/lib/projectRegistry"
import { DASHBOARD_VIEWS, getDashboardHref } from "@/lib/projectRoutes"

const HOME_MENU_VIEWS = ["valuations", "plant-on-site", "progress-reports", "rate-analysis"]

export default function HomeMenu({ projectId }) {
  const hasHydrated = useHasHydrated()
  const { getProject } = useProjects()
  const project = getProject(projectId)
  const deleted = hasHydrated && isDeletedProjectId(projectId)

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
          Select a dashboard
        </h1>
        <p className="text-sm text-zinc-500 sm:text-base">
          Choose a report. Lists and cards scroll with the page on phones and desktops.
        </p>
      </header>

      <div className="app-choice-grid">
        {HOME_MENU_VIEWS.map((view) => {
          const item = DASHBOARD_VIEWS[view]
          if (!item) return null

          return (
            <ChoiceCard
              key={view}
              href={getDashboardHref(projectId, view)}
              icon={item.icon}
              title={item.label}
              description={item.description}
            />
          )
        })}
      </div>
    </div>
  )
}
