"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import EntryUndoButton from "@/components/project/EntryUndoButton"
import ExportPdfButton from "@/components/project/ExportPdfButton"
import Icon from "@/components/icon/icon"
import MaterialScheduleFormulaCell from "@/components/project/MaterialScheduleFormulaCell"
import { useProjectData } from "@/components/project/ProjectDataProvider"
import { subscribeGroveStore } from "@/lib/groveClientStore"
import { useEntryUndo } from "@/lib/useEntryUndo"
import {
  createPlantSubRow,
  isPlantSubRow,
  listBoqAnalysisItems,
  mergeActualCostAnalysisWithBoq,
  RATE_BUILD_UP_COLUMNS,
  resolveActualCostAnalysisRow,
  saveActualCostAnalysisRows,
} from "@/lib/actualCostAnalysis"
import { BOQ_STORAGE_KEY } from "@/lib/boqData"
import { isFormula } from "@/lib/materialScheduleFormulas"
import {
  formatMaterialAmount,
  formatMaterialCurrencyAmount,
  formatMaterialRate,
  parsePlantCostAmount,
} from "@/lib/plantCostCalculations"
import { getRateAnalysisHubHref } from "@/lib/rateAnalysis"
import { applyZimBuildSuggestionToRow } from "@/lib/zimBuildQs"

function computedDisplay(row, key) {
  if (key === "fuelCost" || key === "plantCost" || key === "totalCost") {
    if (row[key] === null || row[key] === undefined) return "—"
    return formatMaterialCurrencyAmount(row[key])
  }
  if (key === "rate" || key === "billRate" || key === "allowableRate") return formatMaterialRate(row[key])
  return "—"
}

function formatEntryDisplay(columnKey, value) {
  if (isFormula(value)) return String(value)
  const numeric = parsePlantCostAmount(value)
  if (numeric === null) return String(value ?? "")
  if (columnKey === "production" || columnKey === "fuelAllocated" || columnKey === "materialQty") {
    return formatMaterialAmount(numeric)
  }
  return formatMaterialCurrencyAmount(numeric)
}

function acceptPercentEntry(value, formula) {
  const source = isFormula(formula) ? formula : value
  if (isFormula(source)) return { value, formula }
  const text = String(value ?? "").trim()
  if (!text) return { value: "", formula: "" }
  if (!/^\d+(\.\d+)?\s*%?$/.test(text)) return null
  return { value: text.replace("%", "").trim(), formula: "" }
}

function persistRows(projectId, next) {
  saveActualCostAnalysisRows(projectId, next, { remember: true, syncBoq: true })
}

function insertIndexAfterPlantGroup(rows, parentIndex) {
  const parent = rows[parentIndex]
  if (!parent) return parentIndex + 1
  let index = parentIndex + 1
  while (index < rows.length && isPlantSubRow(rows[index]) && rows[index].parentId === parent.id) {
    index += 1
  }
  return index
}

