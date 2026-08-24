"use client"

import { useState } from "react"
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
import { PROJECT_STATUS } from "@/lib/projectRegistry"

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

  const selectedProject = projects.find((project) => project.id === selectedProjectId)
  const projectToEnd = projects.find((project) => project.id === endProjectId)
  const activeProjects = projects.filter((project) => project.status !== PROJECT_STATUS.ENDED)

  const refreshAll = () => {
    refreshProjects()
    projectData?.refresh()
  }

  const handleBackup = () => {
    exportGroveDatabaseBackup()
    setStatusMessage("Backup downloaded. Keep this file safe for your CEO showcase.")
  }

  const handleClearStep = () => {
    if (clearStep === 0) {
      setClearStep(1)
      return
    }

    if (clearStep === 1) {
      setClearStep(2)
      return
    }

    clearEntireGroveDatabase()
    refreshAll()
    setClearStep(0)
    setDeleteStep(0)
    setEndStep(0)
    setSelectedProjectId("")
    setEndProjectId("")
    setStatusMessage(`All ${APP_BRAND} data cleared from this browser.`)
    router.push("/")
  }

  const handleDeleteStep = () => {
    if (!selectedProject) return

    if (deleteStep === 0) {
      setDeleteStep(1)
      return
    }

    if (deleteStep === 1) {
      setDeleteStep(2)
      return
    }

    const result = deleteGroveProject(selectedProject.id)
    refreshAll()
    setDeleteStep(0)
    setSelectedProjectId("")
    setStatusMessage(result.ok ? result.message : result.message ?? "Delete failed.")

    if (result.ok) {
      router.push("/")
    }
  }

  const handleEndStep = async () => {
    if (!projectToEnd) return

    if (endStep === 0) {
      setEndStep(1)
      return
    }

    if (endStep === 1) {
      setEndStep(2)
      return
    }

    const result = await endProject(projectToEnd.id, endDate)
    refreshAll()
    setEndStep(0)
    setEndProjectId("")
    setStatusMessage(result.ok ? result.message : result.message ?? "Could not end project.")
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
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-sm font-medium text-zinc-500 transition hover:text-zinc-800"
        >
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
            Manage projects and local data stored in this browser. Your entries are kept until you
            delete them or clear the database.
          </p>
        </header>
      </div>

      {statusMessage ? (
        <ConfirmNotice tone="emerald" title="Done" message={statusMessage} />
      ) : null}

      <section className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
        <div className="border-b border-zinc-200 bg-zinc-50 px-6 py-4">
          <h2 className="text-lg font-semibold text-zinc-900">Save your data</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Download a backup of all projects, dashboards, and material schedules from this browser.
          </p>
        </div>
        <div className="space-y-4 px-6 py-6">
          <ConfirmNotice
            tone="sky"
            title="Data stays on this device"
            message="Everything you enter is saved automatically in this browser. Download a backup before clearing browser data or switching computers so your CEO showcase is safe."
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
                className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
              >
                Cancel
              </button>
            ) : null}
            <button
              type="button"
              disabled={!projectToEnd || !endDate}
              onClick={handleEndStep}
              className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:bg-zinc-400"
            >
              {endStep === 0
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
            Permanently remove a project and all of its dashboards and material schedules.
          </p>
        </div>

        <div className="space-y-4 px-6 py-6">
          {deleteStep === 0 ? (
            <div className="space-y-2">
              <p className="text-sm font-medium text-zinc-700">Available projects</p>
              <ul className="divide-y divide-zinc-200 rounded-lg border border-zinc-200">
                {projects.map((project) => {
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
                })}
              </ul>
            </div>
          ) : null}

          {deleteStep === 1 && selectedProject ? (
            <ConfirmNotice
              tone="amber"
              title="First confirmation"
              message={`Delete "${selectedProject.name}" and all of its dashboards and material schedules?`}
            />
          ) : null}

          {deleteStep === 2 && selectedProject ? (
            <ConfirmNotice
              tone="red"
              title="Final confirmation"
              message={`Last chance: permanently delete "${selectedProject.name}"? This cannot be undone.`}
            />
          ) : null}

          <div className="flex flex-wrap gap-3">
            {deleteStep > 0 ? (
              <button
                type="button"
                onClick={resetDeleteFlow}
                className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
              >
                Cancel
              </button>
            ) : null}
            <button
              type="button"
              disabled={!selectedProject}
              onClick={handleDeleteStep}
              className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-400"
            >
              {deleteStep === 0
                ? "Continue with selected project"
                : deleteStep === 1
                  ? "Yes, continue"
                  : "Delete project now"}
            </button>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-red-200 bg-white shadow-sm">
        <div className="border-b border-red-100 bg-red-50 px-6 py-4">
          <h2 className="text-lg font-semibold text-red-900">Clear whole database</h2>
          <p className="mt-1 text-sm text-red-700">
            Removes every project, dashboard entry, and material schedule from local storage.
          </p>
        </div>

        <div className="space-y-4 px-6 py-6">
          {clearStep === 1 ? (
            <ConfirmNotice
              tone="amber"
              title="First confirmation"
              message={`This will erase all ${APP_BRAND} projects, hourly dashboards, and material schedules saved in this browser.`}
            />
          ) : null}

          {clearStep === 2 ? (
            <ConfirmNotice
              tone="red"
              title="Final confirmation"
              message={`Are you absolutely sure? This action cannot be undone and will clear the entire ${APP_BRAND} database on this device.`}
            />
          ) : null}

          <div className="flex flex-wrap gap-3">
            {clearStep > 0 ? (
              <button
                type="button"
                onClick={resetClearFlow}
                className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
              >
                Cancel
              </button>
            ) : null}
            <button
              type="button"
              onClick={handleClearStep}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700"
            >
              {clearStep === 0
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
