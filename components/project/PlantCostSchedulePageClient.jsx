"use client"

import { notFound } from "next/navigation"
import PageLoadingShell from "@/components/project/PageLoadingShell"
import PlantCostScheduleView from "@/components/project/PlantCostScheduleView"
import { useProjects } from "@/components/project/ProjectsProvider"
import { useHydratedProjectRoute } from "@/hooks/useHydratedProjectRoute"
import { ensureHourlyDashboardsForDay } from "@/lib/projectData"
import { getPlantCostSlotsForDay } from "@/lib/plantCostData"

export default function PlantCostSchedulePageClient({
  projectId,
  dayId,
  dayLabel,
  slotId,
}) {
  const { version } = useProjects()
  const { isReady, project, item: slot } = useHydratedProjectRoute(projectId, () => {
    void version
    ensureHourlyDashboardsForDay(projectId, dayId)
    return getPlantCostSlotsForDay(projectId, dayId).find((item) => item.id === slotId) ?? null
  })

  if (!isReady) {
    return <PageLoadingShell />
  }

  if (!project || !slot) {
    notFound()
  }

  const slotLabel = `${slot.startTime} – ${slot.endTime}`

  return (
    <div className="app-page-frame text-zinc-900">
      <div className="mx-auto max-w-6xl">
        <PlantCostScheduleView
          projectId={projectId}
          projectName={project.name}
          dayId={dayId}
          dayLabel={dayLabel}
          slotId={slotId}
          slotLabel={slotLabel}
        />
      </div>
    </div>
  )
}
