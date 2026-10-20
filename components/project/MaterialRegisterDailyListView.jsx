"use client"

import { memo, useMemo, useState } from "react"
import Icon from "@/components/icon/icon"
import Link from "next/link"
import ReportFileSearchBar, { useReportFileSearch } from "@/components/project/ReportFileSearch"
import RestrictedAreaLoginDialog from "@/components/project/RestrictedAreaLoginDialog"
import { useProjects } from "@/components/project/ProjectsProvider"
import { useFileDeleteAuth } from "@/hooks/useFileDeleteAuth"
import { useHasHydrated } from "@/hooks/useHasHydrated"
import { unlockFinanceEntry, validateFinanceEntryCredentials } from "@/lib/financeEntryAuth"
import { getMaterialRegister } from "@/lib/materialRegister"
import { getMaterialRegisterDailyFileHref, getMaterialRegisterHref } from "@/lib/projectRoutes"

const STATUS_STYLES = {
  awaiting: "bg-sky-50 text-sky-800 ring-sky-200",
  "in-progress": "bg-amber-50 text-amber-800 ring-amber-200",
}

const FileRow = memo(function FileRow({ file, projectId, kind, status, deleting, onDelete }) {
  return (
    <li className="flex items-stretch">
      <Link
        href={getMaterialRegisterDailyFileHref(projectId, kind, file.id)}
        prefetch={false}
        className="app-file-row group min-w-0 flex-1 transition hover:bg-zinc-50"
      >
        <div className="flex min-w-0 items-center gap-3 sm:gap-4">
          <div className="app-icon-tile app-icon-tile--emerald">
            <Icon name="package" size={20} />
          </div>
          <div className="min-w-0">
            <p className="truncate text-base font-semibold text-zinc-900 sm:text-lg">{file.label}</p>
            <p className="text-sm text-zinc-500">{status.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className={`rounded-full px-3 py-1 text-xs font-medium ring-1 ${STATUS_STYLES[status.key]}`}>
            {status.label}
          </span>
          <Icon name="chevron-right" size={18} className="text-zinc-400 transition group-hover:text-zinc-600" />
        </div>
      </Link>
      <button
        type="button"
        aria-label={`Delete ${file.label}`}
        title={`Delete ${file.label}`}
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

export default function MaterialRegisterDailyListView({ projectId, projectName, kind }) {
  const register = getMaterialRegister(kind)
  const hasHydrated = useHasHydrated()
  const { version, refresh } = useProjects()
  const [deletingDayId, setDeletingDayId] = useState("")
  const [creating, setCreating] = useState(false)
  const deleteAuth = useFileDeleteAuth()

  const dailyFiles = useMemo(() => {
    if (!hasHydrated) return []
    void version
    return register.getDailyFiles(projectId)
  }, [hasHydrated, projectId, register, version])

  const search = useReportFileSearch(dailyFiles)

  async function performDelete(file) {
    const confirmed = window.confirm(
      `Delete "${file.label}" from ${register.dailyTitle.toLowerCase()}?\n\nThis removes the day's quantities from the daily dashboard and from project to date.`
    )
    if (!confirmed) return
    setDeletingDayId(file.id)
    try {
      const result = await register.deleteDailyFile(projectId, file.id)
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

  async function handleCreateToday() {
    if (creating) return
    setCreating(true)
    try {
      const result = await register.createDailyFileForToday(projectId)
      if (!result.ok) {
        window.alert(result.message || "Could not create today's file.")
        return
      }
      if (result.alreadyExists) {
        window.alert(result.message)
      }
      refresh()
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Could not create today's file.")
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <Link
          href={getMaterialRegisterHref(projectId, kind)}
          className="inline-flex items-center gap-1 text-sm font-medium text-zinc-500 transition hover:text-zinc-800"
        >
          <Icon name="arrow-left" size={16} />
          Back to {register.title}
        </Link>
        <p className="text-sm font-medium uppercase tracking-wide text-zinc-500">{register.dailyTitle}</p>
        <h1
          suppressHydrationWarning
          className="text-2xl font-semibold tracking-tight text-zinc-900 sm:text-3xl lg:text-4xl"
        >
          {projectName || "Project"}
        </h1>
        <p className="max-w-2xl text-sm text-zinc-500 sm:text-base">
          {`Press + to create today's file. Open the file to change its date and enter the ${register.noun}. Those quantities roll into the daily dashboard and project to date.`}
        </p>
      </header>

      <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <div className="flex items-center justify-between gap-3 border-b border-zinc-200 px-4 py-3 sm:px-5">
          <h2 className="text-base font-semibold text-zinc-900">Daily files</h2>
          <button
            type="button"
            onClick={() => void handleCreateToday()}
            disabled={!hasHydrated || creating}
            aria-label={`Create today's ${register.noun} file`}
            title={`Create today's ${register.noun} file`}
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-zinc-900 text-white shadow-sm transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Icon name="plus" size={22} />
          </button>
        </div>
        <ReportFileSearchBar
          {...search}
          projectId={projectId}
          getFileHref={(id, dayId) => getMaterialRegisterDailyFileHref(id, kind, dayId)}
          placeholder={`Search ${register.dailyTitle.toLowerCase()} files`}
        />
        {!hasHydrated ? (
          <p className="px-6 py-8 text-sm text-zinc-500">Loading daily files…</p>
        ) : search.filteredFiles.length === 0 ? (
          <p className="px-6 py-8 text-sm text-zinc-500">
            {search.activeQuery
              ? `No ${register.dailyTitle.toLowerCase()} files match your search.`
              : `No daily files yet. Press + to create today's ${register.noun} file.`}
          </p>
        ) : (
          <ul className="divide-y divide-zinc-200">
            {search.filteredFiles.map((file) => (
              <FileRow
                key={file.id}
                file={file}
                projectId={projectId}
                kind={kind}
                status={register.getEntryStatus(projectId, file)}
                deleting={deletingDayId === file.id}
                onDelete={(target) => {
                  deleteAuth.requestDeleteAuth(() => {
                    void performDelete(target)
                  })
                }}
              />
            ))}
          </ul>
        )}
      </div>

      <RestrictedAreaLoginDialog
        open={deleteAuth.loginOpen}
        title="Delete files"
        description="Enter Finance credentials to continue. You will be asked to confirm deletion next."
        validateCredentials={validateFinanceEntryCredentials}
        unlock={unlockFinanceEntry}
        onCancel={deleteAuth.cancelLogin}
        onUnlocked={deleteAuth.handleUnlocked}
      />
    </div>
  )
}
