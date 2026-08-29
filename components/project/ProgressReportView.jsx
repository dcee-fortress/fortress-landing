"use client"

import Icon from "@/components/icon/icon"
import Link from "next/link"
import ReportFileSearchBar, { useReportFileSearch } from "@/components/project/ReportFileSearch"
import { useProjectData } from "@/components/project/ProjectDataProvider"
import {
  getActualProgressUpdateHref,
  getDailyProgressReportFileHref,
  getWeeklyProgressReportFileHref,
  getWeeklyFileHref,
} from "@/lib/projectRoutes"
import { getPlantOnSitePeriodFileHref } from "@/lib/plantOnSiteModules"
import {
  getProjectDailyProgressReports,
  getProjectWeeklyProgressReports,
} from "@/lib/progressReports"
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
function ProgressReportFileRow({ file, projectId, reportType }) {
  const inProgress = file.status === "in-progress"
  const description = getProgressReportFileDescription(projectId, file)
  const reportFileHref = reportType === "daily"
    ? getDailyProgressReportFileHref(projectId, file.id)
    : getWeeklyProgressReportFileHref(projectId, file.id)
  const actualHref = reportType === "daily"
    ? getActualProgressUpdateHref(projectId, file.id)
    : `${reportFileHref}/actual-progress-update`
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
            href={reportFileHref}
            prefetch={false}
            className="inline-flex items-center gap-1 rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 transition hover:border-zinc-400 hover:bg-zinc-50"
          >
            Target Plan
            <Icon name="chevron-right" size={14} />
          </Link>
          <Link
            href={actualHref}
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

function ReportTypeSelector({ projectName, onSelect }) {
  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="text-sm font-medium uppercase tracking-wide text-zinc-500">
          Progress Reports
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">{projectName}</h1>
        <p className="max-w-2xl text-zinc-500">
          Choose a report interval to search saved files and open the target plan or actual progress.
        </p>
      </header>

      <section className="grid gap-4 md:grid-cols-2">
        <button
          type="button"
          onClick={() => onSelect("daily")}
          className="group rounded-xl border border-zinc-200 bg-white p-6 text-left shadow-sm transition hover:border-amber-300 hover:shadow-md"
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
            <Icon name="clock" size={20} />
          </span>
          <span className="mt-4 block text-lg font-semibold text-zinc-900">Daily Report Files</span>
          <span className="mt-1 block text-sm text-zinc-500">
            Search by day or date, then open the target plan or actual progress.
          </span>
          <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-zinc-700">
            Open daily reports <Icon name="arrow-right" size={14} />
          </span>
        </button>
        <button
          type="button"
          onClick={() => onSelect("weekly")}
          className="group rounded-xl border border-zinc-200 bg-white p-6 text-left shadow-sm transition hover:border-violet-300 hover:shadow-md"
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-violet-50 text-violet-600">
            <Icon name="calendar-range" size={20} />
          </span>
          <span className="mt-4 block text-lg font-semibold text-zinc-900">Weekly Report Files</span>
          <span className="mt-1 block text-sm text-zinc-500">
            Search by week range, then open the target plan or actual progress.
          </span>
          <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-zinc-700">
            Open weekly reports <Icon name="arrow-right" size={14} />
          </span>
        </button>
      </section>
    </div>
  )
}

function ProgressReportFiles({ projectName, projectId, reportType, onSelectType }) {
  const { version } = useProjectData()

  const progressReports = useMemo(() => {
    const reports = reportType === "daily"
      ? getProjectDailyProgressReports(projectId)
      : getProjectWeeklyProgressReports(projectId)
    return [...reports].sort((a, b) => b.id.localeCompare(a.id))
  }, [projectId, reportType, version]) // eslint-disable-line react-hooks/exhaustive-deps -- version refreshes list after saves

  const search = useReportFileSearch(progressReports)
  const displayFiles = search.activeQuery ? search.filteredFiles : progressReports

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="text-sm font-medium uppercase tracking-wide text-zinc-500">
          Progress Reports
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">{projectName}</h1>
        <div className="flex flex-wrap items-center gap-3">
          <p className="max-w-2xl text-zinc-500">
          {reportType === "daily"
            ? "A daily report file is created automatically for each project day. Search by date or day id to reopen saved target and actual progress."
            : "Weekly reports roll up the same target and actual progress workflow into 7-day project intervals."}
          </p>
          <button
            type="button"
            onClick={() => onSelectType?.(null)}
            className="inline-flex items-center gap-1 rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 transition hover:bg-zinc-50"
          >
            Change interval
            <Icon name="arrow-left" size={14} />
          </button>
        </div>
      </header>

      <section className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
        <div className="border-b border-zinc-200 bg-zinc-50 px-6 py-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
            {reportType === "daily" ? "Daily Report Files" : "Weekly Report Files"} ({displayFiles.length}
            {search.activeQuery ? ` of ${progressReports.length}` : ""})
          </h2>
        </div>

        <ReportFileSearchBar
          {...search}
          getFileHref={reportType === "daily" ? getDailyProgressReportFileHref : getWeeklyProgressReportFileHref}
          projectId={projectId}
          placeholder={reportType === "daily" ? "Search daily reports by date or id…" : "Search weekly reports by range or id…"}
        />

        {displayFiles.length > 0 ? (
          <ul className="divide-y divide-zinc-200">
              {displayFiles.map((file) => (
                <ProgressReportFileRow key={file.id} file={file} projectId={projectId} reportType={reportType} />
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

export default function ProgressReportView({ projectName, projectId, reportType = null, onSelectType }) {
  if (!reportType) {
    return <ReportTypeSelector projectName={projectName} onSelect={onSelectType} />
  }

  return (
    <ProgressReportFiles
      projectName={projectName}
      projectId={projectId}
      reportType={reportType}
      onSelectType={onSelectType}
    />
  )
}
