"use client"

import { notFound } from "next/navigation"
import PageLoadingShell from "@/components/project/PageLoadingShell"
import RestrictedAreaGate from "@/components/project/RestrictedAreaGate"
import MaterialScheduleView from "@/components/project/MaterialScheduleView"
import { useProjectData } from "@/components/project/ProjectDataProvider"
import { useProjects } from "@/components/project/ProjectsProvider"
import { useHydratedProjectRoute } from "@/hooks/useHydratedProjectRoute"
import { ensureDailyFilesThroughToday } from "@/lib/dailyFileSync"
import { ensureHourlyDashboardsForDay, getSlotsForDay as readSlotsForDay } from "@/lib/projectData"
import { isValidMaterialScheduleType } from "@/lib/materialSchedule"

function resolveScheduleSlot(projectId, dayId, slotId, scheduleType, getSlotsForDay) {
  if (!isValidMaterialScheduleType(scheduleType)) return null
  ensureDailyFilesThroughToday(projectId)
  ensureHourlyDashboardsForDay(projectId, dayId)
  const fromProvider = getSlotsForDay?.(dayId)?.find((item) => item.id === slotId)
  if (fromProvider) return fromProvider
  return readSlotsForDay(projectId, dayId).find((item) => item.id === slotId) ?? null
}

export default function MaterialSchedulePageClient({
  projectId,
  projectName,
  dayId,
  dayLabel,
  slotId,
  scheduleType,
}) {
  const { syncReady } = useProjects()
  const { getSlotsForDay, version } = useProjectData()
  const { isReady, project } = useHydratedProjectRoute(projectId, () => {
    void version
    return resolveScheduleSlot(projectId, dayId, slotId, scheduleType, getSlotsForDay)
  })

  const slot = isReady
    ? resolveScheduleSlot(projectId, dayId, slotId, scheduleType, getSlotsForDay)
    : null

  if (isReady && syncReady && !project) {
    notFound()
  }

  if (isReady && syncReady && project && !slot) {
    notFound()
  }

  return (
    <RestrictedAreaGate title="Material Schedule">
      {!isReady || !project || !slot ? (
        <PageLoadingShell />
      ) : (
        <div className="app-page-frame text-zinc-900">
          <div className="mx-auto max-w-6xl">
            <MaterialScheduleView
              projectId={projectId}
              projectName={projectName || project.name}
              dayId={dayId}
              dayLabel={dayLabel}
              slotId={slotId}
              slotLabel={`${slot.startTime} – ${slot.endTime}`}
              scheduleType={scheduleType}
            />
          </div>
        </div>
      )}
    </RestrictedAreaGate>
  )
}
