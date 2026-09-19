"use client"

import { useMemo } from "react"
import Link from "next/link"
import Icon from "@/components/icon/icon"
import PpeReceivedDashboardTable from "@/components/project/PpeReceivedDashboardTable"
import { useHasHydrated } from "@/hooks/useHasHydrated"
import { useProjects } from "@/components/project/ProjectsProvider"
import {
  getPpeReceivedDashboardLinesForDayIds,
  getPpeReceivedDayIds,
  getPpeReceivedDayIdsInMonth,
  getPpeReceivedDayIdsInWeek,
} from "@/lib/ppeReceived"
import { getMonthlyFiles, getWeeklyFiles } from "@/lib/projectFiles"
import { getPpeReceivedHref } from "@/lib/projectRoutes"

export default function PpeReceivedRollupView({
  projectId,
  projectName,
  title,
  description,
  mode,
}) {
  const hasHydrated = useHasHydrated()
  const { version } = useProjects()
  void version

  const periods = useMemo(() => {
    if (!hasHydrated) return []

    if (mode === "project-to-date") {
      const dayIds = getPpeReceivedDayIds(projectId)
      return [
        {
          id: "project-to-date",
          label: "Project to date",
          dayIds,
          lines: getPpeReceivedDashboardLinesForDayIds(projectId, dayIds),
        },
      ]
    }

    const files = mode === "weekly" ? getWeeklyFiles(projectId) : getMonthlyFiles(projectId)

    return files
      .map((file) => {
        const dayIds =
          mode === "weekly"
            ? getPpeReceivedDayIdsInWeek(projectId, file.id)
            : getPpeReceivedDayIdsInMonth(projectId, file.id)
        return {
          id: file.id,
          label: file.label,
          dayIds,
          lines: getPpeReceivedDashboardLinesForDayIds(projectId, dayIds),
        }
      })
      .filter((period) => period.lines.length > 0 || period.dayIds.length > 0)
  }, [hasHydrated, mode, projectId, version])

  const visiblePeriods =
    periods.length > 0 ? periods.filter((period) => period.lines.length > 0) : []

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <Link
          href={getPpeReceivedHref(projectId)}
          className="inline-flex items-center gap-1 text-sm font-medium text-zinc-500 transition hover:text-zinc-800"
        >
          <Icon name="arrow-left" size={16} />
          Back to PPE received
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
      ) : visiblePeriods.length === 0 ? (
        <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
          <div className="border-b border-zinc-200 px-4 py-3 sm:px-5">
            <h2 className="text-base font-semibold text-zinc-900">PPE received table</h2>
          </div>
          <PpeReceivedDashboardTable
            lines={[]}
            emptyMessage="No PPE received in this period yet. Add entries on daily PPE received."
          />
        </section>
      ) : (
        <div className="space-y-4">
          {visiblePeriods.map((period) => (
            <section
              key={period.id}
              className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm"
            >
              <div className="border-b border-zinc-200 px-4 py-3 sm:px-5">
                <h2 className="text-base font-semibold text-zinc-900">{period.label}</h2>
                <p className="mt-0.5 text-sm text-zinc-500">
                  Rolled up from daily PPE received entry · matching descriptions combined
                </p>
              </div>
              <PpeReceivedDashboardTable lines={period.lines} />
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
