"use client"

import Link from "next/link"
import Icon from "@/components/icon/icon"
import PlantCostTable from "@/components/project/PlantCostTable"
import { useProjects } from "@/components/project/ProjectsProvider"
import { useProjectData } from "@/components/project/ProjectDataProvider"
import {
  getPlantOnSiteModuleHref,
  PLANT_COST_MODULE,
} from "@/lib/plantOnSiteModules"

export default function PlantCostProjectToDatePageClient({ projectId }) {
  const { getProject } = useProjects()
  const project = getProject(projectId)
  const { version } = useProjectData()
  void version

  if (!project) {
    return null
  }

  return (
    <div className="h-screen overflow-y-auto bg-zinc-50 p-6 text-zinc-900">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="space-y-2">
          <Link
            href={getPlantOnSiteModuleHref(projectId, PLANT_COST_MODULE.key)}
            className="inline-flex items-center gap-1 text-sm font-medium text-zinc-500 transition hover:text-zinc-800"
          >
            <Icon name="arrow-left" size={16} />
            Back to Plant Cost
          </Link>
          <p className="text-sm font-medium uppercase tracking-wide text-zinc-500">
            Project to Date Rates
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">{project.name}</h1>
          <p className="max-w-2xl text-zinc-500">
            {PLANT_COST_MODULE.periodListDescriptions["project-to-date"]}
          </p>
        </header>

        <article className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
          <div className="border-b border-zinc-200 bg-zinc-50 px-6 py-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
              Project to Date Report
            </h2>
            <p className="mt-1 text-sm text-zinc-600">
              Read-only roll-up from all daily hourly plant cost material schedules. Hourly data
              cumulates to daily, weekly, monthly, and project to date in the same way as
              valuations.
            </p>
          </div>
          <div className="px-4 py-6 sm:px-6">
            <PlantCostTable
              projectId={projectId}
              period="project-to-date"
              fileId="project-to-date"
            />
          </div>
        </article>
      </div>
    </div>
  )
}
