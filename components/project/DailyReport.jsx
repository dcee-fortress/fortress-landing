"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import Icon from "@/components/icon/icon"
import DailyHourlyDashboard from "@/components/project/DailyHourlyDashboard"
import EarnedValueReportTable from "@/components/project/EarnedValueReportTable"
import { useProjectData } from "@/components/project/ProjectDataProvider"
import {
  getMissingSlotTemplates,
  sortSlots,
} from "@/lib/dailySlots"
import { createSlotFromTemplate } from "@/lib/projectData"
import { getDailyFileEntryStatus } from "@/lib/dailyFileSync"
import { getDailyValueHref } from "@/lib/projectRoutes"

export default function DailyReport({ projectName, projectId, file, hideHourlyDashboards = false }) {
  const { version, getSlotsForDay, saveSlotsForDay, getDaySummary } = useProjectData()
  void version

  const slots = getSlotsForDay(file.id)
  const summary = getDaySummary(file.id)
  const status = getDailyFileEntryStatus(projectId, file)

  const missingSlots = getMissingSlotTemplates(slots)

  const persistSlots = (nextSlots) => {
    saveSlotsForDay(file.id, sortSlots(nextSlots))
  }

  const deleteSlot = (slotId) => {
    persistSlots(slots.filter((slot) => slot.id !== slotId))
  }

  const addNextHourlyDashboard = () => {
    const nextTemplate = missingSlots[0]
    if (!nextTemplate) return

    const slot = createSlotFromTemplate(nextTemplate)
    if (!slot) return

    persistSlots([...slots, slot])
  }

  const updateSlot = (updatedSlot) => {
    persistSlots(slots.map((slot) => (slot.id === updatedSlot.id ? updatedSlot : slot)))
  }

  const exportDailyTotal = async () => {
    const { exportDailyTotalPdf } = await import("@/lib/earnedValuePdf")
    exportDailyTotalPdf({ projectName, file, summary })
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
          <Link
            href={getDailyValueHref(projectId)}
            className="inline-flex items-center gap-1 text-sm font-medium text-zinc-500 transition hover:text-zinc-800"
          >
            <Icon name="arrow-left" size={16} />
            Back to daily files
          </Link>
          <header className="space-y-1">
            <p className="text-sm font-medium uppercase tracking-wide text-zinc-500">
              Daily cost
            </p>
            <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">{file.label}</h1>
          </header>
      </div>

      <article className="project-report overflow-hidden rounded-xl border border-zinc-300 bg-white shadow-sm">
        <div className="border-b border-zinc-200 bg-zinc-50 px-8 py-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
                {projectName}
              </p>
              <h2 className="mt-1 text-2xl font-bold text-zinc-900">{file.label}</h2>
              <p className="mt-1 text-sm text-zinc-500">
                {status.key === "awaiting"
                  ? "New daily file — add hourly dashboards and save material schedules to enter data."
                  : status.key === "in-progress"
                    ? "Today's data in progress — totals update as hourly material schedules are saved."
                    : `File completed: ${file.completedAt}`}
              </p>
            </div>
            <span
              className={`rounded-full px-3 py-1 text-xs font-medium ring-1 ${
                status.key === "awaiting"
                  ? "bg-sky-50 text-sky-800 ring-sky-200"
                  : status.key === "in-progress"
                    ? "bg-amber-50 text-amber-800 ring-amber-200"
                    : "bg-emerald-50 text-emerald-700 ring-emerald-200"
              }`}
            >
              {status.label}
            </span>
          </div>
        </div>

        <div className="px-8 py-6">
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-zinc-500">
            Daily Total (Roll-up from Hourly Dashboards)
          </h3>
          <p className="mb-4 text-sm text-zinc-500">
            {status.key === "awaiting"
              ? "No hourly data yet. Add hourly dashboards below, then enter and save material schedules."
              : `Hourly dashboard entries roll up to daily, weekly, monthly, and project to date totals (${slots.length} active dashboard${slots.length === 1 ? "" : "s"}).`}
          </p>
          <EarnedValueReportTable summary={summary} onExportPdf={exportDailyTotal} />
        </div>
      </article>

      {!hideHourlyDashboards && <section className="space-y-4">
        <div className="no-print flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-zinc-900">Hourly Dashboards</h2>
            <p className="text-sm text-zinc-500">
              Enter values in material schedules on each hourly dashboard. Totals roll up to daily, weekly, monthly, and project to date.
            </p>
          </div>

          <button
            type="button"
            disabled={missingSlots.length === 0}
            onClick={addNextHourlyDashboard}
            className="inline-flex items-center gap-2 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-400"
          >
            <Icon name="plus" size={16} />
            Add Hourly Dashboard
          </button>
        </div>

        {slots.length > 0 ? (
          <div className="space-y-4">
            {sortSlots(slots).map((slot) => (
              <DailyHourlyDashboard
                key={`${slot.id}-${version}`}
                slot={slot}
                projectId={projectId}
                projectName={projectName}
                dayLabel={file.label}
                dayId={file.id}
                onDelete={deleteSlot}
                onChange={updateSlot}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-zinc-300 bg-white px-6 py-12 text-center text-zinc-500">
            No hourly dashboards yet. Use &quot;Add Hourly Dashboard&quot;, then open each slot&apos;s
            material schedule to enter and save today&apos;s data.
          </div>
        )}
      </section>}
    </div>
  )
}
