"use client"

import { memo, useMemo, useState } from "react"
import Icon from "@/components/icon/icon"
import Link from "next/link"
import ReportFileSearchBar, { useReportFileSearch } from "@/components/project/ReportFileSearch"
import { useProjectData } from "@/components/project/ProjectDataProvider"
import { useProjects } from "@/components/project/ProjectsProvider"
import { useHasHydrated } from "@/hooks/useHasHydrated"
import {
  getDailyFileEntryStatus,
  getDailyFileEntryStatusForSsr,
  getDailyFileRowValueEarnedForSsr,
} from "@/lib/dailyFileSync"
import { deleteDailyValuationFile } from "@/lib/dailyValuationDelete"
import { formatCurrency } from "@/lib/formatCurrency"
import { getProjectStoreDayIds } from "@/lib/periodFiles"
import { getDailyFileHref } from "@/lib/projectRoutes"
import { getDailyFiles } from "@/lib/projectFiles"

const INITIAL_VISIBLE_DAILY_FILES = 90

const STATUS_STYLES = {
  awaiting: "bg-sky-50 text-sky-800 ring-sky-200",
  "in-progress": "bg-amber-50 text-amber-800 ring-amber-200",
  completed: "bg-emerald-50 text-emerald-700 ring-emerald-200",
}

const DailyFileRow = memo(function DailyFileRow({
  file,
  projectId,
  status,
  valueEarned,
  deleting,
  onDelete,
}) {
  return (
    <li className="flex items-stretch">
      <Link
        href={getDailyFileHref(projectId, file.id)}
        prefetch={false}
        className="app-file-row group min-w-0 flex-1 transition hover:bg-zinc-50"
      >
        <div className="flex min-w-0 items-center gap-3 sm:gap-4">
          <div className="app-icon-tile app-icon-tile--amber">
            <Icon name="file-text" size={20} />
          </div>
          <div className="min-w-0">
            <p className="truncate text-base font-semibold text-zinc-900 sm:text-lg">{file.label}</p>
            <p className="text-sm text-zinc-500">
              {status.key === "awaiting"
                ? status.description
                : `${status.description} · Actual cost ${formatCurrency(valueEarned ?? 0)}`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span
            className={`rounded-full px-3 py-1 text-xs font-medium ring-1 ${STATUS_STYLES[status.key]}`}
          >
            {status.label}
          </span>
          <Icon
            name="chevron-right"
            size={18}
            className="text-zinc-400 transition group-hover:text-zinc-600"
          />
        </div>
      </Link>

      <button
        type="button"
        aria-label={`Delete ${file.label}`}
        title="Delete daily file"
        disabled={deleting}
        onClick={(event) => {
          event.preventDefault()
          event.stopPropagation()
          onDelete(file)
        }}
        className="inline-flex shrink-0 items-center justify-center border-l border-zinc-200 px-3 text-zinc-400 transition hover:bg-rose-50 hover:text-rose-600 disabled:cursor-wait disabled:opacity-60 sm:px-4"
      >
        <Icon name="trash-2" size={18} />
      </button>
    </li>
  )
})

export default function DailyValueView({ projectName, projectId }) {
  const { version, getDayValueEarnedByIds, refresh } = useProjectData()
  const { refresh: refreshProjects } = useProjects()
  const [showAllFiles, setShowAllFiles] = useState(false)
  const [deletingDayId, setDeletingDayId] = useState("")
  const hasHydrated = useHasHydrated()

  const savedDayIds = useMemo(() => {
    if (!hasHydrated) return new Set()
    void version
    return new Set(getProjectStoreDayIds(projectId))
  }, [projectId, version, hasHydrated])
  const dailyFiles = useMemo(() => {
    void version
    if (!hasHydrated) return []
    return getDailyFiles(projectId)
  }, [projectId, version, hasHydrated])
  const search = useReportFileSearch(dailyFiles)
  const displayFiles = search.activeQuery ? search.filteredFiles : dailyFiles
  const visibleFiles = useMemo(() => {
    if (search.activeQuery || showAllFiles) {
      return displayFiles
    }

    return displayFiles.slice(0, INITIAL_VISIBLE_DAILY_FILES)
  }, [displayFiles, search.activeQuery, showAllFiles])
  const hiddenFileCount = Math.max(displayFiles.length - visibleFiles.length, 0)

  const rowData = useMemo(() => {
    const dayIds = visibleFiles.map((file) => file.id)
    const valueEarnedByDayId = hasHydrated ? getDayValueEarnedByIds(dayIds) : {}

    return visibleFiles.map((file) => {
      const status = hasHydrated
        ? getDailyFileEntryStatus(projectId, file, savedDayIds)
        : getDailyFileEntryStatusForSsr(file)

      const valueEarned = hasHydrated
        ? status.key === "awaiting"
          ? null
          : valueEarnedByDayId[file.id] ?? 0
        : getDailyFileRowValueEarnedForSsr(file)

      return { file, status, valueEarned }
    })
  }, [visibleFiles, hasHydrated, projectId, savedDayIds, getDayValueEarnedByIds])

  async function handleDeleteDailyFile(file) {
    const confirmed = window.confirm(
      `Delete "${file.label}" from daily valuations?\n\nThis removes the day from weekly, monthly, and project-to-date rollups. This cannot be undone.`
    )
    if (!confirmed) return

    setDeletingDayId(file.id)
    try {
      const result = await deleteDailyValuationFile(projectId, file.id)
      if (!result.ok) {
        window.alert(result.message || "Could not delete this daily file.")
        return
      }
      refresh()
      refreshProjects()
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Could not delete this daily file.")
    } finally {
      setDeletingDayId("")
    }
  }

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="text-sm font-medium uppercase tracking-wide text-zinc-500">
          Daily cost
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">{projectName}</h1>
        <p className="max-w-2xl text-zinc-500">
          Daily files are created from the project start date through today. Open any day to enter
          or edit hourly dashboards and material schedules.
        </p>
      </header>

      <section className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
        <div className="border-b border-zinc-200 bg-zinc-50 px-6 py-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
            Daily Files ({visibleFiles.length}
            {hiddenFileCount > 0 ? ` of ${displayFiles.length}` : ""}
            {search.activeQuery ? ` matching of ${dailyFiles.length}` : ""})
          </h2>
        </div>

        <ReportFileSearchBar
          {...search}
          getFileHref={getDailyFileHref}
          projectId={projectId}
          placeholder="Search daily files by day, date, or id…"
        />

        {rowData.length > 0 ? (
          <>
            <ul className="divide-y divide-zinc-200">
              {rowData.map(({ file, status, valueEarned }) => (
                <DailyFileRow
                  key={file.id}
                  file={file}
                  projectId={projectId}
                  status={status}
                  valueEarned={valueEarned}
                  deleting={deletingDayId === file.id}
                  onDelete={handleDeleteDailyFile}
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
                  Show all {displayFiles.length} daily files
                </button>
              </div>
            ) : null}
          </>
        ) : (
          <div className="px-6 py-12 text-center text-zinc-500">
            {search.activeQuery ? "No daily files match your search." : "No daily files yet."}
          </div>
        )}
      </section>
    </div>
  )
}
