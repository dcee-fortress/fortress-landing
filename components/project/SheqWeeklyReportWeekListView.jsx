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
  deleteSheqWeeklyReportFile,
  getSheqWeeklyReportFiles,
} from "@/lib/sheqWeeklyReport"
import {
  getSheqWeeklyReportFileHref,
  getSheqWeeklyReportHref,
} from "@/lib/projectRoutes"

const INITIAL_VISIBLE = 12

const WeekReportRow = memo(function WeekReportRow({
  file,
  projectId,
  variant,
  openLabel,
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
        href={getSheqWeeklyReportFileHref(projectId, file.id, variant)}
        prefetch={false}
        onClickCapture={onClickCapture}
        className={`app-file-row group min-w-0 flex-1 transition ${
          selected ? "hover:bg-sky-50" : "hover:bg-zinc-50"
        }`}
      >
        <div className="flex min-w-0 items-center gap-3 sm:gap-4">
          <div className="app-icon-tile app-icon-tile--blue">
            <Icon name="calendar-range" size={20} />
          </div>
          <div className="min-w-0">
            <p className="truncate text-base font-semibold text-zinc-900 sm:text-lg">
              {file.label}
            </p>
            <p className="text-sm text-zinc-500">{openLabel}</p>
          </div>
        </div>
        <Icon
          name="chevron-right"
          size={18}
          className="text-zinc-400 transition group-hover:text-zinc-600"
        />
      </Link>
      <button
        type="button"
        aria-label={`Delete ${file.label}`}
        title="Delete SHEQ weekly report"
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

export default function SheqWeeklyReportWeekListView({
  projectId,
  projectName,
  variant = "actual",
}) {
  const hasHydrated = useHasHydrated()
  const { version, refresh } = useProjects()
  const [showAll, setShowAll] = useState(false)
  const [deletingId, setDeletingId] = useState("")
  const [bulkDeleting, setBulkDeleting] = useState(false)
  const deleteAuth = useFileDeleteAuth()
  const isTarget = variant === "target"
  const title = isTarget ? "Target Weekly SHEQ report" : "Actual Progress Report"
  const openLabel = isTarget
    ? "Open target SHEQ document for this week"
    : "Open actual SHEQ progress report for this week"
  const description = isTarget
    ? "Choose a week to open the Word-style Target Weekly SHEQ document. Drag to select, then Delete — Safety & Health login required."
    : "Choose a week to open the full Actual Progress Report. Drag to select, then Delete — Safety & Health login required."

  useEffect(() => {
    if (!hasHydrated || !projectId) return
    if (ensureDailyFilesThroughToday(projectId)) refresh()
  }, [hasHydrated, projectId, refresh])

  const files = useMemo(() => {
    if (!hasHydrated) return []
    void version
    return getSheqWeeklyReportFiles(projectId, variant)
  }, [hasHydrated, projectId, variant, version])

  const search = useReportFileSearch(files)
  const displayFiles = search.activeQuery ? search.filteredFiles : files
  const visibleFiles = useMemo(() => {
    if (search.activeQuery || showAll) return displayFiles
    return displayFiles.slice(0, INITIAL_VISIBLE)
  }, [displayFiles, search.activeQuery, showAll])
  const visibleIds = useMemo(() => visibleFiles.map((file) => file.id), [visibleFiles])
  const selection = useDragFileSelection(visibleIds)

  function getFileHref(pid, weekId) {
    return getSheqWeeklyReportFileHref(pid, weekId, variant)
  }

  async function performDeleteFile(file) {
    const confirmed = window.confirm(
      `Delete "${file.label}" from ${title}?\n\nYou can restore it from Settings → Recycle files for 90 days.`
    )
    if (!confirmed) return

    setDeletingId(file.id)
    try {
      const result = await deleteSheqWeeklyReportFile(
        projectId,
        file.id,
        variant,
        file.label
      )
      if (!result.ok) {
        window.alert(result.message || "Could not delete this week.")
        return
      }
      refresh()
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Could not delete this week.")
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
        ? `Delete this ${title} week?\n\nYou can restore it from Settings → Recycle files for 90 days.`
        : `Delete ${ids.length} ${title} weeks?\n\nYou can restore them from Settings → Recycle files for 90 days.`
    )
    if (!confirmed) return

    setBulkDeleting(true)
    try {
      for (const weekId of ids) {
        const file = files.find((item) => item.id === weekId)
        const result = await deleteSheqWeeklyReportFile(
          projectId,
          weekId,
          variant,
          file?.label || weekId
        )
        if (!result.ok) {
          window.alert(result.message || `Could not delete ${weekId}.`)
          break
        }
      }
      selection.clearSelection()
      refresh()
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Could not delete the selected weeks.")
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
          href={getSheqWeeklyReportHref(projectId)}
          className="inline-flex items-center gap-1 text-sm font-medium text-zinc-500 transition hover:text-zinc-800"
        >
          <Icon name="arrow-left" size={16} />
          Back to THE SHEQ WEEKLY REPORT
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

      <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <div className="border-b border-zinc-200 bg-zinc-50 px-6 py-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">{title}</h2>
        </div>

        <ReportFileSearchBar
          {...search}
          projectId={projectId}
          getFileHref={getFileHref}
          placeholder={`Search ${title} weeks…`}
        />

        {selection.selectedCount > 0 ? (
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-200 bg-sky-50 px-4 py-2 text-sm text-sky-900 sm:px-5">
            <p>
              {selection.selectedCount} week{selection.selectedCount === 1 ? "" : "s"} selected
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
          <p className="px-6 py-8 text-sm text-zinc-500">Loading weekly reports…</p>
        ) : visibleFiles.length > 0 ? (
          <ul className="divide-y divide-zinc-200">
            {visibleFiles.map((file) => (
              <WeekReportRow
                key={file.id}
                file={file}
                projectId={projectId}
                variant={variant}
                openLabel={openLabel}
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
        ) : (
          <p className="px-6 py-10 text-center text-sm text-zinc-500">
            {search.activeQuery ? "No weeks match your search." : "No weekly report weeks yet."}
          </p>
        )}
      </div>

      {!search.activeQuery && displayFiles.length > INITIAL_VISIBLE ? (
        <button
          type="button"
          onClick={() => setShowAll((current) => !current)}
          className="text-sm font-medium text-zinc-700 underline-offset-2 hover:underline"
        >
          {showAll ? "Show fewer weeks" : `Show all ${displayFiles.length} weeks`}
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
        description="Enter Safety & Health credentials to continue. You will be asked to confirm deletion next."
        validateCredentials={validateSafetyHealthCredentials}
        unlock={unlockPpeEntry}
        onCancel={deleteAuth.cancelLogin}
        onUnlocked={deleteAuth.handleUnlocked}
      />
    </div>
  )
}
