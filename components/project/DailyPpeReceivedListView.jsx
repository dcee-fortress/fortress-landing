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
import {
  deletePpeReceivedDay,
  getPpeReceivedDeletedDayIds,
  getPpeReceivedEntryStatus,
} from "@/lib/ppeReceived"
import { getDailyFiles } from "@/lib/projectFiles"
import { getPpeReceivedDailyFileHref, getPpeReceivedHref } from "@/lib/projectRoutes"

const INITIAL_VISIBLE = 21

const STATUS_STYLES = {
  awaiting: "bg-sky-50 text-sky-800 ring-sky-200",
  "in-progress": "bg-amber-50 text-amber-800 ring-amber-200",
}

const DailyPpeReceivedRow = memo(function DailyPpeReceivedRow({
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
        href={getPpeReceivedDailyFileHref(projectId, file.id)}
        prefetch={false}
        onClickCapture={onClickCapture}
        className={`app-file-row group min-w-0 flex-1 transition ${
          selected ? "hover:bg-sky-50" : "hover:bg-zinc-50"
        }`}
      >
        <div className="flex min-w-0 items-center gap-3 sm:gap-4">
          <div className="app-icon-tile app-icon-tile--blue">
            <Icon name="hard-hat" size={20} />
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
        title="Delete daily PPE received file"
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

export default function DailyPpeReceivedListView({ projectId, projectName }) {
  const hasHydrated = useHasHydrated()
  const { version, refresh } = useProjects()
  const [showAll, setShowAll] = useState(false)
  const [deletingDayId, setDeletingDayId] = useState("")
  const [bulkDeleting, setBulkDeleting] = useState(false)
  const deleteAuth = useFileDeleteAuth()

  useEffect(() => {
    if (!hasHydrated || !projectId) return
    if (ensureDailyFilesThroughToday(projectId)) refresh()
  }, [hasHydrated, projectId, refresh])

  const deletedDayIds = useMemo(() => {
    if (!hasHydrated) return new Set()
    void version
    return new Set(getPpeReceivedDeletedDayIds(projectId))
  }, [hasHydrated, projectId, version])

  const dailyFiles = useMemo(() => {
    if (!hasHydrated) return []
    void version
    return getDailyFiles(projectId).filter((file) => !deletedDayIds.has(file.id))
  }, [deletedDayIds, hasHydrated, projectId, version])

  const search = useReportFileSearch(dailyFiles)

  const displayFiles = search.activeQuery ? search.filteredFiles : dailyFiles
  const visibleFiles = useMemo(() => {
    if (search.activeQuery || showAll) return displayFiles
    return displayFiles.slice(0, INITIAL_VISIBLE)
  }, [displayFiles, search.activeQuery, showAll])

  const visibleIds = useMemo(() => visibleFiles.map((file) => file.id), [visibleFiles])
  const selection = useDragFileSelection(visibleIds)

  async function performDeleteDailyFile(file) {
    const confirmed = window.confirm(
      `Delete "${file.label}" from daily PPE received?\n\nThis removes the day's entry from weekly, monthly, and project-to-date rollups.`
    )
    if (!confirmed) return

    setDeletingDayId(file.id)
    try {
      const result = await deletePpeReceivedDay(projectId, file.id)
      if (!result.ok) {
        window.alert(result.message || "Could not delete this daily file.")
        return
      }
      refresh()
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Could not delete this daily file.")
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
        ? `Delete this PPE received file?\n\nThis removes the day's entry from weekly, monthly, and project-to-date rollups.`
        : `Delete ${ids.length} PPE received files?\n\nThis removes those days from weekly, monthly, and project-to-date rollups.`
    )
    if (!confirmed) return

    setBulkDeleting(true)
    try {
      for (const dayId of ids) {
        const result = await deletePpeReceivedDay(projectId, dayId)
        if (!result.ok) {
          window.alert(result.message || `Could not delete ${dayId}.`)
          break
        }
      }
      selection.clearSelection()
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
          href={getPpeReceivedHref(projectId)}
          className="inline-flex items-center gap-1 text-sm font-medium text-zinc-500 transition hover:text-zinc-800"
        >
          <Icon name="arrow-left" size={16} />
          Back to PPE received
        </Link>
        <p className="text-sm font-medium uppercase tracking-wide text-zinc-500">
          Daily PPE received
        </p>
        <h1
          suppressHydrationWarning
          className="text-2xl font-semibold tracking-tight text-zinc-900 sm:text-3xl lg:text-4xl"
        >
          {projectName || "Project"}
        </h1>
        <p className="max-w-2xl text-sm text-zinc-500 sm:text-base">
          Click a file to open it. Drag to select, then use Delete on the selection bar or the trash
          icon. You will sign in and confirm before anything is removed.
        </p>
      </header>

      <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <ReportFileSearchBar
          {...search}
          projectId={projectId}
          getFileHref={getPpeReceivedDailyFileHref}
          placeholder="Search daily PPE received files"
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

        {!hasHydrated ? (
          <p className="px-6 py-8 text-sm text-zinc-500">Loading daily files…</p>
        ) : (
          <ul className="divide-y divide-zinc-200">
            {visibleFiles.map((file) => {
              const status = getPpeReceivedEntryStatus(projectId, file)
              return (
                <DailyPpeReceivedRow
                  key={file.id}
                  file={file}
                  projectId={projectId}
                  status={status}
                  selected={selection.selectedIds.has(file.id)}
                  deleting={deletingDayId === file.id || bulkDeleting}
                  onDelete={handleDeleteDailyFile}
                  onMouseDown={selection.onRowMouseDown}
                  onMouseEnter={selection.onRowMouseEnter}
                  onMouseMove={selection.onRowMouseMove}
                  onClickCapture={selection.onRowClickCapture}
                  onContextMenu={selection.onRowContextMenu}
                />
              )
            })}
          </ul>
        )}
      </div>

      {!search.activeQuery && displayFiles.length > INITIAL_VISIBLE ? (
        <button
          type="button"
          onClick={() => setShowAll((current) => !current)}
          className="text-sm font-medium text-zinc-700 underline-offset-2 hover:underline"
        >
          {showAll ? "Show fewer files" : `Show all ${displayFiles.length} files`}
        </button>
      ) : null}

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
        description="Enter the username and password to continue. You will be asked to confirm deletion next."
        onCancel={deleteAuth.cancelLogin}
        onUnlocked={deleteAuth.handleUnlocked}
      />
    </div>
  )
}
