"use client"

import Icon from "@/components/icon/icon"
import Link from "next/link"
import { useProjects } from "@/components/project/ProjectsProvider"
import { DASHBOARD_VIEWS, getDashboardHref } from "@/lib/projectRoutes"

const HOME_MENU_VIEWS = ["valuations", "plant-on-site", "progress-reports", "rate-analysis"]

export default function HomeMenu({ projectId }) {
  const { getProject } = useProjects()
  const project = getProject(projectId)

  if (!project) {
    return null
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="space-y-1">
        <p className="text-sm font-medium uppercase tracking-wide text-zinc-500">{project.name}</p>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 sm:text-3xl">
          Select a dashboard
        </h1>
        <p className="text-sm text-zinc-500 sm:text-base">
          Choose a report. Cards scroll with the page on any phone.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
        {HOME_MENU_VIEWS.map((view) => {
          const item = DASHBOARD_VIEWS[view]
          if (!item) return null

          return (
            <Link
              key={view}
              href={getDashboardHref(projectId, view)}
              prefetch={false}
              className="flex min-h-20 touch-manipulation items-start gap-3 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm active:bg-zinc-50 sm:gap-4 sm:p-5"
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-zinc-100 text-zinc-700">
                <Icon name={item.icon} size={22} />
              </div>
              <div className="min-w-0 space-y-1">
                <h2 className="font-semibold text-zinc-900">{item.label}</h2>
                <p className="text-sm leading-relaxed text-zinc-500">{item.description}</p>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
