"use client"

import Link from "next/link"
import Icon from "@/components/icon/icon"
import PlantRateAnalysisReportTable from "@/components/project/PlantRateAnalysisReportTable"
import { getPlantRateAnalysisSummaryForSlot } from "@/lib/plantCostData"
import {
  getPlantCostScheduleHref,
  PLANT_COST_SCHEDULE_LABEL,
} from "@/lib/plantCostSchedule"
import { formatSlotLabel } from "@/lib/projectData"
import { useProjectData } from "@/components/project/ProjectDataProvider"

export default function PlantCostHourlyDashboard({
  slot,
  onDelete,
  onChange,
  projectId,
  dayId,
}) {
  const { version } = useProjectData()
  void version

  const summary = getPlantRateAnalysisSummaryForSlot(projectId, dayId, slot.id)
  const awaitingEntry = summary.rows.length === 0

  const handleTimeChange = (field, value) => {
    const next = { ...slot, [field]: value }
    next.label = formatSlotLabel(next.startTime, next.endTime)
    onChange(next)
  }

  return (
    <section className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 bg-zinc-50 px-6 py-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-50 text-orange-700">
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
                step="900"
                inputMode="numeric"
                aria-label="Hourly dashboard start time"
                onChange={(event) => handleTimeChange("startTime", event.target.value)}
                className="rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-zinc-500">
                End
              </label>
              <input
                type="time"
                value={slot.endTime}
                step="900"
                inputMode="numeric"
                aria-label="Hourly dashboard end time"
                onChange={(event) => handleTimeChange("endTime", event.target.value)}
                className="rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
              />
            </div>
            <div>
              <p className="text-lg font-semibold text-zinc-900">Hourly dashboard</p>
              <p className="text-xs text-zinc-500">
                {awaitingEntry
                  ? "Awaiting entry — open the plant cost material schedule below"
                  : "Read-only report — edit entries in the plant cost material schedule"}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {awaitingEntry ? (
            <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-medium text-sky-800 ring-1 ring-sky-200">
              Awaiting entry
            </span>
          ) : null}
          <button
            type="button"
            onClick={() => onDelete(slot.id)}
            className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 transition hover:bg-red-100"
          >
            <Icon name="trash-2" size={16} />
            Delete
          </button>
        </div>
      </div>

      <div className="px-6 py-6">
        <PlantRateAnalysisReportTable
          summary={summary}
          totalLabel="Hourly total"
          emptyMessage="No plant cost data yet. Open the plant cost material schedule below to enter data for this hourly dashboard."
        />
      </div>

      <div className="border-t border-zinc-200 bg-zinc-50 px-6 py-4">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">
          Material Schedules
        </p>
        <Link
          href={getPlantCostScheduleHref(projectId, dayId, slot.id)}
          className="inline-flex items-center gap-2 rounded-lg border border-orange-200 bg-orange-50 px-4 py-2.5 text-sm font-medium text-orange-800 transition hover:bg-orange-100"
        >
          <Icon name="table" size={16} />
          {PLANT_COST_SCHEDULE_LABEL}
        </Link>
      </div>
    </section>
  )
}
