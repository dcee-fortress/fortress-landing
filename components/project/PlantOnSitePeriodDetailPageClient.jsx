"use client"

import { notFound } from "next/navigation"
import { useProjects } from "@/components/project/ProjectsProvider"
import PlantOnSitePeriodDetailView from "@/components/project/PlantOnSitePeriodDetailView"
import {
  EQUIPMENT_IN_USE_MODULE,
  PLANT_COST_MODULE,
  getPeriodFile,
  PLANT_HOURS_MODULE,
} from "@/lib/plantOnSiteModules"

const MODULES = {
  "plant-hours": PLANT_HOURS_MODULE,
  "plant-cost": PLANT_COST_MODULE,
  "fuel-cost": PLANT_COST_MODULE,
  "equipment-in-use": EQUIPMENT_IN_USE_MODULE,
}

export default function PlantOnSitePeriodDetailPageClient({
  projectId,
  moduleKey,
  period,
  fileId,
}) {
  const { getProject } = useProjects()
  const project = getProject(projectId)
  const siteModule = MODULES[moduleKey]
  const file = getPeriodFile(projectId, period, fileId)

  if (!project || !siteModule || !file) {
    notFound()
  }

  return (
    <div className="h-screen overflow-y-auto bg-zinc-50 p-6 text-zinc-900">
      <div className="mx-auto max-w-4xl">
        <PlantOnSitePeriodDetailView
          projectName={project.name}
          projectId={projectId}
          module={siteModule}
          period={period}
          file={file}
        />
      </div>
    </div>
  )
}
