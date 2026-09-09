"use client"

import Icon from "@/components/icon/icon"
import Link from "next/link"
import { useProjects } from "@/components/project/ProjectsProvider"
import { useHasHydrated } from "@/hooks/useHasHydrated"
import { APP_BRAND } from "@/lib/appBrand"
import { getProjectHomeHref } from "@/lib/projectRoutes"

const START_DATE_MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
]

function formatProjectStartDate(dayId) {
  if (typeof dayId !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(dayId)) return null

  const [year, month, day] = dayId.split("-").map(Number)
  if (!year || !month || !day) return null

  return `${day} ${START_DATE_MONTHS[month - 1]} ${year}`
}

export default function GroveLanding() {
  const hasHydrated = useHasHydrated()
  const { menuProjects } = useProjects()
  const activeProjects = hasHydrated ? menuProjects : []

  if (activeProjects.length === 0) {
    return (
      <div className="app-page-frame flex items-center justify-center text-zinc-900">
        <h1 className="brand-wordmark" aria-label={APP_BRAND}>
          {APP_BRAND}
        </h1>
      </div>
    )
  }

  return (
    <div className="app-page-frame text-zinc-900">
      <div className="app-content-shell space-y-5 lg:space-y-8">
        <ul className="grid grid-cols-1 gap-3 lg:grid-cols-2 lg:gap-4">
          {activeProjects.map((project) => {
            const startedOn = formatProjectStartDate(project.startDate)

            return (
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
                    {startedOn ? (
                      <p className="truncate text-sm text-zinc-500">Started {startedOn}</p>
                    ) : null}
                  </div>
                  <Icon name="chevron-right" size={18} className="shrink-0 text-zinc-400" />
                </Link>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}