export default function ActualCostAnalysisView({ projectId, projectName }) {
  const { version } = useProjectData()
  const [rows, setRows] = useState([])
  const { canUndo, trackBeforeChange, undo, clear: clearUndo } = useEntryUndo()

  useEffect(() => {
    const load = () => {
      clearUndo()
      if (listBoqAnalysisItems(projectId).length === 0) {
        setRows([])
        return
      }
      const merged = mergeActualCostAnalysisWithBoq(projectId)
      setRows(merged)
      saveActualCostAnalysisRows(projectId, merged, { remember: false, syncBoq: false })
    }

    load()
    return subscribeGroveStore((key) => {
      if (key === BOQ_STORAGE_KEY) load()
    })
  }, [projectId, version, clearUndo])

  const resolvedRows = useMemo(() => rows.map(resolveActualCostAnalysisRow), [rows])

  const exportToPdf = async () => {
    const { exportRateBuildUpPdf } = await import("@/lib/rateBuildUpPdf")
    exportRateBuildUpPdf({ projectName, rows })
  }

  const updateRow = (rowIndex, field, value, formula = "", percentOnly = false) => {
    const entry = percentOnly ? acceptPercentEntry(value, formula) : { value, formula }
    if (!entry) return
    setRows((current) => {
      trackBeforeChange(current, `${rowIndex}:${field}`)
      const next = current.map((row, index) =>
        index === rowIndex ? { ...row, [field]: entry.value, [`${field}Formula`]: entry.formula } : row
      )
      persistRows(projectId, next)
      return next
    })
  }

  const addPlantSubRow = (parentIndex) => {
    setRows((current) => {
      const parent = current[parentIndex]
      if (!parent || isPlantSubRow(parent)) return current
      trackBeforeChange(current)
      const insertAt = insertIndexAfterPlantGroup(current, parentIndex)
      const next = [
        ...current.slice(0, insertAt),
        createPlantSubRow(parent),
        ...current.slice(insertAt),
      ]
      persistRows(projectId, next)
      return next
    })
  }

  const removePlantSubRow = (rowIndex) => {
    setRows((current) => {
      const target = current[rowIndex]
      if (!target || !isPlantSubRow(target)) return current
      trackBeforeChange(current)
      const next = current.filter((_, index) => index !== rowIndex)
      persistRows(projectId, next)
      return next
    })
  }

  const applyZimBuild = (rowIndex) => {
    setRows((current) => {
      trackBeforeChange(current)
      const next = current.map((row, index) => {
        if (index !== rowIndex) return row
        return applyZimBuildSuggestionToRow(row, row.zimBuildSuggestion)
      })
      persistRows(projectId, next)
      return next
    })
  }

  const handleUndo = () => {
    const previous = undo()
    if (!previous) return
    setRows(previous)
    persistRows(projectId, previous)
  }

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href={getRateAnalysisHubHref(projectId)}
            className="inline-flex items-center gap-1 text-sm font-medium text-zinc-500 transition hover:text-zinc-800"
          >
            <Icon name="arrow-left" size={16} />
            Back to Rate analysis
          </Link>
          {rows.length > 0 ? (
            <div className="flex flex-wrap items-center gap-2">
              <EntryUndoButton canUndo={canUndo} onUndo={handleUndo} />
              <ExportPdfButton onClick={exportToPdf} />
            </div>
          ) : null}
        </div>
        <p className="text-sm font-medium uppercase tracking-wide text-zinc-500">Rate build up</p>
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">{projectName}</h1>
        <p className="max-w-3xl text-zinc-500">
          Built from Client BOQ descriptions. Daily production is what you do in a day — not the BOQ
          quantity. Matching descriptions auto-fill from Vector Memory; new work can use ZimBuild QS
          market suggestions. Use + on Plant name to add another plant line under the same
          description. Saving writes Actual, Bill, and Allowable rates (and Cost) back into the BOQ.
        </p>
      </header>

      {rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50 px-6 py-12 text-center">
          <p className="text-sm font-medium text-zinc-700">No BOQ uploaded yet</p>
          <p className="mt-1 text-sm text-zinc-500">
            Upload a Client BOQ first on Rate analysis. Its descriptions create this template.
          </p>
        </div>
      ) : (
        <section className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
          <div className="max-h-[min(70vh,52rem)] overflow-auto px-4 py-4 sm:px-6">
            <table className="w-full min-w-[2100px] border-collapse text-sm">
              <thead className="sticky top-0 z-20">
                <tr className="border-b-2 border-zinc-900 bg-zinc-900 text-left text-white">
                  {RATE_BUILD_UP_COLUMNS.map((column) => (
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
                  const zim = row.zimBuildSuggestion
                  const plantSub = isPlantSubRow(row)
                  return (
                    <tr
                      key={row.id}
                      className={`border-b border-zinc-200 align-top ${plantSub ? "bg-zinc-50/80" : "bg-white"}`}
                    >
                      {RATE_BUILD_UP_COLUMNS.map((column) => (
                        <td
                          key={column.key}
                          className={`px-3 py-3 ${
                            column.key === "activityDescription"
                              ? "min-w-[20rem] w-[28rem] max-w-[36rem] align-top"
                              : column.key === "plantName"
                                ? "relative min-w-[10rem] align-top"
                                : ""
                          }`}
                        >
                          {column.key === "activityDescription" ? (
                            plantSub ? (
                              <span className="block px-1 text-xs text-zinc-400">└ plant</span>
                            ) : (
                              <div className="group relative space-y-2">
                                <p className="whitespace-pre-wrap break-words [overflow-wrap:anywhere] text-sm leading-snug text-zinc-900">
                                  {row.activityDescription}
                                </p>
                                {zim ? (
                                  <div className="pointer-events-none invisible absolute left-0 top-full z-30 mt-1 w-[min(22rem,calc(100vw-2rem))] rounded-md border border-zinc-200 bg-white px-2.5 py-2 text-xs text-zinc-600 opacity-0 shadow-lg transition group-hover:pointer-events-auto group-hover:visible group-hover:opacity-100">
                                    <p className="font-medium text-zinc-700">ZimBuild QS suggestion</p>
                                    <p>
                                      Daily cost {formatMaterialCurrencyAmount(zim.dailyCost)} · Daily
                                      production {formatMaterialAmount(zim.dailyProduction)}
                                      {zim.unit ? ` ${zim.unit}` : ""}
                                    </p>
                                    <button
                                      type="button"
                                      onClick={() => applyZimBuild(rowIndex)}
                                      className="mt-1 font-medium text-zinc-800 underline-offset-2 hover:underline"
                                    >
                                      Apply suggestion
                                    </button>
                                  </div>
                                ) : null}
                              </div>
                            )
                          ) : column.key === "plantName" ? (
                            <div className="relative pb-7">
                              <MaterialScheduleFormulaCell
                                projectId={projectId}
                                description={row.activityDescription}
                                columnKey={column.key}
                                rawValue={row[column.key] ?? ""}
                                formulaValue={row[`${column.key}Formula`] ?? ""}
                                align={column.align}
                                numeric={false}
                                columnLabel={column.label}
                                onChange={(value, formula) =>
                                  updateRow(rowIndex, column.key, value, formula, false)
                                }
                              />
                              {!plantSub ? (
                                <button
                                  type="button"
                                  onClick={() => addPlantSubRow(rowIndex)}
                                  title="Add plant row under this description"
                                  aria-label="Add plant row"
                                  className="absolute bottom-0 right-0 inline-flex h-6 w-6 items-center justify-center rounded border border-zinc-300 bg-white text-zinc-700 shadow-sm transition hover:border-zinc-400 hover:bg-zinc-50"
                                >
                                  <Icon name="plus" size={14} />
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => removePlantSubRow(rowIndex)}
                                  title="Remove plant row"
                                  aria-label="Remove plant row"
                                  className="absolute bottom-0 right-0 inline-flex h-6 w-6 items-center justify-center rounded border border-zinc-300 bg-white text-zinc-500 shadow-sm transition hover:border-zinc-400 hover:bg-zinc-50 hover:text-zinc-800"
                                >
                                  <Icon name="x" size={13} />
                                </button>
                              )}
                            </div>
                          ) : column.computed ? (
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
                                column.percent
                                  ? (value) =>
                                      String(value ?? "").trim() === ""
                                        ? ""
                                        : `${String(value).replace("%", "").trim()}%`
                                  : column.numeric
                                    ? (value) => formatEntryDisplay(column.key, value)
                                    : undefined
                              }
                              onChange={(value, formula) =>
                                updateRow(rowIndex, column.key, value, formula, Boolean(column.percent))
                              }
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
            Plant cost = fuel cost + plant hire. Daily cost (total) = labour + plant + material. Actual
            rate = Daily cost ÷ Daily production. Extra plant rows under a description add into the same
            BOQ rates. Bill rate adds overheads and profit. Allowable rate is the target unit cost.
          </p>
        </section>
      )}
    </div>
  )
}
