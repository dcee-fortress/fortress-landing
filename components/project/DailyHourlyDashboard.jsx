"use client"

import Link from "next/link"
import Icon from "@/components/icon/icon"
import EarnedValueReportTable from "@/components/project/EarnedValueReportTable"
import { useProjectData } from "@/components/project/ProjectDataProvider"
import { summarizeEarnedValueActivities } from "@/lib/activities"
import {
  ACTUAL_COST_SCHEDULE_TYPE,
  MATERIAL_SCHEDULE_TYPES,
  getMaterialScheduleHref,
} from "@/lib/materialSchedule"
import { formatSlotLabel } from "@/lib/projectData"

export default function DailyHourlyDashboard({
  slot,
  onDelete,
  onChange,
  projectName,
  projectId,
  dayLabel,
  dayId,
}) {
  const { getSlotsForDay, version } = useProjectData()
  void version

  const liveSlot = getSlotsForDay(dayId).find((item) => item.id === slot.id) ?? slot
  const summary = summarizeEarnedValueActivities(liveSlot.activities ?? [])
  const schedule = MATERIAL_SCHEDULE_TYPES[ACTUAL_COST_SCHEDULE_TYPE]

  const exportToPdf = async () => {
    const { exportHourlyDashboardPdf } = await import("@/lib/earnedValuePdf")
    exportHourlyDashboardPdf({ projectName, dayLabel, dayId, slot: liveSlot, summary })
  }

  const handleTimeChange = (field, value) => {
    const next = { ...slot, [field]: value }
    next.label = formatSlotLabel(next.startTime, next.endTime)
    onChange(next)
  }

  return (
    <section className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 bg-zinc-50 px-6 py-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50 text-amber-700">
            <Icon name="clock" size={18} />
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-zinc-500">
                Start
              </label>
              <input
                type="time"
                value={slot.startTime}
                onChange={(event) => handleTimeChange("startTime", event.target.value)}
                className="rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-zinc-500">
                End
              </label>
              <input
                type="time"
                value={slot.endTime}
                onChange={(event) => handleTimeChange("endTime", event.target.value)}
                className="rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
            <div>
              <p className="text-lg font-semibold text-zinc-900">Hourly dashboard</p>
              <p className="text-xs text-zinc-500">Values from the material schedule below</p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => onDelete(slot.id)}
          className="no-print inline-flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 transition hover:bg-red-100"
        >
          <Icon name="trash-2" size={16} />
          Delete
        </button>
      </div>

      <div className="px-6 py-6">
        <EarnedValueReportTable summary={summary} onExportPdf={exportToPdf} />
      </div>

      <div className="no-print border-t border-zinc-200 bg-zinc-50 px-6 py-4">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">
          Material Schedule
        </p>
        <Link
          href={getMaterialScheduleHref(projectId, dayId, slot.id, ACTUAL_COST_SCHEDULE_TYPE)}
          prefetch={false}
          className="inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-medium text-emerald-800 transition hover:bg-emerald-100"
        >
          <Icon name="table" size={16} />
          {schedule.shortLabel}
        </Link>
      </div>
    </section>
  )
}
