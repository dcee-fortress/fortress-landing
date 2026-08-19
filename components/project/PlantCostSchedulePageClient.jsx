"use client"

import { notFound } from "next/navigation"
import PlantCostScheduleView from "@/components/project/PlantCostScheduleView"
import { useProjects } from "@/components/project/ProjectsProvider"
import { getPlantCostSlotsForDay } from "@/lib/plantCostData"

export default function PlantCostSchedulePageClient({
  projectId,
  dayId,
  dayLabel,
  slotId,
}) {
  const { getProject } = useProjects()
  const project = getProject(projectId)
  const slot = getPlantCostSlotsForDay(projectId, dayId).find((item) => item.id === slotId)

  if (!project || !slot) {
    notFound()
  }

  const slotLabel = `${slot.startTime} – ${slot.endTime}`

  return (
    <div className="h-screen overflow-y-auto bg-zinc-50 p-6 text-zinc-900">
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
