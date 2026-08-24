"use client"

import { useCallback, useMemo, useState } from "react"
import Link from "next/link"
import { useProjectData } from "@/components/project/ProjectDataProvider"
import {
  calculateOperatingHours,
  createEmptyPlantHoursRow,
  formatOperatingHours,
  getDailyPlantHoursData,
  getPlantHoursPeriodSummary,
  saveDailyPlantHoursData,
  sumPlantHoursRows,
} from "@/lib/plantHoursData"
import { getPlantOnSitePeriodHref } from "@/lib/plantOnSiteModules"
import HoursFieldInput from "@/components/project/HoursFieldInput"
import PlantHoursTotalCard from "@/components/project/PlantHoursTotalCard"

function TextInput({ value, onChange, placeholder, type = "text", align = "left" }) {
  return (
    <input
      type={type}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      className={`w-full min-w-[120px] rounded-md border border-zinc-200 bg-white px-2 py-1.5 text-sm text-zinc-900 outline-none transition focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200 ${
        align === "right" ? "text-right tabular-nums" : ""
      }`}
    />
  )
}

function PlantHoursDailyTable({ projectId, dayId }) {
  const [entry, setEntry] = useState(() => getDailyPlantHoursData(projectId, dayId))

  const persist = useCallback(
    (updater) => {
      setEntry((current) => {
        const nextEntry = typeof updater === "function" ? updater(current) : updater
        saveDailyPlantHoursData(projectId, dayId, nextEntry)
        return nextEntry
      })
    },
    [projectId, dayId]
  )

  const updateRow = (rowId, field, value) => {
    persist((current) => ({
      ...current,
      rows: current.rows.map((row) => (row.id === rowId ? { ...row, [field]: value } : row)),
    }))
  }

  const addRow = () => {
    persist((current) => ({
      ...current,
      rows: [...current.rows, createEmptyPlantHoursRow()],
    }))
  }

  const removeRow = (rowId) => {
    persist((current) => ({
      ...current,
      rows: current.rows.filter((row) => row.id !== rowId),
    }))
  }

  const dailyTotal = useMemo(() => sumPlantHoursRows(entry.rows), [entry.rows])

  return (
    <div className="space-y-4">
      <PlantHoursTotalCard
        title="Plant total hours for the day"
        totalHours={dailyTotal}
        description="Automatically rolls up from plant rows below. Daily totals cumulate into weekly and monthly plant hours reports."
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-zinc-600">
          Type figures in <strong>Start hours</strong> and <strong>Finish hours</strong> (e.g.{" "}
          <span className="tabular-nums">7</span> and <span className="tabular-nums">17</span>, or{" "}
          <span className="tabular-nums">7:30</span> and <span className="tabular-nums">17:30</span>
          ). <strong>Hours operating</strong> = finish hours − start hours.
        </p>
        <button
          type="button"
          onClick={addRow}
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-800"
        >
          Add plant row
        </button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-zinc-200">
        <table className="min-w-full border-collapse text-sm">
          <thead>
            <tr className="bg-zinc-50">
              <th className="border border-zinc-200 px-3 py-2 text-left font-semibold text-zinc-700">
                Plant number
              </th>
              <th className="border border-zinc-200 px-3 py-2 text-left font-semibold text-zinc-700">
                Plant description
              </th>
              <th className="border border-zinc-200 px-3 py-2 text-right font-semibold text-zinc-700">
                Start hours
              </th>
              <th className="border border-zinc-200 px-3 py-2 text-right font-semibold text-zinc-700">
                Finish hours
              </th>
              <th className="border border-zinc-200 px-3 py-2 text-right font-semibold text-zinc-700">
                Hours operating
              </th>
              <th className="border border-zinc-200 px-3 py-2 text-left font-semibold text-zinc-700">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {entry.rows.length > 0 ? (
              entry.rows.map((row) => {
                const hours = calculateOperatingHours(row.startHours, row.finishHours)

                return (
                  <tr key={row.id} className="bg-white">
                    <td className="border border-zinc-200 px-2 py-2">
                      <TextInput
                        value={row.plantNumber}
                        onChange={(value) => updateRow(row.id, "plantNumber", value)}
                        placeholder="Plant number"
                      />
                    </td>
                    <td className="border border-zinc-200 px-2 py-2">
                      <TextInput
                        value={row.plantDescription}
                        onChange={(value) => updateRow(row.id, "plantDescription", value)}
                        placeholder="Plant description"
                      />
                    </td>
                    <td className="border border-zinc-200 px-2 py-2">
                      <HoursFieldInput
                        value={row.startHours}
                        onChange={(value) => updateRow(row.id, "startHours", value)}
                        placeholder="Start"
                      />
                    </td>
                    <td className="border border-zinc-200 px-2 py-2">
                      <HoursFieldInput
                        value={row.finishHours}
                        onChange={(value) => updateRow(row.id, "finishHours", value)}
                        placeholder="Finish"
                      />
                    </td>
                    <td className="border border-zinc-200 px-3 py-2 text-right font-semibold tabular-nums text-zinc-900">
                      {formatOperatingHours(hours)}
                    </td>
                    <td className="border border-zinc-200 px-2 py-2">
                      <button
                        type="button"
                        onClick={() => removeRow(row.id)}
                        className="text-sm font-medium text-rose-600 transition hover:text-rose-800"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                )
              })
            ) : (
              <tr>
                <td colSpan={6} className="border border-zinc-200 px-6 py-10 text-center text-zinc-500">
                  No plant hours recorded yet. Click &quot;Add plant row&quot; to start entering
                  start and finish hours.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function PlantHoursSummaryTable({ projectId, period, fileId }) {
  const { version } = useProjectData()
  const summary = getPlantHoursPeriodSummary(projectId, period, fileId)
  void version

  const periodLabel = period === "weekly" ? "week" : "month"

  return (
    <div className="space-y-4">
      <PlantHoursTotalCard
        title={period === "weekly" ? "Plant total hours for the week" : "Plant total hours for the month"}
        totalHours={summary.totalHours}
        description={`Cumulated from ${summary.daysWithEntries} daily file${summary.daysWithEntries === 1 ? "" : "s"} with plant hours entries in this ${periodLabel}.`}
      />

      <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-600">
        <p>
          This {periodLabel}ly summary is read-only and rolls up from daily plant hours entries.
          Edit plant hours in the{" "}
          <Link
            href={getPlantOnSitePeriodHref(projectId, "plant-hours", "daily")}
            className="font-medium text-zinc-900 underline decoration-zinc-300 underline-offset-2 hover:decoration-zinc-500"
          >
            daily plant hours files
          </Link>
          .
        </p>
        <p className="mt-2">
          {summary.daysWithEntries} daily file{summary.daysWithEntries === 1 ? "" : "s"} with entries
          · Total hours:{" "}
          <span className="font-semibold tabular-nums text-zinc-900">
            {formatOperatingHours(summary.totalHours)}
          </span>
        </p>
      </div>

      <div className="overflow-x-auto rounded-xl border border-zinc-200">
        <table className="min-w-full border-collapse text-sm">
          <thead>
            <tr className="bg-zinc-50">
              <th className="border border-zinc-200 px-3 py-2 text-left font-semibold text-zinc-700">
                Plant number
              </th>
              <th className="border border-zinc-200 px-3 py-2 text-left font-semibold text-zinc-700">
                Plant description
              </th>
              <th className="border border-zinc-200 px-3 py-2 text-right font-semibold text-zinc-700">
                Days recorded
              </th>
              <th className="border border-zinc-200 px-3 py-2 text-right font-semibold text-zinc-700">
                Total hours operating
              </th>
            </tr>
          </thead>
          <tbody>
            {summary.rows.length > 0 ? (
              summary.rows.map((row) => (
                <tr key={`${row.plantNumber}-${row.plantDescription}`} className="bg-white">
                  <td className="border border-zinc-200 px-3 py-2 text-zinc-900">
                    {row.plantNumber || "—"}
                  </td>
                  <td className="border border-zinc-200 px-3 py-2 text-zinc-900">
                    {row.plantDescription || "—"}
                  </td>
                  <td className="border border-zinc-200 px-3 py-2 text-right tabular-nums text-zinc-700">
                    {row.daysRecorded}
                  </td>
                  <td className="border border-zinc-200 px-3 py-2 text-right font-medium tabular-nums text-zinc-900">
                    {formatOperatingHours(row.hoursOperating)}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} className="border border-zinc-200 px-6 py-10 text-center text-zinc-500">
                  No daily plant hours recorded for this {periodLabel} yet. Enter hours in the daily
                  plant hours files to build this summary.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default function PlantHoursTable({ projectId, period, fileId }) {
  if (period === "daily") {
    return (
      <PlantHoursDailyTable
        key={`${projectId}-${fileId}`}
        projectId={projectId}
        dayId={fileId}
      />
    )
  }

  return <PlantHoursSummaryTable projectId={projectId} period={period} fileId={fileId} />
}
