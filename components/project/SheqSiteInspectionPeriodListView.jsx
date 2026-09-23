"use client"

import { memo, useEffect, useMemo, useState } from "react"
import Icon from "@/components/icon/icon"
import Link from "next/link"
import FileListContextMenu from "@/components/project/FileListContextMenu"
import ReportFileSearchBar, { useReportFileSearch } from "@/components/project/ReportFileSearch"
import RestrictedAreaLoginDialog from "@/components/project/RestrictedAreaLoginDialog"
import { useProjects } from "@/components/project/ProjectsProvider"
import { useDragFileSelection } from "@/hooks/useDragFileSelection"
import { useFileDeleteAuth } from "@/hooks/useFileDeleteAuth"
import { useHasHydrated } from "@/hooks/useHasHydrated"
import { ensureDailyFilesThroughToday } from "@/lib/dailyFileSync"
import { unlockPpeEntry, validateSafetyHealthCredentials } from "@/lib/ppeEntryAuth"
import {
  SHEQ_ALERT_KIND_INSPECTION,
  getSheqAlertWeekUsage,
} from "@/lib/sheqHomeAlerts"
import {
  deleteSheqSiteInspectionFile,
  getSheqSiteInspectionEntryStatus,
  getSheqSiteInspectionPeriodFiles,
} from "@/lib/sheqSiteInspection"
import {
  getSheqSiteInspectionFileHref,
  getSheqSiteInspectionReportHref,
} from "@/lib/projectRoutes"
import { isMonthlyFileInProgress, isWeeklyFileInProgress } from "@/lib/periodFiles"

const STATUS_STYLES = {
  awaiting: "bg-sky-50 text-sky-800 ring-sky-200",
  "in-progress": "bg-amber-50 text-amber-800 ring-amber-200",
  completed: "bg-emerald-50 text-emerald-700 ring-emerald-200",
}

const PERIOD_LABELS = {
  daily: "Daily",
  weekly: "Weekly",
  monthly: "Monthly",
}

function isPeriodInProgress(period, file) {
  if (period === "weekly") return isWeeklyFileInProgress(file)
  if (period === "monthly") return isMonthlyFileInProgress(file)
  return true
}

