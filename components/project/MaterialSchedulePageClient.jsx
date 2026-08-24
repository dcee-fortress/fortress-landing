"use client"

import dynamic from "next/dynamic"
import { notFound } from "next/navigation"
import PageLoadingShell from "@/components/project/PageLoadingShell"
import { useProjectData } from "@/components/project/ProjectDataProvider"
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
  const { getSlotsForDay } = useProjectData()
  const slot = getSlotsForDay(dayId).find((item) => item.id === slotId)

  if (!slot || !isValidMaterialScheduleType(scheduleType)) {
    notFound()
  }

  const slotLabel = `${slot.startTime} – ${slot.endTime}`

  return (
    <div className="h-screen overflow-y-auto bg-zinc-50 p-6 text-zinc-900">
      <div className="mx-auto max-w-6xl">
        <MaterialScheduleView
          projectId={projectId}
          projectName={projectName}
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
