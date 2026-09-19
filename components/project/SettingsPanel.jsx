"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import Icon from "@/components/icon/icon"
import { useOptionalProjectData } from "@/components/project/ProjectDataProvider"
import { useProjects } from "@/components/project/ProjectsProvider"
import {
  clearEntireGroveDatabase,
  deleteGroveProject,
  exportGroveDatabaseBackup,
} from "@/lib/groveDatabase"
import { APP_BRAND } from "@/lib/appBrand"
import { isEndedProject, PROJECT_STATUS } from "@/lib/projectRegistry"
import {
  daysRemainingInTrash,
  getTrashTypeLabel,
  listTrashEntries,
  permanentlyDeleteTrashEntry,
  restoreTrashEntry,
  TRASH_RETENTION_DAYS,
} from "@/lib/fileTrash"

function ConfirmNotice({ tone = "amber", title, message }) {
  const tones = {
    amber: "border-amber-200 bg-amber-50 text-amber-900",
    red: "border-red-200 bg-red-50 text-red-900",
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-900",
    sky: "border-sky-200 bg-sky-50 text-sky-900",
  }

  return (
    <div className={`rounded-lg border px-4 py-3 ${tones[tone]}`}>
      <p className="text-sm font-semibold">{title}</p>
      <p className="mt-1 text-sm leading-relaxed opacity-90">{message}</p>
    </div>
  )
}

function formatDateInputValue(date = new Date()) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function ProjectStatusBadge({ project }) {
  if (project.status === PROJECT_STATUS.ENDED) {
    return (
      <span className="rounded-full bg-zinc-200 px-2 py-0.5 text-xs font-medium text-zinc-700">
        Ended {project.endDate ?? ""}
      </span>
    )
  }

  return (
    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">
      Active
    </span>
  )
}

