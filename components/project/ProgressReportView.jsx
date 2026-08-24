"use client"

import Icon from "@/components/icon/icon"
import Link from "next/link"
import ReportFileSearchBar, { useReportFileSearch } from "@/components/project/ReportFileSearch"
import { useProjectData } from "@/components/project/ProjectDataProvider"
import {
  getActualProgressUpdateHref,
  getProgressReportFileHref,
  getWeeklyFileHref,
} from "@/lib/projectRoutes"
import { getPlantOnSitePeriodFileHref } from "@/lib/plantOnSiteModules"
import { getProjectProgressReports } from "@/lib/progressReports"
import { isProgressUpdateEmpty, isTargetPlanEmpty } from "@/lib/progressReportDemo"
import { useMemo } from "react"

function getProgressReportFileDescription(_projectId, file) {
  const inProgress = file.status === "in-progress"
  const hasTargetPlan = !isTargetPlanEmpty(file)
  const hasActualProgress = !isProgressUpdateEmpty(file)

  if (inProgress) {
    if (hasTargetPlan) {
      return "In progress · Target plan saved · Actual progress pulls from target plan until edited"
    }

    return "In progress · Target plan and actual progress being prepared"
  }

  if (hasTargetPlan && hasActualProgress) {
    return `Completed ${file.completedAt} · Target plan and actual progress on file`
  }

  return `Completed ${file.completedAt}`
}
function ProgressReportFileRow({ file, projectId }) {
  const inProgress = file.status === "in-progress"
  const description = getProgressReportFileDescription(projectId, file)
  const weeklyValuationHref = getWeeklyFileHref(projectId, file.id)
  const equipmentInUseHref = getPlantOnSitePeriodFileHref(
    projectId,
    "equipment-in-use",
    "weekly",
    file.id
  )

  return (
    <li className="px-6 py-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
            <Icon name="file-text" size={20} />
          </div>
          <div className="min-w-0">
            <p className="text-lg font-semibold text-zinc-900">{file.label}</p>
            <p className="text-sm text-zinc-500">{description}</p>
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
              <Link
                href={weeklyValuationHref}
                prefetch={false}
                className="font-medium text-blue-600 transition hover:text-blue-700 hover:underline"
              >
                Weekly valuation report
              </Link>
              <span className="text-zinc-300">·</span>
              <Link
                href={equipmentInUseHref}
                prefetch={false}
                className="font-medium text-blue-600 transition hover:text-blue-700 hover:underline"
              >
                Weekly equipment in use
              </Link>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <span
            className={`rounded-full px-3 py-1 text-xs font-medium ring-1 ${
              inProgress
                ? "bg-amber-50 text-amber-800 ring-amber-200"
                : "bg-emerald-50 text-emerald-700 ring-emerald-200"
            }`}
          >
            {inProgress ? "In progress" : "Completed"}
          </span>
          <Link
            href={getProgressReportFileHref(projectId, file.id)}
            prefetch={false}
            className="inline-flex items-center gap-1 rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 transition hover:border-zinc-400 hover:bg-zinc-50"
          >
            Target Plan
            <Icon name="chevron-right" size={14} />
          </Link>
          <Link
            href={getActualProgressUpdateHref(projectId, file.id)}
            prefetch={false}
            className="inline-flex items-center gap-1 rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-zinc-800"
          >
            Actual Progress
            <Icon name="chevron-right" size={14} />
          </Link>
        </div>
      </div>
    </li>
  )
}

export default function ProgressReportView({ projectName, projectId }) {
  const { version } = useProjectData()

  const progressReports = useMemo(() => {
    const reports = getProjectProgressReports(projectId)
    return [...reports].sort((a, b) => b.id.localeCompare(a.id))
  }, [projectId, version]) // eslint-disable-line react-hooks/exhaustive-deps -- version refreshes list after saves

  const search = useReportFileSearch(progressReports)
  const displayFiles = search.activeQuery ? search.filteredFiles : progressReports

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="text-sm font-medium uppercase tracking-wide text-zinc-500">
          Progress Reports
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">{projectName}</h1>
        <p className="max-w-2xl text-zinc-500">
          A new weekly progress report is created automatically for each project week, matching the
          valuation weekly files. Open the target plan or actual progress update for each week — both
          duplicate and link to the weekly valuation report and weekly equipment in use.
        </p>
      </header>

      <section className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
        <div className="border-b border-zinc-200 bg-zinc-50 px-6 py-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
            Weekly Progress Reports ({displayFiles.length}
            {search.activeQuery ? ` of ${progressReports.length}` : ""})
          </h2>
        </div>

        <ReportFileSearchBar
          {...search}
          getFileHref={getProgressReportFileHref}
          projectId={projectId}
          placeholder="Search progress reports by week or date…"
        />

        {displayFiles.length > 0 ? (
          <ul className="divide-y divide-zinc-200">
            {displayFiles.map((file) => (
              <ProgressReportFileRow key={file.id} file={file} projectId={projectId} />
            ))}
          </ul>
        ) : (
          <div className="px-6 py-12 text-center text-zinc-500">
            {search.activeQuery
              ? "No progress reports match your search."
              : "No progress reports yet. They will be created automatically each week from project start."}
          </div>
        )}
      </section>
    </div>
  )
}
