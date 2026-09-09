"use client"

import Icon from "@/components/icon/icon"
import Link from "next/link"
import { useProjects } from "@/components/project/ProjectsProvider"
import { useHasHydrated } from "@/hooks/useHasHydrated"
import { APP_BRAND } from "@/lib/appBrand"
import { getProjectHomeHref } from "@/lib/projectRoutes"
import { isEndedProject } from "@/lib/projectRegistry"

export default function GroveLanding() {
  const hasHydrated = useHasHydrated()
  const { menuProjects, projects, syncReady } = useProjects()
  const activeProjects = menuProjects
  const hasEndedProjects = projects.some((project) => isEndedProject(project))

  return (
    <div className="app-page-frame text-zinc-900">
      <div className="app-content-shell space-y-5 lg:space-y-8">
        <header className="space-y-1">
          <p className="text-sm font-medium uppercase tracking-wide text-zinc-500">Projects</p>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 sm:text-3xl lg:text-4xl">
            {APP_BRAND}
          </h1>
          <p className="text-sm text-zinc-500 sm:text-base">
            Open a live project. Data entered on any device with the public link is the same data
            shown here.
          </p>
        </header>

        {activeProjects.length > 0 ? (
          <ul className="grid grid-cols-1 gap-3 lg:grid-cols-2 lg:gap-4">
            {activeProjects.map((project) => (
              <li key={project.id}>
                <Link
                  href={getProjectHomeHref(project.id)}
                  prefetch={false}
                  className="app-choice-card items-center"
                >
                  <div className="app-icon-tile app-icon-tile--neutral">
                    <Icon name="hard-hat" size={22} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-base font-semibold text-zinc-900 lg:text-lg">{project.name}</p>
                    <p className="truncate text-sm text-zinc-500">Open dashboards</p>
                  </div>
                  <Icon name="chevron-right" size={18} className="shrink-0 text-zinc-400" />
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-zinc-500 sm:text-base">
            {!hasHydrated ? (
              "Loading live projects…"
            ) : menuProjects.length === 0 && !syncReady ? (
              "Loading live projects…"
            ) : hasEndedProjects ? (
              <>
                No active projects. Ended projects are in{" "}
                <Link href="/settings" className="font-medium text-zinc-800 underline">
                  Settings
                </Link>
                .
              </>
            ) : (
              "No projects yet. Use New project to create one."
            )}
          </p>
        )}
      </div>
    </div>
  )
}