export default function SettingsPanel() {
  const router = useRouter()
  const { projects, refresh: refreshProjects, endProject } = useProjects()
  const projectData = useOptionalProjectData()

  const [clearStep, setClearStep] = useState(0)
  const [deleteStep, setDeleteStep] = useState(0)
  const [endStep, setEndStep] = useState(0)
  const [selectedProjectId, setSelectedProjectId] = useState("")
  const [endProjectId, setEndProjectId] = useState("")
  const [endDate, setEndDate] = useState(formatDateInputValue())
  const [statusMessage, setStatusMessage] = useState("")
  const [busyAction, setBusyAction] = useState("")
  const [endedDeleteConfirmId, setEndedDeleteConfirmId] = useState("")
  const [recycleOpen, setRecycleOpen] = useState(false)
  const [trashEntries, setTrashEntries] = useState([])
  const [trashBusyId, setTrashBusyId] = useState("")

  const selectedProject = projects.find((project) => project.id === selectedProjectId)
  const projectToEnd = projects.find((project) => project.id === endProjectId)
  const activeProjects = projects.filter((project) => !isEndedProject(project))
  const endedProjects = projects.filter((project) => isEndedProject(project))

  const refreshAll = () => {
    refreshProjects()
    projectData?.refresh()
  }

  const refreshTrash = () => {
    setTrashEntries(listTrashEntries())
  }

  useEffect(() => {
    refreshTrash()
  }, [])

  const handleRestoreTrashEntry = async (entryId) => {
    if (trashBusyId) return
    setTrashBusyId(`restore:${entryId}`)
    try {
      const result = await restoreTrashEntry(entryId)
      refreshTrash()
      refreshAll()
      setStatusMessage(
        result.ok ? "File restored from the recycle bin." : result.message || "Could not restore file."
      )
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Could not restore file.")
    } finally {
      setTrashBusyId("")
    }
  }

  const handlePermanentTrashDelete = async (entryId, label) => {
    if (trashBusyId) return
    const confirmed = window.confirm(
      `Permanently delete "${label}"?\n\nThis cannot be undone.`
    )
    if (!confirmed) return

    setTrashBusyId(`delete:${entryId}`)
    try {
      const result = await permanentlyDeleteTrashEntry(entryId)
      refreshTrash()
      setStatusMessage(
        result.ok
          ? "File permanently deleted from the recycle bin."
          : result.message || "Could not permanently delete file."
      )
    } catch (error) {
      setStatusMessage(
        error instanceof Error ? error.message : "Could not permanently delete file."
      )
    } finally {
      setTrashBusyId("")
    }
  }

  const handleBackup = async () => {
    try {
      await exportGroveDatabaseBackup()
      setStatusMessage("Live database backup downloaded.")
    } catch {
      setStatusMessage("Could not download the live database backup.")
    }
  }

  const handleClearStep = async () => {
    if (busyAction) return
    if (clearStep === 0) {
      setClearStep(1)
      return
    }

    if (clearStep === 1) {
      setClearStep(2)
      return
    }

    setBusyAction("clear")
    try {
      const result = await clearEntireGroveDatabase()
      refreshAll()
      setClearStep(0)
      setDeleteStep(0)
      setEndStep(0)
      setSelectedProjectId("")
      setEndProjectId("")
      setStatusMessage(result.ok ? result.message : result.message ?? "Could not clear the live database.")
      if (result.ok) {
        router.push("/")
      }
    } finally {
      setBusyAction("")
    }
  }

  const handleDeleteStep = async () => {
    if (busyAction || !selectedProject) return

    if (deleteStep === 0) {
      setDeleteStep(1)
      return
    }

    if (deleteStep === 1) {
      setDeleteStep(2)
      return
    }

    setBusyAction("delete")
    try {
      const result = await deleteGroveProject(selectedProject.id)
      refreshAll()
      setDeleteStep(0)
      setSelectedProjectId("")
      setStatusMessage(result.ok ? result.message : result.message ?? "Delete failed.")
    } finally {
      setBusyAction("")
    }
  }

  const handleEndedProjectDelete = async (project) => {
    if (busyAction || !project?.id) return

    if (endedDeleteConfirmId !== project.id) {
      setEndedDeleteConfirmId(project.id)
      setStatusMessage("")
      return
    }

    setBusyAction(`ended-delete:${project.id}`)
    try {
      const result = await deleteGroveProject(project.id)
      setEndedDeleteConfirmId("")
      refreshAll()
      setStatusMessage(
        result.ok
          ? `"${project.name}" was deleted from the live database.`
          : result.message ?? "Delete failed."
      )
    } finally {
      setBusyAction("")
    }
  }

  const handleEndStep = async () => {
    if (busyAction || !projectToEnd) return

    if (endStep === 0) {
      setEndStep(1)
      return
    }

    if (endStep === 1) {
      setEndStep(2)
      return
    }

    setBusyAction("end")
    try {
      const result = await endProject(projectToEnd.id, endDate)
      refreshAll()
      setEndStep(0)
      setEndProjectId("")
      setStatusMessage(result.ok ? result.message : result.message ?? "Could not end project.")
    } finally {
      setBusyAction("")
    }
  }

  const resetClearFlow = () => setClearStep(0)
  const resetDeleteFlow = () => {
    setDeleteStep(0)
    setSelectedProjectId("")
  }
  const resetEndFlow = () => {
    setEndStep(0)
    setEndProjectId("")
    setEndDate(formatDateInputValue())
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8 p-6">
      <div className="space-y-2">
        <Link href="/" className="inline-flex items-center gap-1 text-sm font-medium text-zinc-500 transition hover:text-zinc-800">
          <Icon name="arrow-left" size={16} />
          Back to {APP_BRAND}
        </Link>
        <header className="space-y-1">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-lg border border-zinc-300 bg-zinc-100 text-zinc-700">
              <Icon name="settings-2" size={22} />
            </span>
            <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">Settings</h1>
          </div>
          <p className="text-sm text-zinc-500">
            Manage projects and shared live data. Project entries are shared. Code updates are not.
          </p>
        </header>
      </div>

      <section className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
        <div className="border-b border-zinc-200 bg-zinc-50 px-6 py-4">
          <h2 className="text-lg font-semibold text-zinc-900">Data and code</h2>
          <p className="mt-1 text-sm text-zinc-500">
            These are kept apart on purpose.
          </p>
        </div>
        <div className="space-y-3 px-6 py-6 text-sm leading-relaxed text-zinc-600">
          <p>
            <span className="font-semibold text-zinc-900">Project data</span> lives in the live
            database. Valuations and other entries made on the public website, a phone, or this
            Cursor site are the same records.
          </p>
          <p>
            <span className="font-semibold text-zinc-900">Code and layout</span> that you try in
            Cursor stay on this computer first. They go onto the public website only when you ask
            for them to be published.
          </p>
        </div>
      </section>

      {statusMessage ? (
        <ConfirmNotice tone="emerald" title="Done" message={statusMessage} />
      ) : null}

      <section className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
        <div className="border-b border-zinc-200 bg-zinc-50 px-6 py-4">
          <h2 className="text-lg font-semibold text-zinc-900">Save your data</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Download a backup of all projects, dashboards, and material schedules from the live database.
          </p>
        </div>
        <div className="space-y-4 px-6 py-6">
          <ConfirmNotice
            tone="sky"
            title="Live database backup"
            message="The backup is taken from the shared live database, so it includes data entered by everyone using this site."
          />
          <button
            type="button"
            onClick={handleBackup}
            className="inline-flex items-center gap-2 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-800"
          >
            <Icon name="download" size={16} />
            Download backup
          </button>
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
        <div className="border-b border-zinc-200 bg-zinc-50 px-6 py-4">
          <h2 className="text-lg font-semibold text-zinc-900">Recycle files</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Deleted daily files stay here for up to {TRASH_RETENTION_DAYS} days. Restore them, or
            delete them forever.
          </p>
        </div>
        <div className="space-y-4 px-6 py-6">
          <button
            type="button"
            onClick={() => {
              refreshTrash()
              setRecycleOpen((open) => !open)
            }}
            className="inline-flex items-center gap-2 rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-800 transition hover:bg-zinc-50"
          >
            <Icon name="trash-2" size={16} />
            Recycle files
            {trashEntries.length > 0 ? (
              <span className="rounded-full bg-zinc-900 px-2 py-0.5 text-xs font-semibold text-white">
                {trashEntries.length}
              </span>
            ) : null}
          </button>

          {recycleOpen ? (
            trashEntries.length === 0 ? (
              <p className="text-sm text-zinc-500">No deleted files in the recycle bin.</p>
            ) : (
              <ul className="divide-y divide-zinc-200 rounded-lg border border-zinc-200">
                {trashEntries.map((entry) => {
                  const daysLeft = daysRemainingInTrash(entry)
                  const restoreBusy = trashBusyId === `restore:${entry.id}`
                  const deleteBusy = trashBusyId === `delete:${entry.id}`
                  const busy = Boolean(trashBusyId)
                  return (
                    <li
                      key={entry.id}
                      className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-zinc-900">
                          {entry.label || entry.dayId || entry.id}
                        </p>
                        <p className="mt-0.5 text-xs text-zinc-500">
                          {getTrashTypeLabel(entry.type)}
                          {entry.projectName ? ` · ${entry.projectName}` : ""}
                          {` · ${daysLeft} day${daysLeft === 1 ? "" : "s"} left`}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => handleRestoreTrashEntry(entry.id)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-800 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <Icon name="undo" size={14} />
                          {restoreBusy ? "Restoring…" : "Restore"}
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() =>
                            handlePermanentTrashDelete(
                              entry.id,
                              entry.label || entry.dayId || entry.id
                            )
                          }
                          className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-800 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <Icon name="trash-2" size={14} />
                          {deleteBusy ? "Deleting…" : "Delete forever"}
                        </button>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )
          ) : null}
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
        <div className="border-b border-zinc-200 bg-zinc-50 px-6 py-4">
          <h2 className="text-lg font-semibold text-zinc-900">End a project</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Stops new daily, weekly, and monthly files from being created. All saved data is kept
            and the project can still be opened and viewed.
          </p>
        </div>

        <div className="space-y-4 px-6 py-6">
          {endStep === 0 ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <p className="text-sm font-medium text-zinc-700">Active projects</p>
                <ul className="divide-y divide-zinc-200 rounded-lg border border-zinc-200">
                  {activeProjects.length === 0 ? (
                    <li className="px-4 py-3 text-sm text-zinc-500">No active projects.</li>
                  ) : (
                    activeProjects.map((project) => {
                      const isSelected = endProjectId === project.id

                      return (
                        <li key={project.id}>
                          <button
                            type="button"
                            onClick={() => {
                              setEndProjectId(project.id)
                              setStatusMessage("")
                            }}
                            className={`flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm transition ${
                              isSelected ? "bg-zinc-100" : "hover:bg-zinc-50"
                            }`}
                          >
                            <span className="font-medium text-zinc-900">{project.name}</span>
                            <ProjectStatusBadge project={project} />
                          </button>
                        </li>
                      )
                    })
                  )}
                </ul>
              </div>

              {projectToEnd ? (
                <div>
                  <label htmlFor="project-end-date" className="block text-sm font-medium text-zinc-700">
                    Last project day
                  </label>
                  <input
                    id="project-end-date"
                    type="date"
                    value={endDate}
                    min={projectToEnd.startDate ?? undefined}
                    onChange={(event) => setEndDate(event.target.value)}
                    className="mt-1.5 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-500/20"
                  />
                  <p className="mt-1.5 text-xs text-zinc-500">
                    Started {projectToEnd.startDate}. No dashboards will be added after this date.
                  </p>
                </div>
              ) : null}
            </div>
          ) : null}

          {endStep === 1 && projectToEnd ? (
            <ConfirmNotice
              tone="amber"
              title="First confirmation"
              message={`End "${projectToEnd.name}" on ${endDate}? Saved hourly dashboards and material schedules will be kept, but no new dates will appear after this.`}
            />
          ) : null}

          {endStep === 2 && projectToEnd ? (
            <ConfirmNotice
              tone="red"
              title="Final confirmation"
              message={`End "${projectToEnd.name}" now? You can still view all saved data, but the project timeline will stop on ${endDate}.`}
            />
          ) : null}

          <div className="flex flex-wrap gap-3">
            {endStep > 0 ? (
              <button
                type="button"
                onClick={resetEndFlow}
                disabled={Boolean(busyAction)}
                className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cancel
              </button>
            ) : null}
            <button
              type="button"
              disabled={!projectToEnd || !endDate || Boolean(busyAction)}
              onClick={handleEndStep}
              className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:bg-zinc-400"
            >
              {busyAction === "end"
                ? "Ending…"
                : endStep === 0
                  ? "Continue with selected project"
                  : endStep === 1
                    ? "Yes, continue"
                    : "End project now"}
            </button>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
        <div className="border-b border-zinc-200 bg-zinc-50 px-6 py-4">
          <h2 className="text-lg font-semibold text-zinc-900">Delete a project</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Permanently removes the project and all of its valuations, schedules, plant records, and
            reports from the live site for every device.
          </p>
        </div>

        <div className="space-y-4 px-6 py-6">
          {deleteStep === 0 ? (
            <div className="space-y-2">
              <p className="text-sm font-medium text-zinc-700">Projects</p>
              <ul className="divide-y divide-zinc-200 rounded-lg border border-zinc-200">
                {projects.length === 0 ? (
                  <li className="px-4 py-3 text-sm text-zinc-500">No projects to delete.</li>
                ) : (
                  projects.map((project) => {
                    const isSelected = selectedProjectId === project.id

                    return (
                      <li key={project.id}>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedProjectId(project.id)
                            setStatusMessage("")
                          }}
                          className={`flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm transition ${
                            isSelected ? "bg-zinc-100" : "hover:bg-zinc-50"
                          }`}
                        >
                          <span className="font-medium text-zinc-900">{project.name}</span>
                          <ProjectStatusBadge project={project} />
                        </button>
                      </li>
                    )
                  })
                )}
              </ul>
            </div>
          ) : null}

          {deleteStep === 1 && selectedProject ? (
            <ConfirmNotice
              tone="amber"
              title="First confirmation"
              message={`Permanently delete "${selectedProject.name}" and all of its saved data?`}
            />
          ) : null}

          {deleteStep === 2 && selectedProject ? (
            <ConfirmNotice
              tone="red"
              title="Final confirmation"
              message={`Last chance: permanently delete "${selectedProject.name}" from the live database? This cannot be undone.`}
            />
          ) : null}

          <div className="flex flex-wrap gap-3">
            {deleteStep > 0 ? (
              <button
                type="button"
                onClick={resetDeleteFlow}
                disabled={Boolean(busyAction)}
                className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cancel
              </button>
            ) : null}
            <button
              type="button"
              disabled={!selectedProject || Boolean(busyAction)}
              onClick={handleDeleteStep}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-zinc-400"
            >
              {busyAction === "delete"
                ? "Deleting…"
                : deleteStep === 0
                  ? "Delete selected project"
                  : deleteStep === 1
                    ? "Yes, continue"
                    : "Delete project permanently"}
            </button>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
        <div className="border-b border-zinc-200 bg-zinc-50 px-6 py-4">
          <h2 className="text-lg font-semibold text-zinc-900">Ended projects</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Ended projects are removed from the menu but remain available here until you delete them.
          </p>
        </div>

        <div className="space-y-4 px-6 py-6">
          {endedProjects.length > 0 ? (
            <ul className="divide-y divide-zinc-200 rounded-lg border border-zinc-200">
              {endedProjects.map((project) => {
                const confirming = endedDeleteConfirmId === project.id
                const deleting = busyAction === `ended-delete:${project.id}`

                return (
                  <li key={project.id} className="space-y-3 px-4 py-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="font-medium text-zinc-900">{project.name}</p>
                        <ProjectStatusBadge project={project} />
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Link
                          href={`/project/${project.id}`}
                          prefetch={false}
                          className="inline-flex items-center gap-2 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
                        >
                          <Icon name="external-link" size={16} />
                          Open project
                        </Link>
                        {!confirming ? (
                          <button
                            type="button"
                            disabled={Boolean(busyAction)}
                            onClick={() => handleEndedProjectDelete(project)}
                            className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-zinc-400"
                          >
                            <Icon name="trash-2" size={16} />
                            Delete project
                          </button>
                        ) : null}
                      </div>
                    </div>

                    {confirming ? (
                      <div className="space-y-3">
                        <ConfirmNotice
                          tone="red"
                          title="Delete this ended project?"
                          message={`Permanently delete "${project.name}" from the live database? This cannot be undone.`}
                        />
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            disabled={deleting}
                            onClick={() => setEndedDeleteConfirmId("")}
                            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-60"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            disabled={deleting}
                            onClick={() => handleEndedProjectDelete(project)}
                            className="rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-zinc-400"
                          >
                            {deleting ? "Deleting…" : "Yes, delete permanently"}
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </li>
                )
              })}
            </ul>
          ) : (
            <p className="text-sm text-zinc-500">No ended projects.</p>
          )}
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-red-200 bg-white shadow-sm">
        <div className="border-b border-red-100 bg-red-50 px-6 py-4">
          <h2 className="text-lg font-semibold text-red-900">Clear whole database</h2>
          <p className="mt-1 text-sm text-red-700">
            Permanently removes every project, dashboard entry, and material schedule from the live
            database for every device.
          </p>
        </div>

        <div className="space-y-4 px-6 py-6">
          {clearStep === 1 ? (
            <ConfirmNotice
              tone="amber"
              title="First confirmation"
              message={`This will erase all ${APP_BRAND} projects, hourly dashboards, and material schedules from the live database.`}
            />
          ) : null}

          {clearStep === 2 ? (
            <ConfirmNotice
              tone="red"
              title="Final confirmation"
              message={`Are you absolutely sure? This cannot be undone and will clear the entire ${APP_BRAND} live database for everyone.`}
            />
          ) : null}

          <div className="flex flex-wrap gap-3">
            {clearStep > 0 ? (
              <button
                type="button"
                onClick={resetClearFlow}
                disabled={Boolean(busyAction)}
                className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cancel
              </button>
            ) : null}
            <button
              type="button"
              disabled={Boolean(busyAction)}
              onClick={handleClearStep}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-zinc-400"
            >
              {busyAction === "clear"
                ? "Clearing…"
                : clearStep === 0
                  ? "Clear whole database"
                  : clearStep === 1
                    ? "Yes, continue"
                    : "Clear everything now"}
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}
