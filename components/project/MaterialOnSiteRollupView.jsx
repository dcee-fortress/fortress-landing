"use client"

import { useMemo } from "react"
import Link from "next/link"
import Icon from "@/components/icon/icon"
import MaterialOnSiteTable from "@/components/project/MaterialOnSiteTable"
import { useMaterialOnSiteVersion } from "@/hooks/useMaterialOnSiteVersion"
import { useHasHydrated } from "@/hooks/useHasHydrated"
import { useProjects } from "@/components/project/ProjectsProvider"
import {
  getMaterialOnSiteProjectDayIds,
  getMaterialOnSiteRows,
  getMaterialOnSiteYearDayIds,
  getMaterialOnSiteYears,
} from "@/lib/materialOnSite"
import { getMaterialOnSiteHref } from "@/lib/projectRoutes"
import { mergeSimilarSiteRows } from "@/lib/similarDescriptions"

export default function MaterialOnSiteRollupView({
  projectId,
  projectName,
  title,
  description,
  mode,
}) {
  const hasHydrated = useHasHydrated()
  const { version } = useProjects()
  const entryVersion = useMaterialOnSiteVersion()
  void version
  void entryVersion

  const periods = useMemo(() => {
    if (!hasHydrated) return []

    if (mode === "project-to-date") {
      const years = getMaterialOnSiteYears(projectId)
      const yearPeriods = years.map((year) => ({
        id: year,
        label: `${year} cumulative`,
        detail:
          "Each description shows its cumulative quantity for this year. Similar descriptions are written as one.",
        rows: mergeSimilarSiteRows(
          getMaterialOnSiteRows(projectId, getMaterialOnSiteYearDayIds(projectId, year))
        ),
      }))
      const projectRows = getMaterialOnSiteRows(
        projectId,
        getMaterialOnSiteProjectDayIds(projectId)
      )
      if (years.length <= 1) {
        return [
          {
            id: "project-to-date",
            label: years[0] ? `${years[0]} · project to date` : "Project to date",
            detail:
              "Each description shows its cumulative quantity from the project start through today. Similar descriptions are written as one.",
            rows: mergeSimilarSiteRows(projectRows),
          },
        ]
      }
      return [
        ...yearPeriods,
        {
          id: "project-to-date",
          label: "Project to date",
          detail:
            "Each description shows its cumulative quantity for the whole project. Similar descriptions are written as one.",
          rows: mergeSimilarSiteRows(projectRows),
        },
      ]
    }

    return []
  }, [hasHydrated, mode, projectId, version, entryVersion])

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <Link
          href={getMaterialOnSiteHref(projectId)}
          className="inline-flex items-center gap-1 text-sm font-medium text-zinc-500 transition hover:text-zinc-800"
        >
          <Icon name="arrow-left" size={16} />
          Back to Fuel on site
        </Link>
        <p className="text-sm font-medium uppercase tracking-wide text-zinc-500">{title}</p>
        <h1
          suppressHydrationWarning
          className="text-2xl font-semibold tracking-tight text-zinc-900 sm:text-3xl lg:text-4xl"
        >
          {projectName || "Project"}
        </h1>
        <p className="max-w-2xl text-sm text-zinc-500 sm:text-base">{description}</p>
      </header>

      {!hasHydrated ? (
        <p className="text-sm text-zinc-500">Loading…</p>
      ) : periods.length === 0 ? (
        <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
          <MaterialOnSiteTable
            rows={[]}
            emptyMessage="No goods received in this period yet."
          />
        </section>
      ) : (
        <div className="space-y-4">
          {periods.map((period) => (
            <section
              key={period.id}
              className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm"
            >
              <div className="border-b border-zinc-200 px-4 py-3 sm:px-5">
                <h2 className="text-base font-semibold text-zinc-900">{period.label}</h2>
                <p className="mt-0.5 text-sm text-zinc-500">{period.detail}</p>
              </div>
              <MaterialOnSiteTable
                rows={period.rows}
                emptyMessage="No goods received in this period yet."
              />
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