const InspectionFileRow = memo(function InspectionFileRow({
  file,
  projectId,
  period,
  status,
  selected,
  deleting,
  onDelete,
  onMouseDown,
  onMouseEnter,
  onMouseMove,
  onClickCapture,
  onContextMenu,
}) {
  const inProgress = isPeriodInProgress(period, file)
  return (
    <li
      data-file-id={file.id}
      className={`flex items-stretch select-none ${selected ? "bg-sky-50" : ""}`}
      onMouseDown={(event) => onMouseDown(event, file.id)}
      onMouseEnter={(event) => onMouseEnter(event, file.id)}
      onMouseMove={(event) => onMouseMove(event, file.id)}
      onContextMenu={(event) => onContextMenu(event, file.id)}
    >
      <Link
        href={getSheqSiteInspectionFileHref(projectId, period, file.id)}
        prefetch={false}
        onClickCapture={onClickCapture}
        className={`app-file-row group min-w-0 flex-1 transition ${
          selected ? "hover:bg-sky-50" : "hover:bg-zinc-50"
        }`}
      >
        <div className="flex min-w-0 items-center gap-3 sm:gap-4">
          <div className="app-icon-tile app-icon-tile--blue">
            <Icon name="file-text" size={20} />
          </div>
          <div className="min-w-0">
            <p className="truncate text-base font-semibold text-zinc-900 sm:text-lg">
              {file.label}
            </p>
            <p className="text-sm text-zinc-500">{status.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span
            className={`rounded-full px-3 py-1 text-xs font-medium ring-1 ${
              STATUS_STYLES[status.key] ||
              (inProgress ? STATUS_STYLES["in-progress"] : STATUS_STYLES.completed)
            }`}
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
        title="Delete site inspection file"
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

export default function SheqSiteInspectionPeriodListView({ projectId, projectName, period }) {
  const hasHydrated = useHasHydrated()
  const { version, refresh } = useProjects()
  const [showAll, setShowAll] = useState(false)
  const [deletingId, setDeletingId] = useState("")
  const [bulkDeleting, setBulkDeleting] = useState(false)
  const [weekUsage, setWeekUsage] = useState({
    used: 0,
    remaining: 5,
    limit: 5,
  })
  const deleteAuth = useFileDeleteAuth()

  useEffect(() => {
    if (!hasHydrated || !projectId || period !== "daily") return
    if (ensureDailyFilesThroughToday(projectId)) refresh()
  }, [hasHydrated, period, projectId, refresh])

  useEffect(() => {
    if (!hasHydrated || !projectId) return
    setWeekUsage(getSheqAlertWeekUsage(projectId, SHEQ_ALERT_KIND_INSPECTION))
  }, [hasHydrated, projectId, version])

  useEffect(() => {
    if (!hasHydrated || !projectId) return undefined
    const onStorage = () => {
      setWeekUsage(getSheqAlertWeekUsage(projectId, SHEQ_ALERT_KIND_INSPECTION))
      refresh()
    }
    window.addEventListener("grove-shared-storage-change", onStorage)
    window.addEventListener("sheq-home-alert", onStorage)
    return () => {
      window.removeEventListener("grove-shared-storage-change", onStorage)
      window.removeEventListener("sheq-home-alert", onStorage)
    }
  }, [hasHydrated, projectId, refresh])

  const files = useMemo(() => {
    if (!hasHydrated) return []
    void version
    return getSheqSiteInspectionPeriodFiles(projectId, period)
  }, [hasHydrated, period, projectId, version])

  const search = useReportFileSearch(files)
  const displayFiles = search.activeQuery ? search.filteredFiles : files
  const visibleFiles = useMemo(() => {
    if (search.activeQuery || showAll) return displayFiles
    return displayFiles.slice(0, period === "daily" ? 21 : 12)
  }, [displayFiles, period, search.activeQuery, showAll])
  const hiddenCount = Math.max(displayFiles.length - visibleFiles.length, 0)
  const visibleIds = useMemo(() => visibleFiles.map((file) => file.id), [visibleFiles])
  const selection = useDragFileSelection(visibleIds)

  async function performDeleteFile(file) {
    const confirmed = window.confirm(
      `Delete "${file.label}" from ${PERIOD_LABELS[period] || period} site inspection?\n\nAlerts from this file are restored to this week's quota. You can restore the file from Settings → Recycle files for 90 days.`
    )
    if (!confirmed) return

    setDeletingId(file.id)
    try {
      const result = await deleteSheqSiteInspectionFile(projectId, period, file.id, file.label)
      if (!result.ok) {
        window.alert(result.message || "Could not delete this file.")
        return
      }
      setWeekUsage(getSheqAlertWeekUsage(projectId, SHEQ_ALERT_KIND_INSPECTION))
      refresh()
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Could not delete this file.")
    } finally {
      setDeletingId("")
    }
  }

  function handleDeleteFile(file) {
    deleteAuth.requestDeleteAuth(() => {
      void performDeleteFile(file)
    })
  }

  async function performDeleteSelected() {
    const ids = [...selection.selectedIds]
    selection.closeContextMenu()
    if (ids.length === 0) return

    const confirmed = window.confirm(
      ids.length === 1
        ? `Delete this site inspection file?\n\nAlerts from this file are restored to this week's quota.`
        : `Delete ${ids.length} site inspection files?\n\nAlerts from these files are restored to this week's quota.`
    )
    if (!confirmed) return

    setBulkDeleting(true)
    try {
      for (const fileId of ids) {
        const file = files.find((item) => item.id === fileId)
        const result = await deleteSheqSiteInspectionFile(
          projectId,
          period,
          fileId,
          file?.label || fileId
        )
        if (!result.ok) {
          window.alert(result.message || `Could not delete ${fileId}.`)
          break
        }
      }
      selection.clearSelection()
      setWeekUsage(getSheqAlertWeekUsage(projectId, SHEQ_ALERT_KIND_INSPECTION))
      refresh()
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Could not delete the selected files.")
    } finally {
      setBulkDeleting(false)
    }
  }

  function handleDeleteSelected() {
    selection.closeContextMenu()
    deleteAuth.requestDeleteAuth(() => {
      void performDeleteSelected()
    })
  }

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <Link
          href={getSheqSiteInspectionReportHref(projectId)}
          className="inline-flex items-center gap-1 text-sm font-medium text-zinc-500 transition hover:text-zinc-800"
        >
          <Icon name="arrow-left" size={16} />
          Back to SHEQ site inspection
        </Link>
        <p className="text-sm font-medium uppercase tracking-wide text-zinc-500">
          {PERIOD_LABELS[period] || period} site inspection
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">
          {projectName || "Project"}
        </h1>
        <p className="max-w-2xl text-zinc-500">
          Open a file to enter findings. Drag to select, then Delete — alerts from deleted files
          restore to this week's quota.
        </p>
        <p className="text-sm font-medium text-zinc-700" suppressHydrationWarning>
          {hasHydrated
            ? `Alerts left this week: ${weekUsage.remaining} of ${weekUsage.limit}`
            : "Alerts left this week: —"}
        </p>
      </header>

      <section className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
        <div className="border-b border-zinc-200 bg-zinc-50 px-6 py-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
            {PERIOD_LABELS[period]} files ({visibleFiles.length}
            {hiddenCount > 0 ? ` of ${displayFiles.length}` : ""}
            {search.activeQuery ? ` matching of ${files.length}` : ""})
          </h2>
        </div>

        <ReportFileSearchBar
          {...search}
          getFileHref={(id, fileId) => getSheqSiteInspectionFileHref(id, period, fileId)}
          projectId={projectId}
          placeholder={`Search ${period} inspection files…`}
        />

        {selection.selectedCount > 0 ? (
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-200 bg-sky-50 px-4 py-2 text-sm text-sky-900 sm:px-5">
            <p>
              {selection.selectedCount} file{selection.selectedCount === 1 ? "" : "s"} selected
            </p>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={selection.clearSelection}
                className="font-medium underline-offset-2 hover:underline"
              >
                Clear selection
              </button>
              <button
                type="button"
                disabled={bulkDeleting}
                onClick={handleDeleteSelected}
                className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-rose-700 disabled:opacity-60"
              >
                <Icon name="trash-2" size={14} />
                Delete
              </button>
            </div>
          </div>
        ) : null}

        {visibleFiles.length > 0 ? (
          <>
            <ul className="divide-y divide-zinc-200">
              {visibleFiles.map((file) => (
                <InspectionFileRow
                  key={file.id}
                  file={file}
                  projectId={projectId}
                  period={period}
                  status={getSheqSiteInspectionEntryStatus(projectId, period, file)}
                  selected={selection.selectedIds.has(file.id)}
                  deleting={deletingId === file.id || bulkDeleting}
                  onDelete={handleDeleteFile}
                  onMouseDown={selection.onRowMouseDown}
                  onMouseEnter={selection.onRowMouseEnter}
                  onMouseMove={selection.onRowMouseMove}
                  onClickCapture={selection.onRowClickCapture}
                  onContextMenu={selection.onRowContextMenu}
                />
              ))}
            </ul>
            {hiddenCount > 0 ? (
              <div className="border-t border-zinc-200 bg-zinc-50 px-6 py-4">
                <button
                  type="button"
                  onClick={() => setShowAll(true)}
                  className="text-sm font-medium text-zinc-700 transition hover:text-zinc-900"
                >
                  Show all {displayFiles.length} files
                </button>
              </div>
            ) : null}
          </>
        ) : (
          <div className="px-6 py-12 text-center text-zinc-500">
            {search.activeQuery
              ? "No inspection files match your search."
              : "No inspection files yet."}
          </div>
        )}
      </section>

      <FileListContextMenu
        open={Boolean(selection.contextMenu)}
        x={selection.contextMenu?.x ?? 0}
        y={selection.contextMenu?.y ?? 0}
        selectedCount={selection.selectedCount}
        deleting={bulkDeleting}
        onClose={selection.closeContextMenu}
        onDelete={handleDeleteSelected}
      />

      <RestrictedAreaLoginDialog
        open={deleteAuth.loginOpen}
        title="Delete files"
        description="Enter Safety & Health credentials to continue. You will be asked to confirm deletion next."
        validateCredentials={validateSafetyHealthCredentials}
        unlock={unlockPpeEntry}
        onCancel={deleteAuth.cancelLogin}
        onUnlocked={deleteAuth.handleUnlocked}
      />
    </div>
  )
}
