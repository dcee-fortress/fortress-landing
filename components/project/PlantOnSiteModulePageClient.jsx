"use client"

import { useProjects } from "@/components/project/ProjectsProvider"
import PlantOnSitePeriodHub from "@/components/project/PlantOnSitePeriodHub"
import {
  EQUIPMENT_IN_USE_MODULE,
  PLANT_COST_MODULE,
  PLANT_HOURS_MODULE,
} from "@/lib/plantOnSiteModules"

const MODULES = {
  "plant-hours": PLANT_HOURS_MODULE,
  "plant-cost": PLANT_COST_MODULE,
  "fuel-cost": PLANT_COST_MODULE,
  "equipment-in-use": EQUIPMENT_IN_USE_MODULE,
}

export default function PlantOnSiteModulePageClient({ projectId, moduleKey }) {
  const { getProject } = useProjects()
  const project = getProject(projectId)
  const siteModule = MODULES[moduleKey]

  if (!project || !siteModule) {
    return null
  }

  return (
    <div className="h-screen overflow-y-auto bg-zinc-50 p-6 text-zinc-900">
      <div className="mx-auto max-w-5xl">
        <PlantOnSitePeriodHub projectId={projectId} projectName={project.name} module={siteModule} />
      </div>
    </div>
  )
}
