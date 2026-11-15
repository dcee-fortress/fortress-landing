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
  saveActualCostAnalysisRows,
} from "@/lib/actualCostAnalysis"
import { formatMaterialScheduleDisplayValue, MATERIAL_SCHEDULE_COLUMNS } from "@/lib/materialSchedule"
import { formatMaterialCurrencyAmount, formatMaterialRate } from "@/lib/plantCostCalculations"
import { getRateAnalysisHubHref } from "@/lib/rateAnalysis"

const COMPUTED_KEYS = new Set(["fuelCost", "totalCost", "rate"])

const ANALYSIS_COLUMNS = MATERIAL_SCHEDULE_COLUMNS.filter(
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

export default function ActualCostAnalysisView({ projectId, projectName }) {
  const { version } = useProjectData()
  const [rows, setRows] = useState([])

  useEffect(() => {
    if (listBoqAnalysisItems(projectId).length === 0) {
      setRows([])
      return
    }
    const merged = mergeActualCostAnalysisWithBoq(projectId)
    setRows(merged)
    saveActualCostAnalysisRows(projectId, merged)
  }, [projectId, version])

  const resolvedRows = useMemo(() => rows.map(resolveActualCostAnalysisRow), [rows])

  const updateRow = (rowIndex, field, value, formula = "") => {
    setRows((current) => {
      const next = current.map((row, index) =>
        index === rowIndex ? { ...row, [field]: value, [`${field}Formula`]: formula } : row
      )
      saveActualCostAnalysisRows(projectId, next)
      return next
    })
  }

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <Link
          href={getRateAnalysisHubHref(projectId)}
          className="inline-flex items-center gap-1 text-sm font-medium text-zinc-500 transition hover:text-zinc-800"
        >
          <Icon name="arrow-left" size={16} />
          Back to BOQ analysis
        </Link>
        <p className="text-sm font-medium uppercase tracking-wide text-zinc-500">Actual cost analysis</p>
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">{projectName}</h1>
        <p className="max-w-3xl text-zinc-500">
          Every BOQ description is listed here. Enter the quantities. Fuel cost, total cost, and rate
          calculate from those quantities. Head QS Overview actual cost = valuations production × this
          rate. Bill cost = bill rate × production.
        </p>
      </header>

      {rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50 px-6 py-12 text-center">
          <p className="text-sm font-medium text-zinc-700">No BOQ uploaded yet</p>
          <p className="mt-1 text-sm text-zinc-500">
            Upload a BOQ on BOQ analysis. Its descriptions will be written here automatically.
          </p>
        </div>
      ) : (
        <section className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
          <div className="max-h-[min(70vh,52rem)] overflow-auto px-4 py-4 sm:px-6">
            <table className="w-full min-w-[1400px] border-collapse text-sm">
              <thead className="sticky top-0 z-20">
                <tr className="border-b-2 border-zinc-900 bg-zinc-900 text-left text-white">
                  {ANALYSIS_COLUMNS.map((column) => (
                    <th
                      key={column.key}
                      className={`sticky top-0 z-20 bg-zinc-900 px-3 py-3 font-semibold ${column.align === "left" ? "text-left" : "text-right"}`}
                    >
                      {column.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, rowIndex) => {
                  const resolved = resolvedRows[rowIndex]
                  return (
                    <tr key={row.id} className="border-b border-zinc-200 align-top">
                      {ANALYSIS_COLUMNS.map((column) => (
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
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <p className="border-t border-zinc-200 bg-zinc-50 px-6 py-3 text-sm text-zinc-600">
            Rate = total cost ÷ production on this sheet. That rate × valuations production = actual cost on
            Head QS Overview. Fuel cost = fuel allocated × fuel price. Total cost = fuel cost + plant hire +
            labor cost.
          </p>
        </section>
      )}
    </div>
  )
}
