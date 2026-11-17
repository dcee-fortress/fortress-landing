"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import Icon from "@/components/icon/icon"
import MaterialScheduleFormulaCell from "@/components/project/MaterialScheduleFormulaCell"
import { useProjectData } from "@/components/project/ProjectDataProvider"
import {
  listBoqAnalysisItems,
  mergeActualCostAnalysisWithBoq,
  resolveActualCostAnalysisRow,
} from "@/lib/actualCostAnalysis"
import { formatMaterialScheduleDisplayValue, MATERIAL_SCHEDULE_COLUMNS } from "@/lib/materialSchedule"
import { formatMaterialCurrencyAmount, formatMaterialRate } from "@/lib/plantCostCalculations"
import { getMaterialScheduleHref } from "@/lib/materialSchedule"
import { getQsOverviewHref } from "@/lib/qsOverview"
import { submitValuationVariation } from "@/lib/valuationVariations"

const COMPUTED_KEYS = new Set(["fuelCost", "totalCost", "rate"])

const VARIATION_COLUMNS = MATERIAL_SCHEDULE_COLUMNS.filter(
  (column) => column.key !== "details" && column.key !== "allowableRate"
)

function computedDisplay(row, key) {
  if (key === "fuelCost" || key === "totalCost") {
    if (row[key] === null || row[key] === undefined) return "—"
    return formatMaterialCurrencyAmount(row[key])
  }
  if (key === "rate") return formatMaterialRate(row.rate)
  return "—"
}

export default function ValuationVariationsView({
  projectId,
  projectName,
  dayId,
  dayLabel,
  slotId,
  slotLabel,
  scheduleType,
}) {
  const { version } = useProjectData()
  const [rows, setRows] = useState([])
  const [message, setMessage] = useState("")

  useEffect(() => {
    if (listBoqAnalysisItems(projectId).length === 0) {
      setRows([])
      return
    }
    setRows(mergeActualCostAnalysisWithBoq(projectId))
  }, [projectId, version])

  const resolvedRows = useMemo(() => rows.map(resolveActualCostAnalysisRow), [rows])

  const updateRow = (rowIndex, field, value, formula = "") => {
    setRows((current) =>
      current.map((row, index) =>
        index === rowIndex ? { ...row, [field]: value, [`${field}Formula`]: formula } : row
      )
    )
  }

  const handleSubmit = async () => {
    try {
      const variation = await submitValuationVariation(projectId, {
        dayId,
        slotId,
        rows,
      })
      setMessage(
        variation
          ? "Variation submitted. Head QS Overview now shows a notification to approve or disapprove."
          : "Could not submit variation."
      )
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not submit variation.")
    }
  }

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <Link
          href={getMaterialScheduleHref(projectId, dayId, slotId, scheduleType)}
          className="inline-flex items-center gap-1 text-sm font-medium text-zinc-500 transition hover:text-zinc-800"
        >
          <Icon name="arrow-left" size={16} />
          Back to valuations entry
        </Link>
        <p className="text-sm font-medium uppercase tracking-wide text-zinc-500">Variations</p>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 sm:text-3xl">
          {projectName}
        </h1>
        <p className="max-w-3xl text-sm text-zinc-500">
          {dayLabel} · {slotLabel}. Edit this table like Rate build up, then submit. If Head QS
          approves it, that day’s actual rate/cost use these figures. Later days keep using Rate build up.
        </p>
      </header>

      {rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50 px-6 py-12 text-center">
          <p className="text-sm font-medium text-zinc-700">No BOQ uploaded yet</p>
          <p className="mt-1 text-sm text-zinc-500">Upload a BOQ on Rate analysis first.</p>
        </div>
      ) : (
        <section className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
          <div className="overflow-x-auto px-4 py-4 sm:px-6">
            <table className="w-full min-w-[1200px] border-collapse text-sm">
              <thead>
                <tr className="border-b-2 border-zinc-900 bg-zinc-900 text-left text-white">
                  {VARIATION_COLUMNS.map((column) => (
                    <th
                      key={column.key}
                      className={`px-3 py-3 font-semibold ${column.align === "left" ? "text-left" : "text-right"}`}
                    >
                      {column.label}
                    </th>
                  ))}
                  <th className="px-3 py-3 text-right font-semibold">Submit</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, rowIndex) => {
                  const resolved = resolvedRows[rowIndex]
                  return (
                    <tr key={row.id} className="border-b border-zinc-200 align-top">
                      {VARIATION_COLUMNS.map((column) => (
                        <td key={column.key} className="px-3 py-3">
                          {column.key === "activityDescription" ? (
                            <p className="min-w-[12rem] max-w-[20rem] whitespace-pre-wrap break-words text-sm text-zinc-900">
                              {row.activityDescription}
                            </p>
                          ) : COMPUTED_KEYS.has(column.key) ? (
                            <div className="px-2 py-1.5 text-right text-sm font-medium tabular-nums text-zinc-900">
                              {computedDisplay(resolved, column.key)}
                            </div>
                          ) : (
                            <MaterialScheduleFormulaCell
                              projectId={projectId}
                              description={row.activityDescription}
                              columnKey={column.key}
                              rawValue={row[column.key] ?? ""}
                              formulaValue={row[`${column.key}Formula`] ?? ""}
                              align={column.align}
                              numeric={Boolean(column.numeric)}
                              columnLabel={column.label}
                              formatDisplay={
                                column.numeric
                                  ? (value) => formatMaterialScheduleDisplayValue(column.key, value)
                                  : undefined
                              }
                              onChange={(value, formula) => updateRow(rowIndex, column.key, value, formula)}
                            />
                          )}
                        </td>
                      ))}
                      <td className="px-3 py-3 text-right">
                        {rowIndex === rows.length - 1 ? (
                          <button
                            type="button"
                            onClick={handleSubmit}
                            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-800"
                          >
                            Submit
                          </button>
                        ) : (
                          <span className="text-xs text-zinc-400">—</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-200 bg-zinc-50 px-6 py-4">
            <p className="text-sm text-zinc-600">
              {message || "Submit sends this variation to Head QS Overview for approval."}
            </p>
            <Link
              href={getQsOverviewHref(projectId)}
              className="text-sm font-medium text-zinc-700 underline-offset-2 hover:underline"
            >
              Open Head QS Overview
            </Link>
          </div>
        </section>
      )}
    </div>
  )
}
