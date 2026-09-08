"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import Icon from "@/components/icon/icon"
import PlantCostEntryTable from "@/components/project/PlantCostEntryTable"
import { useProjectData } from "@/components/project/ProjectDataProvider"
import {
  createEmptyPlantCostRow,
  getPlantCostSlotRows,
  savePlantCostSlotRows,
} from "@/lib/plantCostData"
import { getPlantCostHourlyDashboardHref } from "@/lib/plantCostSchedule"

function PlantCostScheduleEditor({
  projectId,
  projectName,
  dayId,
  dayLabel,
  slotId,
  slotLabel,
}) {
  const { refresh } = useProjectData()
  const [rows, setRows] = useState(() => getPlantCostSlotRows(projectId, dayId, slotId))
  const [savedMessage, setSavedMessage] = useState("")
  const rowsRef = useRef(rows)
  const hasEditedRef = useRef(false)

  rowsRef.current = rows

  const persistRows = (nextRows = rowsRef.current) => {
    savePlantCostSlotRows(projectId, dayId, slotId, nextRows)
  }

  useEffect(() => {
    if (!hasEditedRef.current) return undefined
    const timeoutId = window.setTimeout(() => persistRows(), 400)
    return () => window.clearTimeout(timeoutId)
  }, [rows, projectId, dayId, slotId])

  useEffect(() => {
    const flush = () => {
      if (!hasEditedRef.current) return
      persistRows()
    }
    const onVisibility = () => {
      if (document.visibilityState === "hidden") flush()
    }
    window.addEventListener("pagehide", flush)
    window.addEventListener("beforeunload", flush)
    document.addEventListener("visibilitychange", onVisibility)
    return () => {
      flush()
      window.removeEventListener("pagehide", flush)
      window.removeEventListener("beforeunload", flush)
      document.removeEventListener("visibilitychange", onVisibility)
    }
  }, [projectId, dayId, slotId])

  const handleRowsChange = (nextRows) => {
    hasEditedRef.current = true
    setRows(nextRows)
  }

  const handleSave = () => {
    persistRows(rows)
    hasEditedRef.current = false
    refresh()
    setSavedMessage(
      "Plant cost material schedule saved. Totals now appear on the hourly dashboard and roll up to daily, weekly, monthly, and project to date reports."
    )
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Link
          href={getPlantCostHourlyDashboardHref(projectId, dayId)}
          className="inline-flex items-center gap-1 text-sm font-medium text-zinc-500 transition hover:text-zinc-800"
        >
          <Icon name="arrow-left" size={16} />
          Back to hourly dashboards
        </Link>
        <header className="space-y-1">
          <p className="text-sm font-medium uppercase tracking-wide text-zinc-500">
            Plant Cost Material Schedule
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">{dayLabel}</h1>
          <p className="text-zinc-500">
            {projectName} · Hourly dashboard {slotLabel}
          </p>
        </header>
      </div>

      <article className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
        <div className="border-b border-zinc-200 bg-zinc-50 px-6 py-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
            Plant Cost Entry
          </h2>
          <p className="mt-1 text-sm text-zinc-600">
            Enter fuel allocated, fuel price, and plant hire cost, then save. Fuel cost and daily
            plant cost calculate automatically. Daily rate is daily plant cost ÷ production on the
            hourly report and rolls up to daily, weekly, monthly, and project to date reports.
          </p>
        </div>

        <div className="px-4 py-6 sm:px-6">
          <PlantCostEntryTable
            rows={rows}
            onRowsChange={handleRowsChange}
            onAddRow={() => {
              hasEditedRef.current = true
              setRows((current) => [...current, createEmptyPlantCostRow(projectId, dayId)])
            }}
            onSavedMessageClear={() => setSavedMessage("")}
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-200 bg-zinc-50 px-6 py-4">
          <p className="text-sm text-emerald-700">{savedMessage}</p>
          <button
            type="button"
            onClick={handleSave}
            className="inline-flex items-center gap-2 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-800"
          >
            <Icon name="save" size={16} />
            Save
          </button>
        </div>
      </article>
    </div>
  )
}

export default function PlantCostScheduleView(props) {
  const { projectId, dayId, slotId } = props

  return (
    <PlantCostScheduleEditor key={`${projectId}-${dayId}-${slotId}`} {...props} />
  )
}
