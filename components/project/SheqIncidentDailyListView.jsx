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
import { unlockPpeEntry, validateSafetyHealthCredentials } from "@/lib/ppeEntryAuth"
import {
  SHEQ_ALERT_KIND_INCIDENT,
  getSheqAlertWeekUsage,
} from "@/lib/sheqHomeAlerts"
import {
  createSheqIncidentDailyFileForToday,
  deleteSheqIncidentDay,
  getSheqIncidentDailyFiles,
  getSheqIncidentEntryStatus,
  migrateSheqIncidentToManualOnly,
  sealSheqIncidentDeletes,
} from "@/lib/sheqIncident"
import { getSafetyReportsHref, getSheqIncidentDailyFileHref } from "@/lib/projectRoutes"

const STATUS_STYLES = {
  awaiting: "bg-sky-50 text-sky-800 ring-sky-200",
  "in-progress": "bg-amber-50 text-amber-800 ring-amber-200",
}

const IncidentFileRow = memo(function IncidentFileRow({
  file,
  projectId,
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
        href={getSheqIncidentDailyFileHref(projectId, file.id)}
        prefetch={false}
        onClickCapture={onClickCapture}
        className={`app-file-row group min-w-0 flex-1 transition ${
          selected ? "hover:bg-sky-50" : "hover:bg-zinc-50"
        }`}
      >
        <div className="flex min-w-0 items-center gap-3 sm:gap-4">
          <div className="app-icon-tile app-icon-tile--amber">
            <Icon name="triangle-alert" size={20} />
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
        title="Delete incident report file"
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

export default function SheqIncidentDailyListView({ projectId, projectName }) {
  const { version, refresh } = useProjects()
  const [showAll, setShowAll] = useState(false)
  const [deletingDayId, setDeletingDayId] = useState("")
  const [bulkDeleting, setBulkDeleting] = useState(false)
  const [creating, setCreating] = useState(false)
  const [ready, setReady] = useState(false)
  const [weekUsage, setWeekUsage] = useState(() =>
    getSheqAlertWeekUsage(projectId, SHEQ_ALERT_KIND_INCIDENT)
  )
  const deleteAuth = useFileDeleteAuth()

  useEffect(() => {
    if (!projectId) return
    setWeekUsage(getSheqAlertWeekUsage(projectId, SHEQ_ALERT_KIND_INCIDENT))
  }, [projectId, version])

  useEffect(() => {
    if (!projectId) return undefined
    let cancelled = false
    setReady(false)
    void (async () => {
      await migrateSheqIncidentToManualOnly(projectId)
      await sealSheqIncidentDeletes(projectId)
      if (cancelled) return
      refresh()
      setReady(true)
    })()
    return () => {
      cancelled = true
    }
  }, [projectId, refresh])

  useEffect(() => {
    if (!projectId) return undefined
    const onStorage = () => {
      void sealSheqIncidentDeletes(projectId).then(() => {
        setWeekUsage(getSheqAlertWeekUsage(projectId, SHEQ_ALERT_KIND_INCIDENT))
        refresh()
      })
    }
    window.addEventListener("grove-shared-storage-change", onStorage)
    window.addEventListener("sheq-home-alert", onStorage)
    return () => {
      window.removeEventListener("grove-shared-storage-change", onStorage)
      window.removeEventListener("sheq-home-alert", onStorage)
    }
  }, [projectId, refresh])

  const files = useMemo(() => {
    if (!ready) return []
    void version
    return getSheqIncidentDailyFiles(projectId)
  }, [ready, projectId, version])

  const search = useReportFileSearch(files)
  const displayFiles = search.activeQuery ? search.filteredFiles : files
  const visibleFiles = useMemo(() => {
    if (search.activeQuery || showAll) return displayFiles
    return displayFiles.slice(0, 21)
  }, [displayFiles, search.activeQuery, showAll])
  const hiddenCount = Math.max(displayFiles.length - visibleFiles.length, 0)
  const visibleIds = useMemo(() => visibleFiles.map((file) => file.id), [visibleFiles])
  const selection = useDragFileSelection(visibleIds)

  async function handleCreateToday() {
    if (creating) return
    setCreating(true)
    try {
      const result = await createSheqIncidentDailyFileForToday(projectId)
      if (!result.ok) {
        window.alert(result.message || "Could not create today's incident file.")
        return
      }
      setWeekUsage(getSheqAlertWeekUsage(projectId, SHEQ_ALERT_KIND_INCIDENT))
      refresh()
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Could not create today's file.")
    } finally {
      setCreating(false)
    }
  }

  async function performDeleteDailyFile(file) {
    const confirmed = window.confirm(
      `Delete "${file.label}" from SHEQ incident reports?\n\nAlerts from this file restore to this week's quota. Alerts you keep expire after 24 hours. You can restore the file from Settings → Recycle files for 90 days.`
    )
    if (!confirmed) return

    setDeletingDayId(file.id)
    try {
      const result = await deleteSheqIncidentDay(projectId, file.id)
      if (!result.ok) {
        window.alert(result.message || "Could not delete this file.")
        return
      }
      setWeekUsage(getSheqAlertWeekUsage(projectId, SHEQ_ALERT_KIND_INCIDENT))
      refresh()
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Could not delete this file.")
    } finally {
      setDeletingDayId("")
    }
  }

  function handleDeleteDailyFile(file) {
    deleteAuth.requestDeleteAuth(() => {
      void performDeleteDailyFile(file)
    })
  }

  async function performDeleteSelected() {
    const ids = [...selection.selectedIds]
    selection.closeContextMenu()
    if (ids.length === 0) return

    const confirmed = window.confirm(
      ids.length === 1
        ? `Delete this incident file?\n\nAlerts from this file restore to this week's quota.`
        : `Delete ${ids.length} incident files?\n\nAlerts from these files restore to this week's quota.`
    )
    if (!confirmed) return

    setBulkDeleting(true)
    try {
      for (const dayId of ids) {
        const result = await deleteSheqIncidentDay(projectId, dayId)
        if (!result.ok) {
          window.alert(result.message || `Could not delete ${dayId}.`)
          break
        }
      }
      selection.clearSelection()
      setWeekUsage(getSheqAlertWeekUsage(projectId, SHEQ_ALERT_KIND_INCIDENT))
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
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 space-y-2">
            <Link
              href={getSafetyReportsHref(projectId)}
              className="inline-flex items-center gap-1 text-sm font-medium text-zinc-500 transition hover:text-zinc-800"
            >
              <Icon name="arrow-left" size={16} />
              Back to Safety reports
            </Link>
            <p className="text-sm font-medium uppercase tracking-wide text-zinc-500">
              SHEQ Incident report
            </p>
            <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">
              {projectName || "Project"}
            </h1>
            <p className="max-w-2xl text-zinc-500">
              Unlike valuations, incident files are never auto-created. Press + any time to add
              another report for today (multiple files on the same day are allowed). Open a file to
              edit the form, or delete it — deleted-file alerts restore to this week&apos;s quota;
              other alerts expire after 24 hours.
            </p>
            <p className="text-sm font-medium text-zinc-700">
              Alerts left this week: {weekUsage.remaining} of {weekUsage.limit}
            </p>
          </div>
          <button
            type="button"
            onClick={() => void handleCreateToday()}
            disabled={!ready || creating}
            title="Create a new incident report for today"
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-zinc-900 text-white shadow-sm transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Icon name="plus" size={22} />
          </button>
        </div>
      </header>

      <section className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
        <div className="border-b border-zinc-200 bg-zinc-50 px-6 py-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
            Incident files ({visibleFiles.length}
            {hiddenCount > 0 ? ` of ${displayFiles.length}` : ""}
            {search.activeQuery ? ` matching of ${files.length}` : ""})
          </h2>
        </div>

        <ReportFileSearchBar
          {...search}
          getFileHref={getSheqIncidentDailyFileHref}
          projectId={projectId}
          placeholder="Search incident files…"
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
                <IncidentFileRow
                  key={file.id}
                  file={file}
                  projectId={projectId}
                  status={getSheqIncidentEntryStatus(projectId, file)}
                  selected={selection.selectedIds.has(file.id)}
                  deleting={deletingDayId === file.id || bulkDeleting}
                  onDelete={handleDeleteDailyFile}
                  onMouseDown={selection.onRowMouseDown}
                  onMouseEnter={selection.onRowMouseEnter}
                  onMouseMove={selection.onRowMouseMove}
                  onClickCapture={selection.onRowClickCapture}
                  onContextMenu={selection.onRowContextMenu}
                />
              ))}
            </ul>
            {hiddenCount > 0 ? (
              <div className="border-t border-zinc-200 px-6 py-3">
                <button
                  type="button"
                  onClick={() => setShowAll(true)}
                  className="text-sm font-medium text-zinc-600 transition hover:text-zinc-900"
                >
                  Show {hiddenCount} more file{hiddenCount === 1 ? "" : "s"}
                </button>
              </div>
            ) : null}
          </>
        ) : (
          <p className="px-6 py-10 text-center text-sm text-zinc-500">
            {!ready
              ? "Loading…"
              : search.activeQuery
                ? "No files match your search."
                : "No incident files yet. Press + to create a report for today."}
          </p>
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
