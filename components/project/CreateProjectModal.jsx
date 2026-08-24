"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import Icon from "@/components/icon/icon"
import { useProjects } from "@/components/project/ProjectsProvider"
import { getProjectHomeHref } from "@/lib/projectRoutes"

function formatDateInputValue(date = new Date()) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

export default function CreateProjectModal({ open, onClose }) {
  const router = useRouter()
  const { createProject } = useProjects()
  const [name, setName] = useState("")
  const [startDate, setStartDate] = useState(formatDateInputValue())
  const [error, setError] = useState("")

  if (!open) return null

  const handleSubmit = async (event) => {
    event.preventDefault()
    const trimmed = name.trim()

    if (!trimmed) {
      setError("Enter a project name")
      return
    }

    if (!startDate) {
      setError("Choose a project start date")
      return
    }

    const project = await createProject(trimmed, { startDate })
    if (!project) {
      setError("Could not create project")
      return
    }

    setName("")
    setStartDate(formatDateInputValue())
    setError("")
    onClose()
    router.push(getProjectHomeHref(project.id))
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-zinc-900/40 p-4">
      <div
        className="w-full max-w-md rounded-xl border border-zinc-200 bg-white p-6 shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-project-title"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="create-project-title" className="text-lg font-semibold text-zinc-900">
              New Project
            </h2>
            <p className="mt-1 text-sm text-zinc-500">
              Choose when the project starts. Daily dashboards are created from that date.
            </p>
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="rounded-lg p-1 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700"
          >
            <Icon name="x" size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label htmlFor="project-name" className="block text-sm font-medium text-zinc-700">
              Project name
            </label>
            <input
              id="project-name"
              type="text"
              value={name}
              onChange={(event) => {
                setName(event.target.value)
                setError("")
              }}
              placeholder="e.g. Chadcom"
              autoFocus
              className="mt-1.5 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-500/20"
            />
          </div>

          <div>
            <label htmlFor="project-start-date" className="block text-sm font-medium text-zinc-700">
              Project start date
            </label>
            <input
              id="project-start-date"
              type="date"
              value={startDate}
              onChange={(event) => {
                setStartDate(event.target.value)
                setError("")
              }}
              className="mt-1.5 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-500/20"
            />
            <p className="mt-1.5 text-xs text-zinc-500">
              Dashboards and daily files begin on this date. All data is saved in this browser.
            </p>
          </div>

          {error ? <p className="text-sm text-red-600">{error}</p> : null}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-sm font-medium text-zinc-600 transition hover:bg-zinc-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-800"
            >
              Create project
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
