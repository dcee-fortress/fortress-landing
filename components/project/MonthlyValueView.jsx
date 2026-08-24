"use client"

import { memo, useMemo, useState } from "react"
import Icon from "@/components/icon/icon"
import Link from "next/link"
import ReportFileSearchBar, { useReportFileSearch } from "@/components/project/ReportFileSearch"
import { useProjectData } from "@/components/project/ProjectDataProvider"
import { useHasHydrated } from "@/hooks/useHasHydrated"
import { formatCurrency } from "@/lib/formatCurrency"
import { isMonthlyFileInProgress } from "@/lib/periodFiles"
import { getMonthlyFileHref } from "@/lib/projectRoutes"
import { getMonthlyFiles } from "@/lib/projectFiles"

const INITIAL_VISIBLE_MONTHLY_FILES = 24

const MonthlyFileRow = memo(function MonthlyFileRow({ file, projectId, inProgress, valueEarned }) {
  return (
    <li>
      <Link
        href={getMonthlyFileHref(projectId, file.id)}
        prefetch={false}
        className="group flex flex-wrap items-center justify-between gap-4 px-6 py-4 transition hover:bg-zinc-50"
      >
        <div className="flex min-w-0 items-center gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 transition group-hover:bg-blue-100">
            <Icon name="file-text" size={20} />
          </div>
          <div className="min-w-0">
            <p className="text-lg font-semibold text-zinc-900">{file.label}</p>
            <p className="text-sm text-zinc-500">
              {inProgress
                ? `In progress · Cumulative actual cost ${formatCurrency(valueEarned ?? 0)}`
                : `Completed ${file.completedAt} · Actual cost ${formatCurrency(valueEarned ?? 0)}`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span
            className={`rounded-full px-3 py-1 text-xs font-medium ring-1 ${
              inProgress
                ? "bg-amber-50 text-amber-800 ring-amber-200"
                : "bg-emerald-50 text-emerald-700 ring-emerald-200"
            }`}
          >
            {inProgress ? "In progress" : "Completed"}
          </span>
          <Icon
            name="chevron-right"
            size={18}
            className="text-zinc-400 transition group-hover:text-zinc-600"
          />
        </div>
      </Link>
    </li>
  )
})

export default function MonthlyValueView({ projectName, projectId }) {
  const { version, getMonthValueEarnedByIds } = useProjectData()
  const [showAllFiles, setShowAllFiles] = useState(false)
  const hasHydrated = useHasHydrated()
  const monthlyFiles = useMemo(() => {
    void version
    return getMonthlyFiles(projectId)
  }, [projectId, version])
  const search = useReportFileSearch(monthlyFiles)
  const displayFiles = search.activeQuery ? search.filteredFiles : monthlyFiles
  const visibleFiles = useMemo(() => {
    if (search.activeQuery || showAllFiles) {
      return displayFiles
    }

    return displayFiles.slice(0, INITIAL_VISIBLE_MONTHLY_FILES)
  }, [displayFiles, search.activeQuery, showAllFiles])
  const hiddenFileCount = Math.max(displayFiles.length - visibleFiles.length, 0)

  const rowData = useMemo(() => {
    const monthIds = visibleFiles.map((file) => file.id)
    const valueEarnedByMonthId = hasHydrated ? getMonthValueEarnedByIds(monthIds) : {}

    return visibleFiles.map((file) => {
      const inProgress = isMonthlyFileInProgress(file)
      const valueEarned = hasHydrated
        ? valueEarnedByMonthId[file.id] ?? 0
        : file.valueEarned ?? 0

      return { file, inProgress, valueEarned }
    })
  }, [visibleFiles, hasHydrated, getMonthValueEarnedByIds])

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="text-sm font-medium uppercase tracking-wide text-zinc-500">
          Monthly cost
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">{projectName}</h1>
        <p className="max-w-2xl text-zinc-500">
          Monthly reports roll up from saved hourly dashboards. In-progress months show cumulative
          totals and update each time hourly data is saved.
        </p>
      </header>

      <section className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
        <div className="border-b border-zinc-200 bg-zinc-50 px-6 py-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
            Monthly Files ({visibleFiles.length}
            {hiddenFileCount > 0 ? ` of ${displayFiles.length}` : ""}
            {search.activeQuery ? ` matching of ${monthlyFiles.length}` : ""})
          </h2>
        </div>

        <ReportFileSearchBar
          {...search}
          getFileHref={getMonthlyFileHref}
          projectId={projectId}
          placeholder="Search monthly files by month, year, or id…"
        />

        {rowData.length > 0 ? (
          <>
            <ul className="divide-y divide-zinc-200">
              {rowData.map(({ file, inProgress, valueEarned }) => (
                <MonthlyFileRow
                  key={file.id}
                  file={file}
                  projectId={projectId}
                  inProgress={inProgress}
                  valueEarned={valueEarned}
                />
              ))}
            </ul>
            {hiddenFileCount > 0 ? (
              <div className="border-t border-zinc-200 bg-zinc-50 px-6 py-4">
                <button
                  type="button"
                  onClick={() => setShowAllFiles(true)}
                  className="text-sm font-medium text-zinc-700 transition hover:text-zinc-900"
                >
                  Show all {displayFiles.length} monthly files
                </button>
              </div>
            ) : null}
          </>
        ) : (
          <div className="px-6 py-12 text-center text-zinc-500">
            {search.activeQuery
              ? "No monthly files match your search."
              : "No completed monthly files yet."}
          </div>
        )}
      </section>
    </div>
  )
}
