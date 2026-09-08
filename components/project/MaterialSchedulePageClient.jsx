"use client"

import dynamic from "next/dynamic"
import { notFound } from "next/navigation"
import PageLoadingShell from "@/components/project/PageLoadingShell"
import { useProjectData } from "@/components/project/ProjectDataProvider"
import { useHydratedProjectRoute } from "@/hooks/useHydratedProjectRoute"
import { ensureHourlyDashboardsForDay } from "@/lib/projectData"
import { isValidMaterialScheduleType } from "@/lib/materialSchedule"

const MaterialScheduleView = dynamic(
  () => import("@/components/project/MaterialScheduleView"),
  {
    loading: () => <PageLoadingShell />,
  }
)

export default function MaterialSchedulePageClient({
  projectId,
  projectName,
  dayId,
  dayLabel,
  slotId,
  scheduleType,
}) {
  const { getSlotsForDay, version } = useProjectData()
  const { isReady, project, item: slot } = useHydratedProjectRoute(projectId, () => {
    void version
    ensureHourlyDashboardsForDay(projectId, dayId)
    if (!isValidMaterialScheduleType(scheduleType)) return null
    return getSlotsForDay(dayId).find((item) => item.id === slotId) ?? null
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
        <MaterialScheduleView
          projectId={projectId}
          projectName={projectName || project.name}
          dayId={dayId}
          dayLabel={dayLabel}
          slotId={slotId}
          slotLabel={slotLabel}
          scheduleType={scheduleType}
        />
      </div>
    </div>
  )
}
